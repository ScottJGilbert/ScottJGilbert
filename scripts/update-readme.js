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

    // Generate new image with gray background
    const text = await imageRes.text(); // get SVG XML
    await sharp(Buffer.from(text))
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

  console.log("✅ README updated with images with gray backgrounds");
}

main().catch(console.error);
