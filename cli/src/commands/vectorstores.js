import { apiRequest, usageError } from '../http.js';
import { output, convertTimestamps } from '../util/format.js';

// List vector stores
export async function vectorStoresList(ctx) {
  const data = await apiRequest(ctx, 'vector_stores');
  // Support either { vector_stores: [...] } or direct array
  const list = data.data;
  const processed = (ctx.json || ctx.raw) ? list : convertTimestamps(list);

  // Attempt a sensible column set; tolerate missing fields
  output(ctx, processed, [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Created', key: 'created_at' }
  ]);
}

// Show single vector store
export async function vectorStoreShow(ctx, id) {
  if (!id) throw usageError('Missing vectorStoreId');
  const vs = await apiRequest(ctx, `vector_stores/${id}`);
  if (ctx.raw) {
    process.stdout.write(typeof vs === 'string' ? vs : JSON.stringify(vs));
    return;
  }
  const processed = (ctx.json) ? vs : convertTimestamps(vs);
  console.log(JSON.stringify(processed, null, ctx.json ? 2 : 2));
}

// List files in a specific vector store: GET vector_stores/{id}/files
export async function vectorStoreFilesList(ctx, vectorStoreId) {
  if (!vectorStoreId) throw usageError('Missing vectorStoreId');
  const data = await apiRequest(ctx, `vector_stores/${vectorStoreId}/files`);
  const list = data.data || data.files || data.items || data; // flexible shapes
  if (!Array.isArray(list)) {
    const processedSingle = (ctx.json || ctx.raw) ? list : convertTimestamps(list);
    output(ctx, processedSingle, [
      { header: 'ID', key: 'id' },
      { header: 'Filename', key: 'filename' },
      { header: 'Bytes', key: 'bytes' },
      { header: 'Status', key: 'status' },
      { header: 'Created', key: 'created_at' }
    ]);
    return;
  }

  // Fetch per-file details to populate filename & bytes (limit concurrency)
  const concurrency = 5;
  const queue = [...list];
  const enriched = [];
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      const id = item?.id;
      if (!id) { enriched.push(item); continue; }
      try {
        const detail = await apiRequest(ctx, `files/${id}`);
        enriched.push({ ...item, ...detail });
      } catch (e) {
        if (ctx.debug) console.error('[WARN] file detail fetch failed', id, e.message);
        enriched.push(item);
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, list.length) }, () => worker());
  await Promise.all(workers);
  const indexMap = new Map(list.map((f, i) => [f.id, i]));
  enriched.sort((a, b) => (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0));

  const processed = (ctx.json || ctx.raw) ? enriched : convertTimestamps(enriched);
  output(ctx, processed, [
    { header: 'ID', key: 'id' },
    { header: 'Filename', key: 'filename' },
    { header: 'Bytes', key: 'bytes' },
    { header: 'Status', key: 'status' },
    { header: 'Created', key: 'created_at' }
  ]);
}

// Show single file within a vector store: GET vector_stores/{id}/files/{fileId}
export async function vectorStoreFileShow(ctx, vectorStoreId, fileId) {
  if (!vectorStoreId || !fileId) throw usageError('Need vectorStoreId and fileId');
  const f = await apiRequest(ctx, `vector_stores/${vectorStoreId}/files/${fileId}`);
  if (ctx.raw) {
    process.stdout.write(typeof f === 'string' ? f : JSON.stringify(f));
    return;
  }
  const processed = ctx.json ? f : convertTimestamps(f);
  console.log(JSON.stringify(processed, null, 2));
}
