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
        "title": "Full Import Test Complete",
        "procurementMethodType": "belowThreshold",
        "status": "complete",
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
        "enquiryPeriod": {"startDate": (now + timedelta(minutes=1)).isoformat(), "endDate": (now + timedelta(days=1)).isoformat()},
        "tenderPeriod": {"startDate": (now + timedelta(days=1, minutes=1)).isoformat(), "endDate": (now + timedelta(days=2)).isoformat()},
        "bids": [{
            "id": "11111111111111111111111111111111",
            "date": now.isoformat(),
            "status": "active",
            "tenderers": [{
                 "name": "Supplier 1",
                 "identifier": {"scheme": "UA-EDR", "id": "11111111", "legalName": "Supplier 1 Inc"},
                 "address": {"countryName": "Україна", "locality": "Kyiv", "region": "Kyiv", "streetAddress": "Street", "postalCode": "00000"},
                 "contactPoint": {"name": "S. Contact", "telephone": "+38000", "email": "supplier@example.com"}
            }],
            "value": {"amount": 900, "currency": "UAH", "valueAddedTaxIncluded": True}
        }],
        "awards": [{
            "id": "22222222222222222222222222222222",
            "bid_id": "11111111111111111111111111111111",
            "status": "active",
            "date": now.isoformat(),
            "suppliers": [{
                 "name": "Supplier 1",
                 "identifier": {"scheme": "UA-EDR", "id": "11111111", "legalName": "Supplier 1 Inc"},
                 "address": {"countryName": "Україна", "locality": "Kyiv", "region": "Kyiv", "streetAddress": "Street", "postalCode": "00000"},
                 "contactPoint": {"name": "S. Contact", "telephone": "+38000", "email": "supplier@example.com"}
            }],
            "value": {"amount": 900, "currency": "UAH", "valueAddedTaxIncluded": True}
        }]
    }
}

resp = requests.post(API_URL, json=data, headers=HEADERS)
print(resp.status_code)
print(resp.text)
