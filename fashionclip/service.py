"""Local FashionCLIP embedding service.

Exposes:
  GET  /                 -> {"status": "ok", "device": "...", "dims": 512}
  POST /embed/image      -> {"embedding": [... 512 floats ...]}
  POST /embed/text       -> {"embedding": [... 512 floats ...]}

Run via ./start.sh (which sets HF_HOME to ./hf-cache and activates the venv).
"""

import base64
import io
import os

import torch
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel
from transformers import CLIPModel, CLIPProcessor


MODEL_NAME = "patrickjohncyh/fashion-clip"


def pick_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


DEVICE = pick_device()
print(f"[fashionclip] loading {MODEL_NAME} on {DEVICE} (HF_HOME={os.environ.get('HF_HOME', '~/.cache/huggingface')})")

MODEL = CLIPModel.from_pretrained(MODEL_NAME).to(DEVICE).eval()
PROCESSOR = CLIPProcessor.from_pretrained(MODEL_NAME)
DIMS = MODEL.config.projection_dim  # 512 for ViT-B/32
print(f"[fashionclip] ready — projection_dim={DIMS}")


app = FastAPI(title="fashionclip-local")


class ImageRequest(BaseModel):
    image: str  # base64-encoded bytes


class TextRequest(BaseModel):
    text: str


@app.get("/")
def health():
    return {"status": "ok", "device": DEVICE, "dims": DIMS, "model": MODEL_NAME}


@app.post("/embed/image")
def embed_image(req: ImageRequest):
    try:
        raw = base64.b64decode(req.image, validate=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid base64: {e}")
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"cannot decode image: {e}")

    inputs = PROCESSOR(images=img, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        feats = MODEL.get_image_features(**inputs)
    return {"embedding": feats[0].cpu().tolist()}


@app.post("/embed/text")
def embed_text(req: TextRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is empty")
    inputs = PROCESSOR(text=[req.text], return_tensors="pt", padding=True, truncation=True).to(DEVICE)
    with torch.no_grad():
        feats = MODEL.get_text_features(**inputs)
    return {"embedding": feats[0].cpu().tolist()}
