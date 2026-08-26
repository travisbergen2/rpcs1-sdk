// ── P4 import modal — "Import my AI history", zero terminal ──────────────────
//
// File picker accepts .json and .zip (ChatGPT export zip, Claude
// conversations-000.zip, either vendor's conversations.json, or Claude's
// claude_data.json manifest). Shape detection is automatic. The manifest case
// deliberately does NOT auto-download: its links are one-time-use and this
// plugin's disclosed network posture is explicitformula.com only — the modal
// shows the link to open in your own browser instead.

import { App, Modal, Notice } from 'obsidian';
import JSZip from 'jszip';
import { detectPayload, planImport, type Payload, type ImportPlan } from './importer.js';

const scoreZipEntry = (name: string) =>
  name.toLowerCase().includes('conversation') ? 0 : name.toLowerCase().includes('chat') ? 1 : 2;

export class ImportModal extends Modal {
  private busy = false;

  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Import my AI history' });
    contentEl.createEl('p', {
      text:
        'Pick your ChatGPT or Claude export — the zip, the conversations.json inside it, ' +
        'or Claude’s claude_data.json manifest. Everything runs on this machine.',
    });
    contentEl.createEl('p', {
      cls: 'setting-item-description',
      text:
        'Full conversations land in Private/Archive (no AI can read them). Research-topic ' +
        'index stubs (title + topics only) land in Notes/Archive index, plus a report that ' +
        'lists threads you may have forgotten.',
    });

    const input = contentEl.createEl('input', { type: 'file' });
    input.accept = '.json,.zip';
    input.multiple = true;
    input.style.margin = '0.75em 0';

    const status = contentEl.createEl('p', { cls: 'setting-item-description' });
    const results = contentEl.createDiv();

    input.addEventListener('change', async () => {
      if (this.busy || !input.files || input.files.length === 0) return;
      this.busy = true;
      input.disabled = true;
      try {
        await this.handleFiles(Array.from(input.files), status, results);
      } catch (e) {
        status.setText(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        this.busy = false;
        input.disabled = false;
        input.value = '';
      }
    });
  }

  private async payloadsFromFile(file: File, status: HTMLElement): Promise<Payload[]> {
    if (file.name.toLowerCase().endsWith('.zip')) {
      status.setText(`Opening ${file.name}…`);
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const entries = Object.values(zip.files)
        .filter((f) => !f.dir && f.name.toLowerCase().endsWith('.json'))
        .sort((a, b) => scoreZipEntry(a.name) - scoreZipEntry(b.name) || (a.name < b.name ? -1 : 1));
      const out: Payload[] = [];
      for (const entry of entries) {
        try {
          const payload = detectPayload(JSON.parse(await entry.async('string')));
          if (payload.kind === 'claude' || payload.kind === 'openai') out.push(payload);
          else if (payload.kind === 'claude-manifest' && !out.length) out.push(payload);
        } catch {
          /* not a JSON we can use — skip */
        }
      }
      if (!out.length) throw new Error(`${file.name} contains no conversations JSON this importer recognizes.`);
      return out.filter((p) => p.kind !== 'claude-manifest').length
        ? out.filter((p) => p.kind !== 'claude-manifest')
        : out;
    }
    status.setText(`Reading ${file.name}…`);
    return [detectPayload(JSON.parse(await file.text()))];
  }

  private async handleFiles(files: File[], status: HTMLElement, results: HTMLElement) {
    for (const file of files) {
      const payloads = await this.payloadsFromFile(file, status);
      for (const payload of payloads) {
        if (payload.kind === 'claude-manifest') {
          this.renderManifestHelp(results, payload.conversationsUrl);
          continue;
        }
        if (payload.kind === 'unknown') {
          results.createEl('p', { text: `${file.name}: not a conversations export. Structure (keys only):` });
          results.createEl('pre', { text: payload.structuralMap });
          continue;
        }
        const source = payload.kind === 'claude' ? 'anthropic' : 'openai';
        status.setText(`Planning import of ${payload.convos.length} ${source} conversations…`);
        const plan = planImport(payload.convos, source, new Date().toISOString());
        await this.executePlan(plan, status);
        this.renderSummary(results, source, plan);
      }
    }
    status.setText('Done.');
  }

  private renderManifestHelp(results: HTMLElement, url: string | null) {
    const box = results.createDiv();
    box.createEl('h3', { text: 'That file is Claude’s export manifest — the data isn’t in it.' });
    box.createEl('p', {
      text:
        'Its download links are one-time-use and belong in your own browser, so this plugin ' +
        'won’t fetch them. Open the conversations link below, let the zip download, then ' +
        'come back here and pick that zip.',
    });
    if (url) {
      const btn = box.createEl('button', { text: 'Open the conversations download link' });
      btn.addEventListener('click', () => window.open(url));
    } else {
      box.createEl('p', { text: 'No conversations entry found in this manifest — request a fresh export from Claude’s settings.' });
    }
  }

  private async executePlan(plan: ImportPlan, status: HTMLElement) {
    const folders = new Set<string>();
    const all = [...plan.archives, ...plan.stubs, plan.report];
    for (const f of all) folders.add(f.path.slice(0, f.path.lastIndexOf('/')));
    for (const dir of Array.from(folders).sort((a, b) => a.length - b.length)) {
      const parts = dir.split('/');
      for (let i = 1; i <= parts.length; i++) {
        const p = parts.slice(0, i).join('/');
        if (!this.app.vault.getAbstractFileByPath(p)) {
          await this.app.vault.createFolder(p).catch(() => { /* created concurrently — fine */ });
        }
      }
    }
    let written = 0;
    for (const f of all) {
      let path = f.path;
      // live-vault collisions (e.g. re-import): suffix rather than overwrite —
      // this importer never replaces an existing note.
      for (let i = 2; this.app.vault.getAbstractFileByPath(path); i++) {
        path = f.path.replace(/\.md$/, ` ${i}.md`);
      }
      await this.app.vault.create(path, f.content);
      written++;
      if (written % 50 === 0) {
        status.setText(`Writing notes… ${written}/${all.length}`);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
  }

  private renderSummary(results: HTMLElement, source: string, plan: ImportPlan) {
    const box = results.createDiv();
    box.createEl('h3', { text: `${source}: imported.` });
    const ul = box.createEl('ul');
    ul.createEl('li', { text: `${plan.counts.total} conversations → Private/Archive/${source} (no AI can read them)` });
    ul.createEl('li', { text: `${plan.counts.indexed} research-classified → index stubs in Notes/Archive index` });
    ul.createEl('li', { text: `${plan.counts.forgotten} possibly forgotten threads → ${plan.report.path.split('/').pop()}` });
    const btn = box.createEl('button', { text: 'Open the report' });
    btn.addEventListener('click', () => {
      void this.app.workspace.openLinkText(plan.report.path.replace(/\.md$/, ''), '', true);
      this.close();
    });
    new Notice(`Imported ${plan.counts.total} ${source} conversations.`);
  }

  onClose() {
    this.contentEl.empty();
  }
}
