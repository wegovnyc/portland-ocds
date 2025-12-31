import ijson
import sys
import json

DATA_FILE = "OCDS 2025.10.06/record-package-latest.json"

def inspect():
    count = 0
    with open(DATA_FILE, 'rb') as f:
        for record in ijson.items(f, 'records.item'):
            if 'compiledRelease' in record:
                rel = record['compiledRelease']
                if 'contracts' in rel:
                    for c in rel['contracts']:
                        # Check for missing fields
                        has_metrics = 'agreedMetrics' in c
                        has_impl = 'implementation' in c and 'purchaseOrders' in c.get('implementation', {})
                        
                        if has_metrics:
                            print(f"Contract Found with agreedMetrics:")
                            print(json.dumps(c['agreedMetrics'], indent=2))
                            count += 1

                        if has_impl:
                             print("Contract Found with Purchase Orders:")
                             # Print first PO
                             print(json.dumps(c['implementation']['purchaseOrders'][0], indent=2))
                             count += 1
                
                if count >= 3:
                     return

if __name__ == "__main__":
    inspect()
