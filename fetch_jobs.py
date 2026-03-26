import requests
import sqlite3
import time
import random
import logging
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

API_URL = os.getenv("API_URL")
COOKIE = os.getenv("COOKIE")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

if API_URL is None or TELEGRAM_BOT_TOKEN is None:
    logging.critical("CRITICAL: Environment variables not loaded. Check your .env file.")
    sys.exit(1)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Cookie": COOKIE
}

def send_telegram_message(message_text):
    """Sends a notification payload to the configured Telegram chat."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logging.error("Telegram credentials missing.")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message_text,
        "parse_mode": "HTML"
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        logging.info("Telegram notification sent.")
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to send Telegram message: {e}")

def init_db():
    try:
        conn = sqlite3.connect("jobs.db")
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS seen_jobs (
                request_id TEXT PRIMARY KEY
            )
        ''')
        conn.commit()
        conn.close()
    except Exception as e:
        logging.error(f"Database initialization failed: {e}")

def fetch_latest_job():
    """Polls the API for the latest job and processes it if unseen."""
    try:
        payload = {
            "limit": 10,
            "offset": 0,
            "query_type": "all",
            "buyer_username": ""
        }
        response = requests.post(API_URL, headers=HEADERS, json=payload, timeout=15)
        response.raise_for_status() 
        
        json_data = response.json()
        requests_list = json_data.get("data", {}).get("requests", [])
        
        if not requests_list:
            logging.info("No requests found in the API response.")
            return

        latest_job = requests_list[0]
        request_id = latest_job.get("request_id", "N/A")

        conn = sqlite3.connect("jobs.db")
        cursor = conn.cursor()
        
        cursor.execute("SELECT 1 FROM seen_jobs WHERE request_id = ?", (request_id,))
        if cursor.fetchone():
            logging.info(f"No new jobs. Last seen ID: {request_id}")
            conn.close()
            return
            
        cursor.execute("INSERT INTO seen_jobs (request_id) VALUES (?)", (request_id,))
        conn.commit()
        conn.close()

        title = latest_job.get("title", "N/A")
        budget = latest_job.get("budget", "N/A")
        created_at_ms = latest_job.get("created_at")

        if created_at_ms:
            dt = datetime.fromtimestamp(created_at_ms / 1000.0)
            formatted_date = dt.strftime("%d.%m.%Y - %H:%M:%S")
        else:
            formatted_date = "N/A"

        logging.info(f"New job logged - ID: {request_id}, Title: {title}")

        job_link = f"https://bionluk.com/alici-istekleri/{request_id}"
        telegram_message = (
            f"🚨 <b>New Job Found!</b> 🚨\n\n"
            f"📌 <b>Title:</b> {title}\n"
            f"💰 <b>Budget:</b> {budget}\n"
            f"🕒 <b>Date/Time:</b> {formatted_date}\n\n"
            f"🔗 <b>Job Link:</b> {job_link}"
        )
        send_telegram_message(telegram_message)

    except requests.exceptions.RequestException as e:
        logging.error(f"HTTP Request failed: {e}")
    except KeyError as e:
        logging.error(f"Unexpected JSON structure: {e}")
    except Exception as e:
        logging.error(f"Unexpected error: {e}")

if __name__ == "__main__":
    logging.info("Starting Bionluk job tracker...")
    init_db()
    
    while True:
        fetch_latest_job()
        
        # Random sleep to prevent rate-limiting/bans
        sleep_duration = random.randint(60, 120)
        logging.info(f"Sleeping for {sleep_duration} seconds...\n")
        time.sleep(sleep_duration)