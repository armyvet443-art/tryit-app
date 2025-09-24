document.addEventListener("DOMContentLoaded", () => {
  const funButton = document.getElementById("funButton");
  const colorButton = document.getElementById("colorButton");
  const greetButton = document.getElementById("greetButton");
  const darkModeButton = document.getElementById("darkModeButton");
  const message = document.getElementById("message");
  const counterDisplay = document.getElementById("counter");

  // Step 2: name input + button
  const nameInput = document.getElementById("nameInput");
  const nameButton = document.getElementById("nameButton");

  let clickCount = 0;

  // Array of fun messages
  const funMessages = [
    "🎉 You just clicked the TryIt App button!",
    "🚀 Blast off! That button is working.",
    "🔥 Boom! Click detected.",
    "😎 Nice click — you’re a pro at this.",
    "✨ Magic! The TryIt App responds."
  ];

  // Fun Button → random message
  funButton.addEventListener("click", () => {
    const randomIndex = Math.floor(Math.random() * funMessages.length);
    message.textContent = funMessages[randomIndex];

    // Restart animation
    message.classList.remove("show");
    void message.offsetWidth;
    message.classList.add("show");

    // Update counter
    clickCount++;
    counterDisplay.textContent = `Clicks: ${clickCount}`;
  });

  // Color Button → change background color
  colorButton.addEventListener("click", () => {
    const colors = ["#f5f5f5", "#ffe4e1", "#e6ffe6", "#e6f0ff", "#fff3cd"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = randomColor;
  });

  // Greet Button → friendly message
  greetButton.addEventListener("click", () => {
    message.textContent = "👋 Hello there! Thanks for trying the app.";

    // Restart animation
    message.classList.remove("show");
    void message.offsetWidth;
    message.classList.add("show");
  });

  // Dark Mode Toggle (Step 1)
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark");
  }

  darkModeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    if (document.body.classList.contains("dark")) {
      localStorage.setItem("darkMode", "enabled");
    } else {
      localStorage.removeItem("darkMode");
    }
  });

  // Step 2: Name Button → personalized greeting
  nameButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (name) {
      message.textContent = `👋 Hello, ${name}! Thanks for trying the app.`;
    } else {
      message.textContent = "⚠️ Please enter your name first!";
    }

    // Restart animation
    message.classList.remove("show");
    void message.offsetWidth;
    message.classList.add("show");
  });
});
