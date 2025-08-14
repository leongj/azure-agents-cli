import { apiRequest, usageError } from '../http.js';
import { output, convertTimestamps } from '../util/format.js';

export async function threadsList(ctx) {
  const data = await apiRequest(ctx, 'threads');
  const list = data.threads || data;
  const processed = (ctx.json || ctx.raw) ? list : (Array.isArray(list) ? list.map(t => convertTimestamps(t)) : convertTimestamps(list));
  output(ctx, processed, [
    { header: 'ID', key: 'id' },
    { header: 'Created', key: 'created_at' }
  ]);
}

export async function threadShow(ctx, id) {
  if (!id) throw usageError('Missing threadId');
  const threadData = await apiRequest(ctx, `threads/${id}`);

  // Attempt to also fetch the thread's messages (supports pagination flags if provided)
  let messagesData = null;
  try {
    const query = {};
    if (ctx.limit) query.limit = ctx.limit;
    if (ctx.order) query.order = ctx.order;
    if (ctx.after) query.after = ctx.after;
    if (ctx.before) query.before = ctx.before;
    if (ctx.runId) query.run_id = ctx.runId;
    messagesData = await apiRequest(ctx, `threads/${id}/messages`, { query });
  } catch (e) {
    if (ctx.debug) console.error('[WARN] Failed to fetch messages:', e.message);
  }

  // JSON / RAW output: print thread JSON, then messages JSON separated by a delimiter for easy parsing
  if (ctx.json || ctx.raw) {
    const stringify = (obj) => ctx.raw ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
    if (messagesData) {
      process.stdout.write(stringify(threadData) + '\n\n---\n\n' + stringify(messagesData) + '\n');
    } else {
      process.stdout.write(stringify(threadData) + '\n');
    }
    return;
  }

  // Pretty mode: transcript view
  const t = convertTimestamps(threadData);
  const listObj = messagesData ? convertTimestamps(messagesData) : null;
  let msgs = Array.isArray(listObj?.data) ? [...listObj.data] : [];
  // Sort oldest -> newest
  const getTs = (m) => (typeof m.created_at_epoch === 'number' ? m.created_at_epoch : (m.created_at ? Date.parse(m.created_at) / 1000 : 0));
  msgs.sort((a, b) => getTs(a) - getTs(b));

  // Header
  const count = msgs.length;
  console.log(`Thread ${t.id || id} — ${count} message${count === 1 ? '' : 's'}`);

  for (const m of msgs) {
    const ts = m.created_at || m.createdAt || '';
    const role = m.role || 'unknown';
    const rid = m.run_id || m.runId || null;
    const mid = m.id;

    // Header line per message
    let header = `${ts} ${role}`;
    const extras = [];
    if (rid) extras.push(`run: ${shorten(rid)}`);
    if (ctx.showIds && mid) extras.push(`id: ${shorten(mid)}`);
    if (extras.length) header += ` (${extras.join(', ')})`;
    console.log(header + ':');

    // Body: gather text content items
    const texts = extractText(m);
    let body = texts.join('\n\n');
    if (ctx.maxBody != null && body.length > ctx.maxBody) {
      body = body.slice(0, ctx.maxBody) + ' … [truncated]';
    }
    // Optional wrapping: keep simple soft wrap at ~100 chars unless --no-wrap
    if (!ctx.noWrap) body = softWrap(body, 100);

    // Print body on a newline under header
    for (const line of body.split('\n')) {
      console.log('  ' + line);
    }

    // Citations/attachments indicators
    const citationCount = countCitations(m);
    const attachmentCount = Array.isArray(m.attachments) ? m.attachments.length : 0;
    const indicators = [];
    if (citationCount) indicators.push(`${citationCount} citation${citationCount === 1 ? '' : 's'}`);
    if (attachmentCount) indicators.push(`${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`);
    if (indicators.length) console.log('  [' + indicators.join(', ') + ']');

    if (ctx.showCitations && citationCount) {
      const details = listCitations(m);
      for (const d of details) console.log('    - ' + d);
    }
    console.log('');
  }
}

// Helpers
function extractText(message) {
  const out = [];
  const content = Array.isArray(message.content) ? message.content : [];
  for (const item of content) {
    if (item?.type === 'text' && item.text?.value) out.push(item.text.value);
    // future: handle image_file etc.
  }
  return out.length ? out : [''];
}

function countCitations(message) {
  let c = 0;
  for (const item of message.content || []) {
    const anns = item?.text?.annotations || [];
    c += anns.length || 0;
  }
  return c;
}

function listCitations(message) {
  const out = [];
  for (const item of message.content || []) {
    const anns = item?.text?.annotations || [];
    for (const a of anns) {
      const id = a?.file_citation?.file_id || a?.file_path?.file_id || a?.url_citation?.url || 'ref';
      const rng = a?.start_index != null && a?.end_index != null ? `[${a.start_index}-${a.end_index}]` : '';
      out.push(`${a.type || 'annotation'} ${rng} -> ${id}`);
    }
  }
  return out;
}

function softWrap(text, width = 100) {
  const lines = [];
  for (const para of String(text).split(/\n\n+/)) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!line) { line = word; continue; }
      if ((line + ' ' + word).length > width) { lines.push(line); line = word; }
      else { line += ' ' + word; }
    }
    if (line) lines.push(line);
    lines.push(''); // blank between paragraphs
  }
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

function shorten(id, n = 10) { return String(id).length > n ? String(id).slice(0, n) + '…' : String(id); }
