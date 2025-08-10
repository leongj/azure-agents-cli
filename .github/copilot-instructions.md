Copilot instructions

Project summary:
- Primary active CLI implementation is Node (folder `cli/`), using Node >=22 ESM.
- Auth uses `@azure/identity` DefaultAzureCredential with scope https://ai.azure.com/.default.
- Commands implemented:
  - `aza agents list`
  - `aza threads list`
  - `aza threads show <threadId>`
  - `aza threads runs list <threadId>`
  - `aza threads runs show <threadId> <runId>`
- Global flags: `--project|-p`, `--api-version`, `--json`, `--raw`, `--debug`.
- `--project` / env `AZA_PROJECT` holds full base endpoint including project id.
- REST mappings: agents -> `assistants` endpoint.
- Legacy Python prototype remains in `aza/` but is not current.

Guidance for future changes:
- Keep CLI lightweight (minimal deps).
- Add new subcommands under `cli/src/commands`.
- Prefer consistent output options (`--json`, `--raw`).
