// Add a new object to this list whenever you finish something you want to show.
//
// categories can include:
//   "ide"           — ALC ID Project
//   "philographics" — Philographics
//   "light-tower"   — Light Tower Powers
//   "aerospace"     — Aerospace Emphasis
//   "touchdesigner" — Graphic Design › TouchDesigner tab
//   "blender"       — Graphic Design › Blender tab
//   "ctd"           — Creative Technology and Design
//   "art"           — Physical and Digital Art
// A project can belong to more than one.

window.PROJECTS = [
  {
    title: "ALC ID Bracelet",
    year: "2026",
    description:
      "A research library and build guide for a wearable alcohol-sensing bracelet. It keeps the studies, personal notes, an eight-week build plan, and a guide for a simpler version of the UC San Diego sensor.",
    image: "images/alc-id-bracelet.jpg",
    models: [
      {
        label: "Ideal Model",
        src: "alc-id/site/models/exploded.html?embed=1&v=fs",
      },
      {
        label: "Realistic Model",
        src: "alc-id/site/models/prototype.html?embed=1&v=fs",
      },
      {
        label: "Clēar Cuff",
        src: "alc-id/site/models/cuff.html?embed=1&v=clear",
      },
    ],
    video: {
      src: "videos/clear-ad.mp4",
      title: "Introducing Clēar",
      caption:
        "Placeholder: a few sentences about Clēar, our new product. Say what it is, who it's for, and what makes it different.",
    },
    pitch: {
      src: "docs/clear-initial-pitch.pdf?v=3",
      title: "Our initial pitch",
    },
    tags: ["Wearable", "Sensor"],
    categories: ["ide"],
    github: "",
    demo: "alc-id/site/index.html",
    featured: true,
  },
  {
    title: "ATLAS Light Tower Project",
    year: "2025-2026",
    description:
      "Collaborated with a team to create and build a user interactive light tower. We made this image as a team.\n\nWhat is this project?\nWho was involved?\nProject Webpage: https://www.colorado.edu/atlas/atlas-light-tower-gets-makeover\nWhat I personally learned.",
    image: "images/light-tower.jpg",
    frame: "poster",
    tags: [],
    categories: ["light-tower"],
    github: "",
    demo: "https://www.colorado.edu/atlas/atlas-light-tower-gets-makeover",
    cta: "Project webpage",
    featured: true,
  },
  {
    title: "Philographics",
    year: "",
    description:
      "For my first AI building project, I wanted to combine art and philosophy. I can across a project called Philographics, by something Carreras. I then worked with AI to study the algorithm of the way that Carreras designed his philographics, in order to recreate it. You can input any word, then a small, simplistic geometric image with a small definition of the topic.",
    tags: [],
    maker: "philographics",
    categories: ["philographics"],
    github: "",
    demo: "https://sashahene.github.io/learn-vibe-build/",
    cta: "Open project",
    featured: true,
  },
];
