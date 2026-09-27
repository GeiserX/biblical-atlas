// biblical-earth · iconos SVG propios (24×24, trazo 1.8, color = currentColor).
// Uso: <i data-icon="search"></i>  o  <i class="be-i be-i--sm" data-icon="ship"></i>
// Se sustituyen por SVG inline al cargar. Lista completa: Object.keys(BE_ICONS).
(function () {
  const I = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5.5v13M16 5.5v13" stroke-width="3"/>',
    'step-back': '<path d="M17.5 6v12L9 12z" fill="currentColor" stroke="none"/><path d="M6.5 6v12" stroke-width="2.2"/>',
    'step-forward': '<path d="M6.5 6v12L15 12z" fill="currentColor" stroke="none"/><path d="M17.5 6v12" stroke-width="2.2"/>',
    rewind: '<path d="M11.5 6.5v11L4 12zM20 6.5v11L12.5 12z" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'chevron-right': '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
    'chevron-left': '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
    'chevron-down': '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
    'arrow-right': '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    'link-out': '<path d="M14 4.5h5.5V10M19.5 4.5L11 13"/><path d="M17.5 13.5v5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18.5V8A1.5 1.5 0 0 1 6 6.5h5"/>',
    layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>',
    map: '<path d="M9 4.5l-5.5 2v13l5.5-2 6 2 5.5-2v-13l-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    person: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2"/>',
    people: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5"/><path d="M15.5 5.6a3.3 3.3 0 0 1 0 6.1M17.5 14.3c1.9.7 3.1 2.4 3.5 5.2"/>',
    place: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/>',
    event: '<path d="M12 3.5l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.9l-5 2.8 1.2-5.6L4 9.3l5.6-.6z"/>',
    book: '<path d="M4.5 5.5c2.6-.8 5.1-.6 7.5.8v13c-2.4-1.4-4.9-1.6-7.5-.8z"/><path d="M19.5 5.5c-2.6-.8-5.1-.6-7.5.8v13c2.4-1.4 4.9-1.6 7.5-.8z"/>',
    letter: '<path d="M6 3.5h8.5L18 7v13.5H6z"/><path d="M14.5 3.5V7H18M9 11h6M9 14h6M9 17h4"/>',
    scroll: '<path d="M7 5.5h10.5a2 2 0 0 1 0 4H17v8.5a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 18v-1h9.5v1a2.5 2.5 0 0 0 2.5 2.5"/><path d="M7 5.5A2.5 2.5 0 0 0 4.5 8v9"/>',
    ship: '<path d="M3.5 15.5l2 4h13l2-4z"/><path d="M12 3.5v12M12 4.5l6 8H12M12 6.5L7.5 12.5H12"/>',
    road: '<path d="M8.5 3.5L5 20.5M15.5 3.5l3.5 17M12 4.5v2.5M12 10v3M12 16.5v3.5"/>',
    camera: '<path d="M4 8.5h3.5L9 6h6l1.5 2.5H20v10.5H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
    graph: '<circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="6" r="1.9"/><circle cx="19" cy="5.5" r="1.9"/><circle cx="5.5" cy="18.5" r="1.9"/><circle cx="18.5" cy="18" r="1.9"/><path d="M6.5 7.3l3.4 3M17.4 6.8l-3.5 3.5M7 17.2l3.1-3.3M16.9 16.7l-3-2.9"/>',
    crown: '<path d="M4 17.5l-.5-10 5 4.5L12 5.5l3.5 6.5 5-4.5-.5 10z"/><path d="M4.5 20.5h15"/>',
    columns: '<path d="M3.5 8.5L12 4l8.5 4.5zM5 20h14M4 20.5h16"/><path d="M6.5 10.5v7.5M10 10.5v7.5M14 10.5v7.5M17.5 10.5v7.5"/>',
    shovel: '<path d="M14.5 3.5l6 6M17.5 6.5l-8 8"/><path d="M9.5 14.5l-4.8 1.3-1.2 4.7 4.7-1.2 1.3-4.8z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    locate: '<circle cx="12" cy="12" r="5"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    swap: '<path d="M7 4.5l-3.5 3.5L7 11.5M3.5 8h13M17 12.5l3.5 3.5-3.5 3.5M20.5 16h-13"/>',
    curtain: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M12 4.5v15"/><path d="M9 10l-2 2 2 2M15 10l2 2-2 2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="6" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/><path d="M8.2 10.8l7-3.6M8.2 13.2l7 3.6"/>',
    bookmark: '<path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
    question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.6v.6M12 16.6v.4"/>',
    filter: '<path d="M4 5.5h16l-6.2 7.2v5.8l-3.6 1.8v-7.6z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.3M12 18.2v2.3M3.5 12h2.3M18.2 12h2.3M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    mountain: '<path d="M3 19.5L9.5 8l4 6.5 2.5-3.5 5 8.5z"/><path d="M8 10.8l1.5 1.4 1.4-1.2"/>',
    water: '<path d="M3 9c2 0 2-1.5 4.5-1.5S9.5 9 12 9s2.5-1.5 4.5-1.5S19 9 21 9M3 14c2 0 2-1.5 4.5-1.5S9.5 14 12 14s2.5-1.5 4.5-1.5S19 14 21 14M3 19c2 0 2-1.5 4.5-1.5S9.5 19 12 19s2.5-1.5 4.5-1.5S19 19 21 19"/>',
    temple: '<path d="M4 9.5L12 4.5l8 5M5.5 9.5h13M5.5 19.5h13M4 21h16"/><path d="M7.5 11.5v6M12 11.5v6M16.5 11.5v6"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 5 9 5.5 9 8.5s-9 3.5-9 8.5M16.5 3.5c0 5-9 5.5-9 8.5s9 3.5 9 8.5"/>',
    'more': '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>',
    wifi: '<path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a7.5 7.5 0 0 1 11 0M9.5 16a3.2 3.2 0 0 1 5 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
    battery: '<rect x="3" y="7.5" width="16" height="9" rx="2"/><rect x="5" y="9.5" width="10" height="5" rx="1" fill="currentColor" stroke="none"/><path d="M21 10.5v3"/>',
  };
  window.BE_ICONS = I;
  function svg(name) {
    const body = I[name];
    if (!body) { console.warn('Icono desconocido: ' + name); return ''; }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }
  window.BE_icon = svg;
  function hydrate(root) {
    (root || document).querySelectorAll('[data-icon]').forEach((el) => {
      if (el.dataset.iconDone) return;
      el.innerHTML = svg(el.dataset.icon);
      el.classList.add('be-i');
      el.dataset.iconDone = '1';
    });
  }
  window.BE_hydrateIcons = hydrate;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => hydrate());
  else hydrate();
})();
