import { apiRequest, usageError } from '../http.js';
import { output } from '../util/format.js';

export async function runsList(ctx, threadId) {
  if (!threadId) throw usageError('Missing threadId');
  const data = await apiRequest(ctx, `threads/${threadId}/runs`);
  output(ctx, data.runs || data, [
    { header: 'ID', key: 'id' },
    { header: 'Status', key: 'status' },
    { header: 'Created', key: 'created_at' },
    { header: 'Started', key: 'started_at' },
    { header: 'Completed', key: 'completed_at' }
  ]);
}

export async function runShow(ctx, threadId, runId) {
  if (!threadId || !runId) throw usageError('Need threadId and runId');
  const data = await apiRequest(ctx, `threads/${threadId}/runs/${runId}`);
  output(ctx, data, null);
}
