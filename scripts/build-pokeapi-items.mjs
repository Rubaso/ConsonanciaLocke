import fs from "fs";
import path from "path";

const itemsPath =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/f-WebConsonancia/agent-tools/71585f70-f0d7-4113-8a0a-b1e4cf49823a.txt",
  );
const namesPath =
  process.argv[3] ||
  path.join(
    process.env.USERPROFILE || "",
    ".cursor/projects/f-WebConsonancia/agent-tools/b63b4d8a-cb4f-4eb3-a361-ddd6e219458d.txt",
  );

const itemsCsv = fs.readFileSync(itemsPath, "utf8");
const namesCsv = fs.readFileSync(namesPath, "utf8");

const identifiers = new Map();
for (const line of itemsCsv.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const [id, identifier] = line.split(",");
  if (!id || !identifier) continue;
  if (/^(tm|hm|tr)\d+/i.test(identifier)) continue;
  identifiers.set(id, identifier);
}

const spanish = new Map();
for (const line of namesCsv.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const match = line.match(/^(\d+),(\d+),(.*)$/);
  if (!match) continue;
  const [, id, lang, name] = match;
  if (lang !== "7") continue;
  const slug = identifiers.get(id);
  if (!slug || !name.trim()) continue;
  spanish.set(slug, name.trim());
}

const catalog = [...spanish.entries()]
  .map(([slug, name]) => ({ slug, name }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

const out = path.join("src/lib/pokeapi-item-names.json");
fs.writeFileSync(out, `${JSON.stringify(catalog)}\n`);
console.log(`wrote ${catalog.length} items to ${out}`);
