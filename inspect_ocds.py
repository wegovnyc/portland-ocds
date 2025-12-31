import json

def extract_first_record(filepath):
    with open(filepath, 'r') as f:
        # It's likely a single line or standard JSON with newlines
        # We will read char by char to find the first record in 'records' array
        # This is simplified and brittle, assumes "records": [ { ... } ... ]
        buffer = ""
        while True:
            chunk = f.read(1024)
            if not chunk:
                break
            buffer += chunk
            # Find "records": [
            if '"records": [' in buffer:
                start_index = buffer.find('"records": [') + len('"records": [')
                buffer = buffer[start_index:]
                # Now we are inside the array. Find the first object start {
                obj_start = buffer.find('{')
                if obj_start != -1:
                    # We found the start. Now we need to find the matching closing }
                    # We need to count braces
                    brace_count = 0
                    in_string = False
                    escape = False
                    for i, char in enumerate(buffer[obj_start:]):
                        if escape:
                            escape = False
                            continue
                        if char == '\\':
                            escape = True
                            continue
                        if char == '"':
                            in_string = not in_string
                        if not in_string:
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    # Found the end
                                    json_str = buffer[obj_start:obj_start+i+1]
                                    try:
                                        print(json.dumps(json.loads(json_str), indent=2))
                                        return
                                    except:
                                        pass
                                        
extract_first_record("OCDS 2025.10.06/record-package-latest.json")
