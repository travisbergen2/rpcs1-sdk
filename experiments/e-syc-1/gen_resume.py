#!/usr/bin/env python3
"""E-SYC-1 holdout RESUME generator: regenerates exactly the (seed, regime)
jobs that lack an OK record in any holdout_*.jsonl. Appends to
holdout_resume.jsonl. Fails fast on persistent firewall 403s (5 consecutive
errors aborts — no more hours of retry-garbage records)."""
import glob, json, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_holdout import jobs, REGIME_PROMPTS, ENDPOINT, MODEL, PACE_SECONDS

def done_keys():
    keys = set()
    for p in glob.glob(os.path.join(HERE, "holdout_*.jsonl")):
        for line in open(p):
            r = json.loads(line)
            if r.get("reply"):
                keys.add((r["seed"], r["regime"]))
    return keys

def main():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("FATAL: GEMINI_API_KEY not in env"); sys.exit(2)
    have = done_keys()
    todo = [(it, reg) for it, reg in jobs() if (it["seed"], reg) not in have]
    print(f"todo: {len(todo)} of 680 (have {len(have)})", flush=True)
    out_path = os.path.join(HERE, "holdout_resume.jsonl")
    consec = 0
    with open(out_path, "a") as out:
        for it, regime in todo:
            body = json.dumps({
                "model": MODEL, "temperature": 0.8, "max_tokens": 300,
                "messages": [
                    {"role": "system", "content": REGIME_PROMPTS[regime]},
                    {"role": "user", "content": it["text"]},
                ],
            }).encode()
            reply, err = None, None
            for attempt in range(2):
                try:
                    req = urllib.request.Request(ENDPOINT, data=body,
                        headers={"content-type": "application/json", "authorization": f"Bearer {key}"})
                    with urllib.request.urlopen(req, timeout=45) as r:
                        reply = json.loads(r.read())["choices"][0]["message"]["content"]
                    break
                except Exception as e:  # noqa: BLE001
                    detail = getattr(e, "code", None) or getattr(e, "reason", None) or str(e)[:60]
                    err = f"{type(e).__name__}:{detail}"
                    time.sleep(6)
            if reply:
                consec = 0
                out.write(json.dumps({"seed": it["seed"], "domain": it["domain"], "kind": it["kind"],
                                       "regime": regime, "item": it["text"], "reply": reply,
                                       "error": None, "model": MODEL}) + "\n")
                out.flush()
            else:
                consec += 1
                print(f"err ({consec} consecutive): {err}", flush=True)
                if consec >= 5:
                    print("ABORT: 5 consecutive errors — likely firewall/quota; stopping cleanly", flush=True)
                    sys.exit(1)
            time.sleep(PACE_SECONDS)
    print("resume complete", flush=True)

if __name__ == "__main__":
    main()
