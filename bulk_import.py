#!/usr/bin/env python3
import ijson
import argparse
import logging
import time
import json
import requests
from upload_ocds import transform_release_to_tender, API_URL, HEADERS

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_file(filename, limit=0):
    logger.info(f"Opening {filename}...")
    count = 0
    success = 0
    errors = 0
    
    with open(filename, 'rb') as f:
        # Stream items from "records" array
        # usage: ijson.items(file, 'records.item')
        parser = ijson.items(f, 'records.item', use_float=True)
        
        for record in parser:
            if limit > 0 and count >= limit:
                break
                
            count += 1
            if count % 100 == 0:
                logger.info(f"Processed {count} records...")

            if 'compiledRelease' not in record:
                continue

            try:
                release = record['compiledRelease']
                payload = transform_release_to_tender(release)
                
                # Use session for performance?
                response = requests.post(API_URL, json=payload, headers=HEADERS)
                
                if response.status_code == 201:
                    success += 1
                else:
                    errors += 1
                    if errors <= 10: # Log first 10 errors only
                         logger.error(f"Failed: {response.status_code} - {response.text}")
            except Exception as e:
                errors += 1
                logger.error(f"Error: {e}")

            time.sleep(0.05) # fast sleep to prevent complete overwhelm but fast throughput

    logger.info(f"Done. Total: {count}, Success: {success}, Errors: {errors}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('file', help='Path to OCDS JSON file')
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    
    process_file(args.file, args.limit)
