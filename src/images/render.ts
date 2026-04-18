import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

const IMAGES_DIR = join(import.meta.dir, "..", "..", "images");

// Load font — try Inter, fall back to system font
function loadFont(): ArrayBuffer {
  const fontPaths = [
    join(import.meta.dir, "assets", "Inter-Regular.ttf"),
    join(import.meta.dir, "assets", "Inter-Bold.ttf"),
    "/System/Library/Fonts/Geneva.ttf",     // simple TTF, no variable font tables
    "/System/Library/Fonts/NewYork.ttf",    // fallback TTF
    "/System/Library/Fonts/SFNS.ttf",       // variable font — may fail on older opentype.js
    // Helvetica.ttc intentionally omitted — TTC format not supported by opentype.js
  ];

  for (const p of fontPaths) {
    if (existsSync(p)) {
      const buf = readFileSync(p);
      // Bun/Node Buffer.buffer may have an offset into a larger pool — slice it out
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }
  }

  // Last resort — create a minimal font buffer (satori requires at least one font)
  throw new Error("No system font found. Place Inter-Regular.ttf in src/images/assets/");
}

let cachedFont: ArrayBuffer | null = null;

function getFont(): ArrayBuffer {
  if (!cachedFont) {
    cachedFont = loadFont();
  }
  return cachedFont;
}

/**
 * Render a Satori virtual DOM element to a PNG buffer
 */
export async function renderToPng(element: any): Promise<Buffer> {
  const svg = await satori(element, {
    width: 600,
    height: 400,
    fonts: [
      {
        name: "Inter",
        data: getFont(),
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 600 },
  });

  const png = resvg.render();
  return Buffer.from(png.asPng());
}

/**
 * Render and save a weather card image, return the file path
 */
export async function renderWeatherCard(element: any, filename: string = "weather-card.png"): Promise<string> {
  const pngBuffer = await renderToPng(element);
  const filepath = join(IMAGES_DIR, filename);
  await Bun.write(filepath, pngBuffer);
  return filepath;
}
