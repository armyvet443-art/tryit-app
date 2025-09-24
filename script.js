document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script is running!");

  const funButton = document.getElementById("funButton");
  const colorButton = document.getElementById("colorButton");
  const greetButton = document.getElementById("greetButton");
  const darkModeButton = document.getElementById("darkModeButton");
  const nameInput = document.getElementById("nameInput");
  const nameButton = document.getElementById("nameButton");
  const message = document.getElementById("message");
  const counterDisplay = document.getElementById("counter");

  let counter = 0;

  // 🚀 Fun button
  funButton.addEventListener("click", () => {
    counter++;
    counterDisplay.textContent = `Clicks: ${counter}`;
    alert("🚀 You just clicked the TryIt App button!");
  });

  // 🎨 Random background color
  colorButton.addEventListener("click", () => {
    document.body.style.backgroundColor =
      "#" + Math.floor(Math.random() * 16777215).toString(16);
  });

  // 👋 Greeting
  greetButton.addEventListener("click", () => {
    message.textContent = "👋 Hello, friend!";
  });

  // 🙌 Name greeting
  nameButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (name) {
      message.textContent = `🙌 Hello, ${name}! Welcome to Try It App 🚀`;
    } else {
      message.textContent = "⚠️ Please enter your name!";
    }
  });

  // 🌙 Dark Mode Toggle with memory
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }

  darkModeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("darkMode", "enabled");
    } else {
      localStorage.setItem("darkMode", "disabled");
    }
  });
});
