import { apiRequest, usageError } from '../http.js';
import { output, convertTimestamps } from '../util/format.js';

export async function runsList(ctx, threadId) {
  if (!threadId) throw usageError('Missing threadId');
  const data = await apiRequest(ctx, `threads/${threadId}/runs`);
  const list = data.runs || data;

  // Timestamp prettification for non-raw modes
  const processed = convertTimestamps(list);

  // Normalize to arrays for table output regardless of wrapping shape
  const processedRows = Array.isArray(processed) ? processed : (processed?.items || processed?.data || []);
  const rawRows = Array.isArray(list) ? list : (list?.items || list?.data || []);

  // Derive tools type string and Completed display value for table display
  const augmentedRows = processedRows.map(r => {
    const status = r?.status;
    const completed = r?.completed_at;
    return {
      ...r,
      tool_types: Array.isArray(r?.tools) ? r.tools.map(t => t?.type).filter(Boolean).join(', ') : '',
      completed_display: (status && status !== 'completed') ? status : completed
    };
  });

  // Simple ASCII sort: ISO timestamp strings first, then non-date statuses
  const isDateLike = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v);
  const order = (ctx.order || 'asc').toLowerCase();

  const dateRows = augmentedRows.filter(r => isDateLike(r.completed_display));
  const statusRows = augmentedRows.filter(r => !isDateLike(r.completed_display));

  const cmp = (a, b) => String(a.completed_display).localeCompare(String(b.completed_display));
  dateRows.sort((a, b) => order === 'asc' ? cmp(a, b) : cmp(b, a));

  const sortedAugmented = [...dateRows, ...statusRows];

  const tableData = ctx.raw ? rawRows : sortedAugmented;
  const jsonOrRawData = ctx.raw ? list : processed;

  output(ctx, ctx.json ? jsonOrRawData : tableData, [
    { header: 'ID', key: 'id' },
    { header: 'Completed', key: 'completed_display' },
    { header: 'Agent', key: 'assistant_id' },
    { header: 'Tools', key: 'tool_types' }
  ]);
}

export async function runShow(ctx, threadId, runId) {
  if (!threadId || !runId) throw usageError('Need threadId and runId');
  const runData = await apiRequest(ctx, `threads/${threadId}/runs/${runId}`);

  // Fetch ALL run steps by paginating until has_more is false
  let stepsAll = [];
  try {
    let after;
    const limit = 100; // API max per docs
    while (true) {
      // Add include[] expansion so each step returns nested file_search result content
      // TODO: review whether limit/order are valid on the Azure REST API
      const query = { 
        limit, 
        order: 'asc', 
        ...(after ? { after } : {}), 
        'include[]': 'step_details.tool_calls[*].file_search.results[*].content'
      };
      const page = await apiRequest(ctx, `threads/${threadId}/runs/${runId}/steps`, { query });
      const pageItems = Array.isArray(page) ? page : (page?.data || page?.items || []);
      if (Array.isArray(pageItems)) stepsAll.push(...pageItems);

      const hasMore = !!page?.has_more;
      if (!hasMore) break;

      // Prefer server-provided last_id, else fall back to last item's id
      const lastId = page?.last_id || (pageItems?.length ? pageItems[pageItems.length - 1]?.id : undefined);
      if (!lastId) break; // cannot continue safely
      after = lastId;
    }
  } catch (e) {
    if (ctx.debug) console.error('[WARN] Failed to fetch run steps:', e.message);
  }

  // If user asked for JSON or RAW we emit the original run JSON and an array of all steps
  if (ctx.json || ctx.raw) {
    const stringify = (obj) => ctx.raw ? JSON.stringify(obj) : JSON.stringify(obj, null, 2);
    if (stepsAll && stepsAll.length) {
      // Run object first, then the full steps array
      process.stdout.write(stringify(runData) + '\n\n---\n\n' + stringify(stepsAll) + '\n');
    } else {
      process.stdout.write(stringify(runData) + '\n');
    }
    return;
  }

  // Default (pretty) mode: convert *_at epoch second fields to ISO timestamps for readability.
  const runPretty = convertTimestamps(runData);
  const stepsPretty = (stepsAll && stepsAll.length) ? convertTimestamps(stepsAll) : null;

  console.log('--- Run:');
  console.log(JSON.stringify(runPretty, null, 2));
  if (stepsPretty) {
    console.log('\n--- Run Steps:');
    // For each step, show: stepId, completed_at, type, then step_details JSON
    for (const s of stepsPretty) {
      const stepId = s?.id || '';
      const completedAt = s?.completed_at || '';
      const type = s?.type || '';
      console.log(`${stepId} completed_at: ${completedAt}`);
      const details = s?.step_details ?? {};
      // Indent the JSON for readability
      const detailsJson = JSON.stringify(details, null, 2)
      console.log(`step_details:\n${detailsJson}\n`);
    }
  }
}
