#!/usr/bin/env python3
"""
Test script to verify Twilio credentials
"""
from app.config import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

print("Testing Twilio Configuration...")
print(f"Account SID: {settings.twilio_account_sid}")
print(f"Auth Token: {settings.twilio_auth_token[:10]}...")
print(f"Phone Number: {settings.twilio_phone_number}")
print()

try:
    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    
    # Test 1: Fetch account info
    print("Test 1: Fetching account information...")
    account = client.api.accounts(settings.twilio_account_sid).fetch()
    print(f"✓ Account Name: {account.friendly_name}")
    print(f"✓ Account Status: {account.status}")
    print()
    
    # Test 2: List phone numbers
    print("Test 2: Fetching phone numbers...")
    incoming_phone_numbers = client.incoming_phone_numbers.list(limit=5)
    print(f"✓ Found {len(incoming_phone_numbers)} phone number(s)")
    for number in incoming_phone_numbers:
        print(f"  - {number.phone_number} ({number.friendly_name})")
    print()
    
    print("✓ All tests passed! Twilio credentials are valid.")
    
except TwilioRestException as e:
    print(f"✗ Twilio Error: {e.code} - {e.msg}")
    print()
    print("Possible issues:")
    print("1. Account SID is incorrect")
    print("2. Auth Token is incorrect")
    print("3. Credentials don't match")
    print()
    print("To fix:")
    print("1. Go to https://console.twilio.com/")
    print("2. Check your Account SID and Auth Token")
    print("3. Make sure you're copying the correct values")
    print("4. Update the .env file with correct credentials")
    
except Exception as e:
    print(f"✗ Error: {e}")

