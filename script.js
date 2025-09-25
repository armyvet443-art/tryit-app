document.addEventListener("DOMContentLoaded", () => {
  const funButton = document.getElementById("funButton");
  const colorButton = document.getElementById("colorButton");
  const greetButton = document.getElementById("greetButton");
  const darkModeButton = document.getElementById("darkModeButton");
  const nameButton = document.getElementById("nameButton");
  const nameInput = document.getElementById("nameInput");
  const message = document.getElementById("message");
  const counter = document.getElementById("counter");
  const tryitForm = document.getElementById("tryit-form");
  const entriesList = document.getElementById("entries-list");

  // Fun messages
  const funMessages = [
    "🎉 You just clicked the TryIt App button!",
    "🚀 Blast off! That button is working.",
    "🔥 Boom! Click detected.",
    "😎 Nice click — you’re a pro at this.",
    "✨ Magic! The TryIt App responds."
  ];

  // Load state from localStorage
  let clickCount = parseInt(localStorage.getItem("clickCount")) || 0;
  counter.textContent = `Clicks: ${clickCount}`;

  let darkMode = localStorage.getItem("darkMode") === "true";
  if (darkMode) document.body.classList.add("dark");

  let entries = JSON.parse(localStorage.getItem("entries")) || [];
  entries.forEach(entry => addEntryToList(entry));

  // Fun button → random message + counter
  funButton.addEventListener("click", () => {
    const randomIndex = Math.floor(Math.random() * funMessages.length);
    message.textContent = funMessages[randomIndex];

    clickCount++;
    counter.textContent = `Clicks: ${clickCount}`;
    localStorage.setItem("clickCount", clickCount);

    message.classList.remove("show");
    void message.offsetWidth;
    message.classList.add("show");
  });

  // Color button → random background
  colorButton.addEventListener("click", () => {
    const colors = ["#f5f5f5", "#ffe4e1", "#e6ffe6", "#e6f0ff", "#fff3cd"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = randomColor;
  });

  // Greet button
  greetButton.addEventListener("click", () => {
    message.textContent = "👋 Hello there! Thanks for trying the app.";
    message.classList.remove("show");
    void message.offsetWidth;
    message.classList.add("show");
  });

  // Dark mode toggle
  darkModeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
  });

  // Name greeting
  nameButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (name) {
      message.textContent = `🙌 Hello, ${name}!`;
      message.classList.remove("show");
      void message.offsetWidth;
      message.classList.add("show");
    }
  });

  // Form submission
  tryitForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const entry = {
      title: document.getElementById("title").value,
      category: document.getElementById("category").value,
      details: document.getElementById("details").value,
    };

    addEntryToList(entry);

    entries.push(entry);
    localStorage.setItem("entries", JSON.stringify(entries));

    tryitForm.reset();
  });

  // Helper: add entry to list
  function addEntryToList(entry) {
    const li = document.createElement("li");
    li.textContent = `${entry.title} (${entry.category}) - ${entry.details}`;
    entriesList.appendChild(li);
  }
});
