import json

with open("OCDS 2025.10.06/record-package-latest.json", "r") as f:
    # Seek for "records": [
    # It's a huge file possibly. 
    # Use ijson or just read carefully?
    # I'll try to find first "compiledRelease" manually.
    content = f.read(50000) # Read 50kb
    # Find "compiledRelease"
    try:
        idx = content.index('"compiledRelease":')
        start = content.index('{', idx)
        # dumb parser: count braces
        count = 1
        i = start + 1
        while count > 0 and i < len(content):
            if content[i] == '{': count += 1
            elif content[i] == '}': count -= 1
            i += 1
        
        json_str = content[start:i]
        data = json.loads(json_str)
        print("Keys:", data.keys())
        if 'bids' in data:
            print("Bids found:", json.dumps(data['bids'], indent=2))
        else:
            print("No bids in compiledRelease")
            # Check if tender.tenderers exist
            if 'tender' in data and 'tenderers' in data['tender']:
                print("Tenderers:", len(data['tender']['tenderers']))
        
        if 'awards' in data:
            print("Awards found:", len(data['awards']))
            print(json.dumps(data['awards'][0], indent=2))
            
    except Exception as e:
        print("Error:", e)
