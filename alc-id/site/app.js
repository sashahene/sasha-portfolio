const listEl = document.querySelector("#list");
const searchEl = document.querySelector("#search");
const filtersEl = document.querySelector("#filters");
const countEl = document.querySelector("#count");
const clearEl = document.querySelector("#clear");
const statStudies = document.querySelector("#stat-studies");
const statSchools = document.querySelector("#stat-schools");

const schools = [...new Set(STUDIES.map((study) => study.organization))];

statStudies.textContent = String(STUDIES.length);
statSchools.textContent = String(schools.length);

let activeSchool = "All";

function renderFilters() {
  const options = ["All", ...schools];
  filtersEl.innerHTML = options
    .map(
      (school) =>
        `<li><button type="button" data-school="${escapeAttr(school)}" aria-pressed="${
          school === activeSchool
        }">${escapeHtml(school)}</button></li>`
    )
    .join("");
}

function matches(study, query) {
  if (activeSchool !== "All" && study.organization !== activeSchool) return false;
  if (!query) return true;
  const haystack = [
    study.title,
    study.authors,
    study.organization,
    study.partners,
    study.journal,
    study.device,
    study.setting,
    study.researched,
    study.found,
    study.yearLabel,
    study.url || ""
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function render() {
  const query = searchEl.value.trim().toLowerCase();
  const visible = STUDIES.filter((study) => matches(study, query));
  countEl.textContent =
    visible.length === 1 ? "1 study" : `${visible.length} studies`;

  if (visible.length === 0) {
    listEl.innerHTML = `<div class="empty"><p>No studies match that search. Clear the filter or try a school name, a device, or a word from the findings.</p></div>`;
    return;
  }

  listEl.innerHTML = visible
    .map((study) => {
      const source = study.url
        ? `<a class="pdf" href="${escapeAttr(study.url)}" target="_blank" rel="noopener noreferrer">Open the article</a>`
        : `<a class="pdf" href="../${encodeURIComponent(study.pdf)}">Open the PDF</a>`;
      return `
        <article class="card">
          <div>
            <div class="year${study.year ? "" : " is-label"}">${escapeHtml(study.yearLabel)}</div>
          </div>
          <div>
            <h2>${escapeHtml(study.title)}</h2>
            <p class="org">${escapeHtml(study.organization)}</p>
            <p class="partners">${escapeHtml(study.partners)}</p>
            <p class="authors">${escapeHtml(study.authors)}</p>
            <p class="journal">${escapeHtml(study.journal)}</p>
            <ul class="tags">
              <li>${escapeHtml(study.device)}</li>
              <li>${escapeHtml(study.setting)}</li>
            </ul>
          </div>
          <div class="columns">
            <section>
              <h3>What they researched</h3>
              <p>${escapeHtml(study.researched)}</p>
            </section>
            <section>
              <h3>What they found</h3>
              <p>${escapeHtml(study.found)}</p>
            </section>
          </div>
          ${source}
        </article>`;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

filtersEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  activeSchool = button.dataset.school;
  renderFilters();
  render();
});

searchEl.addEventListener("input", render);

clearEl.addEventListener("click", () => {
  searchEl.value = "";
  activeSchool = "All";
  renderFilters();
  render();
  searchEl.focus();
});

const tabResearch = document.querySelector("#tab-research");
const tabNotes = document.querySelector("#tab-notes");
const tabGuide = document.querySelector("#tab-guide");
const tabChats = document.querySelector("#tab-chats");
const panelResearch = document.querySelector("#panel-research");
const panelNotes = document.querySelector("#panel-notes");
const panelGuide = document.querySelector("#panel-guide");
const panelChats = document.querySelector("#panel-chats");
const pageTitle = document.querySelector("#page-title");
const saveStatus = document.querySelector("#save-status");
const noteFields = [...document.querySelectorAll("#panel-notes textarea")];
const NOTES_KEY = "alc-id-notes-build";

function fitNote(el) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function fitNotes() {
  noteFields.forEach(fitNote);
}

function loadNotes() {
  const raw = localStorage.getItem(NOTES_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    noteFields.forEach((el) => {
      if (Object.prototype.hasOwnProperty.call(data, el.id)) el.value = data[el.id];
    });
  } catch {
    /* Keep the notes written into the page. */
  }
}

function saveNotes() {
  const data = {};
  noteFields.forEach((el) => {
    data[el.id] = el.value;
  });
  localStorage.setItem(NOTES_KEY, JSON.stringify(data));
  saveStatus.textContent = "Saved on this computer. You can keep editing.";
  fitNotes();
}

const tabList = [
  { name: "research", button: tabResearch, panel: panelResearch, title: "Research library", doc: "ALC ID Research Library" },
  { name: "notes", button: tabNotes, panel: panelNotes, title: "Notes", doc: "ALC ID Notes" },
  { name: "guide", button: tabGuide, panel: panelGuide, title: "Guide", doc: "ALC ID Guide" },
  { name: "chats", button: tabChats, panel: panelChats, title: "Saved chats", doc: "ALC ID Saved chats" }
];

function showTab(name) {
  tabList.forEach((tab) => {
    const on = tab.name === name;
    tab.button.setAttribute("aria-selected", String(on));
    tab.button.tabIndex = on ? 0 : -1;
    tab.panel.hidden = !on;
    if (on) {
      pageTitle.textContent = tab.title;
      document.title = tab.doc;
    }
  });
  if (name === "notes") requestAnimationFrame(fitNotes);
  if (name === "chats") showChatsGate();
  if (location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
}

tabResearch.addEventListener("click", () => showTab("research"));
tabNotes.addEventListener("click", () => showTab("notes"));
tabGuide.addEventListener("click", () => showTab("guide"));
tabChats.addEventListener("click", () => showTab("chats"));

document.querySelector(".tabs").addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const index = tabList.findIndex((tab) => tab.button === document.activeElement);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === "ArrowRight"
    ? (index + 1) % tabList.length
    : (index - 1 + tabList.length) % tabList.length;
  tabList[next].button.focus();
  showTab(tabList[next].name);
});

noteFields.forEach((el) => el.addEventListener("input", saveNotes));

const guideFields = [...document.querySelectorAll("#panel-chats .note-card textarea")];
const GUIDE_KEY = "alc-id-guide-plan";
const CHAT_KEY = "alc-id-guide-chat";
const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const latestEl = document.querySelector("#latest");
const savedChatsEl = document.querySelector("#saved-chats");
const chatsLock = document.querySelector("#chats-lock");
const chatsBody = document.querySelector("#chats-body");
const chatsPassword = document.querySelector("#chats-password");
const chatsLockError = document.querySelector("#chats-lock-error");
const CHATS_HASH = "21255148c10e14e8d4bdb60d2ab4fca993e080504c38c8dcfad5f2b84e3a6941";
const UNLOCK_KEY = "alc-id-chats-open";
let chat = [];

function chatsOpen() {
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}

function showChatsGate() {
  const open = chatsOpen();
  chatsLock.hidden = open;
  chatsBody.hidden = !open;
  if (!open) {
    savedChatsEl.innerHTML = "";
    return;
  }
  renderChat();
  requestAnimationFrame(() => guideFields.forEach(fitNote));
}

async function passwordMatches(password) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return hex === CHATS_HASH;
}

chatsLock.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (await passwordMatches(chatsPassword.value)) {
    sessionStorage.setItem(UNLOCK_KEY, "1");
    chatsPassword.value = "";
    chatsLockError.hidden = true;
    showChatsGate();
    return;
  }
  chatsLockError.hidden = false;
  chatsPassword.value = "";
  chatsPassword.focus();
});

function loadGuide() {
  const raw = localStorage.getItem(GUIDE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    guideFields.forEach((el) => {
      if (Object.prototype.hasOwnProperty.call(data, el.id)) el.value = data[el.id];
    });
  } catch {
    /* Keep the plan written into the page. */
  }
}

function saveGuide() {
  const data = {};
  guideFields.forEach((el) => {
    data[el.id] = el.value;
  });
  localStorage.setItem(GUIDE_KEY, JSON.stringify(data));
}

function sectionText(id) {
  return document.getElementById(id).value.trim();
}

const STOP_WORDS = new Set([
  "what", "whats", "which", "how", "can", "could", "would", "should", "does", "do", "did",
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was", "were",
  "have", "has", "about", "into", "than", "then", "them", "they", "their", "just", "more",
  "some", "any", "when", "where", "why", "who", "will", "want", "need", "make", "create",
  "build", "using", "used", "use", "own", "version", "please", "tell", "explain", "help",
  "there", "here", "also", "very", "like", "know", "something"
]);

const RELATED = {
  sweat: ["pilocarpine", "sweating"],
  sweating: ["pilocarpine", "sweat"],
  pilocarpine: ["sweat", "sweating"],
  enzyme: ["oxidase"],
  oxidase: ["enzyme", "ethanol", "peroxide"],
  peroxide: ["hydrogen", "oxidase", "electrode"],
  hydrogen: ["peroxide"],
  ethanol: ["alcohol", "oxidase"],
  alcohol: ["ethanol", "oxidase"],
  electrode: ["prussian", "silver", "carbon", "working", "reference", "counter"],
  working: ["electrode", "prussian"],
  reference: ["silver", "electrode"],
  counter: ["carbon", "electrode"],
  prussian: ["working", "electrode", "carbon"],
  coating: ["albumin", "glutaraldehyde", "nafion"],
  albumin: ["enzyme", "coating"],
  glutaraldehyde: ["enzyme", "coating"],
  nafion: ["filter", "membrane", "sweat"],
  bluetooth: ["phone"],
  battery: ["power"],
  notification: ["alert", "contact"],
  software: ["bac"],
  bac: ["software"],
  tattoo: ["patch"],
  patch: ["tattoo"],
  simpler: ["simple", "strip"],
  simple: ["simpler", "strip"],
  test: ["artificial"],
  artificial: ["test", "sweat"]
};

function questionWords(question) {
  return question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function textChunks(text, title) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const bullets = lines.filter((line) => /^([-]|\d+\.)\s+/.test(line));
      if (bullets.length >= 2 && bullets.length === lines.length) {
        return bullets.map((line) => ({
          title,
          text: line.replace(/^([-]|\d+\.)\s+/, "")
        }));
      }
      return [{ title, text: block }];
    });
}

function savedChunks() {
  const cards = [...document.querySelectorAll("#panel-chats .note-card, #panel-notes .note-card")].flatMap((card) => {
    const title = card.querySelector("h2").textContent.trim();
    const text = card.querySelector("textarea").value.trim();
    return textChunks(text, title);
  });
  const weeks = [...document.querySelectorAll("#guide-schedule .week, #guide-schedule .schedule-tips")].map((block) => ({
    title: "Eight-week build",
    text: `${block.querySelector("h3").textContent.trim()}. ${block.querySelector("p").textContent.trim()}`
  }));
  return [...cards, ...weeks];
}

function chunkScore(chunk, words, chunks) {
  const haystack = `${chunk.title} ${chunk.text}`.toLowerCase();
  let score = 0;
  words.forEach((word) => {
    const mentions = chunks.filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(word)).length;
    if (!mentions || mentions > chunks.length / 3) return;
    if (!haystack.includes(word)) {
      const relatedHit = (RELATED[word] || []).some((related) => haystack.includes(related));
      if (relatedHit) score += 1;
      return;
    }
    score += chunk.title.toLowerCase().includes(word) ? 6 : 4;
    if (chunk.text.length < 240) score += 2;
  });
  return score;
}

function answerQuestion(question) {
  const words = questionWords(question);
  if (!words.length) {
    return "Ask about one part of the build, such as the chemicals, the electrodes, pilocarpine, or the battery. I answer from your saved plan and notes.";
  }

  const chunks = savedChunks();
  const ranked = chunks
    .map((chunk) => ({ ...chunk, score: chunkScore(chunk, words, chunks) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    return "That is not in the saved plan or your notes. I can answer from what is saved: the simpler UC San Diego sensor, the chemicals, the electrodes, and the rest of the bracelet.";
  }

  const best = ranked[0].score;
  const picked = [];
  ranked.forEach((chunk) => {
    if (picked.length >= 3 || chunk.score < best * 0.65) return;
    if (picked.some((item) => item.text === chunk.text)) return;
    picked.push(chunk);
  });

  const titles = [...new Set(picked.map((item) => item.title))];
  const intro = titles.length === 1
    ? `This is from ${titles[0]}.`
    : `This is from ${titles.join(" and ")}.`;
  return `${intro}\n\n${picked.map((item) => item.text).join("\n\n")}`;
}

function chatArticle(item, savedNote) {
  return `
    <article class="qa">
      <h3>${escapeHtml(item.q)}</h3>
      <p>${escapeHtml(item.a)}</p>
      ${savedNote ? `<p class="note-source">Saved on the Saved chats tab.</p>` : ""}
    </article>`;
}

function renderChat() {
  latestEl.innerHTML = chat[0] ? chatArticle(chat[0], true) : "";
  if (!chatsOpen()) {
    savedChatsEl.innerHTML = "";
    return;
  }
  savedChatsEl.innerHTML = chat.length
    ? chat.map((item) => chatArticle(item, false)).join("")
    : `<p class="note-source">Ask a question on the Guide tab. The answer is saved here.</p>`;
}

function loadChat() {
  const raw = localStorage.getItem(CHAT_KEY);
  if (raw) {
    try {
      chat = JSON.parse(raw);
    } catch {
      chat = [];
    }
  }
  if (!Array.isArray(chat) || chat.length === 0) {
    chat = [
      {
        q: "How can I create my own, simplified version of the UC San Diego sensor?",
        a: sectionText("guide-simple")
      }
    ];
    localStorage.setItem(CHAT_KEY, JSON.stringify(chat));
  }
  renderChat();
}

askForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = askInput.value.trim();
  if (!question) return;
  chat.unshift({ q: question, a: answerQuestion(question) });
  localStorage.setItem(CHAT_KEY, JSON.stringify(chat));
  askInput.value = "";
  renderChat();
});

guideFields.forEach((el) => el.addEventListener("input", saveGuide));

renderFilters();
render();
loadNotes();
loadGuide();
loadChat();
let startTab = location.hash.replace("#", "");
if (startTab === "plan") startTab = "chats";
showTab(tabList.some((tab) => tab.name === startTab) ? startTab : "research");
