from __future__ import annotations
from typing import Optional
from azure.identity import DefaultAzureCredential
from functools import lru_cache

SCOPE_DEFAULT = "https://management.azure.com/.default"

@lru_cache(maxsize=1)
def _credential() -> DefaultAzureCredential:
    return DefaultAzureCredential(exclude_interactive_browser_credential=False)

def get_token(scope: Optional[str] = None) -> str:
    scope = scope or SCOPE_DEFAULT
    cred = _credential()
    token = cred.get_token(scope)
    return token.token
