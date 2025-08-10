export function output(ctx, data, tableSpec) {
  if (ctx.raw) {
    process.stdout.write(typeof data === 'string' ? data : JSON.stringify(data));
    return;
  }
  if (ctx.json || !tableSpec) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const rows = Array.isArray(data) ? data : (data.items || data.data || []);
  if (!Array.isArray(rows)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  const headers = tableSpec.map(c => c.header);
  const cols = tableSpec.map(c => c.key);
  const table = [headers];
  for (const r of rows) {
    table.push(cols.map(k => toCell(r, k)));
  }
  const widths = headers.map((h, i) => Math.max(h.length, ...table.slice(1).map(row => (row[i] || '').length)));
  for (let i = 0; i < table.length; i++) {
    const line = table[i].map((cell, ci) => pad(cell, widths[ci])).join('  ');
    console.log(line);
    if (i === 0) console.log(widths.map(w => '-'.repeat(w)).join('  '));
  }
}

function toCell(obj, key) {
  const v = obj?.[key];
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    if ('id' in v) return String(v.id);
    if ('name' in v) return String(v.name);
    return JSON.stringify(v);
  }
  return String(v);
}

function pad(s, w) {
  s = s || ''; return s.length >= w ? s : s + ' '.repeat(w - s.length);
}
