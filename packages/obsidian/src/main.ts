// ── Explicit Formula — The Loop (Obsidian plugin, Phase B P1) ─────────────────
//
// P1 scope: the loop panel (dump → lines → lock → redo → finish → copy /
// insert / answer). NO vault reads in P1 — context selection, write-backs,
// and the graph layer arrive in P2/P3 per the Phase B spec. Consumer copy is
// outcome-first: "lines" and "lock" — no mechanism words.

import {
  ItemView,
  MarkdownView,
  Notice,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  type TFile,
  type WorkspaceLeaf,
} from 'obsidian';
import type { LoopSpan } from '@rpcs1/core';
import { LoopClient, LoopClientError, assembleFinalPrompt } from './api.js';
import {
  isAllowed,
  selectSnippets,
  type CandidateNote,
  type SelectedSnippet,
  type SelectionLogEntry,
} from '@rpcs1/core';
import {
  composeContextPack,
  composeLearningsLine,
  composeSessionNote,
  LEARNINGS_HEADER,
  type SessionMeta,
} from './writeback.js';
import { ImportModal } from './import-modal.js';
import { planTopicWiring, type StubIn } from './topic-wiring.js';
import { buildConstellationSvg, pointFromStub, type ConstellationPoint } from './constellation.js';
import { composeAccommodationRecord } from './accommodation.js';
import {
  clampResponseDelay,
  dictationHint,
  normalizeTextScale,
  paceMs,
  srSpanLabel,
  TEXT_SCALE_FACTORS,
  type TextScale,
} from './ui-prefs.js';

export const VIEW_TYPE_LOOP = 'explicit-formula-loop';

interface LoopPluginSettings {
  endpoint: string;
  answerEnabled: boolean;
  /**
   * Comma-separated folder paths the loop may read for grounding.
   * EMPTY = vault reads OFF (privacy law 3 — the default).
   */
  allowedFolders: string;
  /** Folder for session notes + learnings (visible, editable files). */
  writeBackFolder: string;
  sessionNotesEnabled: boolean;
  learningsEnabled: boolean;
  /** Panel-local text scale — never overrides Obsidian's app-wide settings. */
  textScale: TextScale;
  /**
   * Pacing FLOOR (ms) between asking and seeing results — an accommodation
   * for users who need the AI to not respond instantly. 0 = off.
   */
  responseDelayMs: number;
  /** Free-text accommodation notes — the user's own words for their export (M3). */
  accommodationNotes: string;
}

const DEFAULT_SETTINGS: LoopPluginSettings = {
  endpoint: 'https://www.explicitformula.com',
  answerEnabled: true,
  allowedFolders: '',
  writeBackFolder: 'Loop',
  sessionNotesEnabled: true,
  learningsEnabled: true,
  textScale: 'default',
  responseDelayMs: 0,
  accommodationNotes: '',
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default class LoopPlugin extends Plugin {
  settings: LoopPluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_LOOP, (leaf) => new LoopView(leaf, this));

    this.addRibbonIcon('message-circle-question', 'Open the Loop', () => this.activateView());

    this.addCommand({
      id: 'draw-constellation',
      name: 'Draw my constellation (archive as a chart)',
      callback: async () => {
        const idx = 'Notes/Archive index';
        const files = this.app.vault.getMarkdownFiles().filter(
          (f) => f.path.startsWith(idx + '/') && !f.name.startsWith('_'),
        );
        const points: ConstellationPoint[] = [];
        for (const f of files) {
          const p = pointFromStub(await this.app.vault.cachedRead(f));
          if (p) points.push(p);
        }
        const svg = buildConstellationSvg(points);
        const svgPath = 'Constellation.svg';
        const existing = this.app.vault.getAbstractFileByPath(svgPath);
        if (existing && 'stat' in existing) await this.app.vault.modify(existing as never, svg);
        else await this.app.vault.create(svgPath, svg);
        const mdPath = 'Constellation.md';
        const md = '![[Constellation.svg]]\n\n*Regenerate anytime: command palette → "Draw my constellation". Topic labels and dates only — no conversation content.*\n';
        const mdFile = this.app.vault.getAbstractFileByPath(mdPath);
        if (mdFile && 'stat' in mdFile) await this.app.vault.modify(mdFile as never, md);
        else await this.app.vault.create(mdPath, md);
        new Notice(`Constellation drawn: ${points.length} conversations charted. Open Constellation.md.`);
        void this.app.workspace.openLinkText('Constellation', '', true);
      },
    });

    this.addCommand({
      id: 'wire-archive-topics',
      name: 'Wire my archive into topics (graph clusters)',
      callback: async () => {
        const idx = 'Notes/Archive index';
        const files = this.app.vault.getMarkdownFiles().filter(
          (f) => f.path.startsWith(idx + '/') && !f.name.startsWith('_'),
        );
        if (!files.length) {
          new Notice('No archive stubs found — run "Import my AI history" first.');
          return;
        }
        const stubs: StubIn[] = [];
        for (const f of files) stubs.push({ path: f.path, content: await this.app.vault.cachedRead(f) });
        const plan = planTopicWiring(stubs);
        const topicsDir = 'Notes/Topics';
        if (!this.app.vault.getAbstractFileByPath(topicsDir)) {
          await this.app.vault.createFolder(topicsDir).catch(() => { /* exists */ });
        }
        for (const h of plan.hubs) {
          const existing = this.app.vault.getAbstractFileByPath(h.path);
          if (existing && 'stat' in existing) await this.app.vault.modify(existing as never, h.content);
          else await this.app.vault.create(h.path, h.content);
        }
        for (const p of plan.patches) {
          const f = this.app.vault.getAbstractFileByPath(p.path);
          if (f && 'stat' in f) await this.app.vault.modify(f as never, p.content);
        }
        new Notice(`Wired: ${plan.counts.hubs} topic hubs, ${plan.counts.patched} stubs linked (${plan.counts.terms} terms). Open the graph.`);
      },
    });

    this.addCommand({
      id: 'import-ai-history',
      name: 'Import my AI history (ChatGPT / Claude)',
      callback: () => new ImportModal(this.app).open(),
    });

    this.addCommand({
      id: 'export-accommodation-profile',
      name: 'Export my accommodation profile',
      callback: async () => {
        const s = this.settings;
        const record = composeAccommodationRecord(
          {
            textScale: s.textScale,
            responseDelayMs: s.responseDelayMs,
            sessionNotesEnabled: s.sessionNotesEnabled,
            learningsEnabled: s.learningsEnabled,
            accommodationNotes: s.accommodationNotes,
          },
          {
            version: this.manifest.version,
            date: new Date().toISOString().slice(0, 10),
          },
        );
        const path = 'Accommodation profile.md';
        const existing = this.app.vault.getAbstractFileByPath(path);
        if (existing && 'stat' in existing) {
          await this.app.vault.modify(existing as never, record);
        } else {
          await this.app.vault.create(path, record);
        }
        new Notice('Accommodation profile exported — an ordinary note you can share or print.');
        void this.app.workspace.openLinkText('Accommodation profile', '', true);
      },
    });

    this.addCommand({
      id: 'open-loop-panel',
      name: 'Open the Loop panel',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'loop-from-selection',
      name: 'Start a loop from the selected text',
      editorCallback: (editor) => {
        const sel = editor.getSelection();
        if (!sel.trim()) {
          new Notice('Select some text first.');
          return;
        }
        this.activateView(sel);
      },
    });

    this.addCommand({
      id: 'copy-context-pack',
      name: 'Copy my context pack',
      callback: async () => {
        const folder = this.settings.writeBackFolder.trim() || 'Loop';
        const path = `${folder}/learnings.md`;
        const file = this.app.vault.getAbstractFileByPath(path);
        let lines: string[] = [];
        if (file && 'stat' in file) {
          const text = await this.app.vault.cachedRead(file as never);
          lines = text.split('\n');
        }
        await navigator.clipboard.writeText(composeContextPack(lines));
        new Notice(lines.some((l) => l.trim().startsWith('- '))
          ? 'Context pack copied — paste it before your prompt in any AI.'
          : 'Copied a starter pack — finish loop sessions to grow it.');
      },
    });

    this.addCommand({
      id: 'loop-from-note',
      name: 'Start a loop from this note',
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const text = view?.editor.getValue() ?? '';
        if (!text.trim()) {
          new Notice('Open a note with some text first.');
          return;
        }
        this.activateView(text.slice(0, 8000));
      },
    });

    this.addSettingTab(new LoopSettingTab(this));
  }

  async activateView(initialDump?: string) {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_LOOP)[0] ?? null;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_LOOP, active: true });
    }
    workspace.revealLeaf(leaf);
    const view = leaf.view;
    if (view instanceof LoopView && initialDump) view.startWithDump(initialDump);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    // Normalize defensively — data.json may predate these fields or hold junk.
    this.settings.textScale = normalizeTextScale(this.settings.textScale);
    this.settings.responseDelayMs = clampResponseDelay(this.settings.responseDelayMs);
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Live-apply panel preferences (text scale, pacing) to any open Loop views.
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_LOOP)) {
      if (leaf.view instanceof LoopView) leaf.view.refresh();
    }
  }
}

type Stage = 'input' | 'rounds' | 'final';

class LoopView extends ItemView {
  private readonly plugin: LoopPlugin;
  private stage: Stage = 'input';
  private dump = '';
  private spans: LoopSpan[] = [];
  private elected = new Set<string>();
  private round = 0;
  private held = false;
  private busy = false;
  private answer: string | null = null;
  /** The what-left-your-machine log for the latest round (disclosure law). */
  private contextLog: SelectionLogEntry[] = [];
  /**
   * Focus target applied on the next render — keyboard/screen-reader
   * continuity across full re-renders. 'lines' = first unlocked line,
   * 'prompt' = the finished prompt box, number = line index (after a toggle).
   */
  private pendingFocus: 'lines' | 'prompt' | number | null = null;
  /** Persistent polite live region (created once — see onOpen). */
  private statusEl: HTMLElement | null = null;
  /** Re-rendered body (everything except the live region). */
  private bodyEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: LoopPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_LOOP;
  }

  getDisplayText() {
    return 'The Loop';
  }

  getIcon() {
    return 'message-circle-question';
  }

  async onOpen() {
    const c = this.contentEl;
    c.addClass('ef-loop-view');
    if (Platform.isMobile) c.addClass('ef-mobile');
    // Persistent polite live region, created ONCE: screen readers only announce
    // mutations inside a region they already observe — a region rebuilt on every
    // render never announces. Visually hidden; visual equivalents live in the body.
    this.statusEl = c.createDiv({
      cls: 'ef-sr-status',
      attr: { 'aria-live': 'polite', role: 'status' },
    });
    this.bodyEl = c.createDiv();
    this.render();
  }

  /** Public so the settings tab can live-apply text scale to open panels. */
  refresh() {
    this.render();
  }

  private announce(text: string) {
    this.statusEl?.setText(text);
  }

  private disclosureText(): string {
    return this.contextLog.length > 0
      ? 'Left your machine this round: your dump + ' +
          this.contextLog.map((e) => `${e.source} (${e.chars} chars)`).join(' · ')
      : 'Left your machine this round: your dump only.';
  }

  startWithDump(dump: string) {
    this.dump = dump;
    this.stage = 'input';
    this.spans = [];
    this.elected.clear();
    this.round = 0;
    this.answer = null;
    this.render();
  }

  private client(): LoopClient {
    return new LoopClient({ endpoint: this.plugin.settings.endpoint });
  }

  private allowedFolders(): string[] {
    return this.plugin.settings.allowedFolders
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Gather allowlisted candidates (active note + 1/2-hop links + recent) and
   * run the local selector. Context must NEVER block the loop: any failure
   * returns empty and the round proceeds context-free.
   */
  private async gatherContext(): Promise<{ snippets: SelectedSnippet[]; log: SelectionLogEntry[] }> {
    const allow = this.allowedFolders();
    if (allow.length === 0) return { snippets: [], log: [] };
    try {
      const app = this.plugin.app;
      const active = app.workspace.getActiveFile();
      const resolved = app.metadataCache.resolvedLinks as Record<string, Record<string, number>>;
      const hopOf = new Map<string, 0 | 1 | 2 | 3>();
      if (active) {
        hopOf.set(active.path, 0);
        const out1 = Object.keys(resolved[active.path] ?? {});
        const in1 = Object.keys(resolved).filter((src) => resolved[src]?.[active.path]);
        for (const p of [...out1, ...in1]) if (!hopOf.has(p)) hopOf.set(p, 1);
        for (const p of Array.from(hopOf.keys())) {
          if (hopOf.get(p) !== 1) continue;
          for (const q of Object.keys(resolved[p] ?? {}).slice(0, 30)) {
            if (!hopOf.has(q)) hopOf.set(q, 2);
          }
        }
      }
      const files = app.vault.getMarkdownFiles();
      const recent = [...files].sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 15);
      const pool = new Map<string, TFile>();
      for (const f of files) if (hopOf.has(f.path)) pool.set(f.path, f);
      for (const f of recent) if (!pool.has(f.path)) pool.set(f.path, f);
      const candidates: CandidateNote[] = [];
      for (const f of pool.values()) {
        if (candidates.length >= 24) break; // bounded reads per round (mobile-friendly)
        if (!isAllowed(f.path, allow)) continue;
        if (f.stat.size > 200_000) continue; // skip huge notes
        const cache = app.metadataCache.getFileCache(f);
        const fmAliases = (cache?.frontmatter as Record<string, unknown> | undefined)?.aliases;
        const aliases = Array.isArray(fmAliases)
          ? fmAliases.map(String)
          : typeof fmAliases === 'string'
            ? [fmAliases]
            : [];
        const headings = (cache?.headings ?? []).map((h) => h.heading);
        const content = await app.vault.cachedRead(f);
        candidates.push({
          path: f.path,
          title: f.basename,
          aliases,
          headings,
          content,
          hop: hopOf.get(f.path) ?? 3,
          mtime: f.stat.mtime,
        });
      }
      return selectSnippets(this.dump, candidates, Date.now());
    } catch {
      return { snippets: [], log: [] };
    }
  }

  private async firstRound() {
    if (!this.dump.trim() || this.busy) return;
    this.busy = true;
    this.render();
    const t0 = Date.now();
    try {
      const ctx = await this.gatherContext();
      this.contextLog = ctx.log;
      const r = await this.client().startRound(this.dump, ctx.snippets);
      // Pacing floor counts from the tap — slow networks already satisfy it.
      await sleep(paceMs(this.plugin.settings.responseDelayMs, Date.now() - t0));
      this.spans = r.spans;
      this.elected.clear();
      this.round = 1;
      this.held = false;
      this.stage = 'rounds';
      this.pendingFocus = 'lines';
      this.announce(`Interpretation ready — ${r.spans.length} lines. ${this.disclosureText()}`);
    } catch (e) {
      new Notice(e instanceof LoopClientError ? e.message : 'Something went wrong — try again.');
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async nextRound() {
    if (this.busy) return;
    this.busy = true;
    this.render();
    const t0 = Date.now();
    try {
      const lockedTexts = new Set(
        this.spans.filter((s) => this.elected.has(s.id)).map((s) => s.text),
      );
      const ctx = await this.gatherContext();
      this.contextLog = ctx.log;
      const r = await this.client().nextRound(
        this.dump,
        this.spans,
        Array.from(this.elected),
        ctx.snippets,
      );
      await sleep(paceMs(this.plugin.settings.responseDelayMs, Date.now() - t0));
      this.spans = r.spans;
      this.elected = new Set(r.spans.filter((s) => lockedTexts.has(s.text)).map((s) => s.id));
      this.round += 1;
      this.held = r.serverRepaired || r.clientRepaired;
      this.pendingFocus = 'lines';
      this.announce(
        `Round ${this.round} — ${this.elected.size} of ${this.spans.length} locked.` +
          (this.held ? ' Your locked lines were held in place.' : '') +
          ` ${this.disclosureText()}`,
      );
    } catch (e) {
      new Notice(e instanceof LoopClientError ? e.message : 'Something went wrong — try again.');
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async answerHere() {
    if (this.busy) return;
    this.busy = true;
    this.render();
    const t0 = Date.now();
    try {
      const answer = await this.client().answer(assembleFinalPrompt(this.spans));
      await sleep(paceMs(this.plugin.settings.responseDelayMs, Date.now() - t0));
      this.answer = answer;
      this.announce('Answer ready.');
    } catch (e) {
      new Notice(e instanceof LoopClientError ? e.message : 'Could not answer here — copy the prompt instead.');
    } finally {
      this.busy = false;
      this.render();
    }
  }

  /** P3: session note + learnings line — visible files, wikilinked sources. */
  private async saveSession() {
    const s = this.plugin.settings;
    const folder = s.writeBackFolder.trim() || 'Loop';
    const prompt = assembleFinalPrompt(this.spans);
    const meta: SessionMeta = {
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      rounds: this.round,
      lockedCount: this.elected.size,
      totalLines: this.spans.length,
      sources: this.contextLog.map((e) => ({ source: e.source, path: e.path, chars: e.chars })),
    };
    try {
      if (!this.plugin.app.vault.getAbstractFileByPath(folder)) {
        await this.plugin.app.vault.createFolder(folder).catch(() => undefined);
      }
      let saved: string | null = null;
      if (s.sessionNotesEnabled) {
        const { basename, content } = composeSessionNote(prompt, this.answer, meta);
        let path = `${folder}/${basename}.md`;
        let n = 2;
        while (this.plugin.app.vault.getAbstractFileByPath(path)) {
          path = `${folder}/${basename}-${n}.md`;
          n += 1;
        }
        await this.plugin.app.vault.create(path, content);
        saved = path;
      }
      if (s.learningsEnabled) {
        const lpath = `${folder}/learnings.md`;
        const line = composeLearningsLine(meta);
        const existing = this.plugin.app.vault.getAbstractFileByPath(lpath);
        if (existing && 'stat' in existing) {
          await this.plugin.app.vault.process(existing as never, (t: string) =>
            t.endsWith('\n') ? t + line + '\n' : t + '\n' + line + '\n',
          );
        } else {
          await this.plugin.app.vault.create(lpath, LEARNINGS_HEADER + line + '\n');
        }
      }
      new Notice(saved ? `Saved to ${saved}` : 'Learnings updated.');
    } catch {
      new Notice('Could not save to the vault — check the write-back folder setting.');
    }
  }

  private insertIntoNote(text: string) {
    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice('Open a note to insert into.');
      return;
    }
    view.editor.replaceSelection(text);
    new Notice('Inserted.');
  }

  private render() {
    const root = this.bodyEl ?? this.contentEl;
    this.contentEl.style.setProperty(
      '--ef-scale',
      String(TEXT_SCALE_FACTORS[normalizeTextScale(this.plugin.settings.textScale)]),
    );
    root.empty();
    root.setAttr('aria-busy', String(this.busy));

    root.createEl('h4', { text: 'Say it once. Make sure it landed.' });
    const credit = root.createEl('p', { cls: 'ef-credit', text: 'powered by ' });
    const creditLink = credit.createEl('a', { text: 'rpcs1.dev', href: 'https://rpcs1.dev' });
    creditLink.setAttr('rel', 'noreferrer');

    if (this.stage === 'input') {
      const ta = root.createEl('textarea', {
        cls: 'ef-dump',
        attr: {
          placeholder: 'Dump it here exactly how it comes out — half-sentences, tangents, all of it.',
          maxlength: '8000',
          rows: '10',
          'aria-label': 'Brain dump',
        },
      });
      ta.value = this.dump;
      ta.addEventListener('input', () => (this.dump = ta.value));
      const hint = dictationHint(Platform.isMobile);
      if (hint) root.createEl('p', { cls: 'ef-dictation-hint', text: hint });
      const go = root.createEl('button', {
        cls: 'ef-go',
        text: this.busy ? 'Reading…' : 'Show me what it heard',
      });
      go.disabled = this.busy;
      go.addEventListener('click', () => void this.firstRound());
      return;
    }

    if (this.stage === 'rounds') {
      const orig = root.createEl('details');
      orig.createEl('summary', { text: 'What you said' });
      orig.createEl('div', { cls: 'ef-orig-text', text: this.dump });

      // Disclosure strip — the what-left-your-machine law, rendered inline.
      // (Also announced via the persistent live region when a round lands.)
      root.createEl('p', { cls: 'ef-strip', text: this.disclosureText() });

      root.createEl('p', { cls: 'ef-tap-prompt', text: 'Tap the lines that are right:' });
      if (this.held) {
        root.createEl('p', { cls: 'ef-held-note', text: 'Your locked lines were held in place.' });
      }
      const list = root.createDiv({ attr: { role: 'group', 'aria-label': 'Interpretation lines' } });
      this.spans.forEach((s, idx) => {
        const locked = this.elected.has(s.id);
        const b = list.createEl('button', {
          cls: 'ef-line' + (locked ? ' is-locked' : ''),
          text: (locked ? '✓ ' : '') + s.text,
          attr: {
            'aria-pressed': String(locked),
            'aria-label': srSpanLabel(s.text, locked, s.status),
          },
        });
        b.addEventListener('click', () => {
          if (this.elected.has(s.id)) this.elected.delete(s.id);
          else this.elected.add(s.id);
          this.pendingFocus = idx; // keep keyboard/switch focus on the toggled line
          this.render();
        });
      });
      const row = root.createDiv({ cls: 'ef-actions' });
      const redo = row.createEl('button', { text: this.busy ? 'Redoing…' : 'Redo the unlocked lines' });
      redo.disabled = this.busy || this.elected.size === 0 || this.elected.size === this.spans.length;
      redo.addEventListener('click', () => void this.nextRound());
      const done = row.createEl('button', { text: "It's right — finish it" });
      done.disabled = this.busy || this.spans.length === 0;
      done.addEventListener('click', () => {
        this.stage = 'final';
        this.pendingFocus = 'prompt';
        this.render();
      });
      root.createEl('p', {
        cls: 'ef-meta',
        text: `Round ${this.round} · ${this.elected.size}/${this.spans.length} locked`,
      });
      if (this.pendingFocus !== null) {
        const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('button.ef-line'));
        let target: HTMLButtonElement | undefined;
        if (typeof this.pendingFocus === 'number') {
          target = buttons[Math.min(this.pendingFocus, buttons.length - 1)];
        } else if (this.pendingFocus === 'lines') {
          target = buttons.find((el) => el.getAttribute('aria-pressed') === 'false') ?? buttons[0];
        }
        this.pendingFocus = null;
        target?.focus();
      }
      return;
    }

    // final
    const prompt = assembleFinalPrompt(this.spans);
    root.createEl('p', { text: 'Your prompt, ready to land:' });
    const box = root.createEl('div', {
      cls: 'ef-prompt-box',
      text: prompt,
      attr: { tabindex: '0', 'aria-label': 'Your finished prompt' },
    });
    const row = root.createDiv({ cls: 'ef-actions' });
    const copy = row.createEl('button', { text: 'Copy it' });
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(prompt);
      new Notice('Copied — paste it into any AI.');
    });
    const insert = row.createEl('button', { text: 'Insert into note' });
    insert.addEventListener('click', () => this.insertIntoNote(prompt));
    if (this.plugin.settings.sessionNotesEnabled || this.plugin.settings.learningsEnabled) {
      const save = row.createEl('button', { text: 'Save to my vault' });
      save.addEventListener('click', () => void this.saveSession());
    }
    if (this.plugin.settings.answerEnabled) {
      const ans = row.createEl('button', { text: this.busy ? 'Answering…' : 'Answer it here' });
      ans.disabled = this.busy || Boolean(this.answer);
      ans.addEventListener('click', () => void this.answerHere());
    }
    const back = row.createEl('button', { text: 'Back to the lines' });
    back.addEventListener('click', () => {
      this.stage = 'rounds';
      this.pendingFocus = 'lines';
      this.render();
    });
    if (this.answer) {
      root.createEl('p', { cls: 'ef-answer-label', text: 'The answer:' });
      root.createEl('div', { cls: 'ef-answer', text: this.answer });
    }
    if (this.pendingFocus === 'prompt') {
      this.pendingFocus = null;
      box.focus();
    }
  }
}

class LoopSettingTab extends PluginSettingTab {
  private readonly plugin: LoopPlugin;

  constructor(plugin: LoopPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Service address')
      .setDesc('Where interpretation runs. Only your dump text is sent — nothing else leaves this vault in this version.')
      .addText((t) =>
        t.setValue(this.plugin.settings.endpoint).onChange(async (v) => {
          this.plugin.settings.endpoint = v.trim() || DEFAULT_SETTINGS.endpoint;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Folders the loop may read')
      .setDesc(
        'Comma-separated folder paths used to ground interpretations in your own notes. ' +
          'EMPTY = the loop reads nothing from your vault (the default). Only small selected ' +
          'snippets are sent, and every round shows exactly what left your machine.',
      )
      .addText((t) =>
        t
          .setPlaceholder('notes, projects')
          .setValue(this.plugin.settings.allowedFolders)
          .onChange(async (v) => {
            this.plugin.settings.allowedFolders = v;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Write-back folder')
      .setDesc('Where finished sessions and the learnings note land — ordinary markdown files you can edit or delete. Session notes wikilink their source notes, so your graph view shows what grounded each prompt.')
      .addText((t) =>
        t
          .setPlaceholder('Loop')
          .setValue(this.plugin.settings.writeBackFolder)
          .onChange(async (v) => {
            this.plugin.settings.writeBackFolder = v.trim() || 'Loop';
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Save session notes')
      .setDesc('Off = "Save to my vault" only updates learnings.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.sessionNotesEnabled).onChange(async (v) => {
          this.plugin.settings.sessionNotesEnabled = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Track learnings')
      .setDesc('One line per finished session — fewer rounds over time means the loop is starting closer to what you mean.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.learningsEnabled).onChange(async (v) => {
          this.plugin.settings.learningsEnabled = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Allow answering in the panel')
      .setDesc('Off = the loop only produces the finished prompt for you to use elsewhere.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.answerEnabled).onChange(async (v) => {
          this.plugin.settings.answerEnabled = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Panel text size')
      .setDesc(
        'Scales text inside the Loop panel only — your Obsidian and theme settings stay in charge everywhere else.',
      )
      .addDropdown((d) =>
        d
          .addOptions({ default: 'Default', large: 'Large', larger: 'Larger' })
          .setValue(this.plugin.settings.textScale)
          .onChange(async (v) => {
            this.plugin.settings.textScale = normalizeTextScale(v);
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Response pacing')
      .setDesc(
        'A minimum time between asking and seeing results, for anyone who needs answers to not appear instantly. Slow connections already count toward it — pacing never adds on top.',
      )
      .addDropdown((d) =>
        d
          .addOptions({ '0': 'Instant', '1000': 'After 1 second', '2000': 'After 2 seconds' })
          .setValue(String(this.plugin.settings.responseDelayMs))
          .onChange(async (v) => {
            this.plugin.settings.responseDelayMs = clampResponseDelay(Number(v));
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Accommodation notes')
      .setDesc(
        'Your own words about what you need — included in "Export my accommodation profile" '
          + '(command palette). The export is an ordinary note: your settings + these notes, '
          + 'never any vault content or folder names.',
      )
      .addTextArea((t) =>
        t
          .setPlaceholder('e.g. I process written information best; instant walls of text are hard…')
          .setValue(this.plugin.settings.accommodationNotes)
          .onChange(async (v) => {
            this.plugin.settings.accommodationNotes = v.slice(0, 2000);
            await this.plugin.saveSettings();
          }),
      );
  }
}
