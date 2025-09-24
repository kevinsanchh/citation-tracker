import os
import time
from flask import Flask, jsonify
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from datetime import datetime
import pytz
from supabase import create_client, Client

# Vercel requires the app to be named 'app'
app = Flask(__name__)

# --- Initialize Supabase Client ---
# These are loaded from Vercel's environment variables
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def parse_and_format_date(date_str: str) -> str:
    """Parses '9/23/25 6:05 PM' into an ISO 8601 string for PostgreSQL."""
    try:
        # The format code for a 2-digit year is '%y'
        dt_object = datetime.strptime(date_str, "%m/%d/%y %I:%M %p")
        return dt_object.isoformat()
    except ValueError:
        print(f"Error parsing date: {date_str}")
        return None

def scrape_citation_data(citation_id):
    """
    Checks for a valid citation ID. If valid, scrapes the data and returns it as a dict.
    Returns None if the citation is invalid or an error occurs.
    """
    print(f"Checking ID: {citation_id}...")
    base_url = "https://fiu.nupark.com/v2/portal/citations#/citation/citationSelect/"
    url = f"{base_url}{citation_id}//10"
    
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=options)
    
    citation_data = None
    try:
        driver.get(url)
        time.sleep(2) 

        error_alert = driver.find_element(By.CSS_SELECTOR, "div.alert.alert-danger")
        if error_alert.get_attribute("aria-hidden") == "true":
            print(f"Valid citation found: {citation_id}")
            cells = driver.find_elements(By.CSS_SELECTOR, "tbody > tr[data-ng-repeat] > td")
            
            if len(cells) >= 7:
                # The raw date string from the website
                raw_date_str = cells[2].text
                # The parsed and formatted date for the database
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
    finally:
        driver.quit()
        
    return citation_data

@app.route('/api/scraper', methods=['GET'])
def scrape_endpoint():
    try:
        # 1. Get the latest citation number from the database
        # We order by number descending and take the first one.
        response = supabase.table('citations').select('citation_number').order('citation_number', desc=True).limit(1).execute()
        
        if response.data:
            last_known_id = int(response.data[0]['citation_number'])
        else:
            # Fallback for the very first run if the database is empty
            last_known_id = 7325173194
        
        # 2. Scrape for new citations
        ids_to_check = [str(last_known_id + i) for i in range(1, 6)]
        
        found_citations = []
        for cid in ids_to_check:
            result = scrape_citation_data(cid)
            if result:
                found_citations.append(result)

        # 3. Insert new citations into the database
        insert_count = 0
        if found_citations:
            # upsert() is great because it will insert new citations and ignore any duplicates
            # based on the primary key ('citation_number') without causing an error.
            insert_response = supabase.table('citations').upsert(found_citations).execute()
            if insert_response.data:
                insert_count = len(insert_response.data)

        est_tz = pytz.timezone('US/Eastern')
        last_checked_time = datetime.now(est_tz).strftime('%Y-%m-%d %I:%M:%S %p %Z')

        return jsonify({
            'message': f'Scrape complete. Inserted {insert_count} new citation(s).',
            'checked_range': f"{ids_to_check[0]} - {ids_to_check[-1]}",
            'lastChecked': last_checked_time,
        })

    except Exception as e:
        print(f"A critical error occurred in the scrape endpoint: {e}")
        return jsonify({"error": str(e)}), 500