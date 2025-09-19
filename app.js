// Global site config (swap your logo here later if needed)
const SITE = {
  logo: "logo_resized2.jpg",  // <- change here if your logo file changes
  title: "Try It App",
  year: new Date().getFullYear()
};

// Render header (logo + nav + dark toggle)
function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  const path = (p) => location.pathname.endsWith(p);
  const active = (p) => path(p) ? ' style="text-decoration:underline;font-weight:700;"' : "";

  header.innerHTML = `
    <div style="text-align:center;">
      <img src="${SITE.logo}" alt="${SITE.title} Logo" style="width:200px;margin:30px 0 10px;">
    </div>
    <nav>
      <a href="index.html"${active("index.html")}>Home</a>
      <a href="about.html"${active("about.html")}>About</a>
      <a href="contact.html"${active("contact.html")}>Contact</a>
      <button id="toggle-dark" class="btn" style="margin-left:auto;">🌙 Toggle Dark</button>
    </nav>
  `;

  // Dark mode persisted
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
  }
  document.getElementById("toggle-dark").onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
  };
}

// Render footer
function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `© ${SITE.year} ${SITE.title}`;
}

// Kick off on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
});
