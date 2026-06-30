"""RPCS-1 Persona Packs — shareable style profiles for communication."""
import json, os, time

PERSONA_DIR = os.path.expanduser("~/.rpcs1_personas")

def _pack_path(pack_id: str) -> str:
    return os.path.join(PERSONA_DIR, f"{pack_id.replace('/', '_').replace(' ', '_')}.json")

def persona_create(creator_id: str, username: str, name: str, description: str,
                    style_profile_json: str, prompt_template: str, tags: list[str] | None = None) -> dict:
    try:
        style_profile = json.loads(style_profile_json) if isinstance(style_profile_json, str) else style_profile_json
    except json.JSONDecodeError as e:
        return {"error": f"Invalid style_profile JSON: {e}"}
    os.makedirs(PERSONA_DIR, exist_ok=True)
    pack = {"pack_id": f"{creator_id}/{name.lower().replace(' ', '_')}", "version": 1,
            "creator_id": creator_id, "username": username, "name": name, "description": description,
            "style_profile": style_profile, "prompt_template": prompt_template, "tags": tags or [],
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    with open(_pack_path(pack["pack_id"]), "w") as f:
        json.dump(pack, f, indent=2)
    return {"status": "ok", "pack": pack}

def persona_validate(pack_id: str) -> dict:
    path = _pack_path(pack_id)
    if not os.path.exists(path):
        return {"valid": False, "error": f"Pack not found: {pack_id}"}
    pack = json.load(open(path))
    required = ["pack_id", "version", "creator_id", "username", "name", "description", "style_profile", "prompt_template"]
    missing = [r for r in required if r not in pack]
    issues = []
    if missing: issues.append(f"Missing fields: {', '.join(missing)}")
    if not isinstance(pack.get("style_profile"), dict): issues.append("style_profile must be a JSON object")
    if not isinstance(pack.get("prompt_template"), str) or not pack["prompt_template"].strip(): issues.append("prompt_template must be non-empty")
    return {"valid": len(issues) == 0, "pack_id": pack_id, "issues": issues if issues else None,
            "pack": pack if len(issues) == 0 else None}

def persona_list(tag: str | None = None) -> dict:
    packs = []
    for fname in os.listdir(PERSONA_DIR):
        if not fname.endswith(".json"): continue
        pack = json.load(open(os.path.join(PERSONA_DIR, fname)))
        if tag and tag not in pack.get("tags", []): continue
        packs.append(pack)
    return {"count": len(packs), "packs": sorted(packs, key=lambda p: p.get("name", ""))}
