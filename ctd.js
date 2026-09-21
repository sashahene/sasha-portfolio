(function () {
  const desktop = document.getElementById("ctd-desktop");
  if (!desktop) return;

  const projects = (window.PROJECTS || []).filter((project) =>
    (project.categories || []).includes("ctd")
  );
  let stack = 10;
  const EDIT_KEY = "sasha-ctd-edits";

  function loadEdits() {
    try {
      return JSON.parse(window.localStorage.getItem(EDIT_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveEdits(edits) {
    window.localStorage.setItem(EDIT_KEY, JSON.stringify(edits));
  }

  const edits = loadEdits();

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDescription(text) {
    const [intro, ...rest] = text.split("\n\n");
    const introHtml = escapeHtml(intro).replaceAll("\n", "<br>");
    const linkLines = rest
      .join("\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!linkLines.length) return introHtml;
    const linksHtml = linkLines
      .map(
        (line) =>
          `<a class="soft-link" href="#" aria-disabled="true">${escapeHtml(line)}</a>`
      )
      .join("<br>");
    return `${introHtml}<br><br>${linksHtml}`;
  }

  function pickDescription(project, saved) {
    const fromFile = project.description || "";
    const fromSaved =
      saved && typeof saved.description === "string" ? saved.description : null;
    if (fromSaved == null) return fromFile;
    if (
      fromFile &&
      (fromSaved.includes(" - link") ||
        fromSaved.includes("include external link") ||
        fromSaved.includes("EXPLAIN WHAT PHILOGRAPHICS"))
    ) {
      return fromFile;
    }
    return fromSaved;
  }

  function raise(win) {
    stack += 1;
    win.style.zIndex = String(stack);
    desktop.querySelectorAll(".ctd-window").forEach((item) => {
      item.classList.toggle("is-front", item === win);
    });
  }

  function makeDraggable(win) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    win.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      raise(win);
      if (event.target.closest("a, button, [contenteditable]")) return;
      dragging = true;
      win.classList.add("is-dragging");
      const desk = desktop.getBoundingClientRect();
      const box = win.getBoundingClientRect();
      startX = event.clientX;
      startY = event.clientY;
      origX = box.left - desk.left;
      origY = box.top - desk.top;
      win.style.left = `${origX}px`;
      win.style.top = `${origY}px`;
      win.style.right = "auto";
      win.setPointerCapture(event.pointerId);
    });

    win.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const desk = desktop.getBoundingClientRect();
      const maxX = Math.max(8, desk.width - win.offsetWidth - 8);
      const maxY = Math.max(8, desk.height - 44);
      const x = Math.min(maxX, Math.max(8, origX + event.clientX - startX));
      const y = Math.min(maxY, Math.max(8, origY + event.clientY - startY));
      win.style.left = `${x}px`;
      win.style.top = `${y}px`;
    });

    const stopDrag = () => {
      dragging = false;
      win.classList.remove("is-dragging");
    };

    win.addEventListener("pointerup", stopDrag);
    win.addEventListener("pointercancel", stopDrag);
  }

  function projectWindow(project, index) {
    const win = document.createElement("article");
    win.className = "ctd-window";
    if (index === 0) {
      win.style.left = "8px";
      win.style.top = "8px";
    } else if (index === 1) {
      win.style.left = "calc(8px + min(24rem, 68%) + 18px)";
      win.style.top = "8px";
    } else {
      win.style.left = `${8 + index * 36}px`;
      win.style.top = `${8 + index * 36}px`;
    }
    win.style.zIndex = String(4 + index);

    const key = project.title || `project-${index}`;
    const saved = edits[key] || {};
    const title = project.title || "Untitled";
    const year = String(project.year || "");
    const description = pickDescription(project, saved);
    const tags = (project.tags || [])
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
    const links = [
      project.github
        ? `<a href="${escapeHtml(project.github)}" target="_blank" rel="noreferrer">github</a>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    win.innerHTML = `
      <div class="ctd-window-bar">
        <span class="ctd-dots" aria-hidden="true">
          <span class="ctd-dot"></span>
          <span class="ctd-dot"></span>
          <span class="ctd-dot"></span>
        </span>
        <span class="ctd-window-title">${escapeHtml(title)}</span>
      </div>
      <div class="ctd-window-body">
        ${year ? `<p class="project-year">${escapeHtml(year)}</p>` : ""}
        <div class="ctd-window-copy" contenteditable="true" spellcheck="true" data-placeholder="Click to write" aria-label="Project description">${description ? formatDescription(description) : ""}</div>
        ${project.demo ? `<a class="ctd-footnote-link" href="${escapeHtml(project.demo)}" target="_blank" rel="noreferrer">View project</a>` : ""}
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        ${links ? `<div class="project-links">${links}</div>` : ""}
      </div>
    `;

    const copy = win.querySelector(".ctd-window-copy");
    if (copy) {
      copy.addEventListener("input", () => {
        if (!edits[key]) edits[key] = {};
        edits[key].description = copy.innerText.replace(/\n+$/g, "");
        saveEdits(edits);
      });
      copy.addEventListener("blur", () => {
        if (!copy.textContent.trim()) copy.textContent = "";
      });
    }

    makeDraggable(win);
    return win;
  }

  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "No Creative Tech projects yet. Add one in projects.js.";
    desktop.append(empty);
  } else {
    projects.forEach((project, index) => {
      desktop.append(projectWindow(project, index));
    });
  }

  desktop.addEventListener("click", (event) => {
    const link = event.target.closest(".soft-link");
    if (!link) return;
    event.preventDefault();
  });
})();
