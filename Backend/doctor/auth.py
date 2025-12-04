import sqlite3
import hashlib
import os

DB_PATH = "doctor_auth.db"

from flask_restx import Resource
from . import ns

# Returns list of doctors
def init_doctor_db():
    """Create doctor table if not exists"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password_hash TEXT
    )
    """)
    conn.commit()
    conn.close()


def hash_password(password: str):
    """Return salted hash"""
    salt = os.getenv("DOC_SALT", "static_salt")  
    return hashlib.sha256((password + salt).encode()).hexdigest()

def get_all_doctors():
    """Return list of all doctors"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, email FROM doctors")  # you can also add name if schema updated
    rows = cursor.fetchall()
    conn.close()

    # Convert to dict
    return [{"id": r[0], "email": r[1]} for r in rows]


def register_doctor(email: str, password: str):
    """Registers doctor and returns doctor_id if successful"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO doctors (email, password_hash) VALUES (?, ?)",
            (email, hash_password(password))
        )

        conn.commit()

        # Get the newly inserted doctor's ID
        doctor_id = cursor.lastrowid

        conn.close()
        return doctor_id   # ← return ID instead of True

    except Exception as e:
        print("Registration error:", e)
        return None   # return None on failure


def verify_doctor_login(email: str, password: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT password_hash FROM doctors WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return False

    return row[0] == hash_password(password)


def get_doctor_id(email: str):
    """Return doctor ID using email"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM doctors WHERE email = ?", (email,))
    row = cursor.fetchone()

    conn.close()

    if not row:
        return None

    return row[0]
