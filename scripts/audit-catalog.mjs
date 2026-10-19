#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const file = new URL('../data.json', import.meta.url);
let catalog;
try {
  catalog = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  console.error(`FAIL: data.json is not valid JSON: ${error.message}`);
  process.exit(1);
}
if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') {
  console.error('FAIL: data.json must be an object of category arrays.');
  process.exit(1);
}

const errors = [];
const warnings = [];
const seen = new Map();
let total = 0;
for (const [category, entries] of Object.entries(catalog)) {
  if (!Array.isArray(entries)) {
    errors.push(`Category "${category}" must contain an array.`);
    continue;
  }
  for (const [index, entry] of entries.entries()) {
    total++;
    const label = `${category}[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${label}: entry must be an object.`);
      continue;
    }
    if (typeof entry.url !== 'string' || !entry.url.trim()) {
      errors.push(`${label}: missing URL.`);
      continue;
    }
    let parsed;
    try {
      parsed = new URL(entry.url);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
        throw new Error('URL must be http(s), include a hostname, and not contain credentials');
      }
    } catch (error) {
      errors.push(`${label}: invalid URL "${entry.url}" (${error.message}).`);
      continue;
    }
    parsed.hash = '';
    parsed.search = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.hostname.startsWith('www.')) parsed.hostname = parsed.hostname.slice(4);
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    const key = parsed.href;
    if (seen.has(key)) warnings.push(`Possible duplicate: ${entry.url} (also listed at ${seen.get(key)}).`);
    else seen.set(key, `${label} — ${entry.url}`);

    if (typeof entry.name !== 'string' || !entry.name.trim()) warnings.push(`${label}: missing display name.`);
    if (typeof entry.description !== 'string' || !entry.description.trim()) warnings.push(`${label}: missing description.`);
    const logo = entry.logo_url ?? entry.logo;
    if (logo && typeof logo === 'string') {
      try {
        const parsedLogo = new URL(logo);
        if (!['http:', 'https:'].includes(parsedLogo.protocol)) throw new Error('Logo URL must be http(s)');
      } catch (error) {
        errors.push(`${label}: invalid logo URL "${logo}" (${error.message}).`);
      }
    } else {
      warnings.push(`${label}: missing logo URL.`);
    }
    if (entry.tags !== undefined && (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string'))) {
      errors.push(`${label}: tags must be an array of strings when provided.`);
    }
  }
}

console.log(`Catalog audit: ${total} entries across ${Object.keys(catalog).length} categories.`);
console.log(`Errors: ${errors.length} | Warnings: ${warnings.length}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) process.exit(1);
console.log('PASS: catalog structure and URL fields are valid. Warnings do not block the build.');
