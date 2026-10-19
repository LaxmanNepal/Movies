#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalogPath = resolve(root, 'data.json');
const outputDir = resolve(process.argv[2] || root);
const htmlPath = resolve(outputDir, 'catalog-intelligence.html');
const jsonPath = resolve(outputDir, 'catalog-intelligence.json');

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
if (!catalog || Array.isArray(catalog) || typeof catalog !== 'object') {
  throw new Error('data.json must be an object of category arrays.');
}
const rows = [];
const seen = new Map();
const categories = {};
function safeUrl(value) {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password ? u : null;
  } catch { return null; }
}
function normalizedUrl(value) {
  const u = safeUrl(value);
  if (!u) return null;
  u.hash = ''; u.search = '';
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  u.pathname = u.pathname.replace(/\/+$/, '') || '/';
  return u.href;
}
for (const [category, entries] of Object.entries(catalog)) {
  if (!Array.isArray(entries)) throw new Error(`Category "${category}" must be an array.`);
  categories[category] = { total: entries.length, missingName: 0, missingDescription: 0, missingLogo: 0, duplicateUrl: 0, invalidUrl: 0, invalidLogo: 0 };
  entries.forEach((entry, index) => {
    const issues = [];
    const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
    if (typeof item.name !== 'string' || !item.name.trim()) { issues.push('Missing name'); categories[category].missingName++; }
    if (typeof item.description !== 'string' || !item.description.trim()) { issues.push('Missing description'); categories[category].missingDescription++; }
    const logo = item.logo_url ?? item.logo;
    if (typeof logo !== 'string' || !logo.trim()) { issues.push('Missing logo'); categories[category].missingLogo++; }
    else if (!safeUrl(logo)) { issues.push('Invalid logo URL'); categories[category].invalidLogo++; }
    const parsed = typeof item.url === 'string' ? safeUrl(item.url) : null;
    if (!parsed) { issues.push('Invalid URL'); categories[category].invalidUrl++; }
    let duplicateOf = null;
    const key = typeof item.url === 'string' ? normalizedUrl(item.url) : null;
    if (key && seen.has(key)) {
      duplicateOf = seen.get(key);
      issues.push('Possible duplicate URL');
      categories[category].duplicateUrl++;
    } else if (key) seen.set(key, `${category}[${index}]`);
    if (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.some(tag => typeof tag !== 'string'))) issues.push('Invalid tags');
    rows.push({
      category, index, name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : '',
      url: typeof item.url === 'string' ? item.url : '', logo: typeof logo === 'string' ? logo : '',
      description: typeof item.description === 'string' ? item.description : '',
      issues, duplicateOf
    });
  });
}
const totals = {
  entries: rows.length,
  categories: Object.keys(categories).length,
  entriesWithIssues: rows.filter(r => r.issues.length).length,
  missingName: rows.filter(r => r.issues.includes('Missing name')).length,
  missingDescription: rows.filter(r => r.issues.includes('Missing description')).length,
  missingLogo: rows.filter(r => r.issues.includes('Missing logo')).length,
  duplicateUrl: rows.filter(r => r.issues.includes('Possible duplicate URL')).length,
  invalidUrl: rows.filter(r => r.issues.includes('Invalid URL')).length,
  invalidLogo: rows.filter(r => r.issues.includes('Invalid logo URL')).length
};
const report = { generatedAt: new Date().toISOString(), source: 'data.json', note: 'Review aid only. Does not check whether sites are online or whether their content is authorized, and does not modify data.json.', totals, categories, entries: rows };
await (await import('node:fs/promises')).mkdir(outputDir, { recursive: true });
await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metric = (label, value) => `<article class="metric"><span>${esc(label)}</span><strong>${value}</strong></article>`;
const categoryRows = Object.entries(categories).map(([name, c]) => `<tr><td>${esc(name)}</td><td>${c.total}</td><td>${c.missingName}</td><td>${c.missingDescription}</td><td>${c.missingLogo}</td><td>${c.duplicateUrl}</td><td>${c.invalidUrl + c.invalidLogo}</td></tr>`).join('');
const detailRows = rows.map(r => `<tr data-category="${esc(r.category)}" data-issues="${esc(r.issues.join(' '))}" data-search="${esc([r.name,r.url,r.category,r.description].join(' ').toLowerCase())}"><td>${esc(r.category)}</td><td>${esc(r.name || '(missing name)')}</td><td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url)}</a>` : '—'}</td><td>${esc(r.issues.join(', ') || 'No metadata issues detected')}</td></tr>`).join('');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MovieHub Catalog Intelligence</title><style>
:root{color-scheme:dark;--bg:#0b1020;--panel:#121a2d;--line:#29344b;--text:#eef3ff;--muted:#aab6cc;--accent:#8ca8ff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1200px;margin:auto;padding:28px 18px 56px}h1{margin:0 0 6px;font-size:clamp(1.7rem,4vw,2.5rem)}p,.muted{color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0}.metric,.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}.metric span{display:block;color:var(--muted);font-size:.88rem}.metric strong{font-size:1.8rem}.panel{margin-top:18px;overflow:hidden}.controls{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.controls input,.controls select{background:#0b1020;border:1px solid var(--line);color:var(--text);border-radius:9px;padding:10px;min-width:180px}table{border-collapse:collapse;width:100%;min-width:700px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}td a{color:var(--accent);overflow-wrap:anywhere}.table-wrap{overflow:auto}.pill{display:inline-block;border:1px solid var(--line);padding:2px 7px;border-radius:99px;color:var(--muted);font-size:.8rem}.foot{font-size:.9rem;margin-top:18px}@media(max-width:600px){main{padding:20px 12px}.panel{padding:10px}}
</style></head><body><main><h1>MovieHub Catalog Intelligence</h1><p>Generated ${esc(report.generatedAt)} · Review report only; source catalog is unchanged.</p>
<section class="metrics">${metric('Catalog entries', totals.entries)}${metric('Categories', totals.categories)}${metric('Entries needing review', totals.entriesWithIssues)}${metric('Missing names', totals.missingName)}${metric('Missing descriptions', totals.missingDescription)}${metric('Missing logos', totals.missingLogo)}${metric('Possible duplicates', totals.duplicateUrl)}${metric('Invalid URLs', totals.invalidUrl)}${metric('Invalid logo URLs', totals.invalidLogo)}</section>
<section class="panel"><h2>Category overview</h2><div class="table-wrap"><table><thead><tr><th>Category</th><th>Entries</th><th>No name</th><th>No description</th><th>No logo</th><th>Duplicates</th><th>Invalid URL/logo</th></tr></thead><tbody>${categoryRows}</tbody></table></div></section>
<section class="panel"><h2>Entry review queue</h2><p class="muted">Search by name, URL, category or description; filter to entries with detected issues.</p><div class="controls"><input id="search" type="search" placeholder="Search catalog…" aria-label="Search catalog"><select id="category" aria-label="Filter category"><option value="">All categories</option>${Object.keys(categories).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select><select id="issue" aria-label="Filter issues"><option value="all">All entries</option><option value="issues">Needs review</option><option value="clean">No detected issues</option></select><span id="count" class="pill" aria-live="polite"></span></div><div class="table-wrap"><table><thead><tr><th>Category</th><th>Name</th><th>URL</th><th>Detected issues</th></tr></thead><tbody id="entries">${detailRows}</tbody></table></div></section>
<p class="foot">Limits: checks catalog structure and metadata fields only. It does not test live availability, ownership, copyright status, or service safety. Validate suggestions manually before editing data.json.</p></main><script>
const q=document.querySelector('#search'),cat=document.querySelector('#category'),issue=document.querySelector('#issue'),body=document.querySelector('#entries'),count=document.querySelector('#count');function filter(){let visible=0;for(const row of body.rows){const matchText=row.dataset.search.includes(q.value.toLowerCase());const matchCat=!cat.value||row.dataset.category===cat.value;const matchIssue=issue.value==='all'||(issue.value==='issues'?row.dataset.issues!=='':row.dataset.issues==='');row.hidden=!(matchText&&matchCat&&matchIssue);if(!row.hidden)visible++}count.textContent=visible+' entries shown'}[q,cat,issue].forEach(el=>el.addEventListener('input',filter));filter();
</script></body></html>`;
await writeFile(htmlPath, html);
console.log(`Generated dashboard: ${htmlPath}`);
console.log(`Generated JSON report: ${jsonPath}`);
console.log(JSON.stringify(totals, null, 2));
