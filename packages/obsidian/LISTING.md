# Explicit Formula - The Loop — listing & launch copy

Paste-ready copy for the Obsidian community directory and the announcement.
Written intuition-first on purpose (outcome on the wrapper, mechanism one click
deep); the network-use disclosure comes first everywhere. Every claim traces to
the README; nothing here promises anything the plugin does not do.

---

## Submission fields (community.obsidian.md → Add plugin)

**Repository:** `travisbergen2/explicit-formula-loop` (the directory mirror —
canonical source is this package; see `scripts/mirror.mjs`)

**Plugin id:** `explicit-formula-loop` · **Name:** Explicit Formula - The Loop
**Author:** Travis Bergen · **Author URL:** https://www.explicitformula.com
**Release the directory pulls:** tag equal to `manifest.version` — `main.js`, `manifest.json`, `styles.css`

**Short description (the manifest's, 215 characters):**
> Brain-dump it. See what the AI actually heard. Lock the lines that are right, redo the rest, then send a prompt that lands. Interpretation runs via the explicitformula.com service (network use disclosed in the README).

**Free-text summary, if the form offers one:**
> A side panel for the moment before you send a prompt. Dump what you want in your own words, see the lines the AI actually heard, lock the ones that are right, and redo only the rest — until it reads like your own thought. Works on desktop and mobile. The text in the panel is sent to explicitformula.com to be interpreted; your vault is read only from folders you explicitly allow, and every round shows what left your machine.

**Category / tags, if asked:** Writing · AI · Accessibility

**Reviewer checklist (all satisfied as of 0.7.0):** manifest at repo root; `id`
unique, no "obsidian", not ending in "plugin"; name basic-Latin; description
≤ 250 chars ending with a period; `versions.json` maps the version to
`minAppVersion`; README + LICENSE (MIT) at root; release tag equals manifest
version with the three assets; network use disclosed; no telemetry; no
account; no default hotkeys; styles in `styles.css`; mobile-capable.
`tests/listing.test.ts` pins these rules.

---

## Forum post — Share & Showcase (forum.obsidian.md)

**Title:** Explicit Formula - The Loop: brain-dump a prompt, see what the AI heard, lock the right lines, redo the rest

*Up front, because it's the first thing I'd want to know:* this plugin sends
the text you type into its panel to my own server at explicitformula.com to
run the interpretation. Nothing else leaves your machine unless you explicitly
list vault folders it may read — and when you do, every round shows you
exactly which notes and how many characters it used. No account, no telemetry,
no ads. Off by default, visible when on. (README → Network use.)

---

I have been misread my whole life. "That's not what I meant" is the sentence I
have said most often, to people and now to AI. The Loop is the small tool I
built to stop saying it.

**What it does**

1. **Dump.** Type what you want the way you'd say it out loud — fragments,
   run-ons, half-thoughts. A ribbon icon or a command opens the panel; you can
   also start from a selection or from the whole note.
2. **See what it heard.** The panel shows the lines the AI actually took from
   your dump — its reading, not yours, line by line.
3. **Lock what's right, redo the rest.** Tap a line to lock it. Hit *Redo the
   unlocked lines* and only those get re-derived. Locked lines can never
   quietly change: they're checked verbatim, twice (once on the server, once
   inside the plugin), and put back if anything upstream drifts.
4. **Finish.** When it finally reads like your own thought: copy the finished
   prompt into any AI, insert it into your note, or answer it right there in
   the panel.

**Why it lives in Obsidian** — because your notes are the context an AI never
has. Allow a folder and the loop grounds its reading in a few small snippets
from your own notes, chosen locally, capped, and disclosed every round. Finish
a session and it can land as an ordinary note that wikilinks every note it
drew from — open the graph view and the conversation sits wired into the
knowledge it came from. (That write-back has an off switch. Everything it
writes is a plain, editable, deletable file.)

**Built for access** — for anyone for whom dense text, fine motor control, or
the pressure of an instant answer is the obstacle; that's the point of the
product, so it's the spec, not a retrofit: works on phones and tablets, 44px
tap targets on mobile, your keyboard's mic key dictates into the dump box, lock
state announced to screen readers, buttons for everything (no gesture ever
required), a panel-only text-size setting, an optional pacing floor so answers
don't appear instantly, no animations. If an accessibility barrier still bites
you, open an issue — barriers are treated as bugs.

**Also in the box:** import your ChatGPT or Claude history from the export
file (full text lands in a Private folder no connected AI can read; only titles
and topics get indexed), and wire that archive into topic hubs so the graph
shows clusters instead of a point cloud.

**Honest limits:** interpretation needs the network; there is no offline mode.
The topic hubs improve how the graph *looks*, not search — that claim was
tested and failed, so the README says so.

Install: Community plugins → search *Explicit Formula* (once the listing is
live), or the release from https://github.com/travisbergen2/explicit-formula-loop.
Source and issues: mirrored from https://github.com/travisbergen2/rpcs1-sdk
(`packages/obsidian`) — please file issues there. Free for people.

---

## Discord `#updates` (one line, developer role required)

> Explicit Formula - The Loop 0.7.0 — a panel that shows the lines the AI heard from your prompt, lets you lock the right ones and redo the rest, grounded (opt-in, disclosed) in your own notes. Network use: sends panel text to explicitformula.com. https://github.com/travisbergen2/explicit-formula-loop

## Reply templates

**"What leaves my machine?"** — Exactly two things, both visible: (1) the text
you type into the loop panel (your dump and the lines being re-derived) goes
to explicitformula.com to be interpreted; (2) if — and only if — you list
folders in *Settings → Folders the loop may read*, up to 6 short snippets
(≤ 2,400 characters total) from those folders go with it, chosen on your
machine, and the panel lists each note and its character count every round.
Empty the folder list and vault reads stop entirely. No telemetry, no account,
nothing stored by the plugin beyond your own notes.

**"Does it work on mobile?"** — Yes, iOS and Android; every tap target is at
least 44px on mobile, and your keyboard's mic key dictates into the dump box.

**"Offline / my own model?"** — Not yet. Interpretation runs on the
explicitformula.com service; the server address is configurable in settings
for anyone running their own instance, but there is no offline mode today.

**Copy rules for every public sentence about this plugin:** disclosure before
delight; "lines" and "lock," never mechanism words; free for people; never
claim the topic hubs improve search (tested, failed, stated).
