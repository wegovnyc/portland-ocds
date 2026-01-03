import os
import json
import ijson
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import insert

# Configuration
DATA_FILE = "/data/record-package-latest.json"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/tenders_db")

# Setup DB connection
engine = create_engine(DATABASE_URL)

def get_now_formatted():
    return datetime.now().isoformat()

def map_decimal(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: map_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [map_decimal(v) for v in obj]
    return obj

# --- Mapping Functions (Adapted from full_import.py) ---
# ... (See previous file content for logic, I will condense it here)

def map_tender_clean(release):
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

    # Build the full OCDS object Structure
    # We want a single JSON that represents the Tender + Awards + Contracts
    
    # Base Tender
    tender_data = {
        "id": release.get('ocid'),
        "date": release.get('date'),
        "tag": release.get('tag'),
        "initiationType": release.get('initiationType'),
        "tender": {
            "title": t.get('title', "Imported Tender"),
            "description": f"Publisher: {release.get('publisher', {}).get('name', 'Unknown')}\nVersion: {release.get('version', '1.0')}\n\n{t.get('description', '')}",
            "procurementMethod": t.get('procurementMethod', 'open'),
            "procurementMethodType": "belowThreshold", 
            "status": t.get('status', 'complete'), 
            "tenderID": release.get('ocid'),
            "value": map_value(t.get('value')),
            "procuringEntity": map_procuring_entity(release.get('buyer') or t.get('procuringEntity')),
            "items": map_items(t.get('items'), default_desc=t.get('title', "Imported Tender")),
            "sourceUrl": source_url,
            "submissionMethod": t.get('submissionMethod'),
            "tenderPeriod": t.get('tenderPeriod'), # Keep original periods? Or synthesize?
            # We'll use synthesized if missing, or keep original if present. 
            # Given the previous script forced synthesized, users likely want "Active" visualization.
            # But for a permanent archive, we should prefer original. 
            # I will keep original if available, but normalize.
        },
        "awards": release.get('awards', []),
        "contracts": release.get('contracts', []),
        # "bids": ... we can skip bids/tenderers for now if not critical, or map them.
    }
    
    # Clean up Awards/Contracts using helpers if needed, but release object is usually decent.
    # However, to match the UI expectations (embedded descriptions, etc), let's apply some cleanups.
    
    # Map Procuring Entity in Tender
    tender_data['tender']['procuringEntity'] = map_procuring_entity(tender_data['tender'].get('procuringEntity'))
    
    # Map Values
    tender_data['tender']['value'] = map_value(tender_data['tender'].get('value'))
    
    # Clean Items
    tender_data['tender']['items'] = map_items(tender_data['tender'].get('items'))

    return tender_data

def map_procuring_entity(pe):
    if not pe:
        return {
            "name": "Unknown Entity",
            "kind": "general",
            "identifier": {"scheme": "UA-EDR", "id": "00000000", "legalName": "Unknown"},
            "address": {"countryName": "United States", "region": "OR", "locality": "Portland", "streetAddress": "-"}
        }
    return {
        "name": pe.get('name', "Unknown"),
        "identifier": {
            "scheme": pe.get('identifier', {}).get('scheme', "UA-EDR"),
            "id": pe.get('identifier', {}).get('id', "00000000"),
            "legalName": pe.get('identifier', {}).get('legalName', pe.get('name'))
        },
        "address": {
            "countryName": pe.get('address', {}).get('countryName', "United States"),
            "region": pe.get('address', {}).get('region', "OR"),
            "locality": pe.get('address', {}).get('locality', "Portland"),
            "streetAddress": pe.get('address', {}).get('streetAddress', "-")
        }
    }

def map_value(val):
    if not val:
        return {"amount": 0, "currency": "USD"}
    return {
        "amount": float(val.get('amount', 0)),
        "currency": val.get('currency', "USD")
    }

def map_items(items, default_desc="Imported Item"):
    if not items:
        return [{
            "description": default_desc,
            "quantity": 1,
            "unit": {"name": "unit", "code": "C62"},
            "classification": {"scheme": "ДК021", "id": "45000000-7", "description": "Construction work"} 
        }]
    res = []
    for i in items:
        res.append({
            "description": i.get('description', default_desc),
            "quantity": i.get('quantity', 1),
            "unit": {"name": "unit", "code": "C62"},
            "classification": {
                "scheme": "ДК021",
                "id": "45000000-7", 
                "description": i.get('description', "Item")
            }
        })
    return res

def run_import():
    print(f"Connecting to DB: {DATABASE_URL}")
    with engine.connect() as conn:
        # Create table if not exists (via simple SQL fallback)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tenders (
                id SERIAL PRIMARY KEY,
                tender_id VARCHAR UNIQUE,
                title VARCHAR,
                data JSONB
            );
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tenders_data ON tenders USING gin (data);"))
        conn.commit()
    
    print(f"Reading {DATA_FILE}...")
    
    count = 0
    batch = []
    
    with open(DATA_FILE, 'rb') as f:
        for record in ijson.items(f, 'records.item'):
            if 'compiledRelease' not in record:
                continue
            
            release = map_decimal(record['compiledRelease'])
            tender_data = map_tender_clean(release)
            
            # Prepare row
            row = {
                "tender_id": tender_data['id'],
                "title": tender_data['tender']['title'],
                "data": json.dumps(tender_data) # jsonb expects string or dict? sqlalchemy handles dict usually.
                # Actually, with psycopg2 driver, generic JSON is fine.
            }
            # For raw SQL insert, we need string.
            # But let's use list of dicts.
            
            batch.append({
                "tender_id": row['tender_id'],
                "title": row['title'],
                "data": json.dumps(tender_data)
            })
            
            if len(batch) >= 1000:
                insert_batch(batch)
                count += len(batch)
                print(f"Imported {count} records...")
                batch = []

        if batch:
            insert_batch(batch)
            count += len(batch)
            print(f"Imported {count} records. Complete.")

def insert_batch(batch):
    # Using raw SQL for speed and simplicity
    with engine.connect() as conn:
        stmt = text("""
            INSERT INTO tenders (tender_id, title, data)
            VALUES (:tender_id, :title, :data)
            ON CONFLICT (tender_id) DO UPDATE SET
                title = EXCLUDED.title,
                data = EXCLUDED.data;
        """)
        conn.execute(stmt, batch)
        conn.commit()

if __name__ == "__main__":
    run_import()
