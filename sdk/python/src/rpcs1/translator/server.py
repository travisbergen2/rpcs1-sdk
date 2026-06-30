"""RPCS-1 Translator CLI — invoked via `python -m rpcs1.translator.server`."""
import argparse, json, sys
_v = '1.9.0'
from .interpreter import interpret, normalize, split
from .rewriter import rewrite, list_styles
from .router import route, list_routes
from .memory import memory_add, memory_list, memory_search, memory_clear
from .persona import persona_create, persona_validate, persona_list
from .scoring import resolve_ambiguity, candidate_from_dict

PROTOCOL = "RPCS-1 / HF-HATP v1.9"

def _pj(d): print(json.dumps(d, indent=2, default=str))


def get_manifest() -> dict:
    from .rewriter import REWRITE_STYLES
    from .router import TASK_ROUTES
    return {
        "protocol": PROTOCOL, "version": _v,
        "tools": {
            "interpret": {"description": "Interpret a message using RPCS-1",
                          "parameters": {"text": "string (required)", "risk": "casual|advice|high-stakes|safety-critical"}},
            "normalize": {"description": "Normalize fragmented human input"},
            "split": {"description": "Split mixed intents"},
            "rewrite": {"description": "Rewrite for a target audience", "styles": list(REWRITE_STYLES.keys())},
            "route": {"description": "Route a task to a model family", "types": list(TASK_ROUTES.keys())},
            "memory": {"description": "Persistent memory store"},
            "persona": {"description": "Shareable style profiles"},
            "score": {"description": "Score candidates with the Signature Ambiguity Framework"},
        },
    }


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="rpcs1.translator", description=f"{PROTOCOL} — RPCS-1 Translator")
    parser.add_argument("--version", action="version", version=f"{_v} ({PROTOCOL})")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("manifest")
    ip = sub.add_parser("interpret"); ip.add_argument("text"); ip.add_argument("--risk", choices=["casual","advice","high-stakes","safety-critical"], default="advice"); ip.add_argument("--no-inference", action="store_true"); ip.add_argument("--context")
    nm = sub.add_parser("normalize"); nm.add_argument("text")
    sp = sub.add_parser("split"); sp.add_argument("text")
    rw = sub.add_parser("rewrite"); rw.add_argument("text"); rw.add_argument("--style", choices=["technical","plain","socially_gentle","concise","detailed","direct"], default="plain")
    rt = sub.add_parser("route"); rt.add_argument("task_type"); rt.add_argument("--objective"); rt.add_argument("--allow-multi-model", action="store_true")
    sc = sub.add_parser("score"); sc.add_argument("candidates_json"); sc.add_argument("--risk", choices=["casual","advice","high-stakes","safety-critical"], default="advice")
    mem = sub.add_parser("memory"); mem.add_argument("action", choices=["add","list","search","clear"]); mem.add_argument("value", nargs="?"); mem.add_argument("--tag", action="append"); mem.add_argument("--importance", choices=["normal","high"], default="normal")
    per = sub.add_parser("persona"); per.add_argument("action", choices=["create","validate","list"]); per.add_argument("--creator-id"); per.add_argument("--username"); per.add_argument("--name"); per.add_argument("--description"); per.add_argument("--style-profile"); per.add_argument("--prompt-template"); per.add_argument("--tag", action="append"); per.add_argument("--pack-id")

    args = parser.parse_args(argv)
    if args.command == "manifest": _pj(get_manifest())
    elif args.command == "interpret": _pj(interpret(args.text, context=args.context, no_inference=args.no_inference, risk=args.risk))
    elif args.command == "normalize": _pj(normalize(args.text))
    elif args.command == "split": _pj(split(args.text))
    elif args.command == "rewrite": _pj(rewrite(args.text, style=args.style))
    elif args.command == "route": _pj(route(args.task_type, objective=args.objective, allow_multi_model=args.allow_multi_model))
    elif args.command == "score":
        try:
            candidates = [candidate_from_dict(c) for c in json.loads(args.candidates_json)]
            _pj(resolve_ambiguity(candidates, risk=args.risk).to_dict())
        except Exception as e: _pj({"error": str(e)})
    elif args.command == "memory":
        if args.action == "add": _pj(memory_add(args.value or "", tags=args.tag, importance=args.importance))
        elif args.action == "list": _pj(memory_list(tag=args.tag[0] if args.tag else None))
        elif args.action == "search": _pj(memory_search(args.value or ""))
        elif args.action == "clear": _pj(memory_clear())
    elif args.command == "persona":
        if args.action == "create": _pj(persona_create(args.creator_id or "", args.username or "", args.name or "", args.description or "", args.style_profile or "{}", args.prompt_template or "", tags=args.tag))
        elif args.action == "validate": _pj(persona_validate(args.pack_id or ""))
        elif args.action == "list": _pj(persona_list(tag=args.tag[0] if args.tag else None))
    else: parser.print_help()

if __name__ == "__main__": main()
