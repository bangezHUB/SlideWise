/** Longest side (px) a picked image is scaled down to before it is embedded. */
export const MAX_PICKED_IMAGE_SIDE = 1600;

export interface PickedImage {
  /** `data:` URL of the (possibly downscaled) image. */
  src: string;
  /** Natural size of the embedded image. */
  width: number;
  height: number;
}

/**
 * Size for a freshly inserted picture: the image's aspect ratio, fitted into the
 * box the user dragged out (or a default box), never larger than the box.
 */
export function fitImageBox(
  natural: { width: number; height: number },
  box: { w: number; h: number }
): { w: number; h: number } {
  if (natural.width <= 0 || natural.height <= 0) return { w: box.w, h: box.h };
  const k = Math.min(box.w / natural.width, box.h / natural.height);
  return { w: Math.max(1, Math.round(natural.width * k)), h: Math.max(1, Math.round(natural.height * k)) };
}

/** Scale `(w, h)` down so the longer side is at most `max` (never up). */
export function limitSide(w: number, h: number, max = MAX_PICKED_IMAGE_SIDE): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= max) return { w, h };
  const k = max / longest;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/**
 * Open the browser's file chooser for one image and return it as a `data:` URL
 * (large photos are scaled down; PNG / SVG / GIF keep their format). Resolves
 * `null` when the user cancels or the file isn't a readable image.
 */
export function pickImageFile(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    let settled = false;
    const done = (v: PickedImage | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(v);
    };
    input.addEventListener("cancel", () => done(null));
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      const reader = new FileReader();
      reader.onerror = () => done(null);
      reader.onload = () => {
        const original = String(reader.result);
        const img = new Image();
        img.onerror = () => done(null);
        img.onload = () => {
          const { w, h } = limitSide(img.naturalWidth, img.naturalHeight);
          const keepAsIs = w === img.naturalWidth || /svg|gif/.test(file.type);
          if (keepAsIs) return done({ src: original, width: img.naturalWidth, height: img.naturalHeight });
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return done({ src: original, width: img.naturalWidth, height: img.naturalHeight });
          ctx.drawImage(img, 0, 0, w, h);
          const type = file.type === "image/png" ? "image/png" : "image/jpeg";
          done({ src: canvas.toDataURL(type, 0.85), width: w, height: h });
        };
        img.src = original;
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
  });
}
