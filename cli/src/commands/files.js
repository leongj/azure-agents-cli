import { apiRequest, usageError } from '../http.js';
import { output, convertTimestamps } from '../util/format.js';

// Global Files API (Azure AI Agents Files) commands
// List all files (no vector store scoping) GET /files
export async function filesList(ctx) {
  const query = {};
  if (ctx.limit) query.limit = ctx.limit;
  if (ctx.order) query.order = ctx.order;
  if (ctx.after) query.after = ctx.after;
  if (ctx.before) query.before = ctx.before;
  const data = await apiRequest(ctx, 'files', { query });
  const list = data.files || data.data || data.items || data; // tolerate shapes
  const rows = Array.isArray(list) ? list : (list?.data || list?.items || []);
  const processed = (ctx.json || ctx.raw) ? rows : convertTimestamps(rows);
  output(ctx, processed, [
    { header: 'ID', key: 'id' },
    { header: 'Filename', key: 'filename' },
    { header: 'Bytes', key: 'bytes' },
    { header: 'Purpose', key: 'purpose' },
    { header: 'Status', key: 'status' },
    { header: 'Created', key: 'created_at' }
  ]);
}

// Show single file: GET /files/{fileId}
export async function fileShow(ctx, fileId) {
  if (!fileId) throw usageError('Missing fileId');
  const f = await apiRequest(ctx, `files/${fileId}`);
  if (ctx.raw) {
    process.stdout.write(typeof f === 'string' ? f : JSON.stringify(f));
    return;
  }
  const processed = ctx.json ? f : convertTimestamps(f);
  console.log(JSON.stringify(processed, null, 2));
}

