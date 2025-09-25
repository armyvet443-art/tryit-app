document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Script is running!");

  // ========== Dark Mode ==========
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "darkMode",
      document.body.classList.contains("dark-mode") ? "enabled" : "disabled"
    );
  });

  // ========== Click Counter ==========
  const clickCountSpan = document.getElementById("clickCount");
  const incrementButton = document.getElementById("incrementButton");

  let clickCount = parseInt(localStorage.getItem("clickCount")) || 0;
  clickCountSpan.textContent = clickCount;

  incrementButton.addEventListener("click", () => {
    clickCount++;
    clickCountSpan.textContent = clickCount;
    localStorage.setItem("clickCount", clickCount);
  });

  // ========== Entries ==========
  const entryForm = document.getElementById("entryForm");
  const entryText = document.getElementById("entryText");
  const entryCategory = document.getElementById("entryCategory");
  const entriesList = document.getElementById("entriesList");

  let entries = JSON.parse(localStorage.getItem("entries")) || [];

  function saveEntries() {
    localStorage.setItem("entries", JSON.stringify(entries));
  }

  function renderEntries() {
    entriesList.innerHTML = "";
    entries.forEach((entry, index) => {
      const li = document.createElement("li");
      li.textContent = `${entry.text} (${entry.category})`;

      // Add delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "❌";
      deleteBtn.classList.add("delete-btn");
      deleteBtn.addEventListener("click", () => {
        entries.splice(index, 1);
        saveEntries();
        renderEntries();
      });

      li.appendChild(deleteBtn);
      entriesList.appendChild(li);
    });
  }

  entryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newEntry = {
      text: entryText.value,
      category: entryCategory.value,
    };
    entries.push(newEntry);
    saveEntries();
    renderEntries();
    entryForm.reset();
  });

  // Initial render
  renderEntries();
});
