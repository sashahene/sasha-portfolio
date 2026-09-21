function renderProjects() {
  const list = document.getElementById("project-list");
  const allProjects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  const category = list && list.dataset.category;
  const projects = category
    ? allProjects.filter((project) =>
        (project.categories || []).includes(category)
      )
    : allProjects;

  if (!list) return;

  if (list.dataset.layout === "planets") {
    renderPlanetField(list, projects);
    return;
  }

  if (list.dataset.layout === "works") {
    renderWorkIndex(list, projects);
    return;
  }

  if (projects.length === 0) {
    if (list.getAttribute("data-empty") === "") {
      list.replaceChildren();
      return;
    }
    const empty = document.createElement("li");
    empty.className = "empty-note";
    empty.textContent =
      list.dataset.empty || "No projects in this category yet. Add one in projects.js.";
    list.replaceChildren(empty);
    return;
  }

  list.innerHTML = projects.map(projectCardHtml).join("");
}

const PLANET_LOOKS = [
  { highlight: "#ffe2c2", mid: "#ff9a4a", shadow: "#6a2410", glow: "rgba(255, 122, 40, 0.45)" },
  { highlight: "#eef8ff", mid: "#7ec8ff", shadow: "#16385f", glow: "rgba(126, 200, 255, 0.4)" },
  { highlight: "#ffe6f4", mid: "#ff7ad4", shadow: "#5a2048", glow: "rgba(255, 122, 212, 0.38)" },
  { highlight: "#fff4d6", mid: "#ffc14a", shadow: "#6a4a10", glow: "rgba(255, 193, 74, 0.42)" },
  { highlight: "#e8ffe8", mid: "#8fd99a", shadow: "#204a28", glow: "rgba(143, 217, 154, 0.35)" },
  { highlight: "#ffe4d6", mid: "#ff8a5b", shadow: "#5a2818", glow: "rgba(255, 138, 91, 0.4)" },
];

function projectCardHtml(project) {
  const links = projectLinksHtml(project);
  const tags = projectTagsHtml(project);

  return `
    <li class="project-card">
      <p class="project-year">${escapeHtml(String(project.year || ""))}</p>
      <div>
        <h3>${escapeHtml(project.title || "Untitled")}</h3>
        <p>${escapeHtml(project.description || "")}</p>
        <div class="tags">${tags}</div>
      </div>
      <div class="project-links">${links || "<span></span>"}</div>
    </li>
  `;
}

function projectLinksHtml(project) {
  return [
    project.demo
      ? `<a href="${escapeHtml(project.demo)}" target="_blank" rel="noreferrer">&gt; live</a>`
      : "",
    project.github
      ? `<a href="${escapeHtml(project.github)}" target="_blank" rel="noreferrer">&gt; github</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

function projectTagsHtml(project) {
  return (project.tags || [])
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("");
}

function renderWorkIndex(list, projects) {
  if (projects.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-note";
    empty.textContent =
      list.dataset.empty || "No projects in this category yet. Add one in projects.js.";
    list.replaceChildren(empty);
    return;
  }

  list.innerHTML = projects
    .map((project, index) => {
      const href = project.demo || project.github || "#";
      const external = /^https?:/i.test(href)
        ? ' target="_blank" rel="noreferrer"'
        : "";
      const number = String(index + 1).padStart(2, "0");
      const year = project.year || "";
      const tags = (project.tags || [])
        .map((tag) => `<span>${escapeHtml(tag)}</span>`)
        .join("");
      const image = project.image
        ? `<img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.title || "")}">`
        : "";
      const description = project.description
        ? `<p>${escapeHtml(project.description)}</p>`
        : "";
      const cta =
        project.demo || project.github
          ? `<span class="ide-work-cta">View case study <span aria-hidden="true">↗</span></span>`
          : "";

      return `
        <li class="ide-work">
          <a class="ide-work-image" href="${escapeHtml(href)}"${external} aria-label="${escapeHtml(project.title || "Project")}">
            ${image}
            <span class="ide-work-go" aria-hidden="true">↗</span>
          </a>
          <div class="ide-work-copy">
            <div class="ide-work-meta">
              <span>${number}</span>
              <span>${escapeHtml(String(year))}</span>
            </div>
            <div class="ide-work-body">
              <div class="ide-work-tags">${tags}</div>
              <h3>${escapeHtml(project.title || "Untitled")}</h3>
              ${description}
              ${cta}
            </div>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderPlanetField(list, projects) {
  const looks = PLANET_LOOKS;
  const decorCount = 12;
  const bodies = [];

  projects.forEach((project, index) => {
    const look = looks[index % looks.length];
    bodies.push({
      id: `project-${index}`,
      projectIndex: index,
      title: project.title || "Untitled",
      decor: false,
      size: project.featured ? 6.6 : 5.4 - (index % 3) * 0.35,
      look,
      pos: defaultGalaxyPos(index, projects.length + decorCount, 280),
    });
  });

  for (let i = 0; i < decorCount; i += 1) {
    const look = looks[i % looks.length];
    bodies.push({
      id: `decor-${i}`,
      projectIndex: null,
      title: "",
      decor: true,
      size: 1.1 + (i % 5) * 0.28,
      look,
      pos: defaultGalaxyPos(projects.length + i, projects.length + decorCount, 340),
    });
  }

  list.innerHTML = bodies
    .map((body) => {
      const tag = body.decor ? "div" : "button";
      const type = body.decor ? "" : 'type="button"';
      const controls = body.decor
        ? ""
        : 'aria-expanded="false" aria-controls="planet-dossier"';
      const name = body.decor
        ? ""
        : `<span class="planet-name">${escapeHtml(body.title)}</span>`;
      const slices = Array.from({ length: 16 }, (_, i) =>
        `<span class="planet-slice" style="--i:${i}"></span>`
      ).join("");
      const bands = Array.from({ length: 6 }, (_, i) =>
        `<span class="planet-slice planet-band" style="--i:${i + 1}"></span>`
      ).join("");

      return `
        <li class="planet-item${body.decor ? " is-decor" : ""}" data-id="${escapeHtml(body.id)}"
          style="--x:${body.pos.x}px;--y:${body.pos.y}px;--z:${body.pos.z}px;">
          <${tag}
            class="planet"
            ${type}
            ${controls}
            data-project-index="${body.projectIndex ?? ""}"
            style="
              --planet-size: ${body.size}rem;
              --planet-highlight: ${body.look.highlight};
              --planet-mid: ${body.look.mid};
              --planet-shadow: ${body.look.shadow};
              --planet-glow: ${body.look.glow};
            "
          >
            <span class="planet-sphere" aria-hidden="true">${slices}${bands}</span>
            ${name}
          </${tag}>
        </li>
      `;
    })
    .join("");

  setupPlanetDossier(list, projects);
  setupGalaxy();
}

function defaultGalaxyPos(index, total, radius) {
  const phi = Math.acos(1 - (2 * (index + 0.5)) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  return {
    x: Math.round(radius * Math.sin(phi) * Math.cos(theta)),
    y: Math.round(radius * Math.sin(phi) * Math.sin(theta) * 0.85),
    z: Math.round(radius * Math.cos(phi)),
  };
}

function setupGalaxy() {
  const viewport = document.getElementById("galaxy-viewport");
  const galaxy = document.getElementById("galaxy");
  if (!viewport || !galaxy) return;

  let rx = -18;
  let ry = 28;
  let zoom = 1;
  let drag = null;

  function applyCamera() {
    galaxy.style.setProperty("--rx", `${rx}deg`);
    galaxy.style.setProperty("--ry", `${ry}deg`);
    galaxy.style.setProperty("--zoom", String(zoom));
  }

  applyCamera();

  viewport.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    viewport.classList.add("is-grabbing");
    viewport.setPointerCapture(event.pointerId);
    drag = {
      lastX: event.clientX,
      lastY: event.clientY,
      moved: 0,
      planet: event.target.closest(".planet[data-project-index]:not([data-project-index=''])"),
    };
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    ry += dx * 0.38;
    rx = Math.max(-72, Math.min(72, rx - dy * 0.3));
    applyCamera();
  });

  function endDrag() {
    if (!drag) return;
    viewport.classList.remove("is-grabbing");
    if (drag.planet && drag.moved > 8) {
      drag.planet.setAttribute("data-skip-click", "true");
    }
    drag = null;
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  viewport.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      zoom = Math.max(0.55, Math.min(1.7, zoom - event.deltaY * 0.0012));
      applyCamera();
    },
    { passive: false }
  );
}

function setupPlanetDossier(list, projects) {
  const dossier = document.getElementById("planet-dossier");
  if (!dossier) return;

  const year = dossier.querySelector(".project-year");
  const title = dossier.querySelector("h2");
  const copy = dossier.querySelector(".planet-dossier-copy");
  const tags = dossier.querySelector(".tags");
  const links = dossier.querySelector(".project-links");
  const close = dossier.querySelector(".planet-dossier-close");
  const planets = [...list.querySelectorAll(".planet[data-project-index]")].filter(
    (planet) => planet.dataset.projectIndex !== ""
  );

  function openProject(index) {
    const project = projects[index];
    if (!project) return;

    year.textContent = String(project.year || "");
    title.textContent = project.title || "Untitled";
    copy.textContent = project.description || "";
    tags.innerHTML = projectTagsHtml(project);
    links.innerHTML = projectLinksHtml(project) || "";
    dossier.hidden = false;

    planets.forEach((planet) => {
      const isOpen = Number(planet.dataset.projectIndex) === index;
      planet.setAttribute("aria-expanded", String(isOpen));
      planet.classList.toggle("is-open", isOpen);
    });
  }

  function closeProject() {
    dossier.hidden = true;
    planets.forEach((planet) => {
      planet.setAttribute("aria-expanded", "false");
      planet.classList.remove("is-open");
    });
  }

  planets.forEach((planet) => {
    planet.addEventListener("click", (event) => {
      if (planet.getAttribute("data-skip-click") === "true") {
        planet.removeAttribute("data-skip-click");
        event.preventDefault();
        return;
      }
      const index = Number(planet.dataset.projectIndex);
      if (planet.classList.contains("is-open")) {
        closeProject();
        return;
      }
      openProject(index);
    });
  });

  close.addEventListener("click", closeProject);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dossier.hidden) {
      closeProject();
    }
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

renderProjects();

const year = document.getElementById("year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}
