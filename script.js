document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script running!");

  // DOM
  const greetButton = document.getElementById("greetButton");
  const greetMessage = document.getElementById("greetMessage");
  const nameInput = document.getElementById("nameInput");

  const funButton = document.getElementById("funButton");
  const clickCount = document.getElementById("clickCount");

  const colorButton = document.getElementById("colorButton");

  const entryForm = document.getElementById("entryForm");
  const entryInput = document.getElementById("entryInput");
  const categorySelect = document.getElementById("categorySelect");
  const entryList = document.getElementById("entryList");

  const darkModeToggle = document.getElementById("darkModeToggle");

  // Tools
  const searchInput = document.getElementById("searchInput");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const filterCategory = document.getElementById("filterCategory");

  // Central categories list (keep in sync with HTML options)
  const CATEGORIES = ["General","Idea","Feedback","Recipes","Date Night","Dances"];

  // Load state
  let count = parseInt(localStorage.getItem("clickCount")) || 0;
  clickCount.textContent = `Count: ${count}`;

  let entries = loadEntries(); // [{text, category, createdAt}]
  let searchQuery = "";
  let categoryFilter = "All";

  renderEntries();

  // Dark mode restore
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }

  // Greeting
  greetButton.addEventListener("click", () => {
    const name = (nameInput.value || "").trim() || "Friend";
    greetMessage.textContent = `Hello, ${name}! 👋`;
  });

  // Click Counter
  funButton.addEventListener("click", () => {
    count++;
    localStorage.setItem("clickCount", count);
    clickCount.textContent = `Count: ${count}`;
  });

  // Color changer
  colorButton.addEventListener("click", () => {
    const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 70%)`;
    document.body.style.backgroundColor = randomColor;
  });

  // Add entry
  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (entryInput.value || "").trim();
    const category = categorySelect.value || "General";
    if (!text) return;

    const newEntry = { text, category, createdAt: new Date().toISOString() };
    entries.push(newEntry);
    saveEntries(entries);
    renderEntries();
    entryForm.reset();
  });

  // Dark mode toggle
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode") ? "enabled" : "disabled"
    );
  });

  // Clear All
  clearAllBtn.addEventListener("click", () => {
    if (!entries.length) return;
    const sure = confirm("This will delete ALL entries on this device. Continue?");
    if (!sure) return;
    entries = [];
    saveEntries(entries);
    renderEntries();
  });

  // Search (live)
  searchInput.addEventListener("input", (e) => {
    searchQuery = (e.target.value || "").toLowerCase().trim();
    renderEntries();
  });

  // Category Filter (live)
  filterCategory.addEventListener("change", (e) => {
    categoryFilter = e.target.value || "All";
    renderEntries();
  });

  /* ===== Helpers ===== */
  function loadEntries() {
    try { return JSON.parse(localStorage.getItem("entries")) || []; }
    catch { return []; }
  }
  function saveEntries(list) { localStorage.setItem("entries", JSON.stringify(list)); }
  function formatDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return ""; } }

  function passesSearch(entry) {
    if (!searchQuery) return true;
    return (
      entry.text.toLowerCase().includes(searchQuery) ||
      entry.category.toLowerCase().includes(searchQuery)
    );
  }
  function passesCategory(entry) {
    if (categoryFilter === "All") return true;
    return entry.category === categoryFilter;
  }

  function renderEntries() {
    entryList.innerHTML = "";

    const filtered = entries.filter(e => passesSearch(e) && passesCategory(e));

    filtered.forEach((entry) => {
      const realIndex = entries.indexOf(entry);

      const li = document.createElement("li");
      li.className = "entry-card";
      li.dataset.index = realIndex.toString();

      const top = document.createElement("div");
      top.className = "entry-top";

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = entry.category;

      const text = document.createElement("div");
      text.className = "entry-text";
      text.textContent = entry.text;

      top.appendChild(badge);
      top.appendChild(text);

      const meta = document.createElement("div");
      meta.className = "entry-meta";
      meta.textContent = `Added: ${formatDate(entry.createdAt)}`;

      const actions = document.createElement("div");
      actions.className = "entry-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-ghost";
      editBtn.textContent = "✏️ Edit";
      editBtn.addEventListener("click", () => startEdit(li, realIndex, entry));

      const delBtn = document.createElement("button");
      delBtn.className = "btn-danger";
      delBtn.textContent = "❌ Delete";
      delBtn.addEventListener("click", () => {
        entries.splice(realIndex, 1);
        saveEntries(entries);
        renderEntries();
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      li.appendChild(top);
      li.appendChild(meta);
      li.appendChild(actions);

      entryList.appendChild(li);
    });
  }

  function startEdit(cardEl, idx, entry) {
    cardEl.innerHTML = "";

    const editor = document.createElement("div");
    editor.className = "entry-edit-row";

    const editText = document.createElement("input");
    editText.type = "text";
    editText.value = entry.text;

    const editCat = document.createElement("select");
    ["General","Idea","Feedback","Recipes","Date Night","Dances"].forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      if (c === entry.category) opt.selected = true;
      editCat.appendChild(opt);
    });

    const saveBtn = document.createElement("button");
    saveBtn.className = "btn-success";
    saveBtn.textContent = "💾 Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-ghost";
    cancelBtn.textContent = "↩️ Cancel";

    saveBtn.addEventListener("click", () => {
      const newText = (editText.value || "").trim();
      const newCat = editCat.value || "General";
      if (!newText) { editText.focus(); return; }

      entries[idx] = { ...entries[idx], text: newText, category: newCat };
      saveEntries(entries);
      renderEntries();
    });

    cancelBtn.addEventListener("click", renderEntries);

    editor.appendChild(editText);
    editor.appendChild(editCat);
    editor.appendChild(saveBtn);
    editor.appendChild(cancelBtn);
    cardEl.appendChild(editor);

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.textContent = `Added: ${formatDate(entry.createdAt)}`;
    meta.style.marginTop = "6px";
    cardEl.appendChild(meta);
  }
});
