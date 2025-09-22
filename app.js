// Try It App — minimal client-side logic with localStorage
// Features: add entries, render as cards, search, filter, export CSV, clear all

(function () {
  const STORAGE_KEY = 'tryit_entries';

  // --- Elements ---
  const form = document.getElementById('tryit-form');
  const titleInput = document.getElementById('title');
  const categoryInput = document.getElementById('category');
  const descInput = document.getElementById('desc');
  const ratingInput = document.getElementById('rating');

  const entriesList = document.getElementById('entries-list');
  const searchInput = document.getElementById('search');
  const filterSelect = document.getElementById('filter-category');
  const exportBtn = document.getElementById('export');
  const clearAllBtn = document.getElementById('clear-all');

  // --- State ---
  let entries = loadEntries();

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    render(entries);
  });

  // --- Helpers ---
  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  function makeStars(n) {
    const count = Number(n) || 0;
    const filled = '⭐'.repeat(Math.max(0, Math.min(5, count)));
    const empty = '☆'.repeat(5 - Math.max(0, Math.min(5, count)));
    return filled + empty;
  }

  function categoryClass(cat) {
    const c = (cat || '').toLowerCase();
    if (c === 'food') return 'food';
    if (c === 'product') return 'product';
    if (c === 'travel') return 'travel';
    if (c === 'fitness') return 'fitness';
    return 'uncategorized';
  }

  // --- Rendering ---
  function render(list) {
    // Apply filters
    const term = (searchInput?.value || '').trim().toLowerCase();
    const cat = (filterSelect?.value || 'All').toLowerCase();

    let view = list.slice().reverse(); // newest first
    if (cat !== 'all') {
      view = view.filter(e => (e.category || '').toLowerCase() === cat);
    }
    if (term) {
      view = view.filter(e =>
        (e.title || '').toLowerCase().includes(term) ||
        (e.desc || '').toLowerCase().includes(term)
      );
    }

    // Build HTML
    entriesList.innerHTML = view.map(e => {
      const badgeCls = categoryClass(e.category);
      return `
        <article class="entry-card" data-id="${e.id}">
          <div class="entry-header">
            <div class="entry-title">${escapeHtml(e.title)}</div>
            <span class="badge ${badgeCls}">
              ${escapeHtml(e.category || 'Uncategorized')}
            </span>
          </div>
          <div class="entry-desc">${escapeHtml(e.desc)}</div>
          <div class="entry-footer">
            <div class="stars" aria-label="${e.rating} stars">${makeStars(e.rating)}</div>
            <div class="meta">${formatDate(e.createdAt)}</div>
          </div>
        </article>`;
    }).join('');

    // If empty state
    if (!view.length) {
      entriesList.innerHTML = `
        <div class="entry-card" style="text-align:center; color:#666;">
          No submissions yet. Be the first to try something!
        </div>`;
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Events ---
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      const category = categoryInput.value || 'Uncategorized';
      const desc = descInput.value.trim();
      const rating = ratingInput.value;

      if (!title || !desc || !rating) {
        alert('Please fill Title, Description and Rating.');
        return;
      }

      const entry = {
        id: cryptoRandomId(),
        title,
        category,
        desc,
        rating: Number(rating),
        createdAt: new Date().toISOString()
      };

      entries.push(entry);
      saveEntries();
      form.reset();
      render(entries);
      // keep current filters/search; nothing else to do
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => render(entries));
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', () => render(entries));
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (!entries.length) {
        alert('No entries to export yet.');
        return;
      }
      const csv = toCSV(entries);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tryit_entries.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Clear all submissions? This cannot be undone.')) {
        entries = [];
        saveEntries();
        render(entries);
      }
    });
  }

  // --- Utils ---
  function toCSV(list) {
    const header = ['id','title','category','desc','rating','createdAt'];
    const rows = list.map(e => [
      e.id,
      csvEscape(e.title),
      csvEscape(e.category),
      csvEscape(e.desc),
      e.rating,
      e.createdAt
    ]);
    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  function csvEscape(v) {
    const s = String(v ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function cryptoRandomId() {
    // Short, URL-safe id
    const bytes = (self.crypto || window.crypto).getRandomValues(new Uint8Array(8));
    return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
  }
})();