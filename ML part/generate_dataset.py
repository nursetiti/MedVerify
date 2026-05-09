"""
MedVerify — Day 1: Synthetic Credential Image Generator
Generates fake MDCN-style credential documents (clean + tampered) for training.

Requirements:
    pip install pillow reportlab numpy opencv-python
"""

import os
import json
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
import io

# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_DIR = "data/raw"
CLEAN_DIR = os.path.join(OUTPUT_DIR, "clean")
TAMPERED_DIR = os.path.join(OUTPUT_DIR, "tampered")
NUM_CLEAN = 100
NUM_TAMPERED = 100
REGISTRY_PATH = "data/mock_registry.json"

os.makedirs(CLEAN_DIR, exist_ok=True)
os.makedirs(TAMPERED_DIR, exist_ok=True)

# ── Load registry for realistic names/numbers ─────────────────────────────────
def load_registry():
    if not os.path.exists(REGISTRY_PATH):
        print(f"[WARN] Registry not found at {REGISTRY_PATH}. Run generate_registry.py first.")
        print("[INFO] Using fallback dummy data instead.")
        return [
            {"name": "Dr. Aminu Bello", "reg_number": "MDCN/2019/12345", "specialty": "General Practice", "status": "active"},
            {"name": "Dr. Chioma Eze", "reg_number": "MDCN/2020/67890", "specialty": "Paediatrics", "status": "active"},
        ]
    with open(REGISTRY_PATH) as f:
        return json.load(f)

# ── Draw a clean credential image ────────────────────────────────────────────
def draw_credential(record: dict) -> Image.Image:
    """Creates a realistic-looking MDCN credential as a PIL Image."""
    width, height = 1200, 850  # A5 landscape roughly
    img = Image.new("RGB", (width, height), color=(245, 242, 235))  # off-white parchment
    draw = ImageDraw.Draw(img)

    # Border
    draw.rectangle([10, 10, width - 10, height - 10], outline=(0, 60, 30), width=4)
    draw.rectangle([18, 18, width - 18, height - 18], outline=(0, 100, 50), width=1)

    # Header background band
    draw.rectangle([10, 10, width - 10, 100], fill=(0, 80, 40))

    # Header text
    draw.text((width // 2, 35), "FEDERAL REPUBLIC OF NIGERIA", fill="white", anchor="mm")
    draw.text((width // 2, 58), "MEDICAL AND DENTAL COUNCIL OF NIGERIA", fill=(200, 230, 200), anchor="mm")
    draw.text((width // 2, 82), "CERTIFICATE OF REGISTRATION", fill=(255, 220, 100), anchor="mm")

    # Seal circle (mock)
    seal_x, seal_y, seal_r = 700, 300, 55
    draw.ellipse([seal_x - seal_r, seal_y - seal_r, seal_x + seal_r, seal_y + seal_r],
                 outline=(0, 80, 40), width=3)
    draw.ellipse([seal_x - seal_r + 6, seal_y - seal_r + 6,
                  seal_x + seal_r - 6, seal_y + seal_r - 6],
                 outline=(0, 80, 40), width=1)
    draw.text((seal_x, seal_y - 10), "MDCN", fill=(0, 80, 40), anchor="mm")
    draw.text((seal_x, seal_y + 8), "OFFICIAL", fill=(0, 80, 40), anchor="mm")
    draw.text((seal_x, seal_y + 24), "SEAL", fill=(0, 80, 40), anchor="mm")

    # Body fields
    fields = [
        ("REGISTRANT NAME:", record["name"]),
        ("REGISTRATION NO:", record["reg_number"]),
        ("SPECIALTY:", record["specialty"]),
        ("DATE OF REGISTRATION:", record.get("reg_date", "15-JUN-2021")),
        ("STATUS:", record["status"].upper()),
        ("ISSUING AUTHORITY:", "Registrar, MDCN"),
    ]

    y_start = 130
    for label, value in fields:
        font = ImageFont.truetype("arial.ttf", size=16)
        draw.text((50, y_start), label, fill=(80, 80, 80), font=font)
        draw.text((280, y_start), value, fill=(10, 10, 10), font=font)
        draw.line([(50, y_start + 20), (650, y_start + 20)], fill=(180, 180, 180), width=1)
        y_start += 50

    # Signature line
    draw.line([(50, height - 80), (250, height - 80)], fill=(0, 0, 0), width=1)
    draw.text((50, height - 70), "Registrar's Signature", fill=(100, 100, 100), font=font)

    # Subtle noise (paper texture)
    noise = np.array(img).astype(np.int16)
    noise += np.random.randint(-6, 6, noise.shape, dtype=np.int16)
    noise = np.clip(noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(noise)

    return img


# ── Tampering functions ───────────────────────────────────────────────────────
def tamper_text_smudge(img: Image.Image) -> Image.Image:
    """Blurs a small region to simulate erased/re-typed text."""
    img = img.copy()
    x = random.randint(280, 500)
    y = random.randint(130, 350)
    region = img.crop((x, y, x + 160, y + 25))
    region = region.filter(ImageFilter.GaussianBlur(radius=3))
    img.paste(region, (x, y))
    return img


def tamper_color_shift(img: Image.Image) -> Image.Image:
    """Shifts hue slightly in a patch to simulate photoshop manipulation."""
    img = img.copy()
    arr = np.array(img)
    x, y = random.randint(200, 400), random.randint(120, 320)
    arr[y:y+30, x:x+180, 0] = np.clip(arr[y:y+30, x:x+180, 0].astype(int) + 35, 0, 255)
    return Image.fromarray(arr)


def tamper_brightness_patch(img: Image.Image) -> Image.Image:
    """Brightens a patch — simulates content pasted over original."""
    img = img.copy()
    arr = np.array(img).astype(np.int16)
    x, y = random.randint(280, 450), random.randint(130, 300)
    arr[y:y+28, x:x+200] = np.clip(arr[y:y+28, x:x+200] + 55, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))


def tamper_seal_distort(img: Image.Image) -> Image.Image:
    """Slightly blurs the seal area to simulate a copied/pasted seal."""
    img = img.copy()
    region = img.crop((640, 240, 760, 360))
    region = region.filter(ImageFilter.GaussianBlur(radius=2))
    img.paste(region, (640, 240))
    return img


TAMPER_FUNCTIONS = [
    tamper_text_smudge,
    tamper_color_shift,
    tamper_brightness_patch,
    tamper_seal_distort,
]


def apply_tampering(img: Image.Image) -> Image.Image:
    """Applies 1–2 random tampering functions."""
    funcs = random.sample(TAMPER_FUNCTIONS, k=random.randint(1, 2))
    for fn in funcs:
        img = fn(img)
    return img


# ── Main generation loop ──────────────────────────────────────────────────────
def main():
    registry = load_registry()
    manifest = []  # tracks all generated samples with labels

    print(f"[INFO] Generating {NUM_CLEAN} clean credentials...")
    for i in range(NUM_CLEAN):
        record = random.choice(registry)
        img = draw_credential(record)
        filename = f"clean_{i:04d}.png"
        path = os.path.join(CLEAN_DIR, filename)
        img.save(path)
        manifest.append({
            "file": f"clean/{filename}",
            "label": 0,  # 0 = clean/authentic
            "reg_number": record["reg_number"],
            "name": record["name"],
        })

    print(f"[INFO] Generating {NUM_TAMPERED} tampered credentials...")
    for i in range(NUM_TAMPERED):
        record = random.choice(registry)
        img = draw_credential(record)
        img = apply_tampering(img)
        filename = f"tampered_{i:04d}.png"
        path = os.path.join(TAMPERED_DIR, filename)
        img.save(path)
        manifest.append({
            "file": f"tampered/{filename}",
            "label": 1,  # 1 = tampered/forged
            "reg_number": record["reg_number"],
            "name": record["name"],
        })

    # Save manifest
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n✅ Done!")
    print(f"   Clean images    → {CLEAN_DIR}/ ({NUM_CLEAN} files)")
    print(f"   Tampered images → {TAMPERED_DIR}/ ({NUM_TAMPERED} files)")
    print(f"   Manifest        → {manifest_path}")


if __name__ == "__main__":
    main()