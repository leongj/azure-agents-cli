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
