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

    // Fetch the image once
    const imageRes = await fetch(url);
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = imageRes.headers.get("content-type") || "";

    let inputBuffer;

    // Robust SVG detection
    const isSvg =
      contentType.includes("svg") || // server says SVG
      url.endsWith(".svg") || // URL ends with .svg
      buffer.subarray(0, 100).toString().includes("<svg"); // sniff first 100 bytes

    if (isSvg) {
      // Convert SVG text to buffer
      const svgText = buffer.toString("utf-8");
      inputBuffer = Buffer.from(svgText, "utf-8");
    } else {
      // Raster image
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

  console.log(
    "✅ README updated with images (SVGs always processed correctly)"
  );
}

main().catch(console.error);
