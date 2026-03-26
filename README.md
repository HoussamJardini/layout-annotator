<div align="center">

# LayoutAnnotator

**A professional document layout annotation tool for building detection datasets.**

[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

*Built by [Houssam Jardini](https://houssamjardini.netlify.app) as part of the Document Layout Detection project.*

</div>

---

## Overview

LayoutAnnotator is a browser-based annotation workspace for labeling structural elements in document images and PDFs. It is designed to produce professional-grade datasets for training and benchmarking document layout detection models.

Draw bounding boxes around document regions (titles, paragraphs, tables, figures, etc.), transcribe their text content, build complex table structures, and export everything in multiple dataset formats — all without any backend required for core annotation.

---

## Features

| Feature | Description |
|---|---|
| **Annotation Canvas** | Draw bounding boxes with left-click drag. Right-click to pan. Scroll to zoom. Full undo/redo. |
| **Resizable Layout** | Drag the borders between sidebars and canvas to fit your workflow. |
| **Table Builder** | Auto-detect table structure with Microsoft TATR. Merge/split cells. VSCode-style autocomplete from OCR results. |
| **OCR Integration** | Tesseract 5 suggests text for each selected region with confidence scoring. |
| **Schema Editor** | Fully configurable export schema — add/remove fields per annotation and define dataset metadata. |
| **Multi-format Export** | JSON, Markdown, COCO, YOLO .txt, per-image JSON, and ZIP bundle. |
| **Folder Navigation** | Native folder picker with recursive subfolder tree. Supports PDF (page-by-page) and images. |
| **Auto-save** | All annotations, classes, and configuration persist in localStorage automatically. |

---

## Requirements

### Frontend
- [Node.js](https://nodejs.org) v18 or higher
- Chrome or Edge (required for the folder picker API)

### Backend (OCR features)
- Python 3.9+
- [Tesseract 5](https://github.com/tesseract-ocr/tesseract/releases) — Windows binary required

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/HoussamJardini/layout-annotator.git
cd layout-annotator
```

### 2. Install Tesseract (Windows)

Download and run the installer from the [official releases](https://github.com/tesseract-ocr/tesseract/releases):
```
tesseract-ocr-w64-setup-5.x.x.exe
```

Keep the default install path: `C:\Program Files\Tesseract-OCR\`

### 3. Set up the backend

The `server.py` file is located in the project root alongside `start.bat`.
```bat
python -m venv vevn
vevn\Scripts\activate
pip install fastapi uvicorn pytesseract pillow numpy transformers torch torchvision sentencepiece tiktoken
```

### 4. Install frontend dependencies
```bat
npm install
```

---

## Running the App

### One-click start (Windows)

Double-click **`start.bat`** in the project root. It will:
- Check for Node.js, Python, and Tesseract
- Create the virtual environment if it doesn't exist
- Install any missing Python packages automatically
- Install frontend dependencies if needed
- Start the OCR backend in a separate window
- Start the frontend and open the browser automatically

### Manual start

**Terminal 1 — Backend:**
```bat
vevn\Scripts\activate
python server.py
```

**Terminal 2 — Frontend:**
```bat
npm run dev
```

Then open **http://localhost:5173** in Chrome or Edge.

---

## Usage Guide

### 1. Configure label classes
Go to the **Classes** page to define your annotation labels. Each class has a name, color, and optional keyboard shortcut (press the shortcut key while annotating to switch labels instantly).

Default classes: `text_block`, `title`, `table`, `table_cell`, `header`, `footer`, `figure`, `signature`, `date`, `amount`, `logo`

### 2. Configure export schema
Go to the **Schema** page to define which fields appear in each exported annotation. Set dataset metadata (name, version, author, license). Toggle between flat and nested JSON structures.

### 3. Annotate
Go to the **Annotate** page:

1. Click **Open Folder** to load a folder of PDFs or images
2. Navigate files using the left sidebar tree
3. **Left-click drag** to draw a bounding box
4. **Right-click drag** to pan the canvas
5. **Scroll** to zoom in/out
6. Select an annotation in the right sidebar to edit its text content
7. For table regions, click **Build table structure** to open the Table Builder

**Keyboard shortcuts:**

| Key | Action |
|---|---|
| `1`–`9` | Switch label class |
| `Del` | Delete selected box |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `←` `→` | Previous / next image |

### 4. Table Builder
When a `table` region is selected, click **Build table structure**:

- Click **Auto-detect cells** to automatically detect rows, columns, and cell text using Microsoft TATR + Tesseract
- Click any cell to edit its content — type to trigger autocomplete suggestions from the OCR results
- Press **Tab** to accept the first suggestion
- Drag across cells to select a range, then use **Merge** or **Split**
- Mark cells as **Header** rows

### 5. Export
Go to the **Export** page to review your dataset before downloading:

- **JSON Preview** — view the full dataset JSON
- **Markdown** — side-by-side raw text and rendered preview
- **Edit JSON** — modify the JSON directly in-browser before export
- Toggle **COCO** and **YOLO** to include those formats in the ZIP

---

## Export Format Reference

### JSON
```json
{
  "dataset": "invoices_v1",
  "version": "1.0",
  "categories": [{ "id": 1, "name": "title", "color": "#9b59b6" }],
  "images": [{
    "id": 1,
    "file_name": "invoice_001.pdf",
    "folder": "batch_01/",
    "page": 1,
    "width": 1200,
    "height": 1600,
    "annotations": [{
      "id": 1,
      "label": "title",
      "label_id": 2,
      "bbox": [120, 80, 300, 40],
      "area": 12000,
      "text": "INVOICE"
    }]
  }]
}
```

### Markdown
```markdown
# Dataset: invoices_v1

## invoice_001.pdf — Page 1 (1200×1600)
| ID | Label | BBox | Area | Text |
|----|-------|------|------|------|
| 1  | title | [120,80,300,40] | 12000 | INVOICE |
```

### COCO
Standard COCO object detection format with `images`, `annotations`, and `categories` arrays.

### YOLO
One `.txt` file per image with normalized bounding box coordinates:
```
class_id cx cy width height
```

---



## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS + CSS custom properties |
| State management | Zustand + localStorage |
| PDF rendering | PDF.js |
| File system access | File System Access API |
| ZIP export | JSZip |
| OCR engine | Tesseract 5 (via pytesseract) |
| Table structure detection | Microsoft Table Transformer (TATR) |
| Backend | FastAPI + Uvicorn |

---

## Author

**Houssam Jardini**
- Portfolio: [houssamjardini.netlify.app](https://houssamjardini.netlify.app)
- GitHub: [github.com/HoussamJardini](https://github.com/HoussamJardini)

---

## License

MIT License — free to use, modify, and distribute.
