import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let segmenter: ImageSegmenter | null = null;

const initSegmenter = async () => {
  if (segmenter) return segmenter;
  
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
  );
  
  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
      delegate: "GPU"
    },
    runningMode: "IMAGE",
    outputCategoryMask: true,
    outputConfidenceMasks: false
  });
  
  return segmenter;
};

export const processAndRemoveBackground = async (dataUrl: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const seg = await initSegmenter();
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(dataUrl);

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Check if image already has transparency. If so, return immediately.
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let hasTransparency = false;
        for (let i = 3; i < data.length; i += 40) {
          if (data[i] < 255) {
            hasTransparency = true;
            break;
          }
        }
        
        // Even if it has transparency, they might want to use it as-is, but if they explicitly asked for segmentation, we should probably run it anyway if there's a background.
        // But let's respect existing transparent PNGs to save processing time.
        if (hasTransparency) {
          return resolve(dataUrl);
        }

        // Run MediaPipe Selfie Segmenter (or general segmenter)
        // Note: selfie_segmenter is optimized for humans, but works decently on salient objects if they are prominent.
        // Magic Touch: MediaPipe Image Segmenter returns a mask.
        const segmentationResult = seg.segment(img);
        
        if (segmentationResult.categoryMask) {
          const mask = segmentationResult.categoryMask.getAsUint8Array();
          
          // The mask contains category indices. For selfie segmenter: 0 is background, 1 is person/subject.
          for (let i = 0; i < mask.length; i++) {
            // If background (0), set alpha to 0
            if (mask[i] === 0) {
              data[i * 4 + 3] = 0;
            } else {
               // Feathering edge slightly
               // To keep it fast, we do a basic assignment.
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          
          // Apply a fast box blur on the alpha channel for anti-aliasing edges
          const width = canvas.width;
          const height = canvas.height;
          const alphaCopy = new Uint8Array(width * height);
          for (let i = 0; i < width * height; i++) alphaCopy[i] = data[i * 4 + 3];
          
          const blurRadius = 2;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (alphaCopy[y * width + x] === 0) continue; 
              if (alphaCopy[y * width + x] === 255) {
                let isEdge = false;
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                      if (alphaCopy[ny * width + nx] === 0) { isEdge = true; break; }
                    }
                  }
                  if(isEdge) break;
                }
                if (!isEdge) continue;
              }

              let sum = 0, count = 0;
              for (let dy = -blurRadius; dy <= blurRadius; dy++) {
                for (let dx = -blurRadius; dx <= blurRadius; dx++) {
                  const ny = y + dy, nx = x + dx;
                  if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                    sum += alphaCopy[ny * width + nx];
                    count++;
                  }
                }
              }
              data[(y * width + x) * 4 + 3] = sum / count;
            }
          }
          ctx.putImageData(imageData, 0, 0);

          // Auto-crop to bounding box
          let minX = width, minY = height, maxX = 0, maxY = 0;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const alpha = data[(y * width + x) * 4 + 3];
              if (alpha > 10) { // arbitrary threshold to ignore near-transparent pixels
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (minX <= maxX && minY <= maxY) {
            // Padding around the crop (optional)
            const padding = 0;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(width - 1, maxX + padding);
            maxY = Math.min(height - 1, maxY + padding);

            const cropWidth = maxX - minX + 1;
            const cropHeight = maxY - minY + 1;

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = cropWidth;
            croppedCanvas.height = cropHeight;
            const croppedCtx = croppedCanvas.getContext('2d');
            if (croppedCtx) {
              croppedCtx.putImageData(ctx.getImageData(minX, minY, cropWidth, cropHeight), 0, 0);
              resolve(croppedCanvas.toDataURL('image/png'));
              return;
            }
          }

          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(dataUrl);
        }
      } catch (err) {
        console.error("Segmentation failed", err);
        resolve(dataUrl); // Fallback to original image
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};
