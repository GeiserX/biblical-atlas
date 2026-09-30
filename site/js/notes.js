/* biblical-earth · private notes (proposal 14 of the ideas on the graph and relations). A pencil on every card and on
   every chapter of the reading opens a small editor for a note about that entity or chapter; «Mis notas» in the Estudio
   menu lists them, opens the entity of each, exports them to a JSON file and imports them back.
   Notes live only in this browser's localStorage. They never go into the address bar, the shared link, a request or
   the console: nothing here registers a BE.parametros entry, calls fetch or logs.
   Keys are stable across data changes: «<type>:<id>» for an entity (the same text as a shared link's sel), and the wol.jw.org
   book number for Bible text: «chapter:44:16», and «span:44:16:4-9» for a verse range (kept for the reading by spans).
   Nothing written is ever lost by this module: text is never cut once typed, entries it does not understand are written
   back untouched, an unreadable store is kept aside under its own date, and a clash (an import, or another tab) keeps
   both versions until the person chooses. */
'use strict';
(() => {
const BE = window.BE;
const { esc } = BE;

const STORAGE_KEY = 'biblical-earth:notes';
const UNREADABLE_PREFIX = 'biblical-earth:notes:unreadable';
const FORMAT = 'biblical-atlas-notes';
const FORMATS = [FORMAT, 'biblical-earth-notes'];   // nombre-fijo: files and stores written before keep importing
const VERSION = 1;
const MAX_TEXT = 10000;   // what the note box lets a person type; text already stored or imported is never cut
const LIMIT_MSG = 'Has llegado al máximo de 10 000 caracteres.';
const NARROW = '(max-width: 760px)';

// Spanish names of the kinds of card. A type this list does not know still gets its notes, labelled «Ficha». A Map, so a
// key such as «constructor:x» from a hand-made file finds nothing instead of a function of Object.prototype.
const KIND_LABEL = new Map(Object.entries({
  persona: 'Persona', lugar: 'Lugar', evento: 'Suceso', carta: 'Carta', viaje: 'Viaje', parada: 'Parada', periodo: 'Periodo',
  hallazgo: 'Hallazgo', libro: 'Libro', recorrido: 'Recorrido', pasaje: 'Capítulo', chapter: 'Capítulo', span: 'Versículos',
}));
const kindLabel = (kind) => KIND_LABEL.get(kind) || 'Ficha';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
const chapterKey = (book, chapter) => `chapter:${book}:${chapter}`;
/** Key of a verse range inside one chapter. For the reading by spans (proposal 13): notes already open and list them. */
const spanKey = (book, chapter, from, to = from) => `span:${book}:${chapter}:${from}-${to}`;
/** Key of what a selection shows. A chapter card («pasaje») shares its note with the same chapter in the reading. */
function keyForSel(sel) {
  if (!sel) return null;
  if (sel.tipo === 'pasaje') {
    const p = BE.pasajeDeId?.(sel.id);
    return p ? chapterKey(p.libro.num, p.cap) : null;
  }
  return `${sel.tipo}:${sel.id}`;
}
/** Any «<type>:<id>» is a key: a type this version does not know (a digit, a hyphen, a capital) is still read and kept. */
function parseKey(key) {
  const s = String(key);
  let m = s.match(/^chapter:(\d+):(\d+)$/);
  if (m) return { kind: 'chapter', book: +m[1], chapter: +m[2] };
  m = s.match(/^span:(\d+):(\d+):(\d+)-(\d+)$/);
  if (m) return { kind: 'span', book: +m[1], chapter: +m[2], from: +m[3], to: +m[4] };
  m = s.match(/^([^:\s]+):(\S.*)$/);
  if (m) return { kind: m[1], id: m[2] };
  return null;
}
const validKey = (key) => typeof key === 'string' && !!parseKey(key);
/** «pasaje:hch-16» (a hand-made file, or a shared link's sel pasted in one) is the note of its chapter, «chapter:44:16». */
function normalKey(key) {
  const k = parseKey(key);
  return (k?.kind === 'pasaje' && keyForSel({ tipo: 'pasaje', id: k.id })) || key;
}

/** What a key points at today: { kind, title, open, reading }. title and open are null when the data no longer has it:
    the note stays, with the name it had when it was written. */
function target(key) {
  const k = parseKey(key);
  if (!k) return { kind: 'Ficha', title: null, open: null, reading: false };
  if (k.kind === 'chapter' || k.kind === 'span') {
    const lib = (BE.LIBROS || []).find((l) => l.num === k.book);
    const id = lib && BE.idPasaje?.(lib, k.chapter);
    const ok = !!(id && BE.pasajeDeId?.(id));
    const verses = k.kind === 'span' ? `:${k.from}${k.to !== k.from ? `-${k.to}` : ''}` : '';
    return { kind: kindLabel(k.kind), title: ok ? `${lib.nombre} ${k.chapter}${verses}` : null, open: ok ? () => BE.lectura.abrir(id) : null, reading: true };
  }
  let sel = null;
  try { sel = BE.parseSel(key); } catch { sel = null; }
  return { kind: kindLabel(k.kind), title: sel ? BE.nombreSel(sel) : null, open: sel ? () => BE.seleccionar(sel) : null, reading: false };
}

// ---------------------------------------------------------------------------
// Storage: { format, version, notes: { key: { text, label, created, updated } } }
// ---------------------------------------------------------------------------
let blocked = '';       // a message when the stored notes must not be written
let blockedRaw = null;  // the stored text that must not be written over: offered as a download in «Mis notas»
let kept = {};          // entries of the store this version cannot read: written back untouched on every save

/** Reads the notes of a parsed store or export file. Entries it cannot read are counted and returned apart, untouched. */
function readEntries(entries) {
  const notes = {}, rest = {};
  let skipped = 0;
  for (const [key, n] of Object.entries(entries)) {
    const text = typeof n?.text === 'string' ? n.text : '';
    if (!validKey(key) || !text.trim()) { skipped++; rest[key] = n; continue; }
    const date = (x) => (typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? new Date(x).toISOString() : null);
    const updated = date(n.updated) || date(n.created) || new Date(0).toISOString();
    notes[key] = { text, label: typeof n.label === 'string' ? n.label.slice(0, 200) : '', created: date(n.created) || updated, updated };
  }
  return { notes, rest, skipped };
}
/** Checks a parsed store or export file. Returns { notes, rest, skipped }, or { error } with a message for the reader
    (plus the notes it could read, when they come from a newer version of the site). */
function validate(obj) {
  if (!obj || typeof obj !== 'object' || !FORMATS.includes(obj.format) || typeof obj.notes !== 'object' || !obj.notes || Array.isArray(obj.notes)) {
    return { error: 'Este fichero no son notas de biblical-earth.' };
  }
  if (!Number.isInteger(obj.version) || obj.version < 1) return { error: 'Este fichero no son notas de biblical-earth.' };
  // Older versions would be migrated here, one step at a time, before reading them. Version 1 is the first.
  const r = readEntries(obj.notes);
  if (obj.version > VERSION) return { ...r, error: 'Estas notas vienen de una versión más nueva del sitio: recarga la página y vuelve a probar.', newer: true };
  return r;
}
function read() {
  blocked = ''; blockedRaw = null; kept = {};
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch { blocked = 'Este navegador no deja guardar notas aquí.'; return {}; }
  if (raw == null) return {};
  let obj;
  try { obj = JSON.parse(raw); } catch { obj = null; }
  const v = validate(obj);
  if (v.newer) {
    // Shown as they are, read only: this version never writes over what a newer one saved.
    blocked = 'Tus notas se guardaron con una versión más nueva del sitio: recarga la página. Aquí se ven, pero no se cambian, para no perderlas.';
    blockedRaw = raw;
    return v.notes;
  }
  if (v.error) {
    // Unreadable: a copy goes aside under its own date (never over an older copy), and only then does the store start
    // again empty. With no room for the copy, nothing is written until the person takes the notes away.
    try { localStorage.setItem(`${UNREADABLE_PREFIX}:${new Date().toISOString()}`, raw); } catch {
      blocked = 'No se pudieron leer tus notas guardadas y este navegador no tiene sitio para apartar una copia. No se cambian, para no perderlas: descárgalas desde «Mis notas».';
      blockedRaw = raw;
      return {};
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* the copy is already safe */ }
    return {};
  }
  kept = v.rest;
  return v.notes;
}
/** Writes the notes read by the read() just before, with the entries it could not read put back as they were. */
function write(notes) {
  if (blocked) return false;
  const out = { ...kept, ...notes };
  try {
    if (Object.keys(out).length) localStorage.setItem(STORAGE_KEY, JSON.stringify({ format: FORMAT, version: VERSION, notes: out }));
    else localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch { return false; }
}
const all = () => read();
const get = (key) => (key ? read()[key] || null : null);
/** Saves the note of key and returns it, or null when it could not be saved. Empty text is not a note: nothing changes. */
function put(key, text, label) {
  const notes = read();
  if (blocked || !String(text).trim()) return null;
  const now = new Date().toISOString();
  notes[key] = { text: String(text), label: label || notes[key]?.label || '', created: notes[key]?.created || now, updated: now };
  return write(notes) ? notes[key] : null;
}
/** Deletes the note of key. Only «Sí, borrar la nota» calls it. */
function remove(key) {
  const notes = read();
  if (blocked) return false;
  delete notes[key];
  return write(notes);
}
/** The copies of unreadable stores kept aside: [{ key, when }], oldest first. */
function unreadableCopies() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(UNREADABLE_PREFIX)) out.push({ key: k, when: k.slice(UNREADABLE_PREFIX.length + 1) });
    }
  } catch { /* no storage: no copies */ }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------
// The pencil
// ---------------------------------------------------------------------------
// An icon with its name for screen readers and a tooltip, so it takes little more room than «Cerrar ficha» took alone. A
// note is marked by a dot (a shape, not a colour) and by its name, «Tu nota».
const PENCIL = '<svg class="be-i be-i--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16Z M13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
function pencilHtml(key, label) {
  if (!key) return '';
  const has = !!get(key);
  const what = has ? `Ver o cambiar tu nota sobre ${label}` : `Escribir una nota sobre ${label}`;
  return `<button type="button" class="be-btn be-btn--sm be-btn--ghost note-pencil${has ? ' note-pencil--has' : ''}" data-note-key="${esc(key)}" data-note-label="${esc(label)}" aria-haspopup="dialog" aria-label="${esc(what)}" title="${esc(what)}. Solo se guarda en este navegador.">${PENCIL}<span class="sr-only">${has ? 'Tu nota' : 'Nota'}</span></button>`;
}
/** The pencil of what a card shows (the cards call it through BE.cerrarHtml, in ficha.js). */
function pencilForSel(sel) {
  const key = keyForSel(sel);
  if (!key) return '';
  return pencilHtml(key, target(key).title || BE.nombreSel(sel));
}
/** The pencil of a chapter (the reading calls it for the chapter it shows). */
const pencilForChapter = (lib, chapter) => pencilHtml(chapterKey(lib.num, chapter), `${lib.nombre} ${chapter}`);
/** After a save the pencils already on screen change without repainting the card (that would lose its scroll). */
function refreshPencils(key) {
  for (const b of document.querySelectorAll('.note-pencil[data-note-key]')) {
    if (key != null && b.dataset.noteKey !== key) continue;
    const tmp = document.createElement('div');
    tmp.innerHTML = pencilHtml(b.dataset.noteKey, b.dataset.noteLabel);
    const nb = tmp.firstElementChild;
    b.className = nb.className;
    b.setAttribute('aria-label', nb.getAttribute('aria-label'));
    b.title = nb.title;
    b.innerHTML = nb.innerHTML;
  }
}

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------
/** The focus is lost when it sits on the body, on something removed or hidden, or inside a dialog that has closed. */
const lost = (a) => !a || a === document.body || !a.isConnected || !!a.closest('dialog:not([open])') || !(a.checkVisibility?.() ?? true);
/** The visible pencil of key; for Bible text the one in the reading first. */
function pencilOf(key) {
  const reading = target(key).reading;
  const bs = [...document.querySelectorAll(`.note-pencil[data-note-key="${CSS.escape(key)}"]`)].filter((b) => !lost(b));
  return (reading && bs.find((b) => b.closest('#vista-lectura'))) || bs.find((b) => b.closest('#panel-cuerpo')) || bs[0] || null;
}
/** Puts the focus on the pencil of key now and over the next frames: the card and the reading are painted on the next
    frame, and a repaint drops the focus. It never takes the focus from something the person has moved to. When no pencil
    shows up, the focus goes to the card. */
function focusPencilSoon(key, force) {
  const t0 = performance.now();
  let n = 0;
  const step = () => {
    const a = document.activeElement, want = pencilOf(key);
    const onOther = a?.classList?.contains('note-pencil') && a.dataset.noteKey === key && want && a !== want;
    const last = n >= 3 && performance.now() - t0 > 700;   // frames can be slow while the map draws: count time too
    if (want && ((force && n === 0) || lost(a) || onOther)) want.focus();
    else if (!want && last && lost(a)) document.getElementById('panel-cuerpo')?.focus();
    n++;
    if (!last) requestAnimationFrame(step);
  };
  step();
}

// ---------------------------------------------------------------------------
// Editor: one <dialog> for every note
// ---------------------------------------------------------------------------
// base: the «updated» of the note when the editor loaded it, to see a save made meanwhile in another tab. dirty: typed
// since the last save.
const ED = { key: null, label: '', timer: 0, base: null, dirty: false, failed: false, warned: false, confirmAt: 0, fromList: false };
function dialog(id, cls, html) {
  let d = document.getElementById(id);
  if (d) return d;
  d = document.createElement('dialog');
  d.id = id; d.className = cls;
  d.innerHTML = html;
  // Keys typed in a dialog are for the dialog: the site's own shortcuts (listened in the bubble phase) never see them,
  // so Escape closes the dialog without clearing the selection underneath and the arrows do not move the cursor of time.
  // The presentation mode listens in the capture phase and leaves open dialogs alone itself (recorridos.js).
  d.addEventListener('keydown', (e) => e.stopPropagation());
  document.body.appendChild(d);
  return d;
}
function editor() {
  const d = dialog('note-editor', 'note-dialog note-editor', `<form method="dialog" class="note-form">
      <h2 class="note-title" id="note-editor-title"></h2>
      <p class="note-privacy">Solo se guarda en este navegador. No va en el enlace compartido ni sale de aquí.</p>
      <label class="sr-only" for="note-text">Texto de la nota</label>
      <textarea id="note-text" class="note-text" rows="7" maxlength="${MAX_TEXT}" autocomplete="off"></textarea>
      <p class="note-status" id="note-status" role="status"></p>
      <div class="note-actions">
        <button type="button" class="be-btn be-btn--ghost note-delete" data-note-delete>Borrar la nota</button>
        <button type="button" class="be-btn note-keep" data-note-keep hidden>No, conservarla</button>
        <span class="be-spacer"></span>
        <button type="button" class="be-btn be-btn--ghost note-delete" data-note-delete-yes hidden>Sí, borrar la nota</button>
        <button type="button" class="be-btn" data-note-copy hidden>Copiar el texto</button>
        <button type="submit" class="be-btn be-btn--primary" value="done">Listo</button>
      </div>
    </form>`);
  d.setAttribute('aria-labelledby', 'note-editor-title');
  if (!d.dataset.ready) {
    d.dataset.ready = '1';
    const text = d.querySelector('#note-text');
    text.addEventListener('input', () => {
      ED.dirty = true;
      clearTimeout(ED.timer); ED.timer = setTimeout(flush, 400);
      resetDelete(false);
      if (text.value.length >= MAX_TEXT) status(LIMIT_MSG);
    });
    // Deleting takes two different buttons: the first press puts «No, conservarla» in its place, and «Sí, borrar la nota»
    // on the other side, so a double click or a double tap never deletes. It ignores a press in its first 500 ms too.
    d.querySelector('[data-note-delete]').addEventListener('click', () => {
      ED.confirmAt = performance.now();
      d.querySelector('[data-note-delete]').hidden = true;
      d.querySelector('[data-note-keep]').hidden = false;
      d.querySelector('[data-note-delete-yes]').hidden = false;
      d.querySelector('[data-note-keep]').focus();
      status('¿Borrar la nota? No se puede deshacer.');
    });
    d.querySelector('[data-note-keep]').addEventListener('click', () => resetDelete(true));
    d.querySelector('[data-note-delete-yes]').addEventListener('click', () => {
      if (performance.now() - ED.confirmAt < 500) return;
      clearTimeout(ED.timer); ED.dirty = false;
      if (!remove(ED.key)) { status(blocked || 'No se pudo borrar: este navegador no deja guardar aquí.'); return; }
      refreshPencils(ED.key);
      BE.avisar?.('Nota borrada.');
      d.close();
    });
    d.querySelector('[data-note-copy]').addEventListener('click', copyText);
    // «Listo» and Escape save at once: the close event comes later, and a reload could arrive before it. When the save
    // failed, the first «Listo» keeps the editor open, so the text can be copied before it is gone.
    const holdIfFailed = (e) => {
      flush();
      if (ED.failed && !ED.warned) {
        e.preventDefault();
        ED.warned = true;
        status('No se pudo guardar tu nota. Cópiala con «Copiar el texto» antes de cerrar; si pulsas «Listo» otra vez, se cierra sin guardarla.');
        d.querySelector('[data-note-copy]').focus();
      }
    };
    d.querySelector('form').addEventListener('submit', holdIfFailed);
    d.addEventListener('cancel', holdIfFailed);
    d.addEventListener('close', () => {
      flush();
      const key = ED.key;
      ED.key = null;
      const listD = document.getElementById('notes-list');
      if (ED.fromList && listD?.open) {
        // Opened from «Mis notas»: the list is repainted and the focus goes back to the same note in it.
        paintList();
        (listD.querySelector(`[data-notes-edit="${CSS.escape(key)}"]`) || listD.querySelector('[data-notes-close]')).focus();
        return;
      }
      // The browser gives the focus back to the pencil that opened the editor; when the card is repainted (now, or on
      // the next frame, after back or forward) it goes to the new pencil, or to the card.
      focusPencilSoon(key, false);
    });
  }
  return d;
}
/** Writes a message in the status line. The same message is not written again, so a screen reader hears it once. */
function status(msg, force) {
  const s = document.getElementById('note-status');
  if (s && (force || s.textContent !== msg)) s.textContent = msg;
}
function resetDelete(focus) {
  const d = document.getElementById('note-editor');
  if (!d || d.querySelector('[data-note-keep]').hidden) return;
  d.querySelector('[data-note-keep]').hidden = true;
  d.querySelector('[data-note-delete-yes]').hidden = true;
  chrome();
  status('');
  if (focus) d.querySelector('[data-note-delete]').focus();
}
/** The title and «Borrar la nota» follow whether the note exists: the button shows once the first save creates it. */
function chrome() {
  const d = document.getElementById('note-editor');
  if (!d || !ED.key) return;
  const n = get(ED.key);
  d.querySelector('#note-editor-title').textContent = `${n ? 'Tu nota' : 'Nota'} sobre ${ED.label}`;
  if (d.querySelector('[data-note-keep]').hidden) d.querySelector('[data-note-delete]').hidden = !n || !!blocked;
}
async function copyText() {
  const text = document.getElementById('note-text');
  try { await navigator.clipboard.writeText(text.value); status('Texto copiado. Pégalo en otro sitio para no perderlo.'); } catch {
    text.select();
    status('Texto seleccionado: cópialo con Ctrl+C (o Cmd+C) y pégalo en otro sitio.');
  }
}
function flush() {
  clearTimeout(ED.timer); ED.timer = 0;
  if (!ED.key || !ED.dirty) return;
  const box = document.getElementById('note-text');
  let text = box.value;
  const cur = get(ED.key);   // also tells whether the store may be written (blocked)
  if (blocked) { status(blocked); return; }
  if (!text.trim()) {
    if (cur) status('La nota está vacía: se conserva la anterior. Para borrarla, pulsa «Borrar la nota».');
    return;
  }
  let msg = '';
  if (cur && cur.updated !== ED.base && cur.text !== text) {
    // Saved meanwhile in another tab: both versions stay, joined, and the person is told. The caret does not move.
    const caret = box.selectionStart;
    text = `${text}\n\n[Versión de otra pestaña, ${fmtWhen(cur.updated)}]\n${cur.text}`;
    box.value = text;
    box.setSelectionRange(caret, caret);
    msg = 'Esta nota cambió en otra pestaña: se han juntado las dos versiones. Revisa el texto.';
  }
  if (cur?.text === text) { ED.base = cur.updated; ED.dirty = false; return; }
  const saved = put(ED.key, text, ED.label);
  const d = document.getElementById('note-editor');
  if (saved) {
    ED.base = saved.updated; ED.dirty = false; ED.failed = false; ED.warned = false;
    d.querySelector('[data-note-copy]').hidden = true;
    status(msg || (text.length >= MAX_TEXT ? `Guardada. ${LIMIT_MSG}` : 'Guardada en este navegador.'));
  } else {
    ED.failed = !blocked;
    d.querySelector('[data-note-copy]').hidden = !ED.failed;
    status(blocked || 'No se pudo guardar: este navegador no deja guardar aquí. Copia el texto para no perderlo.');
  }
  refreshPencils(ED.key);
  chrome();
}
function openEditor(key, label) {
  const d = editor();
  if (d.open) flush();
  ED.key = key; ED.label = label || target(key).title || '';
  ED.fromList = !!document.getElementById('notes-list')?.open;
  ED.dirty = false; ED.failed = false; ED.warned = false;
  const n = get(key);
  ED.base = n?.updated ?? null;
  const text = d.querySelector('#note-text');
  text.value = n?.text || '';
  text.readOnly = !!blocked;
  d.querySelector('[data-note-keep]').hidden = true;
  d.querySelector('[data-note-delete-yes]').hidden = true;
  d.querySelector('[data-note-copy]').hidden = true;
  chrome();
  status(blocked, true);
  if (!d.open) d.showModal();
  text.focus();
  text.setSelectionRange(text.value.length, text.value.length);
}

// ---------------------------------------------------------------------------
// «Mis notas»: the list, export and import
// ---------------------------------------------------------------------------
const IMP = { pending: null, message: '', returnTo: null, opening: false };
function list() {
  const d = dialog('notes-list', 'note-dialog notes-list', `<header class="notes-head">
      <h2 class="note-title" id="notes-list-title">Mis notas</h2>
      <button type="button" class="be-btn be-btn--sm be-btn--ghost" data-notes-close>Cerrar <span aria-hidden="true">×</span></button>
    </header>
    <p class="note-privacy">Se guardan solo en este navegador y no van en ningún enlace. Para llevarlas a otro, expórtalas a un fichero e impórtalo allí.</p>
    <div class="notes-tools">
      <button type="button" class="be-btn be-btn--sm" data-notes-export>Exportar a un fichero</button>
      <button type="button" class="be-btn be-btn--sm" data-notes-import>Importar un fichero</button>
      <input type="file" accept=".json,application/json" data-notes-file hidden>
    </div>
    <p class="notes-message" role="status"></p>
    <div class="notes-body"></div>`);
  d.setAttribute('aria-labelledby', 'notes-list-title');
  if (!d.dataset.ready) {
    d.dataset.ready = '1';
    const file = d.querySelector('[data-notes-file]');
    const importButton = () => d.querySelector('[data-notes-import]');
    d.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-notes-close]')) { d.close(); focusBack(); return; }
      if (t.closest('[data-notes-export]')) { exportNotes(); return; }
      if (t.closest('[data-notes-import]')) { file.value = ''; file.click(); return; }
      if (t.closest('[data-notes-apply]')) { applyImport(); importButton().focus(); return; }
      if (t.closest('[data-notes-cancel]')) { IMP.pending = null; IMP.message = 'Importación cancelada: no ha cambiado nada.'; paintList(); importButton().focus(); return; }
      const raw = t.closest('[data-notes-raw]');
      if (raw) { downloadRaw(raw.dataset.notesRaw); return; }
      const open = t.closest('[data-notes-open]');
      if (open) {
        const key = open.dataset.notesOpen, tg = target(key);
        IMP.opening = true;
        d.close();
        // On a phone a study view covers the card: it closes, and a folded sheet opens, so what opened can be seen.
        if (!tg.reading && matchMedia(NARROW).matches) {
          BE.estudio?.abrirSolo?.();
          if (BE.E?.hojaPlegada) document.getElementById('hoja-asa')?.click();
        }
        tg.open?.();
        focusPencilSoon(key, true);   // the card or the chapter it opened shows the pencil of this same note
        return;
      }
      const edit = t.closest('[data-notes-edit]');
      if (edit) openEditor(edit.dataset.notesEdit, edit.dataset.notesLabel);
    });
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      let text = '';
      try { text = await f.text(); } catch { text = ''; }
      planImport(text);
    });
    d.addEventListener('close', () => {
      IMP.pending = null; IMP.message = '';
      if (IMP.opening) { IMP.opening = false; return; }
      focusBack();
    });
  }
  return d;
}
/** The menu entry that opened «Mis notas» is hidden by now: the focus goes back to what opened it, or to «Estudio». */
function focusBack() {
  if (!lost(document.activeElement)) return;
  const back = IMP.returnTo && !lost(IMP.returnTo) ? IMP.returnTo : document.getElementById('estudio-boton');
  back?.focus();
}
const fmtWhen = (iso) => { try { return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); } catch { return ''; } };
function itemHtml(key, n) {
  const t = target(key);
  const title = t.title || n.label || key;
  return `<li class="notes-item">
    <div class="notes-item-head"><span class="note-kind">${esc(t.kind)}</span><b class="notes-item-title">${esc(title)}</b><span class="be-muted notes-when">${esc(fmtWhen(n.updated))}</span></div>
    <p class="notes-item-text">${esc(n.text)}</p>
    ${t.open ? '' : '<p class="be-muted notes-gone">Ya no está en los datos del sitio; la nota se conserva.</p>'}
    <div class="notes-item-actions">
      ${t.open ? `<button type="button" class="be-btn be-btn--sm" data-notes-open="${esc(key)}" aria-label="${esc(`Abrir ${t.kind.toLowerCase()}: ${title}`)}">Abrir ${esc(t.kind.toLowerCase())}</button>` : ''}
      <button type="button" class="be-btn be-btn--sm be-btn--ghost" data-notes-edit="${esc(key)}" data-notes-label="${esc(title)}" aria-label="${esc(`Editar la nota sobre ${title}`)}">Editar</button>
    </div></li>`;
}
function clashesHtml(p) {
  const n = p.clashes.length;
  return `<section class="notes-clashes" aria-labelledby="notes-clash-title">
    <h3 class="notes-clash-title" id="notes-clash-title">${n === 1 ? 'Una nota del fichero choca' : `${n} notas del fichero chocan`} con las de este navegador</h3>
    <p>Elige qué hacer con cada una. Hasta que pulses «Aplicar», no cambia nada.${p.added.length === 1 ? ' Además hay una nota nueva, que se añadirá.' : p.added.length ? ` Además hay ${p.added.length} notas nuevas, que se añadirán.` : ''}</p>
    ${p.clashes.map((c, i) => {
      const t = target(c.key);
      const title = t.title || c.local.label || c.incoming.label || c.key;
      const localNewer = Date.parse(c.local.updated) >= Date.parse(c.incoming.updated);
      const opt = (v, txt, on) => `<label class="notes-choice"><input type="radio" name="notes-clash-${i}" value="${v}"${on ? ' checked' : ''}> ${txt}</label>`;
      return `<fieldset class="note-clash" data-clash="${i}"><legend>${esc(title)} <span class="be-muted">(${esc(t.kind)})</span></legend>
        <div class="clash-versions">
          <div class="clash-version"><b>En este navegador</b> <span class="be-muted">${esc(fmtWhen(c.local.updated))}${localNewer ? ' · la más reciente' : ''}</span><p>${esc(c.local.text)}</p></div>
          <div class="clash-version"><b>En el fichero</b> <span class="be-muted">${esc(fmtWhen(c.incoming.updated))}${localNewer ? '' : ' · la más reciente'}</span><p>${esc(c.incoming.text)}</p></div>
        </div>
        ${opt('local', 'Quedarme con la de este navegador', localNewer)}
        ${opt('file', 'Usar la del fichero', !localNewer)}
        ${opt('both', 'Juntar las dos en una', false)}
      </fieldset>`;
    }).join('')}
    <div class="notes-tools"><button type="button" class="be-btn be-btn--sm be-btn--primary" data-notes-apply>Aplicar la importación</button><button type="button" class="be-btn be-btn--sm be-btn--ghost" data-notes-cancel>Cancelar</button></div>
  </section>`;
}
function unreadableHtml() {
  const copies = unreadableCopies();
  if (!copies.length) return '';
  return `<div class="notes-unreadable">
    <p>${copies.length === 1 ? 'Unas notas guardadas antes no se pudieron leer.' : `${copies.length} copias de notas guardadas antes no se pudieron leer.`} Se apartaron sin tocarlas: descárgalas para no perderlas.</p>
    <div class="notes-tools">${copies.map((c) => `<button type="button" class="be-btn be-btn--sm" data-notes-raw="${esc(c.key)}">Descargar la copia${fmtWhen(c.when) ? ` del ${esc(fmtWhen(c.when))}` : ''}</button>`).join('')}</div>
  </div>`;
}
function paintList() {
  const d = list();
  const notes = all();
  const keys = Object.keys(notes).sort((a, b) => String(notes[b].updated).localeCompare(String(notes[a].updated)));
  d.querySelector('[data-notes-export]').disabled = !keys.length && !blockedRaw;
  d.querySelector('[data-notes-import]').disabled = !!blocked;
  d.querySelector('.notes-message').textContent = IMP.message || blocked;
  d.querySelector('.notes-body').innerHTML = IMP.pending ? clashesHtml(IMP.pending)
    : unreadableHtml() + (keys.length ? `<ul class="notes-items" aria-label="${keys.length} ${keys.length === 1 ? 'nota' : 'notas'}">${keys.map((k) => itemHtml(k, notes[k])).join('')}</ul>`
      : blockedRaw ? '' : '<p class="be-muted notes-empty">Todavía no tienes notas. Pulsa el lápiz de cualquier ficha o capítulo para escribir una.</p>');
}
function openList() {
  IMP.pending = null; IMP.message = '';
  const d = list();
  if (!d.open) IMP.returnTo = document.activeElement;
  paintList();
  if (!d.open) d.showModal();
  d.querySelector('[data-notes-close]').focus();
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
function exportNotes() {
  const notes = all();
  const day = new Date().toISOString().slice(0, 10);
  const name = `biblical-earth-notas-${day}.json`;
  if (blockedRaw) {
    // Notes this version cannot write (a newer version, or unreadable with no room for a copy) go out exactly as stored.
    download(name, blockedRaw);
    IMP.message = `Tus notas guardadas se han descargado tal cual, al fichero ${name}.`;
    paintList();
    return;
  }
  if (!Object.keys(notes).length) return;
  download(name, JSON.stringify({ format: FORMAT, version: VERSION, exported: new Date().toISOString(), notes: { ...kept, ...notes } }, null, 2) + '\n');
  IMP.message = `${Object.keys(notes).length === 1 ? 'Exportada 1 nota' : `Exportadas ${Object.keys(notes).length} notas`} al fichero ${name}.`;
  paintList();
}
function downloadRaw(key) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { raw = null; }
  if (raw == null) return;
  const name = `biblical-earth-notas-sin-leer-${(key.slice(UNREADABLE_PREFIX.length + 1) || 'copia').slice(0, 10)}.json`;
  download(name, raw);
  IMP.message = `Copia descargada al fichero ${name}.`;
  paintList();
}
/** Reads an export file. A file that is not notes changes nothing and says why; clashes wait for the person to choose. */
function planImport(text) {
  let obj = null;
  try { obj = JSON.parse(text); } catch { obj = null; }
  const v = obj == null ? { error: 'No se pudo leer el fichero: no es un fichero de notas.' } : validate(obj);
  if (v.error) { IMP.pending = null; IMP.message = `${v.error} No ha cambiado nada.`; paintList(); return; }
  // A chapter written as «pasaje:<id>» joins the note of that chapter; two notes of one chapter in the file are joined.
  const incoming = {};
  for (const [key0, n] of Object.entries(v.notes)) {
    const key = normalKey(key0);
    incoming[key] = incoming[key] ? { ...incoming[key], text: `${incoming[key].text}\n\n${n.text}` } : n;
  }
  const local = all();
  const p = { added: [], same: 0, clashes: [], skipped: v.skipped };
  for (const [key, n] of Object.entries(incoming)) {
    const l = local[key];
    if (!l) p.added.push([key, n]);
    else if (l.text === n.text) p.same++;
    else p.clashes.push({ key, local: l, incoming: n });
  }
  if (!p.added.length && !p.clashes.length) {
    IMP.pending = null;
    IMP.message = Object.keys(incoming).length ? 'Todas las notas del fichero ya estaban aquí: no ha cambiado nada.' : 'El fichero no tiene notas: no ha cambiado nada.';
    paintList();
    return;
  }
  IMP.pending = p;
  if (p.clashes.length) { IMP.message = ''; paintList(); list().querySelector('.notes-clashes input:checked')?.focus(); return; }
  applyImport();
}
function applyImport() {
  const p = IMP.pending;
  if (!p) return;
  const notes = all();
  const d = list();
  const counts = { file: 0, local: 0, both: 0 };
  for (const [key, n] of p.added) notes[key] = n;
  p.clashes.forEach((c, i) => {
    const choice = d.querySelector(`input[name="notes-clash-${i}"]:checked`)?.value || (Date.parse(c.local.updated) >= Date.parse(c.incoming.updated) ? 'local' : 'file');
    counts[choice]++;
    if (choice === 'file') notes[c.key] = c.incoming;
    else if (choice === 'both') {
      // Both texts whole: stored text is never cut, however long the two together are.
      notes[c.key] = { ...c.local, text: `${c.local.text}\n\n[Del fichero, ${fmtWhen(c.incoming.updated)}]\n${c.incoming.text}`, updated: new Date().toISOString() };
    }
  });
  IMP.pending = null;
  if (!write(notes)) { IMP.message = blocked || 'No se pudo guardar: este navegador no deja guardar aquí. No ha cambiado nada.'; paintList(); return; }
  const parts = [];
  if (p.added.length) parts.push(`${p.added.length} ${p.added.length === 1 ? 'nota nueva' : 'notas nuevas'}`);
  if (p.same) parts.push(`${p.same} ${p.same === 1 ? 'ya estaba igual' : 'ya estaban iguales'}`);
  if (counts.file) parts.push(`${counts.file} con la versión del fichero`);
  if (counts.local) parts.push(`${counts.local} con la de este navegador`);
  if (counts.both) parts.push(`${counts.both} con las dos juntas`);
  if (p.skipped) parts.push(`${p.skipped} sin texto o sin ficha que se han dejado fuera`);
  IMP.message = `Importación hecha: ${parts.join(', ')}.`;
  paintList();
  refreshPencils(null);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
function start() {
  read();   // puts an unreadable store aside before anything is written
  window.addEventListener('pagehide', flush);   // what was typed in the last 400 ms, if the page goes away
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.note-pencil[data-note-key]');
    if (!b) return;
    e.preventDefault();
    openEditor(b.dataset.noteKey, b.dataset.noteLabel);
  });
  // Another tab saved notes: the pencils follow, and an editor with nothing typed yet shows the new text.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    refreshPencils(null);
    const d = document.getElementById('note-editor');
    if (d?.open && ED.key && !ED.dirty) {
      const n = get(ED.key);
      d.querySelector('#note-text').value = n?.text || '';
      ED.base = n?.updated ?? null;
      chrome();
    }
  });
  // Back and forward change the card underneath: the editor saves and closes instead of staying over another card.
  const closeEditor = () => {
    const d = document.getElementById('note-editor');
    if (!d?.open) return;
    flush();
    if (ED.failed) return; // la nota sin guardar sigue en pantalla para copiarla
    d.close();
  };
  window.addEventListener('popstate', closeEditor);
  window.addEventListener('hashchange', closeEditor);
}
BE.inicios.push(start);

BE.notes = { chapterKey, spanKey, keyForSel, parseKey, pencilForSel, pencilForChapter, pencilHtml, openEditor, openList, get, all };
})();
