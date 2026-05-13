"""
MedVerify — API Layer
FastAPI endpoint that accepts a credential image and returns a trust score.
Requirements:
    pip install fastapi uvicorn python-multipart
Run:
    uvicorn api:app --reload --port 8000
Test:
    POST http://localhost:8000/verify  (with form-data: file=<image>)
"""

import io
import json
import torch
import tempfile
import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from cv_pipeline import build_model, predict_single, compute_trust_score, MODEL_SAVE_PATH
from nlp_pipeline import load_registry, run_nlp_pipeline


#Fraud Alert Config 
ALERT_THRESHOLD = 30                     # trust score below this triggers alert
ALERT_EMAIL = "authorities@mdcn.gov.ng"   # mock — to be replaced in production
SENDER_EMAIL = "alerts@medverify.ng"      # mock — to be replaced in production
FRAUD_LOG_PATH = "data/fraud_alerts.json" # local log of all alerts triggered

app = FastAPI(
    title="MedVerify API",
    description="AI-powered healthcare credential verification for Squad Hackathon 3.0",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model + registry once at startup 
print("[API] Loading registry...")
REGISTRY = load_registry()

print("[API] Loading CV model...")
MODEL = build_model()
if os.path.exists(MODEL_SAVE_PATH):
    MODEL.load_state_dict(torch.load(MODEL_SAVE_PATH, map_location="cpu"))
    MODEL.eval()
    print(f"[API] Model loaded from {MODEL_SAVE_PATH}")
else:
    print("[API] WARNING: No trained model found. Using untrained weights (run cv_pipeline.py first).")

#Fraud Alert Function 
def send_fraud_alert(trust_report: dict) -> bool:
    """
    Triggered when trust score is below ALERT_THRESHOLD (30).
    Logs the fraud case locally and simulates sending an email alert.
    In production, uncomment the smtplib block to send real emails.
    """
    extracted = trust_report.get("extracted_fields", {})
    name = extracted.get("name") or "Unknown"
    reg_number = extracted.get("reg_number") or "Unknown"
    score = trust_report["trust_score"]
    flags = ", ".join(trust_report["flags"]) or "None"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
 
    # Log to local fraud_alerts.json 
    alert_entry = {
        "timestamp": timestamp,
        "practitioner_name": name,
        "reg_number": reg_number,
        "trust_score": score,
        "decision": trust_report["decision"],
        "flags": trust_report["flags"],
        "alert_sent_to": ALERT_EMAIL,
    }
 
    os.makedirs("data", exist_ok=True)
    existing = []
    if os.path.exists(FRAUD_LOG_PATH):
        with open(FRAUD_LOG_PATH) as f:
            existing = json.load(f)
    existing.append(alert_entry)
    with open(FRAUD_LOG_PATH, "w") as f:
        json.dump(existing, f, indent=2)
 
    #Console alert (visible in terminal during demo) 
    print(f"\n{'='*55}")
    print(f"FRAUD ALERT TRIGGERED — {timestamp}")
    print(f"   Practitioner : {name}")
    print(f"   Reg Number   : {reg_number}")
    print(f"   Trust Score  : {score} / 100")
    print(f"   Flags        : {flags}")
    print(f"   Alert logged to: {FRAUD_LOG_PATH}")
    print(f"   Alert would be sent to: {ALERT_EMAIL}")
    print(f"{'='*55}\n")
 
    # ── Real email alert (uncomment in production) ────────────────────────────
    # subject = "FRAUD ALERT — Suspicious Medical Credential Detected"
    # body = f"""
    # MedVerify Fraud Alert — {timestamp}
    # Practitioner Name : {name}
    # Registration No.  : {reg_number}
    # Trust Score       : {score} / 100
    # Decision          : {trust_report['decision']}
    # Flags             : {flags}
    # This case has been automatically flagged for investigation.
    # — MedVerify Automated Alert System
    # """
    # msg = MIMEMultipart()
    # msg["From"] = SENDER_EMAIL
    # msg["To"] = ALERT_EMAIL
    # msg["Subject"] = subject
    # msg.attach(MIMEText(body, "plain"))
    # with smtplib.SMTP("smtp.gmail.com", 587) as server:
    #     server.starttls()
    #     server.login(SENDER_EMAIL, "your-app-password")
    #     server.sendmail(SENDER_EMAIL, ALERT_EMAIL, msg.as_string())
 
    return True
 
 
# Routes 
@app.get("/")
def root():
    return {"status": "MedVerify API running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": os.path.exists(MODEL_SAVE_PATH)}


@app.post("/verify")
async def verify_credential(file: UploadFile = File(...)):
    """
    Main endpoint. Accepts a credential image, returns a full trust score report.
    If trust score is below 30, automatically triggers a fraud alert.

    Response shape:
    {
        "trust_score": 78.4,
        "decision": "CLEAR",          // CLEAR | REVIEW | BLOCK
        "decision_label": "✅ Payment Cleared",
        "flags": [],
        "score_breakdown": {
            "cv_authenticity": 32.1,
            "registry_match": 28.4,
            "field_completeness": 12.0,
            "registry_status": 10.0
        },
        "extracted_fields": { ... },
        "matched_record": { ... },
        "alert_sent": false,
        "alert_message": null
    }
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG images are accepted.")

    # Save to temp file
    contents = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # Run CV pipeline
        cv_result = predict_single(MODEL, tmp_path)
        nlp_result = run_nlp_pipeline(tmp_path, REGISTRY)
        trust_report = compute_trust_score(cv_result, nlp_result)
        
         # Fraud Alert 
        alert_sent = False
        alert_message = None
        if trust_report["trust_score"] < ALERT_THRESHOLD:
            alert_sent = send_fraud_alert(trust_report)
            alert_message = "Fraud alert has been sent to MDCN authorities."

        return {
            **trust_report,
            "cv_detail": cv_result,
            "alert_sent": alert_sent,
            "alert_message": alert_message,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")

    finally:
        os.unlink(tmp_path)  # clean up temp file


@app.post("/verify/batch")
async def verify_batch(files: list[UploadFile] = File(...)):
    """Verifies multiple credentials at once. Returns list of results."""
    results = []
    for file in files:
        result = await verify_credential(file)
        results.append({"filename": file.filename, **result})
    return {"results": results, "total": len(results)}

@app.get("/fraud-alerts")
def get_fraud_alerts():
    """
    Returns all triggered fraud alerts
    """
    if not os.path.exists(FRAUD_LOG_PATH):
        return {"alerts": [], "total": 0}
    with open(FRAUD_LOG_PATH) as f:
        alerts = json.load(f)
    return {"alerts": alerts, "total": len(alerts)}