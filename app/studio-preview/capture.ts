// Draws a component into a picture, inside the sandboxed preview. No library: the component's HTML
// and the page's styles are put into an SVG (which can hold HTML), the browser draws that SVG, and
// a canvas turns it into an image. Fonts are embedded in the SVG, because a picture drawn this way
// can't load anything from outside.

export const PREVIEW_SIZE = { width: 800, height: 500, scale: 2, padding: 40 } as const;

type Font = { family: string; weight: string; data: ArrayBuffer };

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Every style rule on the page (the theme's colors, and the classes Tailwind made for the component). */
function pageCss(): string {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += `${rule.cssText}\n`;
    } catch {
      // a sheet we're not allowed to read adds nothing we need
    }
  }
  return css;
}

const fontCss = (fonts: Font[]) =>
  fonts
    .map((f) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};src:url(data:font/woff2;base64,${toBase64(f.data)}) format('woff2');}`)
    .join("");

export type CaptureOutcome = { ok: true; mime: string; data: ArrayBuffer } | { ok: false; message: string };

/**
 * `el` is the drawn component. The result is a 2x image of an 800x500 stage in the given theme,
 * with the component centered (and shrunk if it's bigger than the stage).
 */
export async function captureElement(el: HTMLElement, theme: "light" | "dark", fonts: Font[]): Promise<CaptureOutcome> {
  const { width: W, height: H, scale: S, padding: P } = PREVIEW_SIZE;
  const box = el.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return { ok: false, message: "The component has no size to draw." };
  // Big components shrink to fit. Small ones are enlarged (up to 2x) so they fill about 60% of the stage
  // instead of looking lost in it. The scaling is vector, so the result stays sharp.
  const largest = Math.min((W - P * 2) / box.width, (H - P * 2) / box.height);
  const comfortable = Math.max(1, Math.min(2, (W * 0.6) / box.width, (H * 0.6) / box.height));
  const fit = Math.min(largest, comfortable);

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.visibility = "";

  const inner = document.createElement("div");
  inner.setAttribute("style", `flex:none;width:${box.width}px;height:${box.height}px;transform:scale(${fit})`);
  inner.append(clone);

  const stage = document.createElement("div");
  stage.className = theme === "dark" ? "dark" : "";
  stage.setAttribute(
    "style",
    `width:${W}px;height:${H}px;display:flex;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;` +
      "background:var(--background);color:var(--foreground);font-family:'Outfit Variable',ui-sans-serif,system-ui,sans-serif",
  );
  stage.append(inner);

  const style = document.createElement("style");
  style.textContent = fontCss(fonts) + pageCss();
  const holder = document.createElement("div");
  holder.append(style, stage);

  // XML serialization (not outerHTML) so the result is well-formed, which an SVG requires.
  const xml = new XMLSerializer().serializeToString(holder);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${xml}</foreignObject></svg>`;

  try {
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = W * S;
    canvas.height = H * S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, message: "This browser can't draw the preview." };
    ctx.scale(S, S);
    ctx.drawImage(image, 0, 0, W, H);

    // WebP is much smaller; browsers that can't make it hand back a PNG instead.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
    const out = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!out) return { ok: false, message: "This browser couldn't save the preview." };
    return { ok: true, mime: out.type, data: await out.arrayBuffer() };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "The preview couldn't be drawn." };
  }
}
