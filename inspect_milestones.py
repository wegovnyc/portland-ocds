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
                        if 'milestones' in c:
                             print(json.dumps(c['milestones'], indent=2))
                             count += 1
                             if count >= 3:
                                 return

if __name__ == "__main__":
    inspect()
