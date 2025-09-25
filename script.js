document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script is running with localStorage!");

  // Buttons
  const darkModeButton = document.getElementById("darkModeButton");
  const funButton = document.getElementById("funButton");
  const colorButton = document.getElementById("colorButton");
  const greetButton = document.getElementById("greetButton");
  const increaseButton = document.getElementById("increaseButton");
  const addEntryButton = document.getElementById("addEntryButton");

  // Elements
  const countSpan = document.getElementById("count");
  const entryInput = document.getElementById("entryInput");
  const entryCategory = document.getElementById("entryCategory");
  const entriesList = document.getElementById("entriesList");

  // Load from localStorage
  let count = parseInt(localStorage.getItem("count")) || 0;
  let entries = JSON.parse(localStorage.getItem("entries")) || [];
  let darkMode = localStorage.getItem("darkMode") === "true";

  // Apply saved values
  countSpan.textContent = count;
  if (darkMode) document.body.classList.add("dark-mode");
  renderEntries();

  // Dark Mode Toggle
  darkModeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  });

  // Fun Button
  funButton.addEventListener("click", () => {
    alert("🎉 Fun Button Clicked!");
  });

  // Change Background
  colorButton.addEventListener("click", () => {
    const colors = ["#f4a261", "#2a9d8f", "#e9c46a", "#e76f51", "#264653"];
    document.body.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
  });

  // Greet Button
  greetButton.addEventListener("click", () => {
    const name = prompt("What’s your name?");
    if (name) alert(`👋 Hello, ${name}! Welcome to Try It App 🚀`);
  });

  // Increase Counter
  increaseButton.addEventListener("click", () => {
    count++;
    countSpan.textContent = count;
    localStorage.setItem("count", count);
  });

  // Add Entry
  addEntryButton.addEventListener("click", () => {
    const text = entryInput.value.trim();
    const category = entryCategory.value;
    if (text) {
      entries.push({ text, category });
      localStorage.setItem("entries", JSON.stringify(entries));
      entryInput.value = "";
      renderEntries();
    }
  });

  // Render Entries
  function renderEntries() {
    entriesList.innerHTML = "";
    entries.forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `${entry.text} (${entry.category})`;
      entriesList.appendChild(li);
    });
  }
});
