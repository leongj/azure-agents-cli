import { apiRequest, usageError } from '../http.js';
import { output } from '../util/format.js';

export async function threadsList(ctx) {
  const data = await apiRequest(ctx, 'threads');
  output(ctx, data.threads || data, [
    { header: 'ID', key: 'id' },
    { header: 'Status', key: 'status' },
    { header: 'Created', key: 'created_at' }
  ]);
}

export async function threadShow(ctx, id) {
  if (!id) throw usageError('Missing threadId');
  const data = await apiRequest(ctx, `threads/${id}`);
  output(ctx, data, null); // force JSON style for details
}
