#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalogPath = resolve(root, 'data.json');
const outputPath = process.argv[2] ? resolve(process.argv[2]) : null;

let catalog;
try {
  catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
} catch (error) {
  console.error(`Cannot read data.json: ${error.message}`);
  process.exit(1);
}
if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') {
  console.error('data.json must be an object of category arrays.');
  process.exit(1);
}

function suggestName(rawUrl) {
  const host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  const labels = host.split('.');
  const commonTlds = new Set(['com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'io', 'co', 'app', 'dev', 'ai', 'tv', 'to', 'me', 'ru', 'cc', 'xyz', 'top', 'site', 'online', 'studio', 'uno', 'lol', 'vc', 'sx', 'ac', 'pw', 'lt', 'in', 'icu', 'army', 'win', 'club']);
  if (labels.length > 1 && commonTlds.has(labels.at(-1))) labels.pop();
  const words = labels.join(' ').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words.replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

const suggestions = [];
let total = 0;
for (const [category, entries] of Object.entries(catalog)) {
  if (!Array.isArray(entries)) {
    console.error(`Category "${category}" is not an array.`);
    process.exitCode = 1;
    continue;
  }
  for (const [index, entry] of entries.entries()) {
    total++;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || typeof entry.url !== 'string') continue;
    let parsed;
    try {
      parsed = new URL(entry.url);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) continue;
    } catch {
      continue;
    }
    const missingName = typeof entry.name !== 'string' || !entry.name.trim();
    const missingDescription = typeof entry.description !== 'string' || !entry.description.trim();
    if (!missingName && !missingDescription) continue;
    suggestions.push({
      category,
      index,
      url: entry.url,
      currentName: typeof entry.name === 'string' ? entry.name : null,
      suggestedName: missingName ? suggestName(entry.url) : null,
      currentDescription: typeof entry.description === 'string' ? entry.description : null,
      suggestedDescription: missingDescription
        ? `Listed in the ${category} section of MovieHub. Visit the linked website to verify its current features, availability, and terms.`
        : null,
      reviewRequired: true,
      note: 'Suggestions are generated from the URL/category only; verify the site and edit manually before applying.'
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'review-only; data.json is never modified',
  totalEntries: total,
  entriesNeedingMetadataReview: suggestions.length,
  suggestions
};
const json = JSON.stringify(report, null, 2) + '\n';
if (outputPath) {
  await writeFile(outputPath, json, 'utf8');
  console.log(`Wrote ${suggestions.length} review suggestions for ${total} catalog entries to ${outputPath}`);
} else {
  process.stdout.write(json);
}
