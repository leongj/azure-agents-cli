import { usageError } from '../http.js';
import { agentsList } from '../commands/agents.js';
import { threadsList, threadShow } from '../commands/threads.js';
import { runsList, runShow } from '../commands/runs.js';

export async function dispatch(ctx) {
  const [main, sub, sub2, sub3, sub4] = ctx.positional;
  if (!main) throw usageError('No command provided');

  switch (main) {
    case 'agents':
      if (sub === 'list') return agentsList(ctx);
      throw usageError('Usage: aza agents list');
    case 'threads':
      if (sub === 'list') return threadsList(ctx);
      if (sub === 'show') return threadShow(ctx, sub2);
      if (sub === 'runs') {
        if (sub2 === 'list') return runsList(ctx, sub3);
        if (sub2 === 'show') return runShow(ctx, sub3, sub4);
      }
      throw usageError('Usage: aza threads (list|show <threadId>|runs list <threadId>|runs show <threadId> <runId>)');
    default:
      throw usageError(`Unknown command ${main}`);
  }
}
