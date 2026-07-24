#!/usr/bin/env python3
"""Builds packages/core/eval/battery-v4.json under AUTHORING-V3.md as amended (T1').

Composition: 20 P / 16 C / 16 V / 20 N / 16 I / 12 M = 100. All cases fresh
(no reuse from v1/v2/v3). Expected entities are closed-class anaphora only;
plain definite descriptions never appear in expected entities and never make
a case expect clarification (T1').
"""
import json
from collections import Counter

def P(i, text, entities, intent):
    return dict(id=f"P{i:02d}", category="unresolved_pronoun", text=text, risk="advice",
                expect=dict(clarify=True, entities=entities, intent=intent))
def C(i, ctx, text, intent, mentions):
    return dict(id=f"C{i:02d}", category="context_resolvable", context=ctx, text=text, risk="advice",
                expect=dict(clarify=False, entities=[], intent=intent, canonical_mentions=mentions))
def V(i, text, entities, intent):
    return dict(id=f"V{i:02d}", category="underspecified", text=text, risk="advice",
                expect=dict(clarify=True, entities=entities, intent=intent))
def N(i, text, intent):
    return dict(id=f"N{i:02d}", category="clear_control", text=text, risk="casual",
                expect=dict(clarify=False, entities=[], intent=intent))
def I(i, text, intent, intent_not=None):
    e = dict(clarify=False, entities=[], intent=intent)
    if intent_not: e["intent_not"] = intent_not
    return dict(id=f"I{i:02d}", category="intent_trap", text=text, risk="casual", expect=e)
def M(i, text, entities, intent):
    return dict(id=f"M{i:02d}", category="mixed_intent", text=text, risk="advice",
                expect=dict(clarify=True, entities=entities, intent=intent))

cases = [
  # ── unresolved pronouns / deictics (20), cold ──
  P(1,  "has she confirmed for tomorrow?", ["she"], "question"),
  P(2,  "forward it to them when you get a sec", ["it", "them"], "instruction"),
  P(3,  "he still owes me an answer on the quote", ["he"], "general"),
  P(4,  "leave those by the door", ["those"], "instruction"),
  P(5,  "is this what you meant?", ["this"], "question"),
  P(6,  "they pushed the deadline again", ["they"], "general"),
  P(7,  "tell him it's a no from me", ["him", "it"], "instruction"),
  P(8,  "that keeps happening on my machine too", ["that"], "general"),
  P(9,  "can you drop these off at reception?", ["these"], "instruction"),
  P(10, "let's regroup there after the call", ["there"], "instruction"),
  P(11, "someone moved this without asking", ["someone", "this"], "general"),
  P(12, "did they countersign it yet?", ["they", "it"], "question"),
  P(13, "she wants him off the account", ["she", "him"], "general"),
  P(14, "route them to the new queue", ["them"], "instruction"),
  P(15, "why does it keep rejecting that?", ["it", "that"], "question"),
  P(16, "I think he took it personally", ["he", "it"], "opinion"),
  P(17, "put these somewhere they won't melt", ["these"], "instruction"),
  P(18, "ask her whether the slot moved", ["her"], "instruction"),
  P(19, "are those from the same batch?", ["those"], "question"),
  P(20, "somebody flagged this as urgent", ["somebody", "this"], "general"),

  # ── context resolvable (16) ──
  C(1,  ["Tomas sent the revised floor plan last night."], "did he include the second exit?", "question", ["Tomas"]),
  C(2,  ["The nightly backup job failed twice this week."], "rerun it and watch the logs", "instruction", ["backup"]),
  C(3,  ["Our supplier in Leeds raised prices by eight percent."], "what did they say caused it?", "question", ["Leeds"]),
  C(4,  ["The onboarding doc still references the old VPN."], "update it before the new cohort starts", "instruction", ["VPN"]),
  C(5,  ["Nadia is presenting the roadmap on Thursday."], "can you send her the latest numbers?", "instruction", ["Nadia"]),
  C(6,  ["The kiosk on the third floor froze during checkout."], "reboot it and log the incident", "instruction", ["kiosk"]),
  C(7,  ["Omar covered both shifts during the outage."], "should we comp him a day off?", "question", ["Omar"]),
  C(8,  ["The Fairview lease renewal came in 20 percent higher."], "flag it for the budget meeting", "instruction", ["Fairview"]),
  C(9,  ["My dentist rescheduled me to the 28th."], "put it on the family calendar", "instruction", ["28th"]),
  C(10, ["The export button times out on files over 50 megabytes."], "fix that before the demo", "instruction", ["export"]),
  C(11, ["The farmers market on Oak Street ends this season."], "we should go one more time before then", "opinion", ["Oak"]),
  C(12, ["The 6am train was cancelled; we're on the 7:40 instead."], "does it still make the connection?", "question", ["7:40"]),
  C(13, ["Lena's redesign cut support tickets in half."], "explain how she pulled that off", "explanation", ["Lena"]),
  C(14, ["The zoning hearing is set for the 15th."], "check whether public comment is allowed before we attend", "research", ["zoning"]),
  C(15, ["The intern's last day is Friday."], "get her feedback form in before then", "instruction", ["intern"]),
  C(16, ["The podcast audio clips at the two-minute mark."], "re-render it and swap the file", "instruction", ["podcast"]),

  # ── underspecified (16) ──
  V(1,  "give the deck more punch", [], "instruction"),
  V(2,  "deal with the stragglers however you see fit", [], "instruction"),
  V(3,  "run the usual checks before it ships", ["it"], "instruction"),
  V(4,  "make it read less stiff", ["it"], "instruction"),
  V(5,  "trim the fluff but keep the voice", [], "instruction"),
  V(6,  "can you liven up the opener a touch", [], "instruction"),
  V(7,  "sort out whatever's tripping it up", ["it"], "instruction"),
  V(8,  "ping the regulars about the change", [], "instruction"),
  V(9,  "massage it until it flows", ["it"], "instruction"),
  V(10, "I feel like the pricing page reads bland", [], "opinion"),
  V(11, "tidy the loose ends in the proposal", [], "instruction"),
  V(12, "warmer, but keep it professional", ["it"], "instruction"),
  V(13, "do the pricing thing the way we discussed", [], "instruction"),
  V(14, "arrange the assets like you normally would", [], "instruction"),
  V(15, "beef up the closing section", [], "instruction"),
  V(16, "make sure it plays well with the investors", ["it"], "instruction"),

  # ── clear controls (20) ──
  N(1,  "Summarize the attached incident report in four bullets.", "instruction"),
  N(2,  "What is the freezing point of seawater?", "question"),
  N(3,  "List the primary colors of light.", "question"),
  N(4,  "Convert 3.5 miles to kilometers.", "question"),
  N(5,  "Explain why airplanes leave contrails, step by step.", "explanation"),
  N(6,  "Write a one-line birthday message for a coworker named Priya.", "instruction"),
  N(7,  "How do you say 'thank you' in Japanese?", "question"),
  N(8,  "Draft a short email confirming the venue booking for the 12th.", "instruction"),
  N(9,  "What are typical symptoms of dehydration?", "question"),
  N(10, "Rewrite this without buzzwords: 'Let's leverage our core competencies going forward.'", "instruction"),
  N(11, "Explain how a bill becomes law in the United States.", "explanation"),
  N(12, "Set a reminder to water the plants every Tuesday at 8am.", "instruction"),
  N(13, "Name the five Great Lakes.", "question"),
  N(14, "Write a limerick about a forgetful robot.", "instruction"),
  N(15, "What currency is used in Switzerland?", "question"),
  N(16, "Proofread this sentence: 'Their going to review it tomorow.'", "instruction"),
  N(17, "How many milliliters are in a tablespoon?", "question"),
  N(18, "Compose a tagline for a neighborhood tool-lending library.", "instruction"),
  N(19, "Why do cats purr?", "explanation"),
  N(20, "Give me two antonyms for 'generous'.", "question"),

  # ── intent traps (16) ──
  I(1,  "Not asking for fixes, I just need to say today was rough.", "emotional_support", "instruction"),
  I(2,  "The demo bombed and I feel like garbage about it.", "emotional_support", "instruction"),
  I(3,  "Heads up: the offsite is the 22nd, not the 21st.", "correction"),
  I(4,  "Small fix — the client's name is spelled Aisha, not Aysha.", "correction"),
  I(5,  "How should I approach my first performance review as a manager?", "planning"),
  I(6,  "What's a sensible way to start budgeting on a variable income?", "planning"),
  I(7,  "Confirm the Meridian invoice matches their purchase order before we pay.", "research"),
  I(8,  "Frankly, weekly status meetings feel like theater to me.", "opinion"),
  I(9,  "Doesn't everyone secretly hate open-plan offices?", "opinion", "question"),
  I(10, "I'm so done with this sprint, everything broke at once.", "emotional_support", "instruction"),
  I(11, "Verify the caterer's headcount limit before we finalize invitations.", "research"),
  I(12, "That vendor call was two hours of my life I won't get back.", "general"),
  I(13, "My roommate ate my leftovers again and I'm fuming.", "emotional_support"),
  I(14, "Which reads better on a resume, 'led' or 'owned'?", "opinion"),
  I(15, "Double-check the totals in row 40 of the attached budget sheet.", "research"),
  I(16, "Is it weird that I actually enjoy Mondays?", "opinion", "question"),

  # ── mixed intents (12) ──
  M(1,  "Order the standing desks and also is assembly included and tell Marco the invoice is coming", [], "instruction"),
  M(2,  "The chart's mislabeled... redo the axes... and seriously who approved this version", [], "correction"),
  M(3,  "Text the sitter, and does the recital start at six or seven, and warm up the car", [], "instruction"),
  M(4,  "Patch the login bug, benchmark the fix, and find out who's on call this weekend", [], "instruction"),
  M(5,  "I'm swamped — reschedule the one-on-one if that's easier", [], "instruction"),
  M(6,  "Great draft overall but soften the intro and double-check the stats, post it tonight?", [], "question"),
  M(7,  "Update the banner, confirm the coupon code works, and message me when it's live", [], "instruction"),
  M(8,  "Rapid fire: headcount, runway, and when's the board call?", [], "question"),
  M(9,  "Skip this week's retro and if she sends the survey results summarize them for me", ["she"], "instruction"),
  M(10, "The bio is outdated, rewrite it, and honestly the headshot needs help too", [], "instruction"),
  M(11, "Push the release to Thursday — also did security ever finish their review?", [], "instruction"),
  M(12, "Draft the sponsorship pitch, see if last year's contact still works there, and cc the treasurer", [], "instruction"),
]

comp = Counter(c["category"] for c in cases)
assert comp == Counter({"unresolved_pronoun":20,"context_resolvable":16,"underspecified":16,
                        "clear_control":20,"intent_trap":16,"mixed_intent":12}), comp
assert len({c["id"] for c in cases}) == 100
VALID={"question","correction","explanation","planning","opinion","instruction","emotional_support","research","general"}
CLOSED = {"he","him","his","she","her","hers","they","them","their","it","its","this","that","these","those","there",
          "somebody","someone","something","somewhere","sometime"}
for c in cases:
    assert c["expect"]["intent"] in VALID, c["id"]
    for e in c["expect"]["entities"]:
        assert e.lower() in c["text"].lower(), (c["id"], e)
        assert e.lower() in CLOSED, (c["id"], e, "expected entity must be closed-class per T1'")

battery = {
  "version": "4.0.0",
  "frozen": "2026-07-24",
  "note": "Confirmatory battery under AUTHORING-V3.md as amended (T1', owner-approved 2026-07-24). 100 fresh cases, proportions = v3. Expected entities are closed-class anaphora only; plain definite descriptions never expect clarification. Frozen with rules baseline + SWAP bars (gates-v4.json) before any tuning of the closed-class fixes landed. Single confirmatory shot; pass margins per gates file.",
  "cases": cases,
}
json.dump(battery, open("packages/core/eval/battery-v4.json","w"), indent=2)
print(f"wrote battery-v4.json: {len(cases)} cases, composition OK, all entities closed-class")
