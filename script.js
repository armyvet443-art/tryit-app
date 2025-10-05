document.addEventListener("DOMContentLoaded", () => {
  // ---- Storage keys
  const KEYS = {
    COUNT: "tia_count",
    ENTRIES: "tia_entries",
    DARK: "tia_dark",
  };

  // ---- Helpers
  const safeGet = (k, fallback = null) => {
    try { const v = localStorage.getItem(k); return v === null ? fallback : v; }
    catch { return fallback; }
  };
  const safeSet = (k, v) => {
    try { localStorage.setItem(k, v); } catch {}
  };

  // ---- Elements
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

  // ---- State (load from storage)
  let count = parseInt(safeGet(KEYS.COUNT, "0"), 10) || 0;
  let entries = [];
  try { entries = JSON.parse(safeGet(KEYS.ENTRIES, "[]")) || []; } catch { entries = []; }
  const darkSaved = safeGet(KEYS.DARK, "false") === "true";

  // ---- Apply saved dark mode
  if (darkSaved) document.body.classList.add("dark-mode");

  // ---- Renderers
  const renderCount = () => { if (clickCountDisplay) clickCountDisplay.textContent = String(count); };
  const esc = (s) => String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const renderEntries = () => {
    if (!entryList) return;
    entryList.innerHTML = "";
    entries.forEach(({ text, category, ts }) => {
      const li = document.createElement("li");
      const when = ts ? new Date(ts).toLocaleString() : "";
      li.innerHTML = `<strong>[${esc(category || "Other")}]</strong> ${esc(text)} <small>${esc(when)}</small>`;
      entryList.appendChild(li);
    });
  };

  // Initial paint
  renderCount();
  renderEntries();

  // ---- Interactions
  if (funButton) {
    funButton.addEventListener("click", () => {
      count += 1;
      safeSet(KEYS.COUNT, String(count));
      renderCount();
    });
  }

  if (greetButton && greetMessage) {
    greetButton.addEventListener("click", () => {
      greetMessage.textContent = "Hey! 👋 Keep trying new things!";
    });
  }

  if (colorButton) {
    colorButton.addEventListener("click", () => {
      const rand = () => Math.floor(Math.random() * 256);
      const rgb = `rgb(${rand()}, ${rand()}, ${rand()})`;
      document.body.style.backgroundColor = rgb;
      // note: not persisted on purpose (feels nicer ephemeral)
    });
  }

  if (entryForm && entryInput && categorySelect && entryList) {
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
  }

  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => {
      const enabled = document.body.classList.toggle("dark-mode");
      safeSet(KEYS.DARK, enabled ? "true" : "false");
    });
  }
});
