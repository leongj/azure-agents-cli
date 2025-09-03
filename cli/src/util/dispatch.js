import { usageError } from "../http.js";
import { agentsList } from "../commands/agents.js";
import { threadsList, threadShow } from "../commands/threads.js";
import { runsList, runShow } from "../commands/runs.js";
import {
  vectorStoresList,
  vectorStoreShow,
  vectorStoreFilesList,
  vectorStoreFileShow,
} from "../commands/vectorstores.js";
import { filesList, fileShow } from "../commands/files.js";

export async function dispatch(ctx) {
  const [main, sub, sub2, sub3, sub4] = ctx.positional;
  if (!main) throw usageError("No command provided");

  switch (main) {
    case "agents":
      if (sub === "list") return agentsList(ctx);
      throw usageError("Usage: aza agents list");
    case "threads":
      if (sub === "list") return threadsList(ctx);
      if (sub === "show") return threadShow(ctx, sub2);
      if (sub === "runs") {
        if (sub2 === "list") return runsList(ctx, sub3);
        if (sub2 === "show") return runShow(ctx, sub3, sub4);
      }
      throw usageError("Usage: aza threads (list|show <threadId>|runs list <threadId>|runs show <threadId> <runId>)");
    case "runs":
      if (sub === "list") return runsList(ctx, sub2);
      if (sub === "show") return runShow(ctx, sub2, sub3);
      throw usageError("Usage: aza runs (list <threadId>|show <threadId> <runId>)");
    case "vs":
    case "vector-stores":
    case "vectorstores":
      if (sub === "list") return vectorStoresList(ctx);
      if (sub === "show") return vectorStoreShow(ctx, sub2);
      if (sub === "files") {
        if (sub2 === "list") return vectorStoreFilesList(ctx, sub3);
        if (sub2 === "show") return vectorStoreFileShow(ctx, sub3, sub4);
        throw usageError("Usage: aza vs files (list <vectorStoreId>|show <vectorStoreId> <fileId>)");
      }
      throw usageError(
        "Usage: aza vs (list|show <vectorStoreId>|files list <vectorStoreId>|files show <vectorStoreId> <fileId>)"
      );
    case "file": // deprecated singular alias
    case "files":
      if (sub === "list") return filesList(ctx);
      if (sub === "show") return fileShow(ctx, sub2);
      throw usageError("Usage: aza files (list|show <fileId>)");
    default:
      throw usageError(`Unknown command ${main}`);
  }
}
