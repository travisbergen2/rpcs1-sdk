#!/usr/bin/env python3
"""Builds packages/core/eval/battery-v3.json under the frozen AUTHORING-V3.md spec.

Committed alongside the battery so the generation is reproducible and auditable.
Composition: 20 P / 16 C / 16 V / 20 N / 16 I / 12 M = 100.
All six adjudicated-arguable patterns avoided entirely (no edge cases needed).
"""
import json, sys
from collections import Counter

def P(i, text, entities, intent):  # unresolved pronoun → clarify true (T1)
    return dict(id=f"P{i:02d}", category="unresolved_pronoun", text=text, risk="advice",
                expect=dict(clarify=True, entities=entities, intent=intent))

def C(i, ctx, text, intent, mentions):  # context resolves → clarify false (F1)
    return dict(id=f"C{i:02d}", category="context_resolvable", context=ctx, text=text, risk="advice",
                expect=dict(clarify=False, entities=[], intent=intent, canonical_mentions=mentions))

def V(i, text, entities, intent):  # underspecified → clarify true (T4)
    return dict(id=f"V{i:02d}", category="underspecified", text=text, risk="advice",
                expect=dict(clarify=True, entities=entities, intent=intent))

def N(i, text, intent):  # clear control → clarify false (F5)
    return dict(id=f"N{i:02d}", category="clear_control", text=text, risk="casual",
                expect=dict(clarify=False, entities=[], intent=intent))

def I(i, text, intent, intent_not=None):  # intent trap → clarify false (F3/F4), no unresolved refs
    e = dict(clarify=False, entities=[], intent=intent)
    if intent_not: e["intent_not"] = intent_not
    return dict(id=f"I{i:02d}", category="intent_trap", text=text, risk="casual", expect=e)

def M(i, text, entities, intent):  # bundled diverging asks → clarify true (T5)
    return dict(id=f"M{i:02d}", category="mixed_intent", text=text, risk="advice",
                expect=dict(clarify=True, entities=entities, intent=intent))

cases = [
  # ── unresolved pronouns (20) — cold messages, no antecedent anywhere ──
  P(1,  "did they approve the transfer?", ["they"], "question"),
  P(2,  "send him the final version tonight", ["him"], "instruction"),
  P(3,  "she never answered my last message", ["she"], "general"),
  P(4,  "put it back where it was", ["it"], "instruction"),
  P(5,  "are these the right ones?", ["these"], "question"),
  P(6,  "he wants it done by monday", ["he", "it"], "general"),
  P(7,  "tell her I said yes", ["her"], "instruction"),
  P(8,  "that broke again this morning", ["that"], "general"),
  P(9,  "can you pick them up on your way?", ["them"], "instruction"),
  P(10, "let's meet there at noon", ["there"], "instruction"),
  P(11, "somebody left this on my desk", ["somebody", "this"], "general"),
  P(12, "is he coming to the review?", ["he"], "question"),
  P(13, "they said the shipment is delayed", ["they"], "general"),
  P(14, "hand these out before the session starts", ["these"], "instruction"),
  P(15, "she approved it but he hasn't", ["she", "it", "he"], "general"),
  P(16, "what did they mean by that?", ["they", "that"], "question"),
  P(17, "move it somewhere safer", ["it"], "instruction"),
  P(18, "ask him if the offer still stands", ["him"], "instruction"),
  P(19, "why is it still showing the old price?", ["it"], "question"),
  P(20, "I think those need to go out today", ["those"], "opinion"),

  # ── context resolvable (16) — antecedent in provided context (F1) ──
  C(1,  ["Elena submitted the grant proposal on Tuesday."], "did she hear back yet?", "question", ["Elena"]),
  C(2,  ["The staging server crashed during the load test."], "restart it and rerun the test", "instruction", ["staging"]),
  C(3,  ["Our landlord finally replied about the leak."], "what did he say?", "question", ["landlord"]),
  C(4,  ["The quarterly report is missing the churn table."], "add it before you send the report out", "instruction", ["churn"]),
  C(5,  ["Aunt Rosa is arriving Saturday morning."], "can you pick her up from the station?", "instruction", ["Rosa"]),
  C(6,  ["The printer on floor two is jammed again."], "log a ticket for it", "instruction", ["printer"]),
  C(7,  ["Priya led the payment-migration project solo."], "should we put her forward for the award?", "question", ["Priya"]),
  C(8,  ["The invoice from Delta Supplies doubled this month."], "flag it for finance review", "instruction", ["Delta"]),
  C(9,  ["My cardiologist moved my appointment to the 12th."], "add it to the shared calendar", "instruction", ["12th"]),
  C(10, ["The beta signup form is rejecting plus-sign emails."], "fix that before launch", "instruction", ["signup"]),
  C(11, ["Grandma's quilt shop closes at the end of the month."], "we should visit it before then", "opinion", ["quilt"]),
  C(12, ["The San Jose flight was cancelled; we rebooked through Phoenix."], "does it still land before dinner?", "question", ["Phoenix"]),
  C(13, ["Marta's proposal cut the budget by fifteen percent."], "walk me through how she got there", "explanation", ["Marta"]),
  C(14, ["The union vote is scheduled for the 3rd."], "find out whether it's binding before we comment", "research", ["union"]),
  C(15, ["The new hire starts Monday."], "get her a laptop by then", "instruction", ["new hire"]),
  C(16, ["The demo video renders at 720p only."], "bump it to 1080 and reupload", "instruction", ["video"]),

  # ── underspecified (16) — no concrete success criterion (T4) ──
  V(1,  "make the report pop a bit more", [], "instruction"),
  V(2,  "handle the follow-ups however makes sense", [], "instruction"),
  V(3,  "do the usual tweaks before it goes live", ["it"], "instruction"),
  V(4,  "make it feel more premium", ["it"], "instruction"),
  V(5,  "shorter and punchier please", [], "instruction"),
  V(6,  "can you jazz up the intro a little", [], "instruction"),
  V(7,  "fix whatever's making it slow", ["it"], "instruction"),
  V(8,  "give the usual crowd a heads up", [], "instruction"),
  V(9,  "tune it until it feels right", ["it"], "instruction"),
  V(10, "I think the launch page needs a better vibe", [], "opinion"),
  V(11, "smooth out the rough edges in the doc", [], "instruction"),
  V(12, "less corporate, more human", [], "instruction"),
  V(13, "do the thing we talked about with the pricing", [], "instruction"),
  V(14, "sort the files the way you usually do", [], "instruction"),
  V(15, "punch up the middle section", [], "instruction"),
  V(16, "make sure the tone lands with the board", [], "instruction"),

  # ── clear controls (20) — fully specified, must NOT clarify (F5) ──
  N(1,  "Summarize the attached meeting notes in five bullets.", "instruction"),
  N(2,  "What is the boiling point of water at sea level?", "question"),
  N(3,  "List the seven continents.", "question"),
  N(4,  "Convert 250 grams to ounces.", "question"),
  N(5,  "Explain why the sky is blue, step by step.", "explanation"),
  N(6,  "Write a two-line toast for a retirement party.", "instruction"),
  N(7,  "How do you say 'good morning' in Portuguese?", "question"),
  N(8,  "Draft a polite reply declining the meeting invitation for Thursday.", "instruction"),
  N(9,  "What are the common side effects of ibuprofen?", "question"),
  N(10, "Rewrite this sentence without jargon: 'We need to operationalize our synergies.'", "instruction"),
  N(11, "Explain how compound interest works.", "explanation"),
  N(12, "Set a reminder for the standup at 9:45 tomorrow.", "instruction"),
  N(13, "Name the planets in order from the sun.", "question"),
  N(14, "Write a haiku about traffic jams.", "instruction"),
  N(15, "What time zone is Mumbai in?", "question"),
  N(16, "Proofread this paragraph for spelling errors: 'The comittee recieved the report.'", "instruction"),
  N(17, "How many ounces are in a gallon?", "question"),
  N(18, "Compose a subject line for a newsletter about spring recipes.", "instruction"),
  N(19, "Why do leaves change color in autumn?", "explanation"),
  N(20, "Give me three synonyms for 'resilient'.", "question"),

  # ── intent traps (16) — register/function reading; no unresolved refs (F3/F4) ──
  I(1,  "I'm not looking for solutions, today just sucked.", "emotional_support", "instruction"),
  I(2,  "Honestly the launch went sideways and I'm gutted.", "emotional_support", "instruction"),
  I(3,  "Update: the venue is the Hilton, not the Marriott.", "correction"),
  I(4,  "Actually it's spelled Caitlin with a C.", "correction"),
  I(5,  "How should I structure my first month in the new role?", "planning"),
  I(6,  "What's the best way to start learning woodworking from zero?", "planning"),
  I(7,  "Verify the Henderson quote against their signed contract before we invoice.", "research"),
  I(8,  "In my opinion the four-approval deploy pipeline is overkill.", "opinion"),
  I(9,  "Isn't it obvious the pricing page needs work?", "opinion", "question"),
  I(10, "I could scream, the migration ate my weekend again.", "emotional_support", "instruction"),
  I(11, "Fact-check whether the venue really holds 300 before we print flyers.", "research"),
  I(12, "That outage post-mortem was brutal reading.", "general"),
  I(13, "My manager keeps taking credit for my work and I'm done.", "emotional_support"),
  I(14, "Which is better for a first pet, a cat or a dog?", "opinion"),
  I(15, "Double-check the math in cell B12 of the attached sheet.", "research"),
  I(16, "Is it just me or are these meetings getting longer?", "opinion", "question"),

  # ── mixed intents (12) — bundled diverging asks (T5); in-message-resolved refs excluded ──
  M(1,  "Book the conference room and also can we get better coffee and tell Raj the deck moved", [], "instruction"),
  M(2,  "The totals are wrong... redo the sheet... also who reviewed this", [], "correction"),
  M(3,  "Email the vendor, and does our plan cover weekend support, and cc Dana", [], "instruction"),
  M(4,  "Renew the cert, price out the upgrade, and find out who owns DNS now", [], "instruction"),
  M(5,  "I'm behind on everything — push the review if you have to", [], "instruction"),
  M(6,  "Loved the draft but trim part two and maybe rethink the title, send tonight?", [], "question"),
  M(7,  "Fix the header, check if analytics still fire, and ping me after", [], "instruction"),
  M(8,  "Quick one, well three: costs first, then timeline, then risks?", [], "question"),
  M(9,  "Cancel the Friday sync and if he replies about the audit forward it to me", ["he"], "instruction"),
  M(10, "The copy is stale, refresh it, and honestly the images too", [], "instruction"),
  M(11, "Move the launch to the 9th — oh and did legal ever sign off?", [], "instruction"),
  M(12, "Draft the renewal email, see whether pricing changed since March, and loop in accounting", [], "instruction"),
]

# ── invariants ──
comp = Counter(c["category"] for c in cases)
assert comp == Counter({"unresolved_pronoun":20,"context_resolvable":16,"underspecified":16,
                        "clear_control":20,"intent_trap":16,"mixed_intent":12}), comp
assert len({c["id"] for c in cases}) == 100
VALID_INTENTS={"question","correction","explanation","planning","opinion","instruction","emotional_support","research","general"}
for c in cases:
    assert c["expect"]["intent"] in VALID_INTENTS, c["id"]
    assert c["risk"] in {"casual","advice","high-stakes","safety-critical"}
    # spec: no expected entity may be resolvable in-message (manual review) — structural check:
    for e in c["expect"]["entities"]:
        assert e.lower() in c["text"].lower(), (c["id"], e)

battery = {
  "version": "3.0.0",
  "frozen": "2026-07-24",
  "note": "Confirmatory battery under AUTHORING-V3.md (SWAP/CLAIM gates, owner-adjudicated clarify ground truth). 100 cases, proportions = v1/v2 x2. All six adjudicated-arguable patterns avoided; no edge-tagged cases. SWAP bars instantiate from the rules baseline in gates-v3.json, computed before any model contact. Single confirmatory run; pass margins must exceed one case-equivalent; stability check per spec.",
  "cases": cases,
}
out = "packages/core/eval/battery-v3.json"
json.dump(battery, open(out, "w"), indent=2)
print(f"wrote {out}: {len(cases)} cases, composition OK")
