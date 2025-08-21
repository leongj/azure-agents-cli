import { parseArgs } from './util/args.js';
import { dispatch } from './util/dispatch.js';

(async () => {
  try {
    const ctx = parseArgs(process.argv.slice(2));
    if (ctx.help) {
      printHelp();
      process.exit(0);
    }
    await dispatch(ctx);
  } catch (err) {
    if (err && err.code === 'USAGE') {
      console.error(err.message);
      console.error('Use --help for usage.');
      process.exit(2);
    }
    console.error('[ERROR]', err.message || err);
    if (process.env.AZA_DEBUG || process.argv.includes('--debug')) {
      console.error(err.stack);
    }
    process.exit(1);
  }
})();

function printHelp() {
  console.log(`aza - Azure AI Agents debugging CLI\n\nUsage:\n  aza agents list [--limit N --order asc|desc --after ID --before ID]\n  aza threads list\n  aza threads show <threadId>\n  aza threads runs list <threadId>\n  aza threads runs show <threadId> <runId>\n  aza runs list <threadId>\n  aza runs show <threadId> <runId>\n  aza vs list\n  aza vs show <vectorStoreId>\n  aza vs files list <vectorStoreId>\n  aza vs files show <vectorStoreId> <fileId>\n\nGlobal flags:\n  -p, --project <endpoint>   Base endpoint containing project (or set AZA_PROJECT)\n      --api-version <ver>     Override API version (default v1 or AZA_API_VERSION)\n      --json                  Output prettified JSON\n      --raw                   Output raw body\n      --debug                 Verbose HTTP debug output\n      --help                  Show this help\n\nExamples:\n  AZA_PROJECT=https://myendpoint/projects/12345/v1 aza agents list\n  aza -p https://myendpoint/projects/12345/v1 vs list --json\n  aza vs files list vst_123456789\n  aza vs files show vst_123456789 file_abcdef`);
}
