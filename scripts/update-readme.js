import fs from "fs";
import path from "path";

// Your API endpoint returning JSON
const API_URL = "https://scott-gilbert.vercel.app/api/fetch-skills";

async function main() {
  const readmePath = path.resolve("README.md");

  // Fetch JSON data
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Failed to fetch ${API_URL}: ${res.status}`);
  const data = await res.json();

  console.log(data);

  // Extract image URLs
  const urls = data.map((item) => item.image_url);

  // Build HTML <img> tags (example: fixed width 200px each)
  const html = `
    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
      ${urls
        .map(
          (url) =>
            `<img src="${url}" alt="${item.name}" width="200" style="border-radius:8px;" />`
        )
        .join("\n  ")}
    </div>`;

  // Read README
  let readme = fs.readFileSync(readmePath, "utf-8");

  // Replace section between markers
  const start = "<!-- IMAGES-START -->";
  const end = "<!-- IMAGES-END -->";
  const regex = new RegExp(`${start}[\\s\\S]*${end}`);

  const replacement = `${start}\n${html}\n${end}`;
  readme = regex.test(readme)
    ? readme.replace(regex, replacement)
    : readme + "\n\n" + replacement;

  fs.writeFileSync(readmePath, readme);
  console.log("✅ README updated with images from API");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
