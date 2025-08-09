# azure-agents-cli
A command line interface for the Azure Agent Service

## Development Install
```
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e .
```

## Usage
```
aza agents list --project-uri https://example/projects/123
```
Options:
- `--output json` for JSON output (default is table).

## Authentication
Uses `DefaultAzureCredential` from `azure-identity`. Ensure one of: Azure CLI login (`az login`), Managed Identity, Visual Studio Code signed-in account, environment variables (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`), etc.

## Configuration
The base service URL is currently a placeholder constant `DEFAULT_BASE_URL` in `aza/api.py`. Replace with the real endpoint or make it configurable later (e.g., env var `AZA_BASE_URL`).

## Project URI
`--project-uri` currently extracts the last path segment as the project ID. Adjust `parse_project_uri` in `aza/api.py` when real format is known.

## Next Steps
- Additional subcommands: create, delete, update agents
- Config file support (`~/.aza/config.toml`)
- Environment variable overrides
- Pagination, filtering
- Improved error messages & logging
- Tests (pytest + httpx mocking)
- Async version (httpx.AsyncClient)
