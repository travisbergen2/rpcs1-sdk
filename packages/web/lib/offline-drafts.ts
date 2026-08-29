/**
 * Offline draft store (M2) — the working-memory guarantee of the capture
 * surface: a brain dump survives a dead tab, a dead network, or a dead
 * backend. Backed by IndexedDB in the browser; the store interface is
 * injectable so the logic is unit-testable without a browser.
 *
 * Semantics:
 *  - One rolling draft (id "current") autosaves while the user types.
 *  - A send attempted while offline is preserved as its own draft
 *    (id "offline-<ts>") so nothing typed is ever lost.
 *  - Drafts are capped at MAX_DRAFTS (oldest evicted) and DRAFT_MAX_CHARS.
 *  - Nothing here auto-sends: interpretation only ever runs on the user's tap.
 */

export interface Draft {
  id: string;
  text: string;
  savedAt: number;
}

export interface DraftStore {
  put(draft: Draft): Promise<void>;
  list(): Promise<Draft[]>;
  remove(id: string): Promise<void>;
}

export const MAX_DRAFTS = 20;
export const DRAFT_MAX_CHARS = 8000;
export const CURRENT_ID = 'current';
const MIN_AUTOSAVE_CHARS = 10;

/** In-memory store: tests + SSR-safe no-op fallback. */
export class MemoryDraftStore implements DraftStore {
  private m = new Map<string, Draft>();
  async put(d: Draft) {
    this.m.set(d.id, d);
  }
  async list() {
    return Array.from(this.m.values()).sort((a, b) => b.savedAt - a.savedAt);
  }
  async remove(id: string) {
    this.m.delete(id);
  }
}

/** Browser store on raw IndexedDB (no dependency). */
export class IdbDraftStore implements DraftStore {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = new Promise((resolve, reject) => {
        const req = indexedDB.open('ef-loop', 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('drafts')) {
            req.result.createObjectStore('drafts', { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.db;
  }

  private tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return this.open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const t = db.transaction('drafts', mode);
          const req = fn(t.objectStore('drafts'));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        }),
    );
  }

  async put(d: Draft) {
    await this.tx('readwrite', (s) => s.put(d));
  }
  async list() {
    const all = await this.tx<Draft[]>('readonly', (s) => s.getAll() as IDBRequest<Draft[]>);
    return all.sort((a, b) => b.savedAt - a.savedAt);
  }
  async remove(id: string) {
    await this.tx('readwrite', (s) => s.delete(id));
  }
}

/** Pick the right store for the environment (SSR gets a harmless memory store). */
export function defaultDraftStore(): DraftStore {
  if (typeof indexedDB === 'undefined') return new MemoryDraftStore();
  return new IdbDraftStore();
}

function clip(text: string): string {
  return text.length > DRAFT_MAX_CHARS ? text.slice(0, DRAFT_MAX_CHARS) : text;
}

/** Save the rolling "current" draft (autosave while typing). */
export async function saveCurrentDraft(store: DraftStore, text: string, now = Date.now()) {
  const trimmed = text.trim();
  if (trimmed.length < MIN_AUTOSAVE_CHARS) return;
  await store.put({ id: CURRENT_ID, text: clip(text), savedAt: now });
}

/** Preserve a send that failed offline as its own durable draft. */
export async function saveOfflineDump(store: DraftStore, text: string, now = Date.now()) {
  const trimmed = text.trim();
  if (!trimmed) return;
  await store.put({ id: `offline-${now}`, text: clip(text), savedAt: now });
  await enforceCap(store);
}

async function enforceCap(store: DraftStore) {
  const all = await store.list();
  for (const d of all.slice(MAX_DRAFTS)) await store.remove(d.id);
}

/**
 * Trailing-debounce autosaver for the current draft. Injectable timers so
 * tests can drive it deterministically.
 */
export function makeDraftAutosaver(
  store: DraftStore,
  debounceMs = 800,
  timers: { set: typeof setTimeout; clear: typeof clearTimeout } = {
    set: setTimeout,
    clear: clearTimeout,
  },
): (text: string) => void {
  let handle: ReturnType<typeof setTimeout> | null = null;
  return (text: string) => {
    if (handle !== null) timers.clear(handle);
    handle = timers.set(() => {
      void saveCurrentDraft(store, text);
    }, debounceMs);
  };
}
