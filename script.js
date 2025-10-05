document.addEventListener("DOMContentLoaded", () => {
  // ---- LocalStorage keys
  const KEYS = { COUNT: "tia_count", ENTRIES: "tia_entries", DARK: "tia_dark" };

  // ---- Safe helpers
  const safeGet = (k, f = null) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? f : v;
    } catch {
      return f;
    }
  };
  const safeSet = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };

  // ---- Element refs
  const funButton = document.getElementById("funButton");
  const colorButton = document.getElementById("colorButton");
  const greetButton = document.getElementById("greetButton");
  const greetMessage = document.getElementById("greetMessage");
  const clickCountDisplay = document.getElementById("clickCount");
  const entryForm = document.getElementById("entryForm");
  const entryInput = document.getElementById("entryInput");
  const categorySelect = document.getElementById("categorySelect");
  const entryList = document.getElementById("entryList");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const exportBtn = document.getElementById("exportBtn");

  // ---- Load state
  let count = parseInt(safeGet(KEYS.COUNT, "0"), 10) || 0;
  let entries = [];
  try {
    entries = JSON.parse(safeGet(KEYS.ENTRIES, "[]")) || [];
  } catch {
    entries = [];
  }
  const darkSaved = safeGet(KEYS.DARK, "false") === "true";
  if (darkSaved) document.body.classList.add("dark-mode");

  // ---- Render helpers
  const renderCount = () => {
    if (clickCountDisplay) clickCountDisplay.textContent = String(count);
  };
  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  const renderEntries = () => {
    if (!entryList) return;
    entryList.innerHTML = "";
    entries.forEach(({ text, category, ts }) => {
      const li = document.createElement("li");
      const when = ts ? new Date(ts).toLocaleString() : "";
      li.innerHTML = `<strong>[${esc(category || "Other")}]</strong> ${esc(
        text
      )} <small>${esc(when)}</small>`;
      entryList.appendChild(li);
    });
  };

  // Initial paint
  renderCount();
  renderEntries();

  // ---- Click counter
  if (funButton)
    funButton.addEventListener("click", () => {
      count += 1;
      safeSet(KEYS.COUNT, String(count));
      renderCount();
    });

  // ---- Greet
  if (greetButton && greetMessage)
    greetButton.addEventListener("click", () => {
      greetMessage.textContent = "Hey! 👋 Keep trying new things!";
    });

  // ---- Random color
  if (colorButton)
    colorButton.addEventListener("click", () => {
      const r = () => Math.floor(Math.random() * 256);
      document.body.style.backgroundColor = `rgb(${r()}, ${r()}, ${r()})`;
    });

  // ---- Add entry
  if (entryForm && entryInput && categorySelect)
    entryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = entryInput.value.trim();
      const category = categorySelect.value || "Other";
      if (!text) return;
      entries.push({ text, category, ts: new Date().toISOString() });
      safeSet(KEYS.ENTRIES, JSON.stringify(entries));
      entryInput.value = "";
      renderEntries();
    });

  // ---- Dark mode
  if (darkModeToggle)
    darkModeToggle.addEventListener("click", () => {
      const enabled = document.body.classList.toggle("dark-mode");
      safeSet(KEYS.DARK, enabled ? "true" : "false");
    });

  // ---- Export entries (.json)
  if (exportBtn)
    exportBtn.addEventListener("click", () => {
      if (!entries.length) {
        alert("No entries to export yet!");
        return;
      }
      const blob = new Blob([JSON.stringify(entries, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tryit_entries.json";
      a.click();
      URL.revokeObjectURL(url);
    });

  // ---- Clear all
  if (clearAllBtn)
    clearAllBtn.addEventListener("click", () => {
      const confirmed = window.confirm(
        "This will clear all entries, click count, and dark mode settings. Continue?"
      );
      if (!confirmed) return;

      entries = [];
      count = 0;
      document.body.classList.remove("dark-mode");

      try {
        localStorage.removeItem(KEYS.ENTRIES);
        localStorage.removeItem(KEYS.COUNT);
        localStorage.removeItem(KEYS.DARK);
      } catch {}

      renderEntries();
      renderCount();
      alert("All data cleared!");
    });
});
