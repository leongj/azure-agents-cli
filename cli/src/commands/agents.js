import { apiRequest, usageError } from '../http.js';
import { output, convertTimestamps } from '../util/format.js';

export async function agentsList(ctx) {
  const query = {};
  if (ctx.limit) query.limit = ctx.limit;
  if (ctx.order) query.order = ctx.order;
  if (ctx.after) query.after = ctx.after;
  if (ctx.before) query.before = ctx.before;
  const data = await apiRequest(ctx, 'assistants', { query });
  const list = data.assistants || data;
  let processed = list;
  if (!(ctx.json || ctx.raw)) {
    processed = Array.isArray(list) ? list.map(a => convertTimestamps(a)) : convertTimestamps(list);
  }
  output(ctx, processed, [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Model', key: 'model' },
    { header: 'Created', key: 'created_at' }
  ]);
}

// Show single assistant/agent: GET /assistants/{assistantId}
export async function agentShow(ctx, agentId) {
  if (!agentId) throw usageError('Missing agentId');
  const a = await apiRequest(ctx, `assistants/${agentId}`);
  if (ctx.raw) {
    process.stdout.write(typeof a === 'string' ? a : JSON.stringify(a));
    return;
  }
  const processed = ctx.json ? a : convertTimestamps(a);
  console.log(JSON.stringify(processed, null, 2));
}
