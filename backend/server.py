"""
Layout Annotator — OCR + Table Detection Backend
Install: pip install pytesseract pillow fastapi uvicorn numpy transformers torch torchvision sentencepiece tiktoken
"""

import os, base64, io, time
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["KMP_DUPLICATE_LIB_OK"]   = "TRUE"

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

_tatr_processor = None
_tatr_model     = None

def load_tatr():
    global _tatr_processor, _tatr_model
    if _tatr_model is not None:
        return
    from transformers import AutoImageProcessor, TableTransformerForObjectDetection
    print("   Loading Table Transformer (TATR)...")
    t0 = time.time()
    _tatr_processor = AutoImageProcessor.from_pretrained(
    "microsoft/table-transformer-structure-recognition-v1.1-all",
    use_fast=False,
    size={"shortest_edge": 800, "longest_edge": 1333}
    )
    _tatr_model = TableTransformerForObjectDetection.from_pretrained(
        "microsoft/table-transformer-structure-recognition-v1.1-all"
    )
    _tatr_model.eval()
    print(f"   ✓ TATR ready in {time.time()-t0:.1f}s")

@asynccontextmanager
async def lifespan(app):
    try:
        pytesseract.image_to_string(Image.new("RGB", (100, 30), "white"))
        print("   ✓ Tesseract ready")
    except Exception as e:
        print(f"   ✗ Tesseract error: {e}")
    print("   ✓ Server ready\n")
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def preprocess_for_ocr(img: Image.Image) -> Image.Image:
    w, h = img.size
    if h < 100:
        scale = max(100 / h, 2.0)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    img = img.convert('L')
    img = ImageEnhance.Contrast(img).enhance(2.0)
    img = img.filter(ImageFilter.SHARPEN)
    return img

class OCRRequest(BaseModel):
    image: str
    hint: str = ""

class OCRResponse(BaseModel):
    text: str
    confidence: float
    lines: list

@app.get("/health")
def health():
    return {"status": "ok", "engines": ["tesseract-5", "tatr"]}

@app.post("/ocr", response_model=OCRResponse)
def run_ocr(req: OCRRequest):
    try:
        t0 = time.time()
        img_data = base64.b64decode(req.image.split(",")[-1])
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        img = preprocess_for_ocr(img)
        config = '--oem 3 --psm 6'
        text = pytesseract.image_to_string(img, lang='eng', config=config).strip()
        data = pytesseract.image_to_data(img, lang='eng', config=config,
                                          output_type=pytesseract.Output.DICT)
        lines, cur_words, cur_confs, prev_ln = [], [], [], -1
        for i, word in enumerate(data['text']):
            word = word.strip(); conf = int(data['conf'][i]); ln = data['line_num'][i]
            if conf < 0: continue
            if ln != prev_ln and cur_words:
                lines.append({"text": " ".join(cur_words), "confidence": round(sum(cur_confs)/len(cur_confs)/100, 3)})
                cur_words, cur_confs = [], []
            if word: cur_words.append(word); cur_confs.append(conf)
            prev_ln = ln
        if cur_words:
            lines.append({"text": " ".join(cur_words), "confidence": round(sum(cur_confs)/len(cur_confs)/100, 3)})
        avg_conf = round(sum(l['confidence'] for l in lines)/len(lines), 3) if lines else 0.0
        print(f"   OCR {time.time()-t0:.2f}s — {len(lines)} lines")
        if not text:
            return OCRResponse(text="", confidence=0.0, lines=[])
        return OCRResponse(text=text, confidence=avg_conf, lines=lines)
    except Exception as e:
        import traceback; traceback.print_exc()
        return OCRResponse(text=f"[OCR error: {str(e)}]", confidence=0.0, lines=[])

class TableDetectRequest(BaseModel):
    image: str

class TableDetectResponse(BaseModel):
    rows: int
    cols: int
    cells: list
    all_texts: list
    error: str = ""

@app.post("/detect-table", response_model=TableDetectResponse)
def detect_table(req: TableDetectRequest):
    try:
        t0 = time.time()
        load_tatr()
        import torch
        img_data = base64.b64decode(req.image.split(",")[-1])
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        img_w, img_h = img.size

        inputs = _tatr_processor(images=img, return_tensors="pt")
        with torch.no_grad():
            outputs = _tatr_model(**inputs)

        target_sizes = torch.tensor([img.size[::-1]])
        results = _tatr_processor.post_process_object_detection(
            outputs, threshold=0.5, target_sizes=target_sizes
        )[0]

        id2label = _tatr_model.config.id2label
        row_boxes, col_boxes = [], []

        for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
            b = box.tolist()
            lname = id2label[label.item()].lower()
            if "row" in lname and "header" not in lname:
                row_boxes.append(b)
            elif "column" in lname and "header" not in lname:
                col_boxes.append(b)

        if not row_boxes or not col_boxes:
            return TableDetectResponse(rows=0, cols=0, cells=[], all_texts=[],
                error="No table structure detected. Try adjusting the bounding box.")

        row_boxes_s = sorted(row_boxes, key=lambda b: b[1])
        col_boxes_s = sorted(col_boxes, key=lambda b: b[0])
        rows = len(row_boxes_s)
        cols = len(col_boxes_s)

        cells_out, all_texts = [], []
        ocr_config = '--oem 3 --psm 7'

        for r, rb in enumerate(row_boxes_s):
            for c, cb in enumerate(col_boxes_s):
                x1 = max(rb[0], cb[0]); y1 = max(rb[1], cb[1])
                x2 = min(rb[2], cb[2]); y2 = min(rb[3], cb[3])
                if x2 <= x1 or y2 <= y1:
                    continue
                cell_img  = img.crop((x1, y1, x2, y2))
                cell_proc = preprocess_for_ocr(cell_img)
                try:
                    cell_text = pytesseract.image_to_string(cell_proc, lang='eng', config=ocr_config).strip()
                except Exception:
                    cell_text = ""
                cells_out.append({
                    "row": r, "col": c, "rowspan": 1, "colspan": 1,
                    "x": round(x1/img_w, 4), "y": round(y1/img_h, 4),
                    "w": round((x2-x1)/img_w, 4), "h": round((y2-y1)/img_h, 4),
                    "text": cell_text, "confidence": 0.9,
                })
                if cell_text:
                    all_texts.append(cell_text)

        print(f"   Table detect {time.time()-t0:.2f}s — {rows}r×{cols}c — {len(cells_out)} cells")
        return TableDetectResponse(rows=rows, cols=cols, cells=cells_out, all_texts=all_texts)

    except Exception as e:
        import traceback; traceback.print_exc()
        return TableDetectResponse(rows=0, cols=0, cells=[], all_texts=[], error=str(e))

if __name__ == "__main__":
    import uvicorn
    print("\n🚀  OCR + Table Detection server → http://localhost:8000\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)