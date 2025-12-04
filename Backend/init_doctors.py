import os
from doctor.auth import init_doctor_db, register_doctor
from dotenv import load_dotenv

load_dotenv()

def add_default_doctors():
    """Add default doctors only if they don't exist"""
    default_doctors = [
        ("doc1@example.com", "password123"),
        ("doc2@example.com", "password123"),
        ("doc3@example.com", "password123"),
        ("doc4@example.com", "password123"),
        ("doc5@example.com", "password123"),
    ]

    for email, pwd in default_doctors:
        doctor_id = register_doctor(email, pwd)
        if doctor_id:
            print(f"Added doctor: {email}")
        else:
            print(f"Doctor {email} already exists or DB error")

if __name__ == "__main__":
    # Step 1: Create the table if it doesn't exist
    init_doctor_db()
    print("Doctor database initialized!")

    # Step 2: Add default doctors
    add_default_doctors()
    print("Default doctors added (if not already present)")
