# Github Copilot Project Instructions: Azure Agents CLI

## Overview
This repository contains a Python CLI tool named `aza` for interacting with the Azure AI Agent Service (Azure AI Foundry Agents) via the Azure SDK (`azure-ai-projects`). Examples of current commands:
- Listing agents: `aza agents list`
- Listing threads: `aza threads list`
- Showing a thread: `aza threads show <thread_id>`

The CLI uses `Typer` for command definitions, `rich` for output. Authentication is via `DefaultAzureCredential`.

## Key Design Points
- Packaged via `pyproject.toml` exposing entry point script: `aza = aza.cli:app`.
- If `--project-uri` is not supplied, commands fall back to the `PROJECT_ENDPOINT` environment variable.
- The project endpoint must be the full Foundry project endpoint: `https://<ResourceName>.services.ai.azure.com/api/projects/<ProjectName>`.
- SDK access through `AIProjectClient` from `azure.ai.projects`.
- Thread objects are surfaced verbatim (JSON-safe) for debugging; only `created_at` is normalized to UTC ISO8601 (`YYYY-MM-DDTHH:MM:SSZ`).

## Current Data Modeling Decisions
- We're not using Pydantic to avoid tight coupling with the SDK's evolving data structures.
- Return objects as plain dicts (full upstream payload after recursive JSON-serialization) Non-serializable SDK objects (e.g. `ToolResources`) are converted to primitive structures; 
- Dates nicely formatted - `created_at` normalized.

## File Structure (Key Files)
- `pyproject.toml`: Build config & dependencies.
- `aza/cli.py`: Typer application and command groups.
- `aza/api.py`: SDK interaction, agents model, serialization helpers (`list_agents`, `list_threads`, `get_thread`, `serialize_thread`).
- `aza/auth.py`: Legacy token helper (unused in current flow; candidate for removal).

## Dependencies (Runtime)
- `typer`
- `rich`
- `azure-identity`
- `azure-ai-projects`

## Output Conventions
- All commands default to `--output json`; currently only JSON format is implemented.
- Thread JSON includes all upstream fields post-normalization. Agents list returns normalized agent objects (limited fields).
- Timestamps (`created_at`) for threads are converted to UTC ISO8601 without microseconds.

## Guidelines for Future Contributions
1. Maintain idempotent CLI commands; retain `--output json` for scripting.
2. Validate parameters early; provide clear error messages; exit codes: 2 for user input/config issues, 1 for runtime/API errors.
3. Wrap SDK exceptions in `ApiError` for consistent user-facing errors.
4. Keep CLI layer thin—business logic / transformations live in `api.py` (or future dedicated modules).
5. When adding new data shapes, decide explicitly: minimal Pydantic model vs raw dict + normalization. Prefer minimal models only when transformation/validation is required.
6. Preserve stable JSON fields; avoid removing existing keys without a major version bump. Adding keys is acceptable.
7. Ensure new list/show commands support JSON output; if adding table output in future, keep JSON path unchanged.
8. Avoid leaking internal SDK object representations—always pass through JSON-safe serialization helpers.

## Style
- Follow PEP8 + type hints.
- Prefer small, composable helper functions (`serialize_thread`, `_to_jsonable`, etc.).
- Keep external interface stable; document any intentional breaking changes.

## Testing / Validation Suggestions (Future)
- Add unit tests for `serialize_thread` to ensure created_at normalization and complex nested SDK objects are JSON-serializable.
- Add golden-file style tests for CLI JSON output stability.

## Extensibility Notes
- If filtering or paging is added, implement query/pagination parameters in `api.py` first, then surface flags in CLI.
- If non-JSON formats (e.g. table) are reintroduced, keep formatting concerns isolated (e.g. a `formatters.py`).
- Consider a `--raw` flag later to optionally include an unmodified `_raw` payload alongside normalized fields (for deep debugging) without changing existing JSON field names.