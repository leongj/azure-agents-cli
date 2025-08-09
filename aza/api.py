from __future__ import annotations
from typing import Optional, Any
from datetime import datetime, timezone
import json
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
import ast
from collections.abc import Mapping, Sequence

# Removed Pydantic models; agents and threads now represented as plain dicts.

class ApiError(RuntimeError):
    pass

def parse_project_uri(project_uri: str) -> str:
    # TODO: implement real parsing/validation; for now take last path segment as project id
    return project_uri.rstrip("/").split("/")[-1]

def _get(obj: Any, name: str, default=None):
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)

def _parse_created_at(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    if isinstance(value, str):
        try:
            # attempt ISO parse
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None

def _thread_raw_dict(t: Any) -> dict:
    if isinstance(t, dict):
        return t
    # SDK objects often have _data holding the service payload
    data = getattr(t, "_data", None)
    if isinstance(data, dict):
        return data
    # Fallback to __dict__ filtering private attrs
    return {k: v for k, v in getattr(t, "__dict__", {}).items() if not k.startswith("_")}

def _to_jsonable(obj: Any, _seen: set[int] | None = None) -> Any:
    """Recursively convert SDK / custom objects into JSON-serializable structures.
    Fallback to string for anything unknown. Cycles are guarded by object id set.
    """
    if _seen is None:
        _seen = set()
    # Primitives
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, datetime):
        return obj.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    oid = id(obj)
    if oid in _seen:
        return "<recursion>"
    _seen.add(oid)
    if isinstance(obj, Mapping):
        return {str(k): _to_jsonable(v, _seen) for k, v in obj.items()}
    if isinstance(obj, Sequence) and not isinstance(obj, (str, bytes, bytearray)):
        return [_to_jsonable(v, _seen) for v in obj]
    # SDK objects: try _data, dict(), __dict__
    for attr in ("_data",):
        inner = getattr(obj, attr, None)
        if isinstance(inner, (Mapping, list, tuple)):
            return _to_jsonable(inner, _seen)
    if hasattr(obj, "__dict__"):
        data = {k: v for k, v in vars(obj).items() if not k.startswith("__") and not k.startswith("_")}
        if data:
            return _to_jsonable(data, _seen)
    # Fallback string
    return str(obj)

def serialize_thread(raw: Any) -> dict:
    base = _thread_raw_dict(raw)
    out = dict(base)  # shallow copy
    # Normalize created_at
    created_val = out.get("created_at") or out.get("createdAt")
    dt = _parse_created_at(created_val)
    if dt:
        out["created_at"] = dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    # Parse tool_resources if it is a string form of dict/JSON; if it's an object, convert safely
    tr = out.get("tool_resources")
    if isinstance(tr, str):
        parsed = None
        # First try JSON
        try:
            parsed = json.loads(tr)
        except Exception:
            # Try Python literal (service sometimes returns single quotes)
            try:
                parsed = ast.literal_eval(tr)
            except Exception:
                parsed = None
        if parsed is not None:
            out["tool_resources"] = parsed
    elif tr is not None and not isinstance(tr, (dict, list, tuple)):
        out["tool_resources"] = _to_jsonable(tr)
    # Ensure entire structure is JSON-safe
    out = _to_jsonable(out)
    return out

def serialize_run(raw: Any) -> dict:
    """Serialize a run object to a JSON-safe dict with normalized created_at."""
    base = _thread_raw_dict(raw)  # same logic works for runs
    out = dict(base)
    created_val = out.get("created_at") or out.get("createdAt")
    dt = _parse_created_at(created_val)
    if dt:
        out["created_at"] = dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return _to_jsonable(out)

def list_agents(project_uri: str, timeout: float = 10.0) -> list[dict]:
    """List agents using Azure AI Projects SDK.

    Returns a list of plain dicts with keys: id, name, status (if available).
    """
    endpoint = project_uri.rstrip("/")
    try:
        client = AIProjectClient(endpoint=endpoint, credential=DefaultAzureCredential())
    except Exception as ex:
        raise ApiError(f"Failed to create AIProjectClient: {ex}") from ex

    try:
        with client:
            sdk_agents = list(client.agents.list_agents())  # generator -> list
    except Exception as ex:
        raise ApiError(f"Error listing agents: {ex}") from ex

    return [
        {
            "id": _get(a, 'id', ''),
            "name": _get(a, 'name', _get(a, 'id', '')),
            "status": _get(a, 'status', None),
        }
        for a in sdk_agents
    ]

def list_threads(project_uri: str, timeout: float = 10.0) -> list[dict]:
    """List threads in the project using Azure AI Projects SDK.

    Returns a list of plain dicts with full upstream payload plus normalized created_at.
    """
    endpoint = project_uri.rstrip("/")
    try:
        client = AIProjectClient(endpoint=endpoint, credential=DefaultAzureCredential())
    except Exception as ex:
        raise ApiError(f"Failed to create AIProjectClient: {ex}") from ex

    try:
        with client:
            if hasattr(client.agents.threads, 'list_threads'):
                sdk_threads_iter = client.agents.threads.list_threads()
            elif hasattr(client.agents.threads, 'list'):
                sdk_threads_iter = client.agents.threads.list()
            else:
                raise ApiError("Threads listing not supported by this SDK version")
            sdk_threads = list(sdk_threads_iter)
    except Exception as ex:
        raise ApiError(f"Error listing threads: {ex}") from ex

    return [serialize_thread(t) for t in sdk_threads]

def get_thread(project_uri: str, thread_id: str, timeout: float = 10.0) -> dict:
    """Retrieve a single thread by ID using Azure AI Projects SDK.

    Returns a plain dict with full upstream payload plus normalized created_at.
    """
    endpoint = project_uri.rstrip("/")
    try:
        client = AIProjectClient(endpoint=endpoint, credential=DefaultAzureCredential())
    except Exception as ex:
        raise ApiError(f"Failed to create AIProjectClient: {ex}") from ex

    try:
        with client:
            threads_client = client.agents.threads
            if hasattr(threads_client, 'get_thread'):
                t = threads_client.get_thread(thread_id)
            elif hasattr(threads_client, 'get'):
                t = threads_client.get(thread_id)
            elif hasattr(threads_client, 'retrieve'):
                t = threads_client.retrieve(thread_id)
            else:
                raise ApiError("Thread retrieval not supported by this SDK version")
    except Exception as ex:
        raise ApiError(f"Error retrieving thread '{thread_id}': {ex}") from ex

    return serialize_thread(t)

def list_runs(project_uri: str, thread_id: str, timeout: float = 10.0) -> list[dict]:
    """List runs for a given thread.

    Returns a list of plain dicts with full upstream payload plus normalized created_at.
    """
    endpoint = project_uri.rstrip("/")
    try:
        client = AIProjectClient(endpoint=endpoint, credential=DefaultAzureCredential())
    except Exception as ex:
        raise ApiError(f"Failed to create AIProjectClient: {ex}") from ex

    try:
        with client:
            threads_client = client.agents.threads
            runs_client = getattr(threads_client, 'runs', None)
            if runs_client is None:
                raise ApiError("Runs listing not supported by this SDK version (no 'runs' attribute)")
            # Try several possible method names for forward/backward compatibility
            if hasattr(runs_client, 'list_runs'):
                sdk_runs_iter = runs_client.list_runs(thread_id)
            elif hasattr(runs_client, 'list'):
                try:
                    sdk_runs_iter = runs_client.list(thread_id)
                except TypeError:
                    sdk_runs_iter = runs_client.list(thread_id=thread_id)
            else:
                raise ApiError("Runs listing not supported by this SDK version")
            sdk_runs = list(sdk_runs_iter)
    except ApiError:
        raise
    except Exception as ex:
        raise ApiError(f"Error listing runs for thread '{thread_id}': {ex}") from ex

    return [serialize_run(r) for r in sdk_runs]
