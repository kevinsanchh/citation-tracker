import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from datetime import datetime
from supabase import create_client, Client
import pytz

def parse_and_format_date(date_str: str) -> str:
    """
    Parses a naive date string (e.g., '9/23/25 6:05 PM'), localizes it to
    US/Eastern time, and returns a proper ISO 8601 string with timezone info.
    """
    try:
        # Define the timezone for Florida (handles EST/EDT)
        eastern_tz = pytz.timezone('America/New_York')
        
        # 1. Parse the string into a naive datetime object
        naive_dt = datetime.strptime(date_str, "%m/%d/%y %I:%M %p")
        
        # 2. Localize the naive datetime, making it timezone-aware
        aware_dt = eastern_tz.localize(naive_dt)
        
        # 3. Return the ISO 8601 formatted string. It will now include the correct UTC offset.
        # Example output: '2025-09-23T18:05:00-04:00'
        return aware_dt.isoformat()
    except ValueError:
        print(f"Error parsing date: {date_str}")
        return None

def scrape_citation_data(driver, citation_id):
    """Checks a citation ID using an existing webdriver instance."""
    print(f"Checking ID: {citation_id}...")
    base_url = "https://fiu.nupark.com/v2/portal/citations#/citation/citationSelect/"
    url = f"{base_url}{citation_id}//10"
    
    citation_data = None
    try:
        driver.get(url)
        time.sleep(2) 

        # The new, more reliable check: Find the results header.
        results_header = driver.find_element(By.CSS_SELECTOR, "h2.theme-brand-color")
        
        # Check if the text content is "1 Results". This is our new definition of a valid citation.
        if "1 Results" in results_header.text:
            print(f"Valid citation found: {citation_id}")
            cells = driver.find_elements(By.CSS_SELECTOR, "tbody > tr[data-ng-repeat] > td")
            
            if len(cells) >= 8:
                raw_date_str = cells[2].text
                formatted_date = parse_and_format_date(raw_date_str)
                amount = None
                try:
                    raw_amount_str = cells[7].text
                    amount = float(raw_amount_str.replace('$', '').strip())
                except (ValueError, IndexError):
                    print(f"Warning: Could not parse amount for citation {citation_id}")
                    pass

                if formatted_date:
                    citation_data = {
                        "citation_number": cells[1].text,
                        "citation_date": formatted_date,
                        "violation": cells[5].text,
                        "location": cells[6].text,
                        "amount": amount,
                    }
    except Exception as e:
        # If the h2 tag is not found or any other error occurs, we assume it's invalid.
        # We can add a more specific log if needed, but for now, this is safe.
        # print(f"An error occurred while checking {citation_id}: {e}")
        pass # Silently continue, as an error here usually means the page is invalid.
        
    return citation_data

def run_scrape():
    """The main function to be executed by GitHub Actions."""
    # --- Initialize Supabase Client ---
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set.")
        return
    supabase: Client = create_client(url, key)

    citation_series = {
        "73": 7325173198,
        "11": 1125009340,
        "04": 425039555
    }
    
    found_citations = []
    
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=options)

    try:
        for prefix, fallback_id in citation_series.items():
            print(f"\n--- Starting check for series with prefix '{prefix}' ---")
            last_known_id = 0
            try:
                response = supabase.table('citations').select('citation_number') \
                    .like('citation_number', f'{prefix}%') \
                    .order('citation_number', desc=True).limit(1).execute()
                
                if response.data:
                    last_known_id = int(response.data[0]['citation_number'])
                else:
                    last_known_id = fallback_id
                
                print(f"Starting after last known ID: {last_known_id}")

            except Exception as e:
                print(f"Error fetching last known ID for prefix '{prefix}': {e}")
                continue

            while True:
                # --- "WALKING" STATE ---
                batch_ids_to_check = []
                for i in range(1, 6):
                    next_id_num = last_known_id + i
                    next_id_str = str(next_id_num)
                    if prefix == "04":
                        batch_ids_to_check.append("0" + next_id_str)
                    else:
                        batch_ids_to_check.append(next_id_str)

                batch_results = []
                for cid in batch_ids_to_check:
                    result = scrape_citation_data(driver, cid)
                    if result:
                        batch_results.append(result)
                
                if batch_results:
                    found_citations.extend(batch_results)

                last_id_in_batch = batch_ids_to_check[-1]
                found_numbers_in_batch = {item['citation_number'] for item in batch_results}

                if last_id_in_batch in found_numbers_in_batch:
                    print(f"Last ID in batch ({last_id_in_batch}) was found. Continuing to next batch...")
                    last_known_id = int(last_id_in_batch)
                    continue # Continue the 'while' loop to the next batch
                else:
                    # --- "PROBING" STATE ---
                    print(f"Last ID in batch ({last_id_in_batch}) not found. Probing for jumps...")
                    probe_intervals = [20, 50, 100, 200] # Distances to jump ahead
                    probe_successful = False

                    for interval in probe_intervals:
                        probe_id_num = int(last_id_in_batch) + interval
                        probe_id_str = str(probe_id_num)
                        if prefix == "04":
                           probe_id_str = "0" + probe_id_str

                        result = scrape_citation_data(driver, probe_id_str)
                        if result:
                            print(f"Probe successful! Found new valid ID {result['citation_number']} at interval +{interval}.")
                            found_citations.append(result)
                            # Reset last_known_id to one before the newly found ID to restart the "walk" from there.
                            last_known_id = int(result['citation_number']) - 1
                            probe_successful = True
                            break # Exit the probe loop
                    
                    if not probe_successful:
                        print("All probes failed. Assuming no new citations for this series.")
                    
                    # In either probe case (success or fail), we are done with this series for now.
                    break # Exit the 'while' loop for this prefix.
    finally:
        driver.quit()

    # Insert all unique citations found during the entire run
    if found_citations:
        unique_citations = list({item['citation_number']: item for item in found_citations}.values())
        print(f"\nFound a total of {len(unique_citations)} unique new citations. Inserting into database...")
        try:
            supabase.table('citations').upsert(unique_citations).execute()
            print("Successfully inserted new citations.")
        except Exception as e:
            print(f"Error inserting data into Supabase: {e}")
    else:
        print("\nNo new citations found across all series.")

if __name__ == "__main__":
    run_scrape()