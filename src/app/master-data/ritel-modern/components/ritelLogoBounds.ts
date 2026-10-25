export interface LogoBounds {
  width: number;
  height: number;
  x: number;
  y: number;
  cropWidth: number;
  cropHeight: number;
}

// Analyze a small sample; never rewrite the uploaded image or its URL.
const cache = new Map<string, Promise<LogoBounds | null>>();

function extractBoundsFromImage(image: HTMLImageElement): LogoBounds | null {
  try {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) return null;
    const scale = Math.min(1, 512 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width,
      top = canvas.height,
      right = -1,
      bottom = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        // Retain all visible colored/dark pixels, including small taglines.
        if (
          data[i + 3] <= 8 ||
          (data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250)
        )
          continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) return null;
    const padding = Math.max(
      2,
      Math.ceil(Math.max(right - left + 1, bottom - top + 1) * 0.05)
    );
    left = Math.max(0, left - padding);
    top = Math.max(0, top - padding);
    right = Math.min(canvas.width, right + 1 + padding);
    bottom = Math.min(canvas.height, bottom + 1 + padding);
    // Leave already tightly framed images alone.
    if (
      right - left >= canvas.width * 0.9 &&
      bottom - top >= canvas.height * 0.9
    )
      return null;
    return {
      width,
      height,
      x: (left * width) / canvas.width,
      y: (top * height) / canvas.height,
      cropWidth: ((right - left) * width) / canvas.width,
      cropHeight: ((bottom - top) * height) / canvas.height,
    };
  } catch {
    // Cross-origin restrictions and unsupported images keep the original view.
    return null;
  }
}

export function measureLogoBounds(
  url: string,
  loadedImage?: HTMLImageElement | null
): Promise<LogoBounds | null> {
  const cached = cache.get(url);
  if (cached) return cached;

  if (loadedImage && loadedImage.complete && loadedImage.naturalWidth > 0) {
    const result = Promise.resolve(extractBoundsFromImage(loadedImage));
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(url, result);
    return result;
  }

  const pending = new Promise<LogoBounds | null>((resolve) => {
    const image = new Image();
    let done = false;
    const finish = (bounds: LogoBounds | null) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(bounds);
    };
    const timeout = setTimeout(() => finish(null), 10000);
    image.crossOrigin = "anonymous";
    image.onerror = () => finish(null);
    image.onload = () => finish(extractBoundsFromImage(image));
    image.src = url;
  });
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(url, pending);
  return pending;
}
