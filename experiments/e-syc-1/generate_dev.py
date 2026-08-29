#!/usr/bin/env python3
"""E-SYC-1 dev-pair generator (DEV SEEDS ONLY, per registration §2 C-SYN).

Same item answered under two register regimes via Google AI Studio's
OpenAI-compatible endpoint (gemini-2.5-flash-lite), paced 7s/call per the
Gateway Eval Runner skill's measured free-tier experience. Writes JSONL:
one record per (item, regime) reply. Slice with SLICE=start:end over the
call list (2 calls per item). GEMINI_API_KEY from env (never printed).
"""
import json, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
MODEL = "gemini-3.5-flash-lite"  # 2.5-flash-lite retired for new users (API 404, 2026-08-22)
PACE_SECONDS = 7

def main():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("FATAL: GEMINI_API_KEY not in env"); sys.exit(2)
    items = json.load(open(os.path.join(HERE, "items_dev.json")))["items"]
    prompts = json.load(open(os.path.join(HERE, "prompts.json")))
    calls = []
    for it in items:
        for regime in ("flattery", "calibration"):
            calls.append((it, regime))
    sl = os.environ.get("SLICE", f"0:{len(calls)}")
    start, end = (int(x) for x in sl.split(":"))
    out_path = os.path.join(HERE, f"dev_pairs_{start}_{end}.jsonl")
    done = 0
    with open(out_path, "w") as out:
        for it, regime in calls[start:end]:
            # NOTE: no "seed" field — Gemini's OpenAI-compat endpoint rejects it
            # (HTTP 400, verified 2026-08-22). Item seeds are recorded as
            # metadata/identifiers only; reproducibility = committed outputs.
            body = json.dumps({
                "model": MODEL,
                "temperature": 0.8,
                "max_tokens": 300,
                "messages": [
                    {"role": "system", "content": prompts[regime]},
                    {"role": "user", "content": it["text"]},
                ],
            }).encode()
            reply, err = None, None
            for attempt in range(3):
                try:
                    req = urllib.request.Request(
                        ENDPOINT, data=body,
                        headers={"content-type": "application/json", "authorization": f"Bearer {key}"},
                    )
                    with urllib.request.urlopen(req, timeout=60) as r:
                        data = json.loads(r.read())
                    reply = data["choices"][0]["message"]["content"]
                    break
                except Exception as e:  # noqa: BLE001 — record detail and retry with backoff
                    detail = getattr(e, "code", None) or getattr(e, "reason", None) or str(e)[:80]
                    err = f"{type(e).__name__}:{detail}"
                    time.sleep(8 * (attempt + 1))
            rec = {"seed": it["seed"], "regime": regime, "item": it["text"],
                   "reply": reply, "error": None if reply else err, "model": MODEL}
            out.write(json.dumps(rec) + "\n"); out.flush()
            done += 1
            print(f"[{start+done}/{end}] seed={it['seed']} {regime}: {'ok' if reply else 'ERR ' + str(err)}")
            time.sleep(PACE_SECONDS)
    print(f"wrote {out_path}")

if __name__ == "__main__":
    main()
