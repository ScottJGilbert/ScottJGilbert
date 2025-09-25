import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import sharp from "sharp";

const API_URL = "https://scott-gilbert.vercel.app/api/fetch-skills";
const outputDir = path.resolve("assets/generated-images");

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function main() {
  const res = await fetch(API_URL);
  const data = await res.json();

  const htmlImages = [];

  for (const item of data) {
    const url = item.image_url;
    const alt = item.alt || url.split("/").pop().split("?")[0];
    const fileName = `${alt.replace(/\s+/g, "_")}.png`;
    const outputPath = path.join(outputDir, fileName);

    try {
      // Fetch image once
      const imageRes = await fetch(url);
      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        console.warn(`⚠️ Skipping ${url}: empty buffer`);
        continue;
      }

      // Robust SVG detection: sniff first 500 bytes
      const snippet = buffer.subarray(0, 500).toString("utf-8");
      const isSvg = snippet.includes("<svg");

      let inputBuffer;
      if (isSvg) {
        inputBuffer = Buffer.from(snippet, "utf-8");
      } else {
        inputBuffer = buffer;
      }

      // Convert to PNG with gray background
      await sharp(inputBuffer)
        .resize(200, 200, { fit: "contain", background: "#f0f0f0" })
        .png()
        .toFile(outputPath);

      htmlImages.push(
        `<img src="assets/generated-images/${fileName}" alt="${alt}" width="200" style="border-radius:8px;" />`
      );
    } catch (err) {
      console.warn(`⚠️ Failed to process ${url}: ${err.message}`);
      continue; // skip this image
    }
  }

  // Wrap in flexbox div
  const html = `<div style="display:flex; flex-wrap:wrap; gap:10px;">\n${htmlImages.join(
    "\n"
  )}\n</div>`;

  // Update README
  const readmePath = path.resolve("README.md");
  let readme = fs.readFileSync(readmePath, "utf-8");
  const start = "<!-- IMAGES-START -->";
  const end = "<!-- IMAGES-END -->";
  const regex = new RegExp(`\\s*${start}[\\s\\S]*?${end}\\s*`);
  const replacement = `${start}\n${html}\n${end}`;
  readme = regex.test(readme)
    ? readme.replace(regex, replacement)
    : readme + "\n\n" + replacement;
  fs.writeFileSync(readmePath, readme);

  console.log("✅ README updated with images (SVGs handled robustly)");
}

main().catch(console.error);
