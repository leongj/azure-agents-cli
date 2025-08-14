import { apiRequest, usageError } from '../http.js';
import { output, convertTimestamps } from '../util/format.js';

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
  const runData = await apiRequest(ctx, `threads/${threadId}/runs/${runId}`);

  let stepsData = null;
  try {
    stepsData = await apiRequest(ctx, `threads/${threadId}/runs/${runId}/steps`);
  } catch (e) {
    if (ctx.debug) console.error('[WARN] Failed to fetch run steps:', e.message);
  }

  // If user asked for JSON or RAW we emit the original JSON objects exactly as returned
  if (ctx.json || ctx.raw) {
    const stringify = (obj) => ctx.raw ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
    // Simple elegant separation: blank line + --- delimiter (keeps human readability, still easy to split)
    if (stepsData) {
      // Run object first, then steps object untouched
      process.stdout.write(stringify(runData) + '\n\n---\n\n' + stringify(stepsData) + '\n');
    } else {
      process.stdout.write(stringify(runData) + '\n');
    }
    return;
  }

  // Default (pretty) mode: convert *_at epoch second fields to ISO timestamps for readability.
  const runPretty = convertTimestamps(runData);
  const stepsPretty = stepsData ? convertTimestamps(stepsData) : null;

  console.log('--- Run:');
  console.log(JSON.stringify(runPretty, null, 2));
  if (stepsPretty) {
    console.log('\n--- Run Steps:');
    console.log(JSON.stringify(stepsPretty, null, 2));
  }
}
