#!/usr/bin/env node
// Generates the full PWA icon + Apple splash set from public/icons/icon-512.png
// Run via: pnpm --filter @workspace/khurklockd run pwa:assets

import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const ICON_DIR = path.join(ROOT, "public", "icons");
const SPLASH_DIR = path.join(ROOT, "public", "splash");
const SOURCE_PATH = path.join(ICON_DIR, "icon-512.png");
let SOURCE; // populated in main

const BRAND_BG = { r: 7, g: 8, b: 13, alpha: 1 }; // #07080D

const ICON_SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];

// Apple splash sizes (portrait, device pixels). Width x Height.
// Picked subset of common iPhone/iPad sizes per Apple HIG.
const SPLASHES = [
  { name: "iphone-se", w: 750, h: 1334 },
  { name: "iphone-14", w: 1170, h: 2532 },
  { name: "iphone-14-plus", w: 1284, h: 2778 },
  { name: "iphone-14-pro", w: 1179, h: 2556 },
  { name: "iphone-14-pro-max", w: 1290, h: 2796 },
  { name: "ipad-10-9", w: 1640, h: 2360 },
  { name: "ipad-pro-11", w: 1668, h: 2388 },
  { name: "ipad-pro-12-9", w: 2048, h: 2732 },
];

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function genIcon(size) {
  const out = path.join(ICON_DIR, `icon-${size}.png`);
  await sharp(SOURCE).resize(size, size, { fit: "cover" }).png().toFile(out);
  console.log("icon", size, "->", path.relative(ROOT, out));
}

async function loadSource() {
  SOURCE = await readFile(SOURCE_PATH);
}

async function genMaskable() {
  // Maskable: logo inset within safe zone (~80% of canvas) on brand bg.
  const size = 512;
  const safe = Math.round(size * 0.8);
  const logo = await sharp(SOURCE)
    .resize(safe, safe, { fit: "contain", background: BRAND_BG })
    .toBuffer();
  const out = path.join(ICON_DIR, "icon-maskable-512.png");
  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("maskable 512 ->", path.relative(ROOT, out));
}

async function genMonochrome() {
  // Monochrome: white silhouette on transparent bg, used for OS theming.
  const out = path.join(ICON_DIR, "icon-monochrome-512.png");
  await sharp(SOURCE)
    .resize(512, 512)
    .grayscale()
    .threshold(128)
    .negate({ alpha: false })
    .png()
    .toFile(out);
  console.log("monochrome 512 ->", path.relative(ROOT, out));
}

async function genAppleTouch() {
  const out = path.join(ICON_DIR, "apple-touch-icon.png");
  await sharp(SOURCE).resize(180, 180, { fit: "cover" }).png().toFile(out);
  console.log("apple-touch-icon (180) ->", path.relative(ROOT, out));
}

async function genSplash({ name, w, h }) {
  const logoSize = Math.round(Math.min(w, h) * 0.3);
  const logo = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: "contain", background: BRAND_BG })
    .toBuffer();
  const out = path.join(SPLASH_DIR, `${name}.png`);
  await sharp({
    create: { width: w, height: h, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("splash", name, `${w}x${h}`, "->", path.relative(ROOT, out));
}

async function main() {
  await ensureDir(ICON_DIR);
  await ensureDir(SPLASH_DIR);
  await loadSource();

  for (const size of ICON_SIZES) {
    await genIcon(size);
  }
  await genMaskable();
  await genMonochrome();
  await genAppleTouch();
  for (const splash of SPLASHES) {
    await genSplash(splash);
  }

  console.log("PWA assets generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
