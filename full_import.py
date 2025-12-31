import requests
import json
import ijson
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal

import os
import base64

API_HOST = os.getenv("API_HOST", "localhost")
API_PORT = os.getenv("API_PORT", "6543")
API_URL = f"http://{API_HOST}:{API_PORT}/api/2.4/tenders"

# Auth Tokens (default to dev values)
TOKEN_BROKER = os.getenv("API_TOKEN_BROKER", "broker")
TOKEN_BIDDER = os.getenv("API_TOKEN_BIDDER", "bidder")

# Construct Basic Auth Headers
def get_auth_header(token):
    # Basic auth is user:password base64 encoded. Here user=token, password=""
    raw = f"{token}:"
    encoded = base64.b64encode(raw.encode('utf-8')).decode('utf-8')
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}

HEADERS_BROKER = get_auth_header(TOKEN_BROKER)
HEADERS_BIDDER = get_auth_header(TOKEN_BIDDER)

DATA_FILE = "OCDS 2025.10.06/record-package-latest.json"

def get_now_formatted():
    return datetime.now().isoformat()

def generate_bid_id(name):
    return hashlib.md5(name.encode('utf-8')).hexdigest()

def map_decimal(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: map_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [map_decimal(v) for v in obj]
    return obj

def full_import():
    print(f"Starting import from {DATA_FILE}")
    
    with open(DATA_FILE, 'rb') as f:
        # Iterate over records
        for record in ijson.items(f, 'records.item'):
            try:
                if 'compiledRelease' not in record:
                    continue
                
                release = record['compiledRelease']
                ocid = release.get('ocid')
                print(f"Processing OCID: {ocid}")
                
                # 1. Map Tender Data
                raw_tender_data = map_tender(release)
                tender_data = map_decimal(raw_tender_data)
                
                # Create Tender
                resp = requests.post(API_URL, json={"data": tender_data}, headers=HEADERS_BROKER)
                if resp.status_code != 201:
                    print(f"Failed to create tender {ocid}: {resp.text}")
                    continue
                    
                tender_id = resp.json()['data']['id']
                token = resp.json()['access']['token']
                print(f"  Created Tender {tender_id}")
                
                # 2. Patch to active.tendering
                patch_url = f"{API_URL}/{tender_id}?acc_token={token}"
                resp = requests.patch(patch_url, json={"data": {"status": "active.tendering"}}, headers=HEADERS_BROKER)
                if resp.status_code != 200:
                    print(f"  Failed to patch to active.tendering: {resp.text}")
                    continue

                # 3. Create Bids
                # Synthesis: From tender.tenderers AND awards.suppliers
                bidders = {}
                
                # From tenderers
                if 'tender' in release and 'tenderers' in release['tender']:
                    for t in release['tender']['tenderers']:
                        bidders[t['name']] = t
                
                # From awards suppliers
                if 'awards' in release:
                    for aw in release['awards']:
                        if 'suppliers' in aw:
                            for s in aw['suppliers']:
                                bidders[s['name']] = s
                
                # Create each bid
                bid_map = {} # name -> bid_id
                
                for name, supplier_data in bidders.items():
                    raw_bid_payload = map_bid(supplier_data, tender_data['value'])
                    bid_payload = map_decimal(raw_bid_payload)
                    
                    bid_url = f"{API_URL}/{tender_id}/bids"
                    resp = requests.post(bid_url, json={"data": bid_payload}, headers=HEADERS_BIDDER)
                    if resp.status_code == 201:
                        bid_id = resp.json()['data']['id']
                        bid_map[name] = bid_id
                        print(f"  Created Bid for {name}")
                    else:
                        print(f"  Failed to create bid for {name}: {resp.text}")

                # 4. Patch to active.qualification
                resp = requests.patch(patch_url, json={"data": {"status": "active.qualification"}}, headers=HEADERS_BROKER)
                if resp.status_code != 200:
                    print(f"  Failed to patch to active.qualification: {resp.text}")
                    continue
                
                # 5. Create Awards
                award_map = {} # ocds_award_id -> api_award_id
                if 'awards' in release:
                    for aw in release['awards']:
                        # Find bid_id
                        bid_id = None
                        if 'suppliers' in aw and len(aw['suppliers']) > 0:
                            s_name = aw['suppliers'][0]['name']
                            bid_id = bid_map.get(s_name)
                        
                        if not bid_id:
                            print(f"  Skipping award {aw.get('id')} - No matching bid")
                            continue
                            
                        raw_award_payload = map_award(aw, bid_id)
                        award_payload = map_decimal(raw_award_payload)
                        
                        award_url = f"{API_URL}/{tender_id}/awards"
                        resp = requests.post(award_url, json={"data": award_payload}, headers=HEADERS_BROKER)
                        if resp.status_code == 201:
                            api_award_id = resp.json()['data']['id']
                            award_map[aw['id']] = api_award_id
                            print(f"  Created Award {api_award_id}")
                        else:
                            print(f"  Failed to create award: {resp.text}")

                # 6. Create Contracts
                if 'contracts' in release:
                    for c in release['contracts']:
                        ocds_award_id = c.get('awardID')
                        api_award_id = award_map.get(ocds_award_id)
                        
                        if not api_award_id:
                            print(f"  Skipping contract {c.get('id')} - Award not found or skipped")
                            continue
                            
                        raw_contract_payload = map_contract(c, api_award_id, tender_data.get('title'))
                        contract_payload = map_decimal(raw_contract_payload)
                        
                        contract_url = f"{API_URL}/{tender_id}/contracts"
                        resp = requests.post(contract_url, json={"data": contract_payload}, headers=HEADERS_BROKER)
                        
                        if resp.status_code == 201:
                            contract_id = resp.json()['data']['id']
                            print(f"  Created Contract {contract_id}")
                            
                            # Activate Contract
                            patch_contract_url = f"{API_URL}/{tender_id}/contracts/{contract_id}?acc_token={token}"
                            resp = requests.patch(patch_contract_url, json={"data": {"status": "active"}}, headers=HEADERS_BROKER)
                            if resp.status_code != 200:
                                print(f"  Failed to activate contract: {resp.text}")
                        else:
                            print(f"  Failed to create contract: {resp.text}")

                # 7. Patch to complete
                resp = requests.patch(patch_url, json={"data": {"status": "complete"}}, headers=HEADERS_BROKER)
                if resp.status_code == 200:
                    print(f"  Tender {ocid} Complete")
                else:
                    print(f"  Failed to complete tender: {resp.text}")

            except Exception as e:
                print(f"Error processing record: {e}")
                import traceback
                traceback.print_exc()

def map_contract(contract, award_id, tender_title=None):
    now = datetime.now()
    title = contract.get('title') or tender_title or "Contract"
    return {
        "title": title,
        "status": "active",
        "contractID": contract.get('id'),
        "awardID": award_id,
        "dateSigned": now.isoformat(),
        "value": map_value(contract.get('value')),
        "items": map_items(contract.get('items'), default_desc=title),
        "items": map_items(contract.get('items'), default_desc=title),
        "milestones": map_milestones(contract.get('milestones', [])),
        "implementation": map_implementation(contract.get('implementation')),
        "agreedMetrics": map_metrics(contract.get('agreedMetrics'))
    }

def map_tender(release):
    t = release.get('tender', {})
    now = datetime.now()
    
    # Synthesize Source URL
    source_url = None
    if 'identifiers' in t:
        for ident in t['identifiers']:
            if ident.get('scheme') == 'US_OR-PDX-BS-BIDNBR':
                doc_id = ident.get('id')
                source_url = f"https://procure.portlandoregon.gov/bso/external/bidDetail.sda?docId={doc_id}&external=true&parentUrl=close"
                break

    # Defaults and Mapping
    data = {
        "title": t.get('title', "Imported Tender"),
        "title_en": t.get('title'), 
        "description": t.get('description'),
        "procurementMethodType": "belowThreshold", # Force type
        "tenderID": release.get('ocid'),
        "mode": "test",
        "procuringEntity": map_procuring_entity(release.get('buyer') or t.get('procuringEntity')),
        "value": map_value(t.get('value')),
        "minimalStep": map_value(t.get('minValue') or {"amount": 0, "currency": "USD"}), # fallback
        "value": map_value(t.get('value')),
        "minimalStep": map_value(t.get('minValue') or {"amount": 0, "currency": "USD"}), # fallback
        "items": map_items(t.get('items'), default_desc=t.get('title', "Imported Tender")),
        "selectionCriteria": map_selection_criteria(t.get('selectionCriteria')),
        "sourceUrl": source_url,
        # Periods - synthesize to fit workflow constraints (current time)
        "enquiryPeriod": {
            "startDate": (now - timedelta(days=2)).isoformat(),
            "endDate": (now - timedelta(days=1)).isoformat()
        },
        "tenderPeriod": {
            "startDate": (now - timedelta(days=1)).isoformat(),
            "endDate": (now + timedelta(days=1)).isoformat()
        }
    }
    
    
    if not data['items']:
        # Dummy item if missing (double check, though map_items handles it)
        # map_items already returns a list with dummy if input is None/Empty
        pass

    return data

def map_procuring_entity(pe):
    if not pe:
        return {
            "name": "Unknown Entity",
            "kind": "general",
            "identifier": {"scheme": "UA-EDR", "id": "00000000", "legalName": "Unknown"},
            "address": {"countryName": "United States", "region": "NY", "locality": "New York", "streetAddress": "-"}
        }
    
    return {
        "name": pe.get('name', "Unknown"),
        "kind": "general", # Default
        "identifier": {
            "scheme": pe.get('identifier', {}).get('scheme', "UA-EDR"),
            "id": pe.get('identifier', {}).get('id', "00000000"),
            "legalName": pe.get('identifier', {}).get('legalName', pe.get('name'))
        },
        "address": {
            "countryName": pe.get('address', {}).get('countryName', "United States"),
            "region": pe.get('address', {}).get('region', "NY"),
            "locality": pe.get('address', {}).get('locality', "New York"),
            "streetAddress": pe.get('address', {}).get('streetAddress', "-")
        },
         "contactPoint": {
            "name": pe.get('contactPoint', {}).get('name', "Contact"),
            "telephone": pe.get('contactPoint', {}).get('telephone', "-") 
        }
    }

def map_value(val):
    if not val:
        return {"amount": 0, "currency": "USD", "valueAddedTaxIncluded": False}
    return {
        "amount": val.get('amount', 0),
        "currency": val.get('currency', "USD"),
        "valueAddedTaxIncluded": False
    }

def map_items(items, default_desc="Imported Item"):
    if not items:
        # Dummy item if missing
         return [{
            "description": default_desc,
            "quantity": 1,
            "unit": {"name": "unit", "code": "C62"},
            "classification": {"scheme": "ДК021", "id": "45000000-7", "description": "Construction work"} 
        }]

    res = []
    for i in items:
        orig_scheme = i.get('classification', {}).get('scheme', 'CPV')
        
        if orig_scheme in ['CPV', 'ДК021', 'CPV2008']:
            scheme = "ДК021"
            c_id = i.get('classification', {}).get('id', "45000000-7")
            desc = i.get('classification', {}).get('description', "Item")
        else:
            # Fallback for non-CPV schemes to ensure validation passes
            scheme = "ДК021"
            c_id = "45000000-7" 
            desc = i.get('description', "Imported Item")

        res.append({
            "description": i.get('description', "Item"),
            "quantity": i.get('quantity', 1),
            "unit": {"name": "unit", "code": "C62"},
            "classification": {
                "scheme": scheme,
                "id": c_id,
                "description": desc
            }
        })
    return res

def map_organization(org):
    if not org:
        return {
            "name": "Unknown Organization",
            "identifier": {"scheme": "UA-EDR", "id": "00000000", "legalName": "Unknown"},
            "address": {"countryName": "United States", "region": "NY", "locality": "New York", "streetAddress": "-"},
            "contactPoint": {"name": "Contact", "telephone": "-"}
        }
    return {
        "name": org.get('name', "Unknown"),
        "identifier": {
            "scheme": org.get('identifier', {}).get('scheme', "UA-EDR"),
            "id": org.get('identifier', {}).get('id', "00000000"),
            "legalName": org.get('identifier', {}).get('legalName', org.get('name'))
        },
        "address": {
            "countryName": org.get('address', {}).get('countryName', "United States"),
            "region": org.get('address', {}).get('region', "NY"),
            "locality": org.get('address', {}).get('locality', "New York"),
            "streetAddress": org.get('address', {}).get('streetAddress', "-")
        },
         "contactPoint": {
            "name": org.get('contactPoint', {}).get('name', "Contact"),
            "telephone": org.get('contactPoint', {}).get('telephone', "-") 
        }
    }

def map_bid(supplier, value):
    now = datetime.now()
    return {
        "tenderers": [map_organization(supplier)], 
        "value": value,
        "status": "active",
        "date": now.isoformat()
    }

def map_award(award, bid_id):
    now = datetime.now()
    return {
        "title": award.get('title', "Award"),
        "status": "active",
        "date": now.isoformat(),
        "value": map_value(award.get('value')),
        "suppliers": [map_organization(s) for s in award.get('suppliers', [])],
        "bid_id": bid_id
    }

def map_milestones(milestones):
    if not milestones:
        return []
    
    res = []
    for m in milestones:
        res.append({
            "id": m.get('id'),
            "title": m.get('title'),
            "type": m.get('type'), # approval, assessment, etc
            "code": m.get('code'),
            "description": m.get('description'),
            "status": m.get('status'), # met, notMet, partiallyMet
            "date": m.get('date'),
            "dueDate": m.get('dueDate'),
            "dateModified": get_now_formatted()
        })
    return res

def map_selection_criteria(criteria_data):
    if not criteria_data: return None
    # Assuming criteria_data is {"criteria": [...]}
    return {
        "criteria": criteria_data.get('criteria', [])
    }

def map_implementation(impl_data):
    if not impl_data: return None
    return {
        "transactions": map_transactions(impl_data.get('transactions', [])),
        "milestones": map_milestones(impl_data.get('milestones', [])),
        "purchaseOrders": map_purchase_orders(impl_data.get('purchaseOrders', []))
    }

def map_transactions(txs):
    if not txs: return []
    res = []
    for t in txs:
        res.append({
            "id": t.get('id'),
            "date": t.get('date'),
            "value": map_value(t.get('value')),
            "payer": map_organization_ref(t.get('payer')),
            "payee": map_organization_ref(t.get('payee')),
            "uri": t.get('uri')
        })
    return res

def map_purchase_orders(pos):
    if not pos: return []
    res = []
    for p in pos:
        res.append({
            "id": p.get('id'),
            "title": p.get('title'),
            "executionPeriod": p.get('executionPeriod')
        })
    return res

def map_metrics(metrics):
    if not metrics: return []
    res = []
    for m in metrics:
        res.append({
            "id": m.get('id'),
            "title": m.get('title'),
            "description": m.get('description')
        })
    return res

def map_organization_ref(ref):
    if not ref: return None
    return {
        "name": ref.get('name', 'Unknown'),
        "identifier": {
            "scheme": "UA-EDR", 
            "id": ref.get('id', '00000000'),
            "legalName": ref.get('name', 'Unknown')
        },
        "address": {"countryName": "United States", "region": "NY", "locality": "New York", "streetAddress": "-"},
        "contactPoint": {"name": "Contact", "telephone": "-"}
    }

if __name__ == "__main__":
    full_import()
