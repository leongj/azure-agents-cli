import { apiRequest, usageError } from '../http.js';
import { output } from '../util/format.js';

export async function agentsList(ctx) {
  const query = {};
  if (ctx.limit) query.limit = ctx.limit;
  if (ctx.order) query.order = ctx.order;
  if (ctx.after) query.after = ctx.after;
  if (ctx.before) query.before = ctx.before;
  const data = await apiRequest(ctx, 'assistants', { query });
  output(ctx, data.assistants || data, [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
    { header: 'Model', key: 'model' },
    { header: 'Created', key: 'created_at' }
  ]);
}
