# azure-agents-cli

A lightweight CLI for Azure AI Foundry Agent (assistants) service.

## Node CLI (current)

Location: `cli/` (Node >=22, ESM). Auth via `DefaultAzureCredential`.

Install deps:

```bash
cd cli && npm install
```

(Optionally add `cli/bin` to PATH.)

Usage:

```bash
aza agents list -p <endpoint>
aza threads list -p <endpoint>
aza threads show <threadId> -p <endpoint>
aza threads runs list <threadId> -p <endpoint>
aza threads runs show <threadId> <runId> -p <endpoint>
```

Flags:

- `-p, --project` or env `AZA_PROJECT` = base endpoint including project id
- `--api-version` (default v1 / env `AZA_API_VERSION`)
- `--json` pretty JSON
- `--raw` raw body
- `--debug` verbose HTTP

Agents command maps to REST `assistants` endpoint (naming aligned to docs).

## Authentication

Run `az login` or provide env vars (`AZURE_CLIENT_ID`, etc.). Scope used: `https://ai.azure.com/.default`.

## Legacy Python (initial draft)

A prior Python scaffold existed under `aza/`; current active implementation is Node CLI in `cli/`.