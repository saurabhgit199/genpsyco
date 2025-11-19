#!/usr/bin/env python3
"""
Migration script to add OAuth support fields to the users table.
This script updates the database schema to support:
- OAuth providers (Google, Phone)
- Optional email and password fields
"""
import sqlite3
from pathlib import Path

# Get database path
db_path = Path(__file__).parent / "therapy_app.db"

if not db_path.exists():
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

try:
    # Check current schema
    cursor.execute("PRAGMA table_info(users)")
    columns = {row[1]: row for row in cursor.fetchall()}
    
    print("Current schema check:")
    print(f"  - email nullable: {columns.get('email', [None, None, None, None, None, None])[3] == 0}")
    print(f"  - hashed_password nullable: {columns.get('hashed_password', [None, None, None, None, None, None])[3] == 0}")
    print(f"  - auth_provider exists: {'auth_provider' in columns}")
    print(f"  - provider_id exists: {'provider_id' in columns}")
    print()
    
    # SQLite doesn't support ALTER COLUMN to change nullability directly
    # We need to recreate the table with the new schema
    
    # Step 1: Create new table with updated schema
    print("Creating new users table with updated schema...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR,
            username VARCHAR UNIQUE NOT NULL,
            hashed_password VARCHAR,
            full_name VARCHAR NOT NULL,
            role VARCHAR NOT NULL,
            created_at DATETIME,
            phone_number VARCHAR UNIQUE,
            bio TEXT,
            email_verified_at DATETIME,
            phone_verified_at DATETIME,
            auth_provider VARCHAR NOT NULL DEFAULT 'password',
            provider_id VARCHAR
        )
    """)
    
    # Step 2: Copy data from old table to new table
    print("Migrating existing data...")
    cursor.execute("""
        INSERT INTO users_new (
            id, email, username, hashed_password, full_name, role, 
            created_at, phone_number, bio, email_verified_at, 
            phone_verified_at, auth_provider, provider_id
        )
        SELECT 
            id, email, username, hashed_password, full_name, role,
            created_at, phone_number, bio, email_verified_at,
            phone_verified_at, 'password' as auth_provider, NULL as provider_id
        FROM users
    """)
    
    # Step 3: Drop old table
    print("Dropping old table...")
    cursor.execute("DROP TABLE users")
    
    # Step 4: Rename new table
    print("Renaming new table...")
    cursor.execute("ALTER TABLE users_new RENAME TO users")
    
    # Step 5: Recreate indexes
    print("Recreating indexes...")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_phone_number ON users(phone_number)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_provider_id ON users(provider_id)")
    
    # Commit changes
    conn.commit()
    print("✓ Migration completed successfully!")
    
    # Verify
    cursor.execute("PRAGMA table_info(users)")
    new_columns = {row[1]: row for row in cursor.fetchall()}
    print("\nUpdated schema:")
    print(f"  - email nullable: {new_columns.get('email', [None, None, None, None, None, None])[3] == 1}")
    print(f"  - hashed_password nullable: {new_columns.get('hashed_password', [None, None, None, None, None, None])[3] == 1}")
    print(f"  - auth_provider exists: {'auth_provider' in new_columns}")
    print(f"  - provider_id exists: {'provider_id' in new_columns}")
    
except Exception as e:
    conn.rollback()
    print(f"✗ Migration failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
finally:
    conn.close()

