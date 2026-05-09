"""
MedVerify — Day 1: Mock MDCN Registry Generator
Generates 200 synthetic Nigerian medical practitioner records.

Requirements:
    pip install faker
"""

import json
import random
import os
from faker import Faker

fake = Faker("en_NG")  # Nigerian locale
random.seed(42)

# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_PATH = "data/mock_registry.json"
NUM_RECORDS = 200

os.makedirs("data", exist_ok=True)

# ── Nigerian name pools (realistic) ──────────────────────────────────────────
FIRST_NAMES = [
    "Aminu", "Chioma", "Emeka", "Fatima", "Gbenga", "Hauwa", "Ibrahim",
    "Jumoke", "Kelechi", "Lawal", "Miriam", "Ngozi", "Oluwaseun", "Precious",
    "Quadri", "Rachael", "Segun", "Taiwo", "Uche", "Victoria", "Wale",
    "Xola", "Yusuf", "Zainab", "Adaeze", "Babatunde", "Chibundo", "Damilola",
    "Efosa", "Funke", "Grace", "Henry", "Ifeoma", "John", "Kolade",
]

LAST_NAMES = [
    "Bello", "Eze", "Okonkwo", "Abubakar", "Adeyemi", "Nwosu", "Ibrahim",
    "Okafor", "Aliyu", "Chukwu", "Musa", "Ogundele", "Suleiman", "Uwah",
    "Okeke", "Danjuma", "Fashola", "Gana", "Hassan", "Ihejirika", "James",
    "Kwara", "Lawan", "Mohammed", "Nwachukwu", "Olawale", "Pam", "Rabiu",
    "Shagari", "Tinubu", "Umar", "Vandu", "Waziri", "Yakubu", "Zuru",
]

SPECIALTIES = [
    "General Practice",
    "Paediatrics",
    "Internal Medicine",
    "Obstetrics & Gynaecology",
    "Surgery",
    "Psychiatry",
    "Radiology",
    "Anaesthesia",
    "Ophthalmology",
    "Dermatology",
    "Cardiology",
    "Neurology",
    "Orthopaedics",
    "Pathology",
    "Public Health",
]

STATES = [
    "Lagos", "Abuja", "Kano", "Rivers", "Oyo", "Kaduna", "Anambra",
    "Enugu", "Delta", "Borno", "Imo", "Ogun", "Plateau", "Kwara", "Edo",
]

INSTITUTIONS = [
    "University of Lagos",
    "Ahmadu Bello University",
    "University of Nigeria Nsukka",
    "Obafemi Awolowo University",
    "University of Ibadan",
    "University of Benin",
    "Bayero University Kano",
    "University of Port Harcourt",
    "Jos University Teaching Hospital",
    "Lagos University Teaching Hospital",
]

# ── Generate records ──────────────────────────────────────────────────────────
def generate_reg_number(year: int, seq: int) -> str:
    return f"MDCN/{year}/{seq:05d}"

def random_date(start_year=2000, end_year=2023) -> str:
    day = random.randint(1, 28)
    month = random.randint(1, 12)
    year = random.randint(start_year, end_year)
    return f"{day:02d}-{['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][month-1]}-{year}"

def generate_record(seq: int) -> dict:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    title = random.choice(["Dr.", "Prof.", "Dr."])  # mostly Dr.
    year = random.randint(2000, 2023)
    reg_date = random_date(year, year + 1)

    # ~5% are revoked/suspended (useful for edge case testing)
    status_roll = random.random()
    if status_roll < 0.88:
        status = "active"
    elif status_roll < 0.94:
        status = "inactive"
    else:
        status = "revoked"

    return {
        "id": seq,
        "name": f"{title} {first} {last}",
        "first_name": first,
        "last_name": last,
        "reg_number": generate_reg_number(year, seq),
        "specialty": random.choice(SPECIALTIES),
        "reg_date": reg_date,
        "expiry_date": random_date(year + 2, year + 5),
        "status": status,
        "state": random.choice(STATES),
        "institution": random.choice(INSTITUTIONS),
        "phone": f"080{random.randint(10000000, 99999999)}",
        "email": f"{first.lower()}.{last.lower()}{random.randint(1,99)}@medverify.ng",
    }


def main():
    records = [generate_record(i + 1) for i in range(NUM_RECORDS)]

    with open(OUTPUT_PATH, "w") as f:
        json.dump(records, f, indent=2)

    # Stats summary
    active = sum(1 for r in records if r["status"] == "active")
    inactive = sum(1 for r in records if r["status"] == "inactive")
    revoked = sum(1 for r in records if r["status"] == "revoked")

    print(f"✅ Registry generated → {OUTPUT_PATH}")
    print(f"   Total records : {NUM_RECORDS}")
    print(f"   Active        : {active}")
    print(f"   Inactive      : {inactive}")
    print(f"   Revoked       : {revoked}")
    print(f"\nSample record:")
    print(json.dumps(records[0], indent=4))


if __name__ == "__main__":
    main()