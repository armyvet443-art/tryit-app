document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script is running!");

  // ==== Buttons & Inputs ====
  const funButton = document.getElementById("funButton");
  const colorButton = document.getElementById("colorButton");
  const greetButton = document.getElementById("greetButton");
  const darkModeButton = document.getElementById("darkModeButton");
  const nameInput = document.getElementById("nameInput");
  const nameButton = document.getElementById("nameButton");
  const message = document.getElementById("message");
  const counterDisplay = document.getElementById("counter");

  // ==== Counter ====
  let counter = 0;

  funButton?.addEventListener("click", () => {
    counter++;
    counterDisplay.textContent = `Clicks: ${counter}`;
  });

  // ==== Random Background Color ====
  colorButton?.addEventListener("click", () => {
    const randomColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 80%)`;
    document.body.style.backgroundColor = randomColor;
  });

  // ==== Greeting Buttons ====
  greetButton?.addEventListener("click", () => {
    alert("👋 Hello from Try It App!");
  });

  nameButton?.addEventListener("click", () => {
    const name = nameInput.value.trim();
    message.textContent = name ? `Hi, ${name}! 🎉` : "Please enter a name.";
  });

  // ==== Dark Mode (with localStorage) ====
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }

  darkModeButton?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("darkMode", "enabled");
    } else {
      localStorage.setItem("darkMode", "disabled");
    }
  });

  // ==== Entries Form ====
  const form = document.getElementById("tryit-form");
  const entriesList = document.getElementById("entries-list");

  // Load saved entries from localStorage
  let savedEntries = JSON.parse(localStorage.getItem("entries")) || [];
  savedEntries.forEach(addEntryToPage);

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value;
    const rating = document.querySelector("input[name='rating']:checked")?.value || "⭐";

    const entry = { title, category, description, rating, date: new Date().toLocaleString() };

    // Save to localStorage
    savedEntries.push(entry);
    localStorage.setItem("entries", JSON.stringify(savedEntries));

    addEntryToPage(entry);
    form.reset();
  });

  function addEntryToPage(entry) {
    const card = document.createElement("div");
    card.className = "entry-card";

    card.innerHTML = `
      <div class="entry-header">
        <span class="entry-title">${entry.title}</span>
        <span class="badge ${entry.category.toLowerCase()}">${entry.category}</span>
      </div>
      <p class="entry-desc">${entry.description}</p>
      <div class="entry-footer">
        <span class="stars">${entry.rating}</span>
        <span class="meta">${entry.date}</span>
      </div>
    `;

    entriesList.prepend(card);
  }
});
