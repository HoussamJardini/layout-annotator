import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_CODE = `def run(image_pil, model_path, device):
    """
    YOLOv5 example — replace with your model's inference code.
    All imports must be inside the function.
    Must return: list of {x, y, w, h, label, confidence}
    """
    import torch

    # Load model (cache manually if needed for repeated calls)
    model = torch.hub.load(
        'ultralytics/yolov5', 'custom',
        path=model_path, device=device, verbose=False
    )
    model.conf = 0.25  # confidence threshold

    # Run inference
    results = model(image_pil)

    boxes = []
    for *xyxy, conf, cls in results.xyxy[0].tolist():
        x1, y1, x2, y2 = xyxy
        boxes.append({
            'x': int(x1),
            'y': int(y1),
            'w': int(x2 - x1),
            'h': int(y2 - y1),
            'label': results.names[int(cls)],
            'confidence': round(float(conf), 3),
        })
    return boxes
`

export const useModelStore = create(
  persist(
    (set) => ({
      modelDir: '',
      modelFiles: [],        // not persisted — re-fetched each session
      modelPath: null,
      modelArchitecture: null,
      translatorCode: DEFAULT_CODE,
      device: 'cpu',
      confidence: 0.25,

      setModelDir:          (dir)   => set({ modelDir: dir }),
      setModelFiles:        (files) => set({ modelFiles: files }),
      setModelPath:         (path)  => set({ modelPath: path, modelArchitecture: null }),
      setModelArchitecture: (arch)  => set({ modelArchitecture: arch }),
      setTranslatorCode:    (code)  => set({ translatorCode: code }),
      setDevice:            (dev)   => set({ device: dev }),
      setConfidence:        (val)   => set({ confidence: val }),
      resetTranslatorCode:  ()      => set({ translatorCode: DEFAULT_CODE }),
    }),
    {
      name: 'annotator_model',
      partialize: (s) => ({
        modelDir:          s.modelDir,
        modelPath:         s.modelPath,
        modelArchitecture: s.modelArchitecture,
        translatorCode:    s.translatorCode,
        device:            s.device,
        confidence:        s.confidence,
      }),
    }
  )
)
