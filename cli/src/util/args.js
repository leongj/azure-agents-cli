import { usageError } from '../http.js';

export function parseArgs(argv) {
  const ctx = {
    rawArgs: argv,
    project: process.env.AZA_PROJECT,
    apiVersion: process.env.AZA_API_VERSION || 'v1',
    json: false,
    raw: false,
    debug: process.env.AZA_DEBUG === '1' || argv.includes('--debug')
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--help':
      case '-h':
        ctx.help = true; break;
      case '--project':
      case '-p':
        ctx.project = argv[++i]; break;
      case '--api-version':
        ctx.apiVersion = argv[++i]; break;
      case '--json':
        ctx.json = true; break;
      case '--raw':
        ctx.raw = true; break;
      case '--debug':
        ctx.debug = true; break;
      case '--limit':
        ctx.limit = argv[++i]; break;
      case '--order':
        ctx.order = argv[++i]; break;
      case '--after':
        ctx.after = argv[++i]; break;
      case '--before':
        ctx.before = argv[++i]; break;
      default:
        if (a.startsWith('-')) throw usageError(`Unknown flag ${a}`);
        positional.push(a);
    }
  }
  ctx.positional = positional;
  return ctx;
}
