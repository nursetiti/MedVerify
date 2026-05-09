"""
MedVerify — 2: CV Pipeline + Trust Scoring Engine
Uses a pretrained EfficientNet to classify credentials as clean or tampered,
then combines CV + NLP signals into a final Trust Score (0-100).

Requirements:
    pip install torch torchvision timm scikit-learn pillow opencv-python
"""

import os
import json
import glob
import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import timm

# ── Config ────────────────────────────────────────────────────────────────────
MANIFEST_PATH = "data/raw/manifest.json"
DATA_DIR = "data/raw"
MODEL_SAVE_PATH = "models/cv_model.pth"
BATCH_SIZE = 16
EPOCHS = 5          # enough for a hackathon demo
LEARNING_RATE = 1e-4
IMG_SIZE = 224
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

os.makedirs("models", exist_ok=True)
print(f"[INFO] Using device: {DEVICE}")


# ── 1. Dataset ────────────────────────────────────────────────────────────────
class CredentialDataset(Dataset):
    def __init__(self, manifest_path: str, data_dir: str, transform=None):
        with open(manifest_path) as f:
            self.manifest = json.load(f)
        self.data_dir = data_dir
        self.transform = transform

    def __len__(self):
        return len(self.manifest)

    def __getitem__(self, idx):
        entry = self.manifest[idx]
        img_path = os.path.join(self.data_dir, entry["file"])
        image = Image.open(img_path).convert("RGB")
        label = entry["label"]  # 0 = clean, 1 = tampered
        if self.transform:
            image = self.transform(image)
        return image, label


# ── 2. Transforms ─────────────────────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(5),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

eval_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])


# ── 3. Model ──────────────────────────────────────────────────────────────────
def build_model() -> nn.Module:
    """
    EfficientNetB0 pretrained on ImageNet, fine-tuned for binary classification.
    (clean=0, tampered=1)
    """
    model = timm.create_model("efficientnet_b0", pretrained=True, num_classes=2)
    return model.to(DEVICE)


# ── 4. Training ───────────────────────────────────────────────────────────────
def train_model(model, dataloader, epochs=EPOCHS):
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=2, gamma=0.5)

    model.train()
    for epoch in range(epochs):
        total_loss, correct, total = 0.0, 0, 0
        for images, labels in dataloader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        scheduler.step()
        acc = correct / total * 100
        print(f"  Epoch [{epoch+1}/{epochs}] Loss: {total_loss/len(dataloader):.4f} | Acc: {acc:.1f}%")

    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"\n✅ Model saved → {MODEL_SAVE_PATH}")
    return model


# ── 5. Inference ──────────────────────────────────────────────────────────────
def predict_single(model, image_path: str) -> dict:
    """
    Runs CV inference on one credential image.
    Returns predicted class + confidence score.
    """
    model.eval()
    img = Image.open(image_path).convert("RGB")
    tensor = eval_transform(img).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        pred_class = probs.argmax().item()
        confidence = probs[pred_class].item()

    return {
        "prediction": "tampered" if pred_class == 1 else "clean",
        "cv_authentic_confidence": round(probs[0].item(), 4),  # prob of being clean
        "cv_tampered_confidence": round(probs[1].item(), 4),
    }


# ── 6. Trust Scoring Engine ───────────────────────────────────────────────────
def compute_trust_score(cv_result: dict, nlp_result: dict) -> dict:
    """
    Combines CV + NLP signals into a single Trust Score (0–100).

    Weights:
      - CV authenticity confidence   → 40%
      - Registry match score         → 35%
      - OCR field completeness       → 15%
      - Registry status bonus/penalty→ 10%
    """
    cv_score = cv_result["cv_authentic_confidence"]  # 0–1, higher = more authentic

    registry = nlp_result.get("registry_match", {})
    nlp_score = registry.get("overall_match_score", 0.0)  # 0–1

    completeness = nlp_result.get("ocr_completeness", 0.0)  # 0–1

    # Status modifier
    reg_status = registry.get("registry_status", None)
    if reg_status == "active":
        status_score = 1.0
    elif reg_status == "inactive":
        status_score = 0.5
    elif reg_status == "revoked":
        status_score = 0.0
    else:
        status_score = 0.3  # unknown / not found

    raw_score = (
        (cv_score      * 0.40) +
        (nlp_score     * 0.35) +
        (completeness  * 0.15) +
        (status_score  * 0.10)
    )

    trust_score = round(raw_score * 100, 1)  # scale to 0–100

    # Decision thresholds
    if trust_score >= 70:
        decision = "CLEAR"
        decision_label = "✅ Payment Cleared"
    elif trust_score >= 50:
        decision = "REVIEW"
        decision_label = "⚠️ Flag for Manual Review"
    else:
        decision = "BLOCK"
        decision_label = "🚫 Payment Blocked"

    # Flags (explainability)
    flags = []
    if cv_result["cv_tampered_confidence"] > 0.5:
        flags.append("document_tampering_detected")
    if nlp_score < 0.6:
        flags.append("registry_mismatch")
    if completeness < 0.5:
        flags.append("incomplete_fields")
    if reg_status == "revoked":
        flags.append("practitioner_revoked")
    if reg_status == "inactive":
        flags.append("practitioner_inactive")
    if reg_status is None:
        flags.append("not_found_in_registry")

    return {
        "trust_score": trust_score,
        "decision": decision,
        "decision_label": decision_label,
        "flags": flags,
        "score_breakdown": {
            "cv_authenticity": round(cv_score * 40, 1),      # out of 40
            "registry_match": round(nlp_score * 35, 1),      # out of 35
            "field_completeness": round(completeness * 15, 1), # out of 15
            "registry_status": round(status_score * 10, 1),  # out of 10
        },
        "extracted_fields": nlp_result.get("extracted_fields", {}),
        "matched_record": registry.get("matched_record"),
    }


# ── 7. Full Verification Pipeline (CV + NLP → Trust Score) ───────────────────
def verify_credential(image_path: str, model, registry: list) -> dict:
    """
    The single function the FastAPI endpoint will call.
    Takes an image path, returns a full trust score report.
    """
    from nlp_pipeline import run_nlp_pipeline  # import NLP layer

    cv_result = predict_single(model, image_path)
    nlp_result = run_nlp_pipeline(image_path, registry)
    trust_report = compute_trust_score(cv_result, nlp_result)

    return {
        "image_path": image_path,
        "cv_result": cv_result,
        "nlp_result": nlp_result,
        "trust_report": trust_report,
    }


# ── 8. Main — Train + Demo ────────────────────────────────────────────────────
if __name__ == "__main__":
    # Check manifest exists
    if not os.path.exists(MANIFEST_PATH):
        print("[ERROR] manifest.json not found. Run generate_dataset.py first.")
        exit(1)

    print("[INFO] Loading dataset...")
    dataset = CredentialDataset(MANIFEST_PATH, DATA_DIR, transform=train_transform)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    print(f"[INFO] Dataset size: {len(dataset)} images")

    print("\n[INFO] Building model (EfficientNetB0)...")
    model = build_model()

    print(f"\n[INFO] Training for {EPOCHS} epochs...")
    model = train_model(model, dataloader, EPOCHS)

    # Quick inference demo on 3 samples
    print("\n[INFO] Demo inference on sample images:")
    samples = glob.glob("data/raw/clean/*.png")[:2] + glob.glob("data/raw/tampered/*.png")[:1]
    for img_path in samples:
        result = predict_single(model, img_path)
        label = "CLEAN" if "clean" in img_path else "TAMPERED"
        print(f"  [{label}] → predicted: {result['prediction']} "
              f"(authentic: {result['cv_authentic_confidence']:.2f}, "
              f"tampered: {result['cv_tampered_confidence']:.2f})")

    print("\n✅ Model trained and saved.")
    print("   Next: wire this into the FastAPI endpoint (api.py)")