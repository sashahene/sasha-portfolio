(function () {
  const perch = document.querySelector(".butterfly-perch");
  const toggle = document.querySelector(".hero-butterfly-toggle");
  const mathH = document.querySelector(".hero-math-h");
  const welcomeO = document.querySelector(".hero-welcome-o");
  if (!perch || !toggle || !mathH || !welcomeO) return;

  const BUTTERFLY_SVG = `
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <linearGradient id="glass-fill" x1="18" y1="10" x2="58" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
          <stop offset="0.42" stop-color="#e7f8ff" stop-opacity="0.04"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="glass-inner" x1="32" y1="28" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="wing wing-left">
        <path d="M40 41C18 8 2 18 8 40c-6 4 6 20 32 8Z" />
        <path d="M40 47C22 52 10 70 26 72c8-8 10-18 14-25Z" />
        <path class="wing-inner" d="M36 36c-10-14-20-10-18 2 2 4 10 8 18 2Z" />
      </g>
      <g class="wing wing-right">
        <path d="M40 41C62 8 78 18 72 40c6 4-6 20-32 8Z" />
        <path d="M40 47C58 52 70 70 54 72c-8-8-10-18-14-25Z" />
        <path class="wing-inner" d="M44 36c10-14 20-10 18 2-2 4-10 8-18 2Z" />
      </g>
      <ellipse class="body" cx="40" cy="44" rx="2.1" ry="13" />
      <path class="antenna" d="M39 32Q33 18 26 14" />
      <path class="antenna" d="M41 32Q47 18 54 14" />
    </svg>
  `;

  const track = document.createElement("div");
  track.className = "butterfly-track";
  track.setAttribute("aria-hidden", "true");
  track.style.setProperty("--size", "62px");
  track.style.setProperty("--tilt", "-22deg");
  track.innerHTML = `<div class="butterfly">${BUTTERFLY_SVG}</div>`;
  perch.appendChild(track);

  function pin() {
    const parent = perch.getBoundingClientRect();
    const h = mathH.getBoundingClientRect();
    const o = welcomeO.getBoundingClientRect();
    const fs = parseFloat(
      getComputedStyle(document.querySelector(".hero h1")).fontSize
    );
    const targetLeft = h.right + fs * 0.0864;
    const targetTop = o.top + fs * -0.9222;

    track.style.left = `${targetLeft - parent.left}px`;
    track.style.top = `${targetTop - parent.top}px`;

    const box = (track.querySelector("svg") || track).getBoundingClientRect();
    track.style.left = `${targetLeft - parent.left + (targetLeft - box.left)}px`;
    track.style.top = `${targetTop - parent.top + (targetTop - box.top)}px`;
  }

  function pinWhenReady() {
    requestAnimationFrame(pin);
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => requestAnimationFrame(pin));
    }
  }

  pinWhenReady();
  window.addEventListener("resize", pin);

  function setButterfliesVisible(visible) {
    perch.classList.toggle("butterflies-off", !visible);
    toggle.setAttribute("aria-pressed", String(visible));
    toggle.setAttribute(
      "aria-label",
      visible ? "Hide butterflies" : "Show butterflies"
    );
  }

  toggle.addEventListener("click", () => {
    setButterfliesVisible(perch.classList.contains("butterflies-off"));
  });
})();
