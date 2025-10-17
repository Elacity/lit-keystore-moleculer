#!/usr/bin/env python3
"""
Script to fetch accounts from GraphQL API and add them as users to Lit relayer.
Handles pagination to process all available accounts in chunks.
"""

import urllib.request
import urllib.parse
import json
import sys
import argparse
from typing import List, Dict, Any
import time

# Configuration
DEFAULT_GRAPHQL_SUBDOMAIN = "staging"
DEFAULT_RELAYER_SUBDOMAIN = "datil-test"
BATCH_SIZE = 50  # Number of addresses to send per relayer request
DELAY_BETWEEN_REQUESTS = 1  # Seconds to wait between requests

# GraphQL query
GRAPHQL_QUERY = """
query FetchAccount($query: AccountQueryInput, $filters: FilterPaginationInput) {
  accounts: fetchAccounts(query: $query, filters: $filters) {
    total
    offset
    data {
      address
    }
  }
}
"""

def get_graphql_headers(graphql_subdomain: str) -> Dict[str, str]:
  """Get GraphQL headers with dynamic origin based on subdomain."""
  if graphql_subdomain:
    origin = f'https://{graphql_subdomain}.ela.city'
  else:
    origin = 'https://ela.city'
  
  return {
    'Accept-Encoding': 'gzip, deflate, br',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Origin': origin
  }

def parse_arguments():
  """Parse command line arguments."""
  parser = argparse.ArgumentParser(
    description='Fetch accounts from GraphQL API and add them as users to Lit relayer.',
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog="""
Example usage:
  python3 add-users.py --api-key your_api_key --payer-secret-key your_payer_secret_key
  python3 add-users.py -k your_api_key -p your_payer_secret_key --batch-size 100
  python3 add-users.py -k your_api_key -p your_payer_secret_key --graphql-subdomain production --relayer-subdomain datil-prod
  python3 add-users.py -k your_api_key -p your_payer_secret_key --graphql-subdomain "" --relayer-subdomain datil-prod
    """
  )
  
  parser.add_argument(
    '--api-key', '-k',
    required=True,
    help='API key for the Lit relayer'
  )
  
  parser.add_argument(
    '--payer-secret-key', '-p',
    required=True,
    help='Payer secret key for the Lit relayer'
  )
  
  parser.add_argument(
    '--batch-size', '-b',
    type=int,
    default=BATCH_SIZE,
    help=f'Number of addresses to send per batch (default: {BATCH_SIZE})'
  )
  
  parser.add_argument(
    '--delay', '-d',
    type=float,
    default=DELAY_BETWEEN_REQUESTS,
    help=f'Delay in seconds between requests (default: {DELAY_BETWEEN_REQUESTS})'
  )
  
  parser.add_argument(
    '--graphql-subdomain',
    default=DEFAULT_GRAPHQL_SUBDOMAIN,
    help=f'Subdomain for ela.city GraphQL API, empty for ela.city (default: {DEFAULT_GRAPHQL_SUBDOMAIN})'
  )
  
  parser.add_argument(
    '--relayer-subdomain',
    default=DEFAULT_RELAYER_SUBDOMAIN,
    help=f'Subdomain for relayer API (default: {DEFAULT_RELAYER_SUBDOMAIN})'
  )
  
  return parser.parse_args()

def fetch_accounts_chunk(offset: int, limit: int, graphql_url: str, graphql_subdomain: str = DEFAULT_GRAPHQL_SUBDOMAIN) -> Dict[str, Any]:
  """Fetch a chunk of accounts from the GraphQL API."""
  variables = {
    "query": {},
    "filters": {
      "offset": offset,
      "limit": limit
    }
  }
  
  payload = {
    "query": GRAPHQL_QUERY,
    "variables": variables
  }
  
  try:
    # Prepare the request
    data = json.dumps(payload).encode('utf-8')
    headers = get_graphql_headers(graphql_subdomain)
    request = urllib.request.Request(
      graphql_url,
      data=data,
      headers=headers,
      method='POST'
    )
    
    # Make the request
    with urllib.request.urlopen(request, timeout=30) as response:
      if response.status != 200:
        raise Exception(f"HTTP {response.status}: {response.reason}")
      response_data = json.loads(response.read().decode('utf-8'))
      return response_data
      
  except Exception as e:
    print(f"Error fetching accounts at offset {offset}: {e}")
    raise

def extract_addresses(response_data: Dict[str, Any]) -> List[str]:
  """Extract addresses from GraphQL response."""
  try:
    accounts_data = response_data.get('data', {}).get('accounts', {})
    addresses = []
    
    for account in accounts_data.get('data', []):
      if 'address' in account and account['address']:
        addresses.append(account['address'])
    
    return addresses
  except (KeyError, TypeError) as e:
    print(f"Error extracting addresses from response: {e}")
    return []

def add_users_to_relayer(addresses: List[str], api_key: str, payer_secret_key: str, relayer_url: str) -> bool:
  """Send addresses to the relayer to add as users."""
  headers = {
    'Content-Type': 'application/json',
    'api-key': api_key,
    'payer-secret-key': payer_secret_key
  }
  
  try:
    # Prepare the request
    data = json.dumps(addresses).encode('utf-8')
    request = urllib.request.Request(
      relayer_url,
      data=data,
      headers=headers,
      method='POST'
    )
    
    # Make the request
    with urllib.request.urlopen(request, timeout=30) as response:
      if response.status != 200:
        raise Exception(f"HTTP {response.status}: {response.reason}")
      response_data = json.loads(response.read().decode('utf-8'))
      
      print(f"Successfully added {len(addresses)} addresses to relayer")
      print(f"Response: {response_data}")
      return True
      
  except urllib.error.HTTPError as e:
    print(f"Error adding users to relayer: HTTP {e.code}: {e.reason}")
    try:
      error_body = e.read().decode('utf-8')
      print(f"Response text: {error_body}")
    except:
      pass
    return False
  except Exception as e:
    print(f"Error adding users to relayer: {e}")
    return False

def main():
  """Main function to orchestrate the process."""
  # Parse command line arguments
  args = parse_arguments()
  
  # Construct URLs from subdomains
  if args.graphql_subdomain:
    graphql_url = f"https://{args.graphql_subdomain}.ela.city/api/2.0/graphql"
  else:
    graphql_url = "https://ela.city/api/2.0/graphql"
  relayer_url = f"https://{args.relayer_subdomain}-relayer.getlit.dev/add-users"
  
  print("Starting account fetching and user addition process...")
  print(f"GraphQL URL: {graphql_url}")
  print(f"Relayer URL: {relayer_url}")
  print(f"Batch size: {args.batch_size}")
  print(f"Delay between requests: {args.delay}s")
  
  # Initialize variables
  offset = 0
  total_records = None
  
  try:
    # First, fetch initial request to get total count
    print(f"Fetching initial request to determine total records...")
    response_data = fetch_accounts_chunk(0, 1, graphql_url, args.graphql_subdomain)
    
    accounts_data = response_data.get('data', {}).get('accounts', {})
    total_records = accounts_data.get('total', 0)
    
    print(f"Total records available: {total_records}")
    
    if total_records == 0:
      print("No accounts found.")
      return
    
    # Process records in chunks using offset/limit
    chunk_size = args.batch_size
    total_chunks = (total_records + chunk_size - 1) // chunk_size
    success_count = 0
    processed_addresses = set()  # Track processed addresses to avoid duplicates
    
    print(f"\nProcessing {total_records} records in chunks of {chunk_size}...")
    
    for chunk_num in range(1, total_chunks + 1):
      offset = (chunk_num - 1) * chunk_size
      
      print(f"Fetching chunk {chunk_num}/{total_chunks} (offset: {offset}, limit: {chunk_size})...")
      
      # Fetch chunk from GraphQL
      response_data = fetch_accounts_chunk(offset, chunk_size, graphql_url, args.graphql_subdomain)
      addresses = extract_addresses(response_data)
      
      if not addresses:
        print(f"No addresses found in chunk {chunk_num}")
        continue
      
      # Filter out already processed addresses
      new_addresses = [addr for addr in addresses if addr not in processed_addresses]
      
      if not new_addresses:
        print(f"All addresses in chunk {chunk_num} already processed (duplicates)")
        continue
      
      print(f"Found {len(new_addresses)} new addresses in chunk {chunk_num}")
      
      # Send addresses directly to relayer
      if add_users_to_relayer(new_addresses, args.api_key, args.payer_secret_key, relayer_url):
        success_count += len(new_addresses)
        processed_addresses.update(new_addresses)
        print(f"Successfully processed chunk {chunk_num}")
      else:
        print(f"Failed to process chunk {chunk_num}")
      
      # Add delay between chunks
      if chunk_num < total_chunks and args.delay > 0:
        time.sleep(args.delay)
    
    print(f"\nProcess completed!")
    print(f"Total unique addresses processed: {len(processed_addresses)}")
    print(f"Successfully added: {success_count}")
    print(f"Failed: {len(processed_addresses) - success_count}")
    
  except KeyboardInterrupt:
    print("\nProcess interrupted by user.")
    sys.exit(1)
  except Exception as e:
    print(f"Unexpected error: {e}")
    sys.exit(1)

if __name__ == "__main__":
  main()
