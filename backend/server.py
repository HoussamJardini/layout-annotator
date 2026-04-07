"""
Layout Annotator — OCR + Table Detection Backend
Install: pip install pytesseract pillow fastapi uvicorn numpy transformers torch torchvision sentencepiece tiktoken slowapi
"""

import os, base64, io, time, logging, pathlib, subprocess, sys, json as _json, tempfile
from typing import Optional
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["KMP_DUPLICATE_LIB_OK"]   = "TRUE"

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import numpy as np
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

TESSERACT_CMD   = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
ALLOWED_ORIGIN  = os.getenv("ALLOWED_ORIGIN", "http://localhost:5173")
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
MAX_IMAGE_DIM   = int(os.getenv("MAX_IMAGE_DIM", "4096"))

pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("annotator")

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

_tatr_processor = None
_tatr_model     = None

def load_tatr():
    global _tatr_processor, _tatr_model
    if _tatr_model is not None:
        return
    from transformers import AutoImageProcessor, TableTransformerForObjectDetection
    log.info("Loading Table Transformer (TATR)...")
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
    log.info(f"TATR ready in {time.time()-t0:.1f}s")

@asynccontextmanager
async def lifespan(app):
    # Warm up Tesseract
    try:
        pytesseract.image_to_string(Image.new("RGB", (100, 30), "white"))
        log.info("Tesseract ready")
    except Exception as e:
        log.error(f"Tesseract error: {e}")

    # Load TATR at startup so first request has no delay
    try:
        load_tatr()
        import torch
        dummy = Image.new("RGB", (200, 100), "white")
        inputs = _tatr_processor(images=dummy, return_tensors="pt")
        with torch.no_grad():
            _tatr_model(**inputs)
        log.info("TATR warm-up done")
    except Exception as e:
        log.error(f"TATR load error: {e}")

    log.info("Server ready")
    yield

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

def decode_and_validate_image(b64_string: str) -> Image.Image:
    raw = b64_string.split(",")[-1]
    estimated_bytes = len(raw) * 3 // 4
    if estimated_bytes > MAX_IMAGE_BYTES:
        raise ValueError(f"Image too large ({estimated_bytes // 1024}KB). Max {MAX_IMAGE_BYTES // 1024}KB.")
    img_bytes = base64.b64decode(raw)
    is_png  = img_bytes[:4] == b'\x89PNG'
    is_jpeg = img_bytes[:3] == b'\xff\xd8\xff'
    if not (is_png or is_jpeg):
        raise ValueError("Invalid image format. Only PNG and JPEG are accepted.")
    img = Image.open(io.BytesIO(img_bytes))
    if img.width > MAX_IMAGE_DIM or img.height > MAX_IMAGE_DIM:
        raise ValueError(f"Image dimensions {img.width}x{img.height} exceed max {MAX_IMAGE_DIM}px.")
    return img.convert("RGB")

def preprocess_for_ocr(img: Image.Image) -> Image.Image:
    w, h = img.size
    if h < 100:
        scale = max(100 / h, 2.0)
        new_w = min(int(w * scale), MAX_IMAGE_DIM)
        new_h = min(int(h * scale), MAX_IMAGE_DIM)
        img = img.resize((new_w, new_h), Image.LANCZOS)
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

class TableDetectRequest(BaseModel):
    image: str

class TableDetectResponse(BaseModel):
    rows: int
    cols: int
    cells: list
    all_texts: list
    error: str = ""

@app.get("/health")
def health():
    return {"status": "ok", "engines": ["tesseract-5", "tatr"]}

@app.post("/pick-file")
def pick_file():
    """Open a native OS file picker dialog via tkinter and return the selected path."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        root.update()
        path = filedialog.askopenfilename(
            title="Select Model File",
            filetypes=[
                ("Model files", "*.pt *.pth *.onnx *.weights *.cfg *.bin *.safetensors *.h5 *.pkl"),
                ("PyTorch",     "*.pt *.pth"),
                ("ONNX",        "*.onnx"),
                ("Darknet",     "*.weights *.cfg"),
                ("All files",   "*.*"),
            ],
        )
        root.destroy()
        if not path:
            return {"path": "", "dir": ""}
        resolved = str(pathlib.Path(path).resolve())
        parent   = str(pathlib.Path(resolved).parent)
        return {"path": resolved, "dir": parent}
    except Exception as e:
        return {"path": "", "dir": "", "error": str(e)}

# ── Model Config models ────────────────────────────────────────────────────────

class InspectRequest(BaseModel):
    model_path: str

class InspectResponse(BaseModel):
    framework:      str           = "Unknown"
    input_shape:    str           = "unknown"
    output_shape:   str           = "unknown"
    num_classes:    Optional[int] = None
    class_names:    list          = []
    layers_summary: str           = ""
    raw_info:       str           = ""
    error:          str           = ""

class RunModelRequest(BaseModel):
    image:           str
    model_path:      str
    translator_code: str
    device:          str   = "cpu"
    confidence:      float = 0.25

class RunModelResponse(BaseModel):
    boxes:  list = []
    error:  str  = ""
    stderr: str  = ""

# ── /models ────────────────────────────────────────────────────────────────────

MODEL_EXTS = {'.pt', '.pth', '.onnx', '.weights', '.cfg', '.pb', '.tflite', '.bin', '.h5', '.pkl', '.safetensors'}

@app.get("/models")
def list_models(dir: str = ""):
    if not dir:
        return {"files": [], "error": "No directory specified"}
    path = pathlib.Path(dir)
    if not path.exists():
        return {"files": [], "error": f"Directory not found: {dir}"}
    if not path.is_dir():
        return {"files": [], "error": f"Not a directory: {dir}"}
    files = []
    try:
        for item in sorted(path.iterdir(), key=lambda x: (x.is_dir(), x.name.lower())):
            if item.is_file() and item.suffix.lower() in MODEL_EXTS:
                try:   size = item.stat().st_size
                except: size = 0
                files.append({"name": item.name, "path": str(item.resolve()), "size": size, "ext": item.suffix.lower(), "is_dir": False})
            elif item.is_dir() and (item / "config.json").exists():
                files.append({"name": item.name + "/", "path": str(item.resolve()), "size": 0, "ext": "dir", "is_dir": True})
    except PermissionError as e:
        return {"files": files, "error": f"Permission denied: {e}"}
    return {"files": files, "error": ""}

# ── /inspect-model ─────────────────────────────────────────────────────────────

def _fmt_size(p):
    try:
        b = pathlib.Path(p).stat().st_size
        if b >= 1 << 30: return f"{b/(1<<30):.1f} GB"
        if b >= 1 << 20: return f"{b/(1<<20):.1f} MB"
        return f"{b/(1<<10):.0f} KB"
    except: return "?"

def _inspect_pytorch(path: pathlib.Path) -> dict:
    try:
        import torch
        try:
            obj = torch.load(str(path), map_location="cpu", weights_only=True)
        except Exception:
            obj = torch.load(str(path), map_location="cpu", weights_only=False)

        # Normalise to state dict
        if hasattr(obj, "state_dict"):
            sd = obj.state_dict()
        elif isinstance(obj, dict) and any(isinstance(v, torch.Tensor) for v in obj.values()):
            sd = obj
        elif isinstance(obj, dict) and "model" in obj:
            raw = obj["model"]
            sd = raw.state_dict() if hasattr(raw, "state_dict") else (raw if isinstance(raw, dict) else {})
        else:
            sd = {}

        keys = list(sd.keys()) if sd else []
        num_classes = None
        for k in reversed(keys):
            if "weight" in k and sd[k].ndim >= 1:
                num_classes = sd[k].shape[0]
                break
        summary_lines = keys[:25]
        if len(keys) > 25:
            summary_lines.append(f"... (+{len(keys)-25} more tensors)")
        return {
            "framework": "PyTorch", "input_shape": "unknown (state dict)",
            "output_shape": "unknown (state dict)", "num_classes": num_classes,
            "class_names": [], "layers_summary": "\n".join(summary_lines),
            "raw_info": f"File: {path.name}\nSize: {_fmt_size(path)}\nTensors: {len(keys)}",
        }
    except ImportError:
        return {"framework": "PyTorch", "error": "torch not installed", "input_shape": "unknown", "output_shape": "unknown", "class_names": []}
    except Exception as e:
        return {"framework": "PyTorch", "error": str(e), "input_shape": "unknown", "output_shape": "unknown", "class_names": []}

def _inspect_onnx(path: pathlib.Path) -> dict:
    try:
        import onnxruntime as ort
        sess = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
        ins  = [{"name": i.name, "shape": str(i.shape), "dtype": i.type} for i in sess.get_inputs()]
        outs = [{"name": o.name, "shape": str(o.shape), "dtype": o.type} for o in sess.get_outputs()]
        in_shape  = ins[0]["shape"]  if ins  else "unknown"
        out_shape = outs[0]["shape"] if outs else "unknown"
        summary = "Inputs:\n" + "\n".join(f"  {x}" for x in ins) + "\nOutputs:\n" + "\n".join(f"  {x}" for x in outs)
        return {
            "framework": "ONNX", "input_shape": in_shape, "output_shape": out_shape,
            "num_classes": None, "class_names": [], "layers_summary": summary,
            "raw_info": f"File: {path.name}\nSize: {_fmt_size(path)}",
        }
    except ImportError:
        return {"framework": "ONNX", "input_shape": "unknown", "output_shape": "unknown",
                "class_names": [], "raw_info": "onnxruntime not installed. Run: pip install onnxruntime"}
    except Exception as e:
        return {"framework": "ONNX", "error": str(e), "input_shape": "unknown", "output_shape": "unknown", "class_names": []}

def _inspect_darknet(path: pathlib.Path) -> dict:
    try:
        # Use sibling .cfg if a .weights file was passed
        cfg_path = path if path.suffix == ".cfg" else path.with_suffix(".cfg")
        if not cfg_path.exists():
            return {"framework": "Darknet", "input_shape": "unknown", "output_shape": "unknown",
                    "class_names": [], "raw_info": f"No .cfg found alongside {path.name}"}
        lines = cfg_path.read_text(errors="replace").splitlines()
        sections, net, classes = [], {}, None
        cur = None
        for ln in lines:
            ln = ln.strip()
            if ln.startswith("["):
                cur = ln[1:-1]; sections.append(cur)
            elif "=" in ln and cur == "net":
                k, v = ln.split("=", 1)
                net[k.strip()] = v.strip()
            elif ln.startswith("classes=") and classes is None:
                try: classes = int(ln.split("=", 1)[1].strip())
                except: pass
        w = net.get("width", "?"); h = net.get("height", "?"); ch = net.get("channels", "?")
        from collections import Counter
        counts = Counter(sections)
        summary = "\n".join(f"{k}: {v}" for k, v in sorted(counts.items(), key=lambda x: -x[1]))
        return {
            "framework": "Darknet", "input_shape": f"[1, {ch}, {h}, {w}]", "output_shape": "unknown",
            "num_classes": classes, "class_names": [], "layers_summary": summary,
            "raw_info": f"Config: {cfg_path.name}\nTotal sections: {len(sections)}",
        }
    except Exception as e:
        return {"framework": "Darknet", "error": str(e), "input_shape": "unknown", "output_shape": "unknown", "class_names": []}

def _inspect_huggingface(path: pathlib.Path) -> dict:
    try:
        cfg_file = path / "config.json" if path.is_dir() else path
        with open(cfg_file) as f:
            cfg = _json.load(f)
        model_type = cfg.get("model_type", "unknown")
        num_classes = cfg.get("num_labels", cfg.get("num_classes"))
        id2label = cfg.get("id2label", {})
        class_names = [id2label[str(i)] for i in sorted(int(k) for k in id2label)] if id2label else []
        arch = (cfg.get("architectures") or ["unknown"])[0]
        summary = f"model_type: {model_type}\narchitecture: {arch}"
        raw = _json.dumps({k: v for k, v in cfg.items() if not isinstance(v, (dict, list)) or k == "architectures"}, indent=2)
        return {
            "framework": "HuggingFace", "input_shape": "variable (processor handles it)",
            "output_shape": "variable", "num_classes": num_classes,
            "class_names": class_names[:100], "layers_summary": summary, "raw_info": raw[:1200],
        }
    except Exception as e:
        return {"framework": "HuggingFace", "error": str(e), "input_shape": "unknown", "output_shape": "unknown", "class_names": []}

@app.post("/inspect-model", response_model=InspectResponse)
def inspect_model(req: InspectRequest):
    p = pathlib.Path(req.model_path)
    if not p.exists():
        return InspectResponse(error=f"Path not found: {req.model_path}")
    ext = p.suffix.lower()
    if ext in (".pt", ".pth", ".bin", ".safetensors", ".pkl"):
        result = _inspect_pytorch(p)
    elif ext == ".onnx":
        result = _inspect_onnx(p)
    elif ext in (".weights", ".cfg"):
        result = _inspect_darknet(p)
    elif p.is_dir() or (p.name == "config.json"):
        result = _inspect_huggingface(p)
    else:
        result = {"framework": "Unknown", "input_shape": "unknown", "output_shape": "unknown",
                  "class_names": [], "raw_info": f"File: {p.name}\nSize: {_fmt_size(p)}\nExtension: {ext or '(none)'} — could not auto-detect model type."}
    fields = set(InspectResponse.model_fields) if hasattr(InspectResponse, "model_fields") else set(InspectResponse.__fields__)
    return InspectResponse(**{k: v for k, v in result.items() if k in fields})

# ── /run-model ─────────────────────────────────────────────────────────────────

_RUN_HARNESS = """
import sys, json
from PIL import Image

{code}

image_pil = Image.open(sys.argv[1]).convert('RGB')
model_path = sys.argv[2]
device     = sys.argv[3]
confidence = float(sys.argv[4])

result   = run(image_pil, model_path, device)
filtered = [b for b in result if float(b.get('confidence', 0)) >= confidence]
print(json.dumps(filtered))
"""

@app.post("/run-model", response_model=RunModelResponse)
def run_model_endpoint(req: RunModelRequest):
    # Validate and decode image
    try:
        img = decode_and_validate_image(req.image)
    except ValueError as e:
        return RunModelResponse(error=str(e))

    tmp_img = tmp_script = None
    try:
        # Write image to temp file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            img.save(f.name)
            tmp_img = f.name

        # Write harness script to temp file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
            f.write(_RUN_HARNESS.format(code=req.translator_code))
            tmp_script = f.name

        proc = subprocess.run(
            [sys.executable, tmp_script, tmp_img, req.model_path, req.device, str(req.confidence)],
            capture_output=True, text=True, timeout=120,
        )

        if proc.returncode != 0:
            return RunModelResponse(error=f"Exit code {proc.returncode}", stderr=proc.stderr[-3000:])
        try:
            boxes = _json.loads(proc.stdout)
            return RunModelResponse(boxes=boxes)
        except _json.JSONDecodeError:
            return RunModelResponse(error="Could not parse model output as JSON", stderr=proc.stdout[-500:] + proc.stderr[-500:])
    except subprocess.TimeoutExpired:
        return RunModelResponse(error="Inference timed out (120s)")
    except Exception as e:
        return RunModelResponse(error=str(e))
    finally:
        for p in (tmp_img, tmp_script):
            if p:
                try: os.unlink(p)
                except: pass

@app.post("/ocr", response_model=OCRResponse)
@limiter.limit("30/minute")
def run_ocr(req: OCRRequest, request: Request):
    try:
        t0 = time.time()
        img = decode_and_validate_image(req.image)
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
        log.info(f"OCR {time.time()-t0:.2f}s — {len(lines)} lines")
        if not text:
            return OCRResponse(text="", confidence=0.0, lines=[])
        return OCRResponse(text=text, confidence=avg_conf, lines=lines)
    except ValueError as e:
        return OCRResponse(text=f"[Error: {str(e)}]", confidence=0.0, lines=[])
    except Exception as e:
        log.error(f"OCR failed: {e}", exc_info=True)
        return OCRResponse(text="[OCR processing failed]", confidence=0.0, lines=[])

@app.post("/detect-table", response_model=TableDetectResponse)
@limiter.limit("10/minute")
def detect_table(req: TableDetectRequest, request: Request):
    try:
        t0 = time.time()
        import torch
        img = decode_and_validate_image(req.image)
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
        log.info(f"Table detect {time.time()-t0:.2f}s — {rows}r×{cols}c — {len(cells_out)} cells")
        return TableDetectResponse(rows=rows, cols=cols, cells=cells_out, all_texts=all_texts)
    except ValueError as e:
        return TableDetectResponse(rows=0, cols=0, cells=[], all_texts=[], error=str(e))
    except Exception as e:
        log.error(f"Table detect failed: {e}", exc_info=True)
        return TableDetectResponse(rows=0, cols=0, cells=[], all_texts=[], error="Table detection failed")

if __name__ == "__main__":
    import uvicorn
    log.info("Starting OCR + Table Detection server → http://localhost:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
