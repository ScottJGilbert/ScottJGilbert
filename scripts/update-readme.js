// Fixed version of update-readme.js for GitHub README flexbox rendering
import fs from "fs";
import path from "path";

const API_URL = "https://scott-gilbert.vercel.app/api/fetch-skills";

async function main() {
  const readmePath = path.resolve("README.md");

  // Fetch JSON data
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Failed to fetch ${API_URL}: ${res.status}`);
  const data = await res.json();

  // Extract image URLs and optional alt text (fallback to filename)
  const htmlImages = data
    .map((item) => {
      const url = item.image_url;
      // Use last part of URL as alt if not provided
      const alt = item.alt || url.split("/").pop().split("?")[0];
      return `<img src="${url}" alt="${alt}" width="32" style="border-radius: 8px; background-color: #858585ff; padding: 8px;" />`;
    })
    .join("\n");

  // Wrap in flexbox div with no extra indentation
  const html = `<div style="display:flex; flex-wrap:wrap; gap:10px;">
${htmlImages}
</div>`;

  // Read README
  let readme = fs.readFileSync(readmePath, "utf-8");

  // Replace section between markers
  const start = "<!-- IMAGES-START -->";
  const end = "<!-- IMAGES-END -->";
  const regex = new RegExp(`\\s*${start}[\\s\\S]*?${end}\\s*`);

  const replacement = `${start}\n${html}\n${end}`;
  readme = regex.test(readme)
    ? readme.replace(regex, replacement)
    : readme + "\n\n" + replacement;

  fs.writeFileSync(readmePath, readme);
  console.log(
    "✅ README updated with images from API (flexbox, fixed formatting)"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
