document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script is running!");

  const funButton = document.getElementById("funButton");
  const colorButton = document.getElementById("colorButton");
  const greetButton = document.getElementById("greetButton");
  const nameButton = document.getElementById("nameButton");
  const nameInput = document.getElementById("nameInput");
  const message = document.getElementById("message");
  const counter = document.getElementById("counter");

  // Array of fun messages
  const funMessages = [
    "🎉 You just clicked the TryIt App button!",
    "🚀 Blast off! That button is working.",
    "🔥 Boom! Click detected.",
    "😎 Nice click — you’re a pro at this.",
    "✨ Magic! The TryIt App responds."
  ];

  // Load saved counter from localStorage or default to 0
  let count = Number(localStorage.getItem("clickCount")) || 0;
  if (counter) {
    counter.textContent = `Clicks: ${count}`;
    counter.dataset.count = String(count);
  }

  // Helper → update counter
  function updateCounter() {
    count++;
    localStorage.setItem("clickCount", count); // save
    if (counter) {
      counter.dataset.count = String(count);
      counter.textContent = `Clicks: ${count}`;
    }
  }

  // Helper → bounce animation
  function triggerBounce(element) {
    element.classList.remove("show");
    void element.offsetWidth; // restart animation
    element.classList.add("show");
  }

  // Fun Button → random message
  funButton.addEventListener("click", () => {
    const randomIndex = Math.floor(Math.random() * funMessages.length);
    message.textContent = funMessages[randomIndex];
    triggerBounce(message);
    updateCounter();
  });

  // Color Button → change background color
  colorButton.addEventListener("click", () => {
    const colors = ["#f5f5f5", "#ffe4e1", "#e6ffe6", "#e6f0ff", "#fff3cd"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    document.body.style.backgroundColor = randomColor;

    message.textContent = "🎨 Background color changed!";
    triggerBounce(message);
    updateCounter();
  });

  // Greet Button → friendly message
  greetButton.addEventListener("click", () => {
    message.textContent = "👋 Hello there! Thanks for trying the app.";
    triggerBounce(message);
    updateCounter();
  });

  // Name Button → greet with name
  nameButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (name) {
      message.textContent = `🙌 Hi, ${name}! Welcome to TryIt App 🎉`;
      localStorage.setItem("userName", name);
    } else {
      message.textContent = "⚠️ Please enter your name first!";
    }
    triggerBounce(message);
    updateCounter();
  });
});
