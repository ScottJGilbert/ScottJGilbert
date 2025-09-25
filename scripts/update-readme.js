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

    // Fetch original image buffer
    const imageRes = await fetch(url);
    let contentType = imageRes.headers.get("content-type");

    // If content-type is missing, try to detect from file contents (magic number)
    let imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    if (!contentType) {
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (
        imageBuffer
          .slice(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      ) {
        contentType = "image/png";
      }
      // JPEG: FF D8 FF
      else if (
        imageBuffer.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      ) {
        contentType = "image/jpeg";
      }
      // SVG: starts with <svg or <?xml
      else if (
        imageBuffer.slice(0, 100).toString().includes("<svg") ||
        imageBuffer.slice(0, 100).toString().includes("<?xml")
      ) {
        contentType = "image/svg+xml";
      }
      // Add more types as needed
    }

    let inputBuffer;
    if (contentType && contentType.includes("svg")) {
      // SVG: get text and convert to buffer with utf-8 encoding
      const svgText = await imageRes.text();
      inputBuffer = Buffer.from(svgText, "utf-8");
      // Convert SVG to PNG first
      await sharp(inputBuffer)
        .resize(200, 200, { fit: "contain", background: "#f0f0f0" })
        .png()
        .toFile(outputPath);
    } else {
      // Other image types: get buffer directly
      inputBuffer = Buffer.from(await imageRes.arrayBuffer());
      await sharp(inputBuffer)
        .resize(200, 200, { fit: "contain", background: "#f0f0f0" })
        .png()
        .toFile(outputPath);
    }

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

  console.log("✅ README updated with images with gray backgrounds");
}

main().catch(console.error);
