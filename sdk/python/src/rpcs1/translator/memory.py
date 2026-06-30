"""RPCS-1 Memory Store — persistent session memory for evidence and corrections."""
import json, os, time

MEMORY_DIR = os.path.expanduser("~/.rpcs1_memory")

def _store_path() -> str:
    os.makedirs(MEMORY_DIR, exist_ok=True)
    return os.path.join(MEMORY_DIR, "memory_store.json")

def _load() -> list[dict]:
    path = _store_path()
    return json.load(open(path)) if os.path.exists(path) else []

def _save(entries: list[dict]) -> None:
    with open(_store_path(), "w") as f:
        json.dump(entries, f, indent=2)

def memory_add(observation: str, tags: list[str] | None = None, importance: str = "normal") -> dict:
    entries = _load()
    entry = {"id": len(entries) + 1, "observation": observation, "tags": tags or [],
             "importance": importance, "timestamp": time.time(),
             "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    entries.append(entry)
    _save(entries)
    return {"status": "ok", "entry": entry}

def memory_list(tag: str | None = None) -> dict:
    entries = _load()
    if tag: entries = [e for e in entries if tag in e.get("tags", [])]
    return {"count": len(entries), "entries": sorted(entries, key=lambda e: e.get("timestamp", 0), reverse=True)}

def memory_search(query: str) -> dict:
    q = query.lower()
    entries = [e for e in _load() if q in e.get("observation", "").lower() or any(q in t.lower() for t in e.get("tags", []))]
    return {"query": query, "count": len(entries), "entries": sorted(entries, key=lambda e: e.get("timestamp", 0), reverse=True)}

def memory_clear() -> dict:
    _save([])
    return {"status": "ok", "message": "Memory cleared"}
