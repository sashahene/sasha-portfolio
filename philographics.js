(function () {
  const root = document.querySelector("[data-philo-maker]");
  if (!root) return;

  const KEY = "philographics-cover";
  const form = root.querySelector(".philo-maker-form");
  const stage = root.querySelector(".philo-maker-stage");
  const useButton = root.querySelector(".philo-maker-use");
  const wordInput = form.querySelector('[name="word"]');
  const lineInput = form.querySelector('[name="line"]');

  const looks = [
    { bg: "#1a1918", ink: "#ece6da", a: "#b3922f", b: "#ece6da" },
    { bg: "#f4f2ee", ink: "#211f1d", a: "#211f1d", b: "#8a2f2f" },
    { bg: "#1e3a36", ink: "#e8efe8", a: "#e8efe8", b: "#c4a35a" },
    { bg: "#e6dfd2", ink: "#3a342c", a: "#4a453c", b: "#8d4a32" },
    { bg: "#2b2624", ink: "#f0ebe3", a: "#e2c48a", b: "#f0ebe3" },
    { bg: "#e6e9e0", ink: "#161616", a: "#3dc8c4", b: "#e85a28" },
    { bg: "#14161c", ink: "#e7e4dc", a: "#d4534a", b: "#e7e4dc" },
    { bg: "#f7f1e8", ink: "#1c1915", a: "#7c2f2a", b: "#243f34" },
  ];

  function hash(value) {
    let h = 2166136261;
    for (const char of value.toLowerCase()) {
      h ^= char.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function xml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wrap(text, max) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function shapes(kind, look) {
    if (kind === 0) return `<circle cx="50" cy="72" r="18" fill="${look.a}"/>`;
    if (kind === 1) return `<polygon points="50,48 78,96 22,96" fill="${look.a}"/>`;
    if (kind === 2) {
      return `<circle cx="50" cy="74" r="22" fill="none" stroke="${look.a}" stroke-width="8"/>`;
    }
    if (kind === 3) return `<rect x="32" y="56" width="36" height="36" fill="${look.a}"/>`;
    if (kind === 4) {
      return `<circle cx="50" cy="62" r="16" fill="${look.a}"/><circle cx="50" cy="86" r="16" fill="${look.b}"/>`;
    }
    if (kind === 5) {
      return `<rect x="44" y="50" width="12" height="44" fill="${look.a}"/><rect x="28" y="66" width="44" height="12" fill="${look.a}"/>`;
    }
    return `<circle cx="42" cy="74" r="16" fill="${look.a}"/><circle cx="62" cy="74" r="10" fill="${look.b}"/>`;
  }

  function posterSvg(word, line) {
    const seed = hash(word);
    const look = looks[seed % looks.length];
    const art = shapes(seed % 7, look);
    const title = wrap(word, 16);
    const caption = line ? wrap(line, 28) : [];
    const titleSvg = title
      .map(
        (row, index) =>
          `<text x="8" y="${18 + index * 6}" fill="${look.ink}" font-family="Helvetica, Arial, sans-serif" font-size="5" font-weight="700">${xml(row)}</text>`
      )
      .join("");
    const captionSvg = caption
      .map(
        (row, index) =>
          `<text x="8" y="${112 + index * 4.2}" fill="${look.ink}" font-family="Helvetica, Arial, sans-serif" font-size="2.6">${xml(row)}</text>`
      )
      .join("");

    return `<svg viewBox="0 0 100 133" role="img" aria-label="${xml(word)}">
      <rect width="100" height="133" fill="${look.bg}"/>
      ${art}
      ${titleSvg}
      ${captionSvg}
    </svg>`;
  }

  function showDraft(word, line) {
    stage.hidden = false;
    stage.innerHTML = posterSvg(word, line);
    useButton.hidden = false;
    root.classList.remove("is-placed");
    root.dataset.word = word;
    root.dataset.line = line;
  }

  function showPlaced(word, line) {
    root.classList.add("is-placed");
    stage.hidden = false;
    stage.innerHTML = `<figure class="philo-poster">${posterSvg(word, line)}</figure>`;
    useButton.hidden = true;
    wordInput.value = word;
    lineInput.value = line;
    if (!root.querySelector(".philo-maker-again")) {
      const again = document.createElement("button");
      again.type = "button";
      again.className = "philo-maker-again";
      again.textContent = "Make another";
      again.addEventListener("click", () => {
        root.classList.remove("is-placed");
        stage.hidden = true;
        stage.innerHTML = "";
        useButton.hidden = true;
        wordInput.focus();
      });
      root.append(again);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const word = wordInput.value.trim();
    if (!word) return;
    showDraft(word, lineInput.value.trim());
  });

  useButton.addEventListener("click", () => {
    const word = root.dataset.word || "";
    const line = root.dataset.line || "";
    if (!word) return;
    localStorage.setItem(KEY, JSON.stringify({ word, line }));
    showPlaced(word, line);
  });

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && saved.word) showPlaced(saved.word, saved.line || "");
  } catch {
    localStorage.removeItem(KEY);
  }
})();
