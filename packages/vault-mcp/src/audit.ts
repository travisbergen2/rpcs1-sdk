// ── The vault-side access log ─────────────────────────────────────────────────
//
// One markdown line per tool call: what was asked, and exactly what left the
// vault (paths and character counts — never content). The disclosure
// HIERARCHY matters: the mandatory disclosure is inside every tool result
// (the AI app shows it), so a failed audit write must never block or hide a
// read — this file is the durable, greppable convenience layer on top.
// Best-effort by design; failures are reported in the tool result text.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export const AUDIT_BASENAME = 'mcp-audit.md';

export const AUDIT_HEADER = [
  '# Second-brain access log',
  '',
  'One line per tool call from a connected AI app — what was asked and exactly',
  'what left this vault (note paths and character counts, never content).',
  'Editable, deletable, or disable entirely with --no-audit; the same',
  'disclosure always appears in the tool results the AI app shows you.',
  '',
  '',
].join('\n');

export function auditLine(dateIso: string, client: string, tool: string, summary: string): string {
  return `- ${dateIso} · ${client} · ${tool} · ${summary}`;
}

export interface AuditOutcome {
  ok: boolean;
  error?: string;
}

export async function appendAudit(
  vaultRoot: string,
  writeBackFolder: string,
  line: string,
): Promise<AuditOutcome> {
  try {
    const dir = path.join(vaultRoot, writeBackFolder);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, AUDIT_BASENAME);
    let exists = true;
    try {
      await fs.access(file);
    } catch {
      exists = false;
    }
    if (!exists) await fs.writeFile(file, AUDIT_HEADER, 'utf8');
    await fs.appendFile(file, line + '\n', 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
