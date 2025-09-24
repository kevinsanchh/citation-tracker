import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from datetime import datetime
from supabase import create_client, Client

def parse_and_format_date(date_str: str) -> str:
    """Parses '9/23/25 6:05 PM' into an ISO 8601 string for PostgreSQL."""
    try:
        dt_object = datetime.strptime(date_str, "%m/%d/%y %I:%M %p")
        return dt_object.isoformat()
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

        error_alert = driver.find_element(By.CSS_SELECTOR, "div.alert.alert-danger")
        if error_alert.get_attribute("aria-hidden") == "true":
            print(f"Valid citation found: {citation_id}")
            cells = driver.find_elements(By.CSS_SELECTOR, "tbody > tr[data-ng-repeat] > td")
            
            if len(cells) >= 7:
                raw_date_str = cells[2].text
                formatted_date = parse_and_format_date(raw_date_str)
                if formatted_date:
                    citation_data = {
                        "citation_number": cells[1].text,
                        "citation_date": formatted_date,
                        "violation": cells[5].text,
                        "location": cells[6].text
                    }
    except Exception as e:
        print(f"An error occurred while checking {citation_id}: {e}")
        
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

    # 1. Get the latest citation number from the database
    try:
        response = supabase.table('citations').select('citation_number').order('citation_number', desc=True).limit(1).execute()
        if response.data:
            last_known_id = int(response.data[0]['citation_number'])
        else:
            last_known_id = 7325173198 # Fallback for the first run
    except Exception as e:
        print(f"Error fetching last known ID from Supabase: {e}")
        return # Exit if we can't connect to the DB

    print(f"Starting scrape after last known ID: {last_known_id}")
    
    # 2. Scrape for new citations
    ids_to_check = [str(last_known_id + i) for i in range(1, 6)]
    found_citations = []
    
    # --- Setup WebDriver ---
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=options)

    try:
        for cid in ids_to_check:
            result = scrape_citation_data(driver, cid)
            if result:
                found_citations.append(result)
    finally:
        driver.quit()

    # 3. Insert new citations into the database
    if found_citations:
        print(f"Found {len(found_citations)} new citations. Inserting into database...")
        try:
            supabase.table('citations').upsert(found_citations).execute()
            print("Successfully inserted new citations.")
        except Exception as e:
            print(f"Error inserting data into Supabase: {e}")
    else:
        print("No new citations found in the checked range.")

if __name__ == "__main__":
    run_scrape()