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
  Plugin,
  PluginSettingTab,
  Setting,
  type WorkspaceLeaf,
} from 'obsidian';
import type { LoopSpan } from '@rpcs1/core';
import { LoopClient, LoopClientError, assembleFinalPrompt } from './api.js';

export const VIEW_TYPE_LOOP = 'explicit-formula-loop';

interface LoopPluginSettings {
  endpoint: string;
  answerEnabled: boolean;
}

const DEFAULT_SETTINGS: LoopPluginSettings = {
  endpoint: 'https://www.explicitformula.com',
  answerEnabled: true,
};

export default class LoopPlugin extends Plugin {
  settings: LoopPluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_LOOP, (leaf) => new LoopView(leaf, this));

    this.addRibbonIcon('message-circle-question', 'Open the Loop', () => this.activateView());

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
  }

  async saveSettings() {
    await this.saveData(this.settings);
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
    this.render();
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

  private async firstRound() {
    if (!this.dump.trim() || this.busy) return;
    this.busy = true;
    this.render();
    try {
      const r = await this.client().startRound(this.dump);
      this.spans = r.spans;
      this.elected.clear();
      this.round = 1;
      this.held = false;
      this.stage = 'rounds';
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
    try {
      const lockedTexts = new Set(
        this.spans.filter((s) => this.elected.has(s.id)).map((s) => s.text),
      );
      const r = await this.client().nextRound(this.dump, this.spans, Array.from(this.elected));
      this.spans = r.spans;
      this.elected = new Set(r.spans.filter((s) => lockedTexts.has(s.text)).map((s) => s.id));
      this.round += 1;
      this.held = r.serverRepaired || r.clientRepaired;
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
    try {
      this.answer = await this.client().answer(assembleFinalPrompt(this.spans));
    } catch (e) {
      new Notice(e instanceof LoopClientError ? e.message : 'Could not answer here — copy the prompt instead.');
    } finally {
      this.busy = false;
      this.render();
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
    const root = this.contentEl;
    root.empty();
    root.addClass('ef-loop-view');

    root.createEl('h4', { text: 'Say it once. Make sure it landed.' });

    if (this.stage === 'input') {
      const ta = root.createEl('textarea', {
        attr: { placeholder: 'Dump it here exactly how it comes out — half-sentences, tangents, all of it.', maxlength: '8000', rows: '10' },
      });
      ta.style.width = '100%';
      ta.value = this.dump;
      ta.addEventListener('input', () => (this.dump = ta.value));
      const go = root.createEl('button', { text: this.busy ? 'Reading…' : 'Show me what it heard' });
      go.disabled = this.busy;
      go.style.marginTop = '8px';
      go.addEventListener('click', () => void this.firstRound());
      return;
    }

    if (this.stage === 'rounds') {
      const orig = root.createEl('details');
      orig.createEl('summary', { text: 'What you said' });
      orig.createEl('div', { text: this.dump }).style.opacity = '0.75';

      root.createEl('p', { text: 'Tap the lines that are right:' }).style.marginTop = '8px';
      if (this.held) {
        const note = root.createEl('p', { text: 'Your locked lines were held in place.' });
        note.style.fontSize = '0.85em';
        note.style.opacity = '0.8';
      }
      const list = root.createDiv();
      for (const s of this.spans) {
        const locked = this.elected.has(s.id);
        const b = list.createEl('button', { text: (locked ? '✓ ' : '') + s.text });
        b.style.display = 'block';
        b.style.width = '100%';
        b.style.textAlign = 'left';
        b.style.margin = '4px 0';
        b.style.whiteSpace = 'normal';
        if (locked) b.style.borderColor = 'var(--color-green)';
        b.addEventListener('click', () => {
          if (this.elected.has(s.id)) this.elected.delete(s.id);
          else this.elected.add(s.id);
          this.render();
        });
      }
      const row = root.createDiv();
      row.style.marginTop = '8px';
      const redo = row.createEl('button', { text: this.busy ? 'Redoing…' : 'Redo the unlocked lines' });
      redo.disabled = this.busy || this.elected.size === 0 || this.elected.size === this.spans.length;
      redo.addEventListener('click', () => void this.nextRound());
      const done = row.createEl('button', { text: "It's right — finish it" });
      done.style.marginLeft = '6px';
      done.disabled = this.busy || this.spans.length === 0;
      done.addEventListener('click', () => {
        this.stage = 'final';
        this.render();
      });
      const meta = root.createEl('p', {
        text: `Round ${this.round} · ${this.elected.size}/${this.spans.length} locked`,
      });
      meta.style.fontSize = '0.85em';
      meta.style.opacity = '0.7';
      return;
    }

    // final
    const prompt = assembleFinalPrompt(this.spans);
    root.createEl('p', { text: 'Your prompt, ready to land:' });
    const box = root.createEl('div', { text: prompt });
    box.style.border = '1px solid var(--background-modifier-border)';
    box.style.borderRadius = '6px';
    box.style.padding = '8px';
    box.style.userSelect = 'text';
    const row = root.createDiv();
    row.style.marginTop = '8px';
    const copy = row.createEl('button', { text: 'Copy it' });
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(prompt);
      new Notice('Copied — paste it into any AI.');
    });
    const insert = row.createEl('button', { text: 'Insert into note' });
    insert.style.marginLeft = '6px';
    insert.addEventListener('click', () => this.insertIntoNote(prompt));
    if (this.plugin.settings.answerEnabled) {
      const ans = row.createEl('button', { text: this.busy ? 'Answering…' : 'Answer it here' });
      ans.style.marginLeft = '6px';
      ans.disabled = this.busy || Boolean(this.answer);
      ans.addEventListener('click', () => void this.answerHere());
    }
    const back = row.createEl('button', { text: 'Back to the lines' });
    back.style.marginLeft = '6px';
    back.addEventListener('click', () => {
      this.stage = 'rounds';
      this.render();
    });
    if (this.answer) {
      root.createEl('p', { text: 'The answer:' }).style.marginTop = '10px';
      const a = root.createEl('div', { text: this.answer });
      a.style.opacity = '0.9';
      a.style.userSelect = 'text';
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
      .setName('Allow answering in the panel')
      .setDesc('Off = the loop only produces the finished prompt for you to use elsewhere.')
      .addToggle((t) =>
        t.setValue(this.plugin.settings.answerEnabled).onChange(async (v) => {
          this.plugin.settings.answerEnabled = v;
          await this.plugin.saveSettings();
        }),
      );
  }
}
