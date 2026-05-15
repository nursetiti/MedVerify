"""
MedVerify — Day 2: NLP Extraction Layer
Extracts key fields from credential images using OCR + regex/spaCy,
then cross-references against the mock MDCN registry.

Requirements:
    pip install pytesseract spacy rapidfuzz opencv-python pillow
    python -m spacy download en_core_web_sm

    Install Tesseract binary:
    - Windows: https://github.com/UB-Mannheim/tesseract/wiki
    - Linux:   sudo apt install tesseract-ocr
    - Mac:     brew install tesseract
"""

import os
import re
import json
import cv2
import pytesseract
import numpy as np
from PIL import Image
from rapidfuzz import fuzz, process


REGISTRY_PATH = "data/mock_registry.json"


# 1. Load Registry 
def load_registry(path: str = REGISTRY_PATH) -> list:
    with open(path) as f:
        return json.load(f)


# 2. Image Preprocessing
def preprocess_image(image_path: str) -> np.ndarray:
    """
    Cleans the image before OCR:
    - Converts to grayscale
    - Denoises
    - Applies adaptive thresholding (handles uneven lighting)
    - Deskews if needed
    """
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Adaptive threshold — makes text pop even on parchment-style bg
    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )

    # Slight sharpen
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(thresh, -1, kernel)

    return sharpened


# 3. OCR 
def run_ocr(preprocessed_img: np.ndarray) -> str:
    """Runs Tesseract OCR and returns raw extracted text."""
    pil_img = Image.fromarray(preprocessed_img)
    config = "--oem 3 --psm 6"  # psm 6 = assume uniform block of text
    text = pytesseract.image_to_string(pil_img, config=config)
    return text


#  4. Field Extraction
def extract_fields(ocr_text: str) -> dict:
    """
    Uses regex patterns to extract structured fields from raw OCR text.
    Returns a dict with extracted values and confidence flags.
    """
    fields = {
        "name": None,
        "reg_number": None,
        "specialty": None,
        "reg_date": None,
        "status": None,
        "issuing_authority": None,
    }

    lines = ocr_text.upper().split("\n")
    lines = [l.strip() for l in lines if l.strip()]

    for i, line in enumerate(lines):
        # Registration number — format: MDCN/YYYY/NNNNN
        reg_match = re.search(r"MDCN[\/\\\-_|](\d{4})[\/\\\-_|](\d{4,6})", line)
        if reg_match and not fields["reg_number"]:
            fields["reg_number"] = f"MDCN/{reg_match.group(1)}/{reg_match.group(2)}"

        # Name — look for line after "REGISTRANT NAME" label
        if "REGISTRANT NAME" in line or "NAME:" in line:
            # Try same line first
            name_inline = re.sub(r"REGISTRANT\s*NAME\s*[:\-]?\s*", "", line).strip()
            if len(name_inline) > 3:
                fields["name"] = name_inline.title()
            elif i + 1 < len(lines):
                fields["name"] = lines[i + 1].title()

        # Specialty
        if "SPECIALTY" in line or "SPECIALITY" in line:
            specialty_inline = re.sub(r"SPECIALTY\s*[:\-]?\s*|SPECIALITY\s*[:\-]?\s*", "", line).strip()
            if len(specialty_inline) > 3:
                fields["specialty"] = specialty_inline.title()
            elif i + 1 < len(lines):
                fields["specialty"] = lines[i + 1].title()

        # Date
        date_match = re.search(r"\d{2}[\/\-]\w{3}[\/\-]\d{4}", line)
        if date_match and not fields["reg_date"]:
            fields["reg_date"] = date_match.group(0)

        # Status
        for status_keyword in ["ACTIVE", "INACTIVE", "REVOKED", "SUSPENDED"]:
            if status_keyword in line:
                fields["status"] = status_keyword.lower()

        # Issuing authority
        if "REGISTRAR" in line or "ISSUING" in line:
            fields["issuing_authority"] = "MDCN"

    return fields


# 5. Registry Cross-Reference
def cross_reference(extracted: dict, registry: list) -> dict:
    """
    Compares extracted fields against the mock registry.
    Returns match scores for each field and an overall match confidence.
    """
    result = {
        "reg_number_match": 0.0,
        "name_match": 0.0,
        "specialty_match": 0.0,
        "matched_record": None,
        "registry_status": None,
        "overall_match_score": 0.0,
    }

    if not extracted.get("reg_number"):
        return result  # can't match without reg number

    # Step 1: Find by reg number (exact or near-exact)
    all_reg_numbers = [r["reg_number"] for r in registry]
    reg_match = process.extractOne(
        extracted["reg_number"],
        all_reg_numbers,
        scorer=fuzz.ratio,
        score_cutoff=70,
    )

    if not reg_match:
        return result  # no registry match at all

    matched_reg_number, reg_score, _ = reg_match
    matched_record = next(r for r in registry if r["reg_number"] == matched_reg_number)

    result["reg_number_match"] = reg_score / 100.0
    result["matched_record"] = matched_record
    result["registry_status"] = matched_record["status"]

    # Step 2: Name fuzzy match
    if extracted.get("name") and matched_record.get("name"):
        name_score = fuzz.token_sort_ratio(
            extracted["name"].upper(),
            matched_record["name"].upper()
        )
        result["name_match"] = name_score / 100.0

    # Step 3: Specialty fuzzy match
    if extracted.get("specialty") and matched_record.get("specialty"):
        spec_score = fuzz.partial_ratio(
            extracted["specialty"].upper(),
            matched_record["specialty"].upper()
        )
        result["specialty_match"] = spec_score / 100.0

    # Step 4: Overall match score (weighted)
    result["overall_match_score"] = round(
        (result["reg_number_match"] * 0.5) +
        (result["name_match"] * 0.35) +
        (result["specialty_match"] * 0.15),
        4
    )

    return result


# 6. Full Pipeline
def run_nlp_pipeline(image_path: str, registry: list) -> dict:
    """
    End-to-end NLP pipeline for one credential image.
    Returns extracted fields + registry match results.
    """
    print(f"\n[NLP] Processing: {image_path}")

    preprocessed = preprocess_image(image_path)
    ocr_text = run_ocr(preprocessed)
    extracted = extract_fields(ocr_text)
    registry_result = cross_reference(extracted, registry)

    # OCR field completeness score (how many fields were found)
    filled = sum(1 for v in extracted.values() if v is not None)
    completeness = filled / len(extracted)

    return {
        "image_path": image_path,
        "extracted_fields": extracted,
        "registry_match": registry_result,
        "ocr_completeness": round(completeness, 4),
        "raw_ocr_snippet": ocr_text[:300],  # first 300 chars for debugging
    }



if __name__ == "__main__":
    import glob

    registry = load_registry()

    # Grab 5 clean + 5 tampered samples
    clean_samples = glob.glob("data/raw/clean/*.png")[:5]
    tampered_samples = glob.glob("data/raw/tampered/*.png")[:5]
    samples = clean_samples + tampered_samples

    if not samples:
        print("[ERROR] No images found. Run generate_dataset.py first.")
        exit(1)

    results = []
    for img_path in samples:
        result = run_nlp_pipeline(img_path, registry)
        results.append(result)

        print(f"  Extracted   : {result['extracted_fields']}")
        print(f"  Registry    : match={result['registry_match']['overall_match_score']:.2f}, "
              f"status={result['registry_match']['registry_status']}")
        print(f"  Completeness: {result['ocr_completeness']:.2f}")

    # Save results
    out_path = "data/nlp_results_sample.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print(f"\n✅ NLP pipeline done. Results saved to {out_path}")