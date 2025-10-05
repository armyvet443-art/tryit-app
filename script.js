document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script running!");

  // DOM elements
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

  // Load state
  let count = parseInt(localStorage.getItem("clickCount")) || 0;
  clickCount.textContent = `Count: ${count}`;

  let entries = JSON.parse(localStorage.getItem("entries")) || [];
  renderEntries();

  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark");
  }

  // Greeting
  greetButton.addEventListener("click", () => {
    const name = nameInput.value.trim() || "Friend";
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

  // Entry form
  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = entryInput.value.trim();
    const category = categorySelect.value;

    if (text) {
      const newEntry = { text, category };
      entries.push(newEntry);
      localStorage.setItem("entries", JSON.stringify(entries));
      renderEntries();
      entryForm.reset();
    }
  });

  // Render entries
  function renderEntries() {
    entryList.innerHTML = "";
    entries.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `[${entry.category}] ${entry.text}`;
      entryList.appendChild(li);
    });
  }

  // Dark mode toggle
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark") ? "enabled" : "disabled"
    );
  });
});
