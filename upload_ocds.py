#!/usr/bin/env python3
import sys
import json
import argparse
import logging
import requests
import time
from datetime import datetime

# Configuration
API_HOST = "http://localhost:6543"
API_VERSION = "2.4"
API_URL = f"{API_HOST}/api/{API_VERSION}/tenders"
AUTH_TOKEN = "broker" # Basic auth user, password empty
HEADERS = {
    "Authorization": "Basic YnJva2VyOg==", # base64("broker:")
    "Content-Type": "application/json"
}

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Default CPV if mapping fails
DEFAULT_CPV = "45000000-7" # Construction work
DEFAULT_CPV_SERVICES = "98300000-6" # Miscellaneous services
DEFAULT_CPV_GOODS = "44617100-9" # Cartons (from tutorial)

mappings = {
    "goods": DEFAULT_CPV_GOODS,
    "services": DEFAULT_CPV_SERVICES,
    "works": DEFAULT_CPV
}

def get_default_cpv(main_category):
    return mappings.get(main_category, DEFAULT_CPV)

def transform_release_to_tender(release):
    """
    Transforms an OCDS compiledRelease to OpenProcurement Tender payload.
    """
    tender_data = release.get('tender', {})
    
    # Basic fields
    payload = {
        "title": tender_data.get('title', 'No Title'),
        "description": tender_data.get('description', tender_data.get('title', 'No Description')),
        "procurementMethodType": "belowThreshold", # Default for sandbox testing
        "mode": "test"
    }
    
    # Value
    if 'value' in tender_data:
        payload['value'] = {
            "amount": tender_data['value'].get('amount', 0),
            "currency": tender_data['value'].get('currency', 'UAH'),
            "valueAddedTaxIncluded": True
        }
    else:
         payload['value'] = {
            "amount": 1000,
            "currency": 'UAH',
            "valueAddedTaxIncluded": True
        }

    # Procuring Entity
    # We need to find the full details in 'parties'
    procuring_entity_id = tender_data.get('procuringEntity', {}).get('id')
    procuring_entity_details = None
    
    if procuring_entity_id:
        for party in release.get('parties', []):
            if party.get('id') == procuring_entity_id:
                procuring_entity_details = party
                break
    
    if procuring_entity_details:
        contact_point = procuring_entity_details.get('contactPoint', {})
        address = procuring_entity_details.get('address', {
            "countryName": "Україна",
            "locality": "Kyiv",
            "region": "Kyiv",
            "streetAddress": "Khreshchatyk 1",
            "postalCode": "01001"
        })
        
        # Identifier mapping
        identifier = procuring_entity_details.get('identifier', {})
        scheme = identifier.get('scheme', 'UA-EDR')
        if scheme not in ['UA-EDR', 'UA-IPN', 'UA-MFO']: # Simplified check, ideal would be to check against allowed list
            scheme = 'UA-EDR' # Fallback
            
        payload['procuringEntity'] = {
            "name": procuring_entity_details.get('name', 'Unknown Entity'),
            "kind": "general", # Required
            "identifier": {
                "scheme": scheme,
                "id": identifier.get('id', '00000000'),
                "legalName": identifier.get('legalName', procuring_entity_details.get('name'))
            },
            "contactPoint": {
                "name": contact_point.get('name', 'Contact Person'),
                "telephone": contact_point.get('telephone', '+380440000000'),
                "email": contact_point.get('email', 'info@example.com')
            },
            "address": {
                 "countryName": "Україна", # Sandbox requires valid country
                 "locality": address.get('locality', 'Kyiv'),
                 "region": address.get('region', 'Kyiv'),
                 "streetAddress": address.get('streetAddress', 'Unknown'),
                 "postalCode": address.get('postalCode', '00000')
            }
        }
    else:
        # Fallback if no procuring entity found
         payload['procuringEntity'] = {
            "name": "Default Entity",
            "kind": "general",
            "identifier": {
                "scheme": "UA-EDR",
                "id": "00037256",
                "legalName": "Default Entity"
            },
            "contactPoint": {
                "name": "Default Contact",
                "telephone": "+380440000000"
            },
            "address": {
                "countryName": "Україна",
                "locality": "Kyiv",
                "region": "Kyiv",
                "streetAddress": "Shevchenko 1",
                "postalCode": "01000"
            }
        }

    # Minimal Step
    tender_amount = payload['value']['amount']
    if not tender_amount or tender_amount <= 0:
        tender_amount = 1000
        payload['value']['amount'] = tender_amount
        
    step_amount = round(tender_amount * 0.005, 2)
    if step_amount < 10.0:
        step_amount = min(10.0, tender_amount / 2) # Ensure step is not bigger than half the tender if tender is small

    payload['minimalStep'] = {
        "amount": step_amount,
        "currency": payload['value']['currency'],
        "valueAddedTaxIncluded": True
    }

    # Items
    items = tender_data.get('items', [])
    if not items:
        # Try to find items in contracts if missing in tender
        contracts = release.get('contracts', [])
        if contracts:
             items = contracts[0].get('items', [])
    
    transformed_items = []
    main_cpv = get_default_cpv(tender_data.get('mainProcurementCategory', 'services'))
    
    if items:
        for i, item in enumerate(items):
            # OCDS Item -> API Item
            # Ensure classification is valid
            classification = item.get('classification', {})
            scheme = classification.get('scheme')
            cpv_id = main_cpv
            if scheme in ['CPV', 'ДК021', 'DK021']:
                 cpv_id = classification.get('id', main_cpv)

            transformed_items.append({
                "description": item.get('description', payload['title']),
                "classification": {
                    "scheme": u"ДК021", # OpenProcurement expects scheme to be explicitly this string (Cyrillic)
                    "id": cpv_id,
                    "description": classification.get('description', 'Product')
                },
                "quantity": item.get('quantity', 1),
                "unit": {
                    "code": "44617100-9", # item.get('unit', {}).get('code', '44617100-9')
                    "name": item.get('unit', {}).get('name', 'item')
                }
            })
            # Fix unit code: OpenProcurement often uses codes like 'MON' (month) or just text.
            # Tutorial used: "unit": { "code": "44617100-9", "name": "item" } matching the classification key!
            # Let's use the classification ID as the unit code if unsure, or specific valid codes.
            transformed_items[-1]['unit']['code'] = "KGM" # Just using a safe default for now
    else:
        # Create a dummy item
         transformed_items.append({
                "description": payload['title'],
                "classification": {
                    "scheme": u"ДК021",
                    "id": main_cpv,
                    "description": "Generic Item"
                },
                "quantity": 1,
                "unit": {
                    "code": "KGM",
                    "name": "item"
                }
            })

    payload['items'] = transformed_items
    
    # Enquiry Period and Tender Period
    # Using hardcoded future dates for validation to pass in 'test' mode or just valid intervals
    # Since we are bypassing accreditation, we might be creating 'draft' or 'active.enquiries'
    
    from datetime import timedelta
    now = datetime.now()
    payload['enquiryPeriod'] = {
        "startDate": (now + timedelta(minutes=1)).isoformat(),
        "endDate": (now + timedelta(days=10)).isoformat()
    }
    payload['tenderPeriod'] = {
        "startDate": (now + timedelta(days=10, minutes=1)).isoformat(),
        "endDate": (now + timedelta(days=20)).isoformat()
    }

    return {"data": payload}

def worker(line, dry_run=False):
    try:
        record = json.loads(line)
        if 'compiledRelease' not in record:
            return False, "No compiledRelease"
        
        release = record['compiledRelease']
        payload = transform_release_to_tender(release)
        
        if dry_run:
            logger.info(f"Dry Run: Prepared payload for {release.get('ocid')}")
            print(json.dumps(payload, indent=2))
            return True, "Dry Run"
            
        response = requests.post(API_URL, json=payload, headers=HEADERS)
        if response.status_code == 201:
            logger.info(f"Successfully created tender: {response.json()['data']['id']} (URL: {response.headers.get('Location')})")
            return True, response.json()['data']['id']
        else:
            logger.error(f"Failed to create tender. Status: {response.status_code}, Body: {response.text}")
            return False, response.text
            
    except Exception as e:
        logger.error(f"Error processing record: {e}")
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(description='Upload OCDS data to OpenProcurement API')
    parser.add_argument('--limit', type=int, default=0, help='Max records to process (0 for unlimited)')
    parser.add_argument('--dry-run', action='store_true', help='Do not actually upload')
    args = parser.parse_args()
    
    count = 0
    success = 0
    
    logger.info("Starting upload process...")
    
    for line in sys.stdin:
        if args.limit > 0 and count >= args.limit:
            break
            
        # Optional: skip empty lines
        if not line.strip():
            continue
            
        ok, msg = worker(line, args.dry_run)
        count += 1
        if ok:
            success += 1
        
        # Rate limiting to be nice to sandbox
        if not args.dry_run:
             time.sleep(0.5)

    logger.info(f"Finished. Total processed: {count}. Success: {success}.")

if __name__ == '__main__':
    main()
