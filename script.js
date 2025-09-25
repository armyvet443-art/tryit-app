document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script is running!");

  // Dark mode
  const body = document.body;
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (localStorage.getItem("darkMode") === "enabled") {
    body.classList.add("dark");
  }
  darkModeToggle.addEventListener("click", () => {
    body.classList.toggle("dark");
    if (body.classList.contains("dark")) {
      localStorage.setItem("darkMode", "enabled");
    } else {
      localStorage.setItem("darkMode", "disabled");
    }
  });

  // Fun button
  const funButton = document.getElementById("funButton");
  funButton.addEventListener("click", () => {
    alert("🎉 You clicked the Fun Button!");
  });

  // Color changer
  const colorButton = document.getElementById("colorButton");
  colorButton.addEventListener("click", () => {
    const randomColor = "#" + Math.floor(Math.random()*16777215).toString(16);
    body.style.backgroundColor = randomColor;
  });

  // Greeting
  const greetButton = document.getElementById("greetButton");
  greetButton.addEventListener("click", () => {
    const name = prompt("What’s your name?");
    if (name) alert(`👋 Hello, ${name}!`);
  });

  // Counter
  const counter = document.getElementById("counter");
  const incrementButton = document.getElementById("incrementButton");
  let count = 0;
  incrementButton.addEventListener("click", () => {
    count++;
    counter.textContent = count;
  });

  // Entries (Step 2)
  const entryForm = document.getElementById("entryForm");
  const entryText = document.getElementById("entryText");
  const entryCategory = document.getElementById("entryCategory");
  const entriesList = document.getElementById("entriesList");

  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = entryText.value.trim();
    const category = entryCategory.value;

    if (text !== "") {
      const li = document.createElement("li");
      li.textContent = `${text} (${category})`;
      entriesList.appendChild(li);

      entryText.value = "";
    }
  });
});
