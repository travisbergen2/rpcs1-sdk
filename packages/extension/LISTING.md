# Explicit Formula — store listing package

Everything a store form asks for, ready to paste. The store-facing sections
come first; the maintainer's build and submission steps are at the bottom.
Written intuition-first on purpose: the mechanism lives one click deep at
explicitformula.com, not in the listing.

---

## Store-facing fields

**Name:** Explicit Formula

**Summary (≤ 132 characters):** Underlines words a reader could take two ways, before you send. Tap it, pick what you meant, or say it in your own words.

**Category:** Productivity (alternate: Communication)

**Language:** English

**Detailed description:**

Say it once. Land it right.

Explicit Formula watches what you type — in Gmail, Slack, a forum box, a doc, anywhere there's a text field — and puts a quiet amber underline under the words a reader could take more than one way. Not spelling. Not grammar. Meaning.

Tap the underline and you get three exits:

- **Pick the version you meant.** The readings your words support, as buttons. One tap adds a single clarifying sentence to the end of your message.
- **Say it in your own words.** A small box: type what you meant in a few words, and it's framed onto the end of your message. Your words are the ground truth; the tool only frames them.
- **It's fine as I wrote it.** Sometimes ambiguity is on purpose. One tap, and it stays quiet about that phrase.

Reading something instead of writing it? Select any text on any page, right-click, **How could this read?** — and see the readings a message supports, with a ready-to-copy "quick check — do you mean A, or B?" reply.

What it never does:

- It never rewrites your text. Nothing changes unless you tap something.
- It never scans messages you receive. The reading card opens only when you select text and ask.
- It never needs an account. There is nothing to sign up for.
- No ads. No selling data. Free for people.

Privacy, said plainly: to check a draft, the text in the field you're typing in (up to the last 4,000 characters) is sent over an encrypted connection to our own server at rpcs1.dev, checked, and answered. It is not stored there beyond a short-lived cache, not shared with anyone, and not used for anything except answering you. The extension keeps a small local log of which suggestions you accepted or dismissed — on your machine only — to improve future suggestions. Full policy: https://www.explicitformula.com/privacy

Made by one person who has been misread his whole life, for anyone who has ever heard "that's not what I meant."

**Single purpose statement:** Shows the sender, before sending, where a piece of text can be read more than one way, and offers three ways to make the intended reading explicit (pick a reading, say it in your own words, or leave it). On request, shows the readings a selected piece of text supports.

**Permission justifications:**

- `storage` — keeps a small local log (last 200 events) of which suggestions were accepted, retried, or dismissed, plus per-session mutes. Never transmitted.
- `contextMenus` — adds the right-click item **How could this read?** on selected text.
- `clipboardWrite` — fallback when a page's editor refuses programmatic insertion: the clarifying sentence is copied so the user can paste it; also powers the "Copy ask-back" buttons on the reading card.
- Host permission `https://rpcs1.dev/*` — the only network destination: the checking API. Calls are made from the background service worker so the extension needs no permission on the pages you write in.
- Content script on `<all_urls>` — the underline has to work in whatever text field the user is writing in (mail, chat, docs, forums). The script only reads the field the user is typing in, and only after they pause typing; it never touches the page's own document model (it draws an overlay).

**Data usage disclosure (Privacy tab):**

- Collects: *Personal communications* and *Website content* — the text of the field being typed in, sent to rpcs1.dev for checking; the selected text when the user asks "How could this read?".
- Not collected: identity, health, financial, authentication, location, browsing history, user activity outside the text field.
- Certify: not sold to third parties; not used or transferred for purposes unrelated to the item's single purpose; not used to determine creditworthiness or for lending.

**Privacy policy URL:** https://www.explicitformula.com/privacy
**Homepage URL:** https://www.explicitformula.com
**Support email:** travisbergen2@gmail.com

**Store assets:**

- Icon 128×128: `icons/icon-128.png` (also 16/32/48 for the toolbar).
- Small promo tile 440×280: `icons/promo-440x280.png`.
- Screenshots (at least one; 1280×800 or 640×400, PNG or JPEG): capture on a real page. Suggested set — (1) an ambiguous draft in a compose box with the amber underline; (2) the picker open with the readings and the "say it in your own words" box; (3) the right-click reading card on a selected message. Capture steps are in the maintainer section.

---

## For the maintainer (build, capture, submit)

**Build the upload file**

```
cd packages/extension
npm test          # node --test: logic + store-readiness tests
npm run pack      # dist/explicit-formula-extension-<version>.zip
```

The zip contains exactly: manifest.json, background.js, content.js, logic.js, styles.css, icons/icon-{16,32,48,128}.png. Nothing else. The `zip` CLI is required (macOS/Linux have it; on Windows, `Compress-Archive` the same file list with manifest.json at the top level).

**Capture screenshots** (the store will not accept the listing without at least one):

1. `chrome://extensions` → Developer mode → Load unpacked → `packages/extension`.
2. Open a Gmail compose window (or any text box). Type: `Can you fix it before they see it and send them the file?` and pause a second — the underline appears.
3. Screenshot at 1280×800 (or 640×400). Click the underline for the picker and screenshot again. Select some text on a page, right-click → **How could this read?** for the third.

**Chrome Web Store** (owner-only; the fee and review times below were true when written — verify at submission):

1. https://chrome.google.com/webstore/devconsole — register a developer account (one-time $5 fee), same Google account as the Vercel/GitHub owner is fine.
2. *New item* → upload the zip.
3. *Store listing*: paste Name, Summary, Description, Category, Language; upload the 128px icon, the promo tile, and the screenshots.
4. *Privacy*: paste the single purpose statement and each permission justification; tick the two data-collection boxes named above and the three certifications; enter the privacy policy URL.
5. *Distribution*: Public, all regions, free.
6. *Submit for review*. Typical review is one to three business days; items with `<all_urls>` content scripts sometimes draw a request to justify broad host access — the justification text above is the answer.

**Edge Add-ons**: https://partner.microsoft.com/dashboard/microsoftedge — free; upload the same zip and paste the same fields.

**Firefox**: not in this pass — Firefox requires `browser_specific_settings.gecko.id` in the manifest and a separate review; add when wanted.

**Honest limits to keep in the listing's spirit** (from the README): passive underlines come from a deterministic check that stays silent on clean text; the deeper reading suggestions use a model on the server with a per-IP daily budget, and the picker says so when it is out of deep checks rather than showing noise. Phrases split across formatting are missed; `<textarea>` fields get a corner badge instead of an inline underline.
