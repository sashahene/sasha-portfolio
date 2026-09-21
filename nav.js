function setupWorkDropdown() {
  const dropdowns = document.querySelectorAll(".nav-dropdown");

  dropdowns.forEach((dropdown) => {
    const label = dropdown.querySelector(".nav-dropdown-label");
    if (!label) return;

    label.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !dropdown.classList.contains("is-open");
      closeDropdowns();
      if (willOpen) {
        dropdown.classList.add("is-open");
        label.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-dropdown")) {
      closeDropdowns();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdowns();
    }
  });
}

function closeDropdowns() {
  document.querySelectorAll(".nav-dropdown").forEach((dropdown) => {
    dropdown.classList.remove("is-open");
    const label = dropdown.querySelector(".nav-dropdown-label");
    if (label) {
      label.setAttribute("aria-expanded", "false");
    }
  });
}

setupWorkDropdown();
