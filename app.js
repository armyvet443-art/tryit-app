// app.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 🔑 Your Supabase credentials
const SUPABASE_URL = "https://gyeefhpvsszatylskbbw.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5ZWVmaHB2c3N6YXR5bHNrYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjMwNzAsImV4cCI6MjA3NDEzOTA3MH0.qp3085TxIdB6xGiAI2sgkJT9oubOAn-2IGWrDRNpgqI";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  // 🔹 Auth elements
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const signupBtn = document.getElementById("signup-button");
  const loginBtn = document.getElementById("login-button");
  const logoutBtn = document.getElementById("logout-button");
  const authMsg = document.getElementById("auth-message");

  // 🔹 Form + entries
  const form = document.getElementById("tryit-form");
  const entriesList = document.getElementById("entries-list");
  const searchInput = document.getElementById("search");
  const filterCategory = document.getElementById("filter-category");
  const clearAllButton = document.getElementById("clear-all");
  const exportButton = document.getElementById("export");

  let entries = [];

  // --------------------
  // AUTH HANDLERS
  // --------------------
  signupBtn.addEventListener("click", async () => {
    const { data, error } = await supabase.auth.signUp({
      email: emailInput.value,
      password: passwordInput.value,
    });
    if (error) {
      authMsg.textContent = "❌ " + error.message;
    } else {
      authMsg.textContent = "✅ Check your email to confirm signup.";
    }
  });

  loginBtn.addEventListener("click", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput.value,
      password: passwordInput.value,
    });
    if (error) {
      authMsg.textContent = "❌ " + error.message;
    } else {
      authMsg.textContent = "✅ Logged in!";
      logoutBtn.style.display = "inline-block";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    authMsg.textContent = "👋 Logged out!";
    logoutBtn.style.display = "none";
  });

  // --------------------
  // ENTRIES FUNCTIONS
  // --------------------
  async function loadEntries() {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading entries:", error);
      return [];
    }
    return data;
  }

  async function saveEntry(entry) {
    const { data, error } = await supabase.from("entries").insert([entry]);
    if (error) {
      console.error("Error saving entry:", error);
      return null;
    }
    return data[0];
  }

  function displayEntries(list) {
    entriesList.innerHTML = "";
    if (list.length === 0) {
      entriesList.innerHTML = "<p>No submissions yet. Be the first to try something!</p>";
      return;
    }
    list.forEach((entry) => {
      const div = document.createElement("div");
      div.className = "entry";
      div.innerHTML = `
        <h3>${entry.title} (${entry.category})</h3>
        <p>${entry.desc}</p>
        <p>Rating: ${"⭐".repeat(entry.rating)}</p>
      `;
      entriesList.appendChild(div);
    });
  }

  // --------------------
  // FORM HANDLER
  // --------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const category = document.getElementById("category").value || "Uncategorized";
    const desc = document.getElementById("desc").value.trim();
    const rating = document.getElementById("rating").value;

    if (!title || !desc || !rating) return;

    const newEntry = { title, category, desc, rating: Number(rating) };

    const saved = await saveEntry(newEntry);
    if (saved) {
      entries.unshift(saved);
      displayEntries(entries);
      form.reset();
    }
  });

  // --------------------
  // FILTERS + ACTIONS
  // --------------------
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(searchTerm) ||
        entry.desc.toLowerCase().includes(searchTerm)
    );
    displayEntries(filtered);
  });

  filterCategory.addEventListener("change", () => {
    const category = filterCategory.value;
    if (category === "All") {
      displayEntries(entries);
    } else {
      const filtered = entries.filter((entry) => entry.category === category);
      displayEntries(filtered);
    }
  });

  clearAllButton.addEventListener("click", async () => {
    if (!confirm("Clear ALL submissions? This will wipe the database!")) return;
    const { error } = await supabase.from("entries").delete().neq("id", "");
    if (error) {
      console.error("Error clearing entries:", error);
      return;
    }
    entries = [];
    displayEntries(entries);
  });

  exportButton.addEventListener("click", () => {
    if (entries.length === 0) return;
    let csv = "Title,Category,Description,Rating\n";
    entries.forEach((e) => {
      csv += `"${e.title}","${e.category}","${e.desc}",${e.rating}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tryit-entries.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  // --------------------
  // INITIALIZE
  // --------------------
  entries = await loadEntries();
  displayEntries(entries);
});
