/**
 * Calendario Astronómico 2025 - JS (versión fusion compacta)
 * - Etiquetas + iconos automáticos (emoji/fondo)
 * - Filtros, búsqueda con resaltado
 * - Próximo evento
 * - Tema claro/oscuro persistente
 * - Toggle densidad
 * - Animación reveal
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', calendarioInit);
} else {
  calendarioInit();
}

function calendarioInit() {
  const YEAR = 2025;
  const SELECTORS = {
    root: '#calendario',
    controls: '.calendar-controls',
    filterBar: '.filters-bar',
    filterChip: '.filter-chip',
    search: 'input[type="search"]',
    themeBtn: '.theme-toggle-btn',
    densityBtn: '.density-toggle-btn'
  };

  const root = document.querySelector(SELECTORS.root);
    if (!root) return; // No advertencia si no hay calendario

  const controls = root.querySelector(SELECTORS.controls);
    if (!controls) return; // No advertencia si no hay controles

  const searchInput = controls.querySelector(SELECTORS.search);
  const themeBtn = controls.querySelector(SELECTORS.themeBtn);
  const densityBtn = controls.querySelector(SELECTORS.densityBtn);
  const filterBar = controls.querySelector(SELECTORS.filterBar);

  const typePatterns = [
    { type:'meteoros',   regex:/lluvia de meteoros/i, label:'Meteoros',    icon:'☄️' },
    { type:'luna-nueva', regex:/luna nueva/i,         label:'Luna Nueva',  icon:'🌑' },
    { type:'luna-llena', regex:/luna llena/i,         label:'Luna Llena',  icon:'🌕' },
    { type:'eclipse',    regex:/eclipse/i,            label:'Eclipse',     icon:'🌘' },
    { type:'solsticio',  regex:/solsticio/i,          label:'Solsticio',   icon:'☀️' },
    { type:'equinoccio', regex:/equinoccio/i,         label:'Equinoccio',  icon:'⚖️' },
    { type:'conjuncion', regex:/conjunción|conjuncion/i,label:'Conjunción',icon:'✧' },
    { type:'estacion',   regex:/inicio del verano|inicio de la primavera|inicio del invierno|inicio del otoño/i,
                          label:'Estación', icon:'📅' }
  ];

  const monthMap = {
    enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,
    julio:6,agosto:7,septiembre:8,octubre:9,noviembre:10,diciembre:11
  };

  // Estado interno
  const state = {
    events: [],  // { li, textNorm, types[], startDate, endDate }
    filterTypesActive: new Set(), // Se llena al iniciar
    nextEventMarked: false
  };

  /* ---------------- Utilidades ---------------- */
  const normalize = (str) =>
    str.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();

  function parseDateRange(raw, monthIndex) {
    // raw puede ser "5–6" o "5-6" o "12"
    const rangeMatch = raw.match(/^(\d{1,2})[–-](\d{1,2})$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1],10);
      const end   = parseInt(rangeMatch[2],10);
      return {
        startDate: new Date(Date.UTC(YEAR, monthIndex, start, 12)),
        endDate:   new Date(Date.UTC(YEAR, monthIndex, end, 23,59,59))
      };
    }
    if (/^\d{1,2}$/.test(raw)) {
      const d = parseInt(raw,10);
      const base = new Date(Date.UTC(YEAR, monthIndex, d, 12));
      return { startDate: base, endDate: base };
    }
    return { startDate: null, endDate: null };
  }

  function createElement(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }

  function debounce(fn, delay=180) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(()=>fn(...args), delay);
    };
  }

  /* ---------------- Procesamiento de eventos ---------------- */
  function enhanceEvents() {
    const boxes = [...root.querySelectorAll('.astro-event-box')];
    boxes.forEach(box => {
      const monthName = box.querySelector('h5')?.textContent.trim().toLowerCase();
      const mIndex = monthMap[monthName];
      const lis = [...box.querySelectorAll('li')];
      lis.forEach(li => {
        if (li.dataset.enhanced === 'true') return;

        const dateSpan = li.querySelector('.event-date');
        if (!dateSpan) return;

        const rawDate = dateSpan.textContent.trim();
        const { startDate, endDate } = (mIndex >= 0) ? parseDateRange(rawDate, mIndex) : { startDate:null, endDate:null };

        if (startDate) {
          li.dataset.date = startDate.toISOString();
          if (endDate && endDate.getTime() !== startDate.getTime()) {
            li.dataset.dateEnd = endDate.toISOString();
          }
        }

        const fullText = li.textContent.trim();
        const typesFound = [];
        for (const tp of typePatterns) {
          if (tp.regex.test(fullText)) typesFound.push(tp.type);
        }
        if (typesFound.length) {
          li.dataset.types = typesFound.join(',');
        }

        // Icono
        const icon = createElement('div', 'event-icon');
        if (typesFound.length) {
          icon.dataset.type = typesFound[0];
          const meta = typePatterns.find(t=>t.type === typesFound[0]);
          icon.textContent = meta?.icon || '★';
        } else {
          icon.textContent = '★';
        }
        li.prepend(icon);

        // Reagrupar texto principal
        const following = [];
        let n = dateSpan.nextSibling;
        while (n) {
          const next = n.nextSibling;
          following.push(n);
          n = next;
        }
        const main = createElement('div','event-main-line');
        following.forEach(nd => main.appendChild(nd));
        li.appendChild(main);

        // Chips (opcionales)
        if (typesFound.length) {
          const tags = createElement('div','event-tags');
          typesFound.forEach(t=>{
            const meta = typePatterns.find(x=>x.type===t);
            const tag = createElement('span','event-tag', meta?.label || t);
            tag.dataset.type = t;
            tags.appendChild(tag);
          });
          li.appendChild(tags);
        }

        li.dataset.enhanced = 'true';

        state.events.push({
          li,
            textNorm: normalize(fullText),
            types: typesFound,
            startDate,
            endDate
        });
      });
    });
  }

  function markNextEvent() {
    if (state.nextEventMarked) return;
    const now = new Date();
    // Buscar el primer evento cuyo endDate > now
    const upcoming = state.events
      .filter(e => e.startDate && e.endDate && e.endDate > now)
      .sort((a,b)=> a.startDate - b.startDate)[0];
    if (upcoming) {
      upcoming.li.dataset.next = 'true';
      upcoming.li.setAttribute('aria-label','Próximo evento');
    }
    state.nextEventMarked = true;
  }

  /* ---------------- Filtrado y búsqueda ---------------- */
  function initFilterStateFromDOM() {
    const chips = controls.querySelectorAll(SELECTORS.filterChip);
    chips.forEach(ch => {
      if (ch.dataset.active === 'true') state.filterTypesActive.add(ch.dataset.type);
    });
  }

  function getActiveTypes() {
    return [...state.filterTypesActive];
  }

  function toggleType(type) {
    if (state.filterTypesActive.has(type)) state.filterTypesActive.delete(type);
    else state.filterTypesActive.add(type);

    // Si quedó vacío, reactivar todos para no dejar vacío
    if (!state.filterTypesActive.size) {
      const chips = controls.querySelectorAll(SELECTORS.filterChip);
      chips.forEach(ch => state.filterTypesActive.add(ch.dataset.type));
    }
  }

  function getSearchTokens() {
    if (!searchInput) return [];
    const raw = searchInput.value.trim();
    if (!raw) return [];
    return raw.split(/\s+/).map(normalize).filter(Boolean);
  }

  function filterAndRender() {
    const activeTypes = getActiveTypes();
    const tokens = getSearchTokens();
    const wantTypes = activeTypes.length > 0;
    let visibleCount = 0;

    state.events.forEach(ev => {
      let show = true;

      if (wantTypes) {
        if (!ev.types.length || !ev.types.some(t => activeTypes.includes(t))) show = false;
      }

      if (show && tokens.length) {
        for (const tk of tokens) {
          if (!ev.textNorm.includes(tk)) { show = false; break; }
        }
      }

      ev.li.dataset.hidden = (!show).toString();
      ev.li.style.display = show ? 'grid' : 'none';
      if (show) visibleCount++;
      clearHighlights(ev.li);
      if (show && tokens.length) applyHighlights(ev.li.querySelector('.event-main-line'), tokens);
    });

    updateBoxesOpacity();
    updateNoResults(visibleCount === 0);
  }

  /* ---------------- Highlights ---------------- */
  function clearHighlights(li) {
    li.querySelectorAll('mark.search-highlight').forEach(mark => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
  }

  function applyHighlights(container, tokens) {
    if (!container || !tokens.length) return;
    // Crear una sola regex combinada escapando tokens
    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    const regex = new RegExp( '(' + escaped.join('|') + ')', 'gi');

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT','STYLE','MARK'].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const tasks = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent;
      let match;
      const ranges = [];
      while ((match = regex.exec(text)) !== null) {
        ranges.push({ start: match.index, end: match.index + match[0].length });
      }
      if (!ranges.length) continue;
      // Fusionar solapamientos
      ranges.sort((a,b)=> a.start - b.start);
      const merged = [];
      let prev = ranges[0];
      for (let i=1;i<ranges.length;i++){
        const cur = ranges[i];
        if (cur.start <= prev.end) {
          prev.end = Math.max(prev.end, cur.end);
        } else {
          merged.push(prev);
          prev = cur;
        }
      }
      merged.push(prev);
      tasks.push({ node, merged });
    }

    tasks.forEach(task => {
      const { node, merged } = task;
      const original = node.textContent;
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      merged.forEach(r => {
        if (r.start > lastIndex) {
          frag.appendChild(document.createTextNode(original.slice(lastIndex, r.start)));
        }
        const mark = createElement('mark','search-highlight', original.slice(r.start, r.end));
        frag.appendChild(mark);
        lastIndex = r.end;
      });
      if (lastIndex < original.length) {
        frag.appendChild(document.createTextNode(original.slice(lastIndex)));
      }
      node.replaceWith(frag);
    });
  }

  /* ---------------- UI helpers ---------------- */
  function updateBoxesOpacity() {
    const boxes = root.querySelectorAll('.astro-event-box');
    boxes.forEach(box => {
      const hasVisible = box.querySelector('li:not([data-hidden="true"])');
      box.style.opacity = hasVisible ? '1' : '.22';
      box.style.filter = hasVisible ? 'none' : 'grayscale(.45)';
    });
  }

  function updateNoResults(show) {
    let n = root.querySelector('.no-results');
    if (!n) {
      n = createElement('div','no-results','No se encontraron eventos que coincidan.');
      root.querySelector('.row')?.appendChild(n);
    }
    n.style.display = show ? 'block' : 'none';
  }

  /* ---------------- Eventos UI ---------------- */
  function handleFilterClick(e) {
    const btn = e.target.closest(SELECTORS.filterChip);
    if (!btn) return;
    const type = btn.dataset.type;
    toggleType(type);
    // Actualizar visual y aria
    const active = state.filterTypesActive.has(type);
    btn.dataset.active = active ? 'true':'false';
    btn.setAttribute('aria-pressed', String(active));

    // Si todos estaban desactivados los reactivamos (en toggleType ya se hace)
    if (!state.filterTypesActive.size) {
      document.querySelectorAll(SELECTORS.filterChip).forEach(ch => {
        ch.dataset.active = 'true';
        ch.setAttribute('aria-pressed','true');
      });
    }
    filterAndRender();
  }

  function setupAriaOnChips() {
    controls.querySelectorAll(SELECTORS.filterChip).forEach(ch => {
      const active = ch.dataset.active === 'true';
      ch.setAttribute('aria-pressed', String(active));
    });
  }

  function setupTheme() {
    const stored = localStorage.getItem('calendar-theme');
    if (stored === 'light') {
      document.body.classList.add('theme-light');
      themeBtn?.setAttribute('aria-pressed','true');
    }
    themeBtn?.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('theme-light');
      themeBtn.setAttribute('aria-pressed', String(isLight));
      localStorage.setItem('calendar-theme', isLight ? 'light':'dark');
    });
  }

  function setupDensity() {
    const stored = localStorage.getItem('calendar-density');
    if (stored === 'compact') {
      document.body.classList.add('density-compact');
      densityBtn?.setAttribute('aria-pressed','true');
      densityBtn?.querySelector('.density-label')?.replaceChildren('Cómodo');
    }
    densityBtn?.addEventListener('click', () => {
      const isCompact = document.body.classList.toggle('density-compact');
      densityBtn.setAttribute('aria-pressed', String(isCompact));
      densityBtn.querySelector('.density-label')?.replaceChildren(isCompact ? 'Cómodo':'Compacto');
      localStorage.setItem('calendar-density', isCompact ? 'compact':'comfortable');
    });
  }

  function setupSearch() {
    if (!searchInput) return;
    const onInput = debounce(filterAndRender, 180);
    searchInput.addEventListener('input', onInput);
  }

  function setupReveal() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in-view');
          observer.unobserve(en.target);
        }
      });
    }, { threshold: .15 });
    root.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  /* ---------------- Inicialización ---------------- */
  enhanceEvents();
  initFilterStateFromDOM();
  setupAriaOnChips();
  markNextEvent();
  setupTheme();
  setupDensity();
  setupSearch();
  setupReveal();

  // Delegación para filtros
  filterBar?.addEventListener('click', handleFilterClick);
  filterBar?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const btn = e.target.closest(SELECTORS.filterChip);
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
  });

  filterAndRender();

}