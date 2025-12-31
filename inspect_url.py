import ijson
import json

DATA_FILE = "OCDS 2025.10.06/record-package-latest.json"

def inspect():
    with open(DATA_FILE, 'rb') as f:
        for record in ijson.items(f, 'records.item'):
            if 'compiledRelease' in record:
                rel = record['compiledRelease']
                # specific check for the user's example if possible, or just dump a record
                # User example: https://procure.portlandoregon.gov/bso/external/bidDetail.sda?docId=00002649&external=true&parentUrl=close
                
                # Check top level text dump for the domain
                # Helper for decimals
                def d_enc(o):
                    if type(o).__name__ == 'Decimal':
                        return float(o)
                    raise TypeError
                
                # Search for any URL in tender
                t = rel.get('tender', {})
                found_url = False
                
                # Check direct fields
                for k, v in t.items():
                    if isinstance(v, str) and "http" in v:
                        print(f"Found URL in tender.{k}: {v}")
                        found_url = True
                
                # Check documents
                if 'documents' in t:
                    for doc in t['documents']:
                        if 'url' in doc:
                            print(f"Found URL in tender.documents: {doc['url']} (Title: {doc.get('title')}, Type: {doc.get('documentType')})")
                            found_url = True

                if found_url:
                    print("-" * 20)
                    # Limit output
                    import sys
                    sys.exit(0)

if __name__ == "__main__":
    inspect()
