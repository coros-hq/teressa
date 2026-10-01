import { AVATAR } from "./validation";

/**
 * Cuts the middle square out of an image and scales it to the avatar size, in the browser, so only a
 * small square is uploaded. No library: a canvas does it. Returns WebP where the browser can make it
 * and PNG otherwise.
 */
export async function cropToSquare(file: File, size: number = AVATAR.size): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.9));
    if (blob) return blob;
    const png = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!png) throw new Error("couldn't encode");
    return png;
  } finally {
    bitmap.close();
  }
}
