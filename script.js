document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script is running!");

  // Dark Mode Toggle
  const darkModeToggle = document.getElementById("darkModeToggle");
  const isDark = localStorage.getItem("darkMode") === "enabled";
  if (isDark) document.body.classList.add("dark-mode");

  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode") ? "enabled" : "disabled"
    );
  });

  // Greeting
  const greetButton = document.getElementById("greetButton");
  const greetMessage = document.getElementById("greetMessage");

  greetButton.addEventListener("click", () => {
    greetMessage.textContent = "Hello, friend! 👋";
  });

  // Click Counter
  const funButton = document.getElementById("funButton");
  const clickCount = document.getElementById("clickCount");
  let count = parseInt(localStorage.getItem("clickCount")) || 0;
  clickCount.textContent = `Count: ${count}`;

  funButton.addEventListener("click", () => {
    count++;
    clickCount.textContent = `Count: ${count}`;
    localStorage.setItem("clickCount", count);
  });

  // Background Color Changer
  const colorButton = document.getElementById("colorButton");
  colorButton.addEventListener("click", () => {
    const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 80%)`;
    document.body.style.backgroundColor = randomColor;
  });

  // Entries with Local Storage
  const entryForm = document.getElementById("entryForm");
  const entryInput = document.getElementById("entryInput");
  const categorySelect = document.getElementById("categorySelect");
  const entryList = document.getElementById("entryList");

  let entries = JSON.parse(localStorage.getItem("entries")) || [];

  // Render entries on page load
  function renderEntries() {
    entryList.innerHTML = "";
    entries.forEach((entry) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>[${entry.category}]</span> ${entry.text}`;
      entryList.appendChild(li);
    });
  }

  renderEntries();

  // Add new entry
  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newEntry = {
      text: entryInput.value,
      category: categorySelect.value,
    };
    entries.push(newEntry);
    localStorage.setItem("entries", JSON.stringify(entries));
    renderEntries();
    entryForm.reset();
  });
});
