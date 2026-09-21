(function () {
  const desktop = document.getElementById("ctd-desktop");
  if (!desktop) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const spot = document.createElement("div");
  spot.className = "ctd-spot";
  spot.setAttribute("aria-hidden", "true");
  desktop.prepend(spot);

  let targetX = desktop.clientWidth * 0.35;
  let targetY = desktop.clientHeight * 0.4;
  let x = targetX;
  let y = targetY;

  desktop.addEventListener(
    "pointermove",
    (event) => {
      const box = desktop.getBoundingClientRect();
      targetX = event.clientX - box.left;
      targetY = event.clientY - box.top;
      desktop.classList.add("is-lit");
    },
    { passive: true }
  );

  desktop.addEventListener("pointerleave", () => {
    desktop.classList.remove("is-lit");
  });

  function frame() {
    const ease = reduced ? 1 : 0.16;
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    spot.style.setProperty("--spot-x", `${x}px`);
    spot.style.setProperty("--spot-y", `${y}px`);
    window.requestAnimationFrame(frame);
  }

  frame();
})();
