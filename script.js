// ---------- Storage helpers ----------
const LS_KEY = "tryit_entries_v2";
const THEME_KEY = "tryit_theme";

const loadEntries = () => JSON.parse(localStorage.getItem(LS_KEY) || "[]");
const saveEntries = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

// ---------- DOM ----------
const darkToggle = document.getElementById("darkModeToggle");
const entryForm = document.getElementById("entryForm");
const entryTitle = document.getElementById("entryTitle");
const entryCategory = document.getElementById("entryCategory");
const entryText = document.getElementById("entryText");
const entryRating = document.getElementById("entryRating");
const entriesList = document.getElementById("entries-list");

const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const clearFilters = document.getElementById("clearFilters");
const clearAll = document.getElementById("clearAll");

// ---------- Dark mode ----------
(function initTheme(){
  const mode = localStorage.getItem(THEME_KEY) || "light";
  if (mode === "dark") document.body.classList.add("dark");
})();
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});

// ---------- Render ----------
function stars(n){
  const s = Number(n)||0;
  return "★★★★★".slice(0,s) + "☆☆☆☆☆".slice(s);
}
function catBadgeClass(cat){
  const key = (cat||"").toLowerCase();
  if (key === "food") return "food";
  if (key === "product") return "product";
  if (key === "travel") return "travel";
  if (key === "fitness") return "fitness";
  if (key === "recipes") return "recipes";
  if (key === "date night") return "date-night";
  if (key === "dances") return "dances";
  return "";
}

function renderEntries() {
  const q = (searchInput.value || "").trim().toLowerCase();
  const fcat = (filterCategory.value || "").toLowerCase();
  const entries = loadEntries();

  const filtered = entries.filter(e => {
    const hitText = (e.title + " " + e.text).toLowerCase().includes(q);
    const hitCat = !fcat || e.category.toLowerCase() === fcat;
    return hitText && hitCat;
  });

  if (!filtered.length) {
    entriesList.innerHTML = `<p style="color:#777">No entries yet. Add your first one!</p>`;
    return;
  }

  entriesList.innerHTML = filtered.map(e => {
    const likeCount = e.likes || 0;
    const comments = e.comments || [];
    return `
    <article class="entry-card" data-id="${e.id}">
      <div class="entry-header">
        <div class="entry-title">${escapeHtml(e.title)}</div>
        <span class="badge ${catBadgeClass(e.category)}">${escapeHtml(e.category)}</span>
      </div>
      <div class="entry-desc">${escapeHtml(e.text)}</div>
      <div class="entry-footer">
        <div class="stars" title="${e.rating} stars">${stars(e.rating)}</div>
        <div class="meta">${new Date(e.ts).toLocaleString()}</div>
      </div>

      <div class="actions">
        <button class="icon-btn like-btn" data-id="${e.id}" aria-label="like">
          ❤️ <span class="count">${likeCount}</span>
        </button>
        <button class="icon-btn comment-toggle" data-id="${e.id}" aria-label="comments">
          💬 <span class="count">${comments.length}</span>
        </button>
        <button class="icon-btn edit-btn" data-id="${e.id}">✏️ Edit</button>
        <button class="icon-btn delete-btn" data-id="${e.id}">🗑️ Delete</button>
      </div>

      <div class="comments" id="comments-${e.id}" style="display:none">
        <div class="comment-list">
          ${comments.map(c => `
            <div class="comment">
              <div class="comment-meta">${new Date(c.ts).toLocaleString()}</div>
              <div>${escapeHtml(c.text)}</div>
            </div>
          `).join("")}
        </div>
        <form class="comment-form" data-id="${e.id}">
          <input type="text" placeholder="Write a comment…" required />
          <button class="btn" type="submit">Post</button>
        </form>
      </div>
    </article>`;
  }).join("");
}

// ---------- Add Entry ----------
entryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const entries = loadEntries();
  entries.unshift({
    id: uid(),
    title: entryTitle.value.trim(),
    category: entryCategory.value,
    text: entryText.value.trim(),
    rating: Number(entryRating.value),
    ts: Date.now(),
    likes: 0,
    comments: []
  });
  saveEntries(entries);
  entryForm.reset();
  renderEntries();
});

// ---------- List Delegation (like, comment, edit, delete, toggle) ----------
entriesList.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  if (!id) return;

  const entries = loadEntries();
  const idx = entries.findIndex(x => x.id === id);
  if (idx < 0) return;

  // Like
  if (btn.classList.contains("like-btn")) {
    entries[idx].likes = (entries[idx].likes || 0) + 1;
    saveEntries(entries);
    renderEntries();
    return;
  }

  // Toggle comments
  if (btn.classList.contains("comment-toggle")) {
    const wrap = document.getElementById(`comments-${id}`);
    if (wrap) wrap.style.display = (wrap.style.display === "none" ? "block" : "none");
    return;
  }

  // Edit
  if (btn.classList.contains("edit-btn")) {
    // Prefill form with the entry and scroll to top
    entryTitle.value = entries[idx].title;
    entryCategory.value = entries[idx].category;
    entryText.value = entries[idx].text;
    entryRating.value = entries[idx].rating;
    // Remove the old version (we'll re-add on submit)
    entries.splice(idx,1);
    saveEntries(entries);
    renderEntries();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Delete
  if (btn.classList.contains("delete-btn")) {
    if (confirm("Delete this entry?")) {
      entries.splice(idx,1);
      saveEntries(entries);
      renderEntries();
    }
    return;
  }
});

// Handle comment submit (delegated)
entriesList.addEventListener("submit", (e) => {
  const form = e.target.closest(".comment-form");
  if (!form) return;
  e.preventDefault();

  const id = form.dataset.id;
  const input = form.querySelector("input");
  const text = (input.value || "").trim();
  if (!text) return;

  const entries = loadEntries();
  const idx = entries.findIndex(x => x.id === id);
  if (idx < 0) return;

  entries[idx].comments = entries[idx].comments || [];
  entries[idx].comments.push({ id: uid(), text, ts: Date.now() });
  saveEntries(entries);

  input.value = "";
  renderEntries();

  // keep comments open
  const wrap = document.getElementById(`comments-${id}`);
  if (wrap) wrap.style.display = "block";
});

// ---------- Filters ----------
searchInput.addEventListener("input", renderEntries);
filterCategory.addEventListener("change", renderEntries);
clearFilters.addEventListener("click", () => {
  searchInput.value = "";
  filterCategory.value = "";
  renderEntries();
});
clearAll.addEventListener("click", () => {
  if (confirm("Clear ALL entries?")) {
    saveEntries([]);
    renderEntries();
  }
});

// ---------- Utils ----------
function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", renderEntries);
