import requests
import json
from datetime import datetime, timedelta

API_URL = "http://localhost:6543/api/2.4/tenders"
HEADERS = {
    "Authorization": "Basic YnJva2VyOg==",
    "Content-Type": "application/json"
}

now = datetime.now()
data = {
    "data": {
        "title": "Workflow Value Test",
        "procurementMethodType": "belowThreshold",
        "mode": "test",
        "minimalStep": {"amount": 10, "currency": "UAH", "valueAddedTaxIncluded": True},
        "value": {"amount": 1000, "currency": "UAH", "valueAddedTaxIncluded": True},
        "procuringEntity": {
             "name": "Test Entity",
             "kind": "general",
             "identifier": {"scheme": "UA-EDR", "id": "00000000", "legalName": "Test Entity"},
             "address": {"countryName": "Україна", "locality": "Kyiv", "region": "Kyiv", "streetAddress": "Street", "postalCode": "00000"},
             "contactPoint": {"name": "Contact", "telephone": "+38000"}
        },
        "items": [{
            "description": "Item 1",
            "classification": {"scheme": "ДК021", "id": "44617100-9", "description": "Cartons"},
            "unit": {"code": "KGM", "name": "kg"},
            "quantity": 1
        }],
        "enquiryPeriod": {"startDate": (now - timedelta(days=2)).isoformat(), "endDate": (now - timedelta(days=1)).isoformat()},
        "tenderPeriod": {"startDate": (now - timedelta(days=1)).isoformat(), "endDate": (now + timedelta(days=1)).isoformat()}
    }
}

# 1. Create Tender
print("Creating Tender...")
resp = requests.post(API_URL, json=data, headers=HEADERS)
if resp.status_code != 201:
    print("Failed to create tender:", resp.text)
    exit(1)
tender = resp.json()['data']
token = resp.json()['access']['token']
print(f"Tender created: {tender['id']}")

# 2. Patch to active.tendering
print("Patching to active.tendering...")
patch_url = f"{API_URL}/{tender['id']}?acc_token={token}"
# Need to set status. 
# Also might need verification of period? 
# If I force status, validation rules for periods might apply?
# Let's try forcing status.
patch_data = {"data": {"status": "active.tendering"}}
resp = requests.patch(patch_url, json=patch_data, headers=HEADERS)
print(f"Patch Status Code: {resp.status_code}")
if resp.status_code != 200:
    print(resp.text)

# 3. Create Bid
print("Creating Bid...")
bid_data = {
    "data": {
        "tenderers": [{
             "name": "Supplier 1",
             "identifier": {"scheme": "UA-EDR", "id": "11111111", "legalName": "Supplier 1 Inc"},
             "address": {"countryName": "Україна", "locality": "Kyiv", "region": "Kyiv", "streetAddress": "Street", "postalCode": "00000"},
             "contactPoint": {"name": "S. Contact", "telephone": "+38000", "email": "supplier@example.com"}
        }],
        "value": {"amount": 900, "currency": "UAH", "valueAddedTaxIncluded": True}
    }
}
HEADERS_BIDDER = {
    "Authorization": "Basic YmlkZGVyOg==",
    "Content-Type": "application/json"
}
resp = requests.post(f"{API_URL}/{tender['id']}/bids", json=bid_data, headers=HEADERS_BIDDER)
print(f"Bid Create Status: {resp.status_code}")
if resp.status_code != 201:
    print(resp.text)
else:
    bid_id = resp.json()['data']['id']
    print(f"Bid created: {bid_id}")

# 4. Patch to active.qualification
print("Patching to active.qualification...")
patch_data = {"data": {"status": "active.qualification"}}
resp = requests.patch(patch_url, json=patch_data, headers=HEADERS)
print(f"Patch Status Code: {resp.status_code}")
if resp.status_code != 200:
    print(resp.text)

# 5. Create Award
print("Creating Award...")
award_data = {
    "data": {
        "bid_id": bid_id,
        "status": "active",
        "suppliers": bid_data['data']['tenderers'],
        "value": {"amount": 900, "currency": "UAH", "valueAddedTaxIncluded": True}
    }
}
resp = requests.post(f"{API_URL}/{tender['id']}/awards?acc_token={token}", json=award_data, headers=HEADERS)
print(f"Award Create Status: {resp.status_code}")
if resp.status_code != 201:
    print(resp.text)
else:
    award_id = resp.json()['data']['id']
    print(f"Award created: {award_id}")

# 6. Patch to complete
print("Patching to complete...")
patch_data = {"data": {"status": "complete"}}
resp = requests.patch(patch_url, json=patch_data, headers=HEADERS)
print(f"Patch Status Code: {resp.status_code}")
if resp.status_code != 200:
    print(resp.text)

# 7. Verify
print("Verifying Tender...")
resp = requests.get(f"{API_URL}/{tender['id']}")
t = resp.json()['data']
print(f"Final Status: {t['status']}")
if 'awards' in t:
    print(f"Awards count: {len(t['awards'])}")
if 'bids' in t: # Bids usually hidden in responses without token? No, in complete/qualification?
    print(f"Bids count: {len(t.get('bids', []))}")
