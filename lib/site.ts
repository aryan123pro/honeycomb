export interface PageInfo { id: string; href: string; k: string; title: string; sub: string }
export type Cell = "lobby" | "comb" | "web" | "sum";

export const CHAPTERS: PageInfo[] = [
  { id: "ch1", href: "/honeycomb", k: "I", title: "The comb", sub: "How bees build the lightest strong structure, and why facades and aircraft copy it" },
  { id: "ch2", href: "/spider-web", k: "II", title: "The web", sub: "How an orb web catches a bee, survives broken threads, and what silk is made of" },
  { id: "ch3", href: "/verdict", k: "III", title: "Crush or catch", sub: "Two ways to absorb a blow, side by side, and what comes next" },
];

export const LABS: PageInfo[] = [
  { id: "crush", href: "/crush-lab", k: "L1", title: "Crush Lab", sub: "Design a honeycomb core, drop a mass on it, check it against Hexcel's data" },
  { id: "weblab", href: "/web-lab", k: "L2", title: "Web Lab", sub: "Spin your own orb web and throw insects at it" },
  { id: "facade", href: "/facade-lab", k: "L3", title: "Facade Lab", sub: "Design a light facade panel for wind, earthquake and impact" },
];

export const REFS: PageInfo[] = [
  { id: "ref", href: "/references#sources", k: "R", title: "Sources", sub: "Every number on this site, with its paper" },
  { id: "ref", href: "/references#slides", k: "R", title: "Presentation", sub: "The original slide deck" },
  { id: "ref", href: "/references#team", k: "R", title: "Team", sub: "C174 · C175 · C176" },
];

export const TRACKED = [...CHAPTERS, ...LABS];

/* The comb chapter is warm wax on olive; the web chapter is silk on charcoal, as in the deck. */
export const CELLS: Record<string, Cell> = {
  "/": "lobby", "/honeycomb": "comb", "/crush-lab": "comb", "/facade-lab": "comb",
  "/spider-web": "web", "/web-lab": "web", "/verdict": "sum", "/references": "lobby",
};

/* The presentation, in order. Step titles must match the <Step title> props in each chapter. */
export interface StoryPage { href: string; k: string; title: string; steps: string[] }
export const STORY: StoryPage[] = [
  { href: "/honeycomb", k: "I", title: "The comb", steps: ["The heavy facade", "Bees without blueprints", "Crush, don't shatter", "The sandwich", "Pull it inside out", "Comb numbers"] },
  { href: "/spider-web", k: "II", title: "The web", steps: ["Spinning an orb", "Hit the web", "Making silk", "Silk vs steel", "Web numbers"] },
  { href: "/verdict", k: "III", title: "Crush or catch", steps: ["Two ways to stop a blow", "What comes next"] },
  { href: "/crush-lab", k: "L1", title: "Crush Lab", steps: ["Crush Lab"] },
  { href: "/web-lab", k: "L2", title: "Web Lab", steps: ["Web Lab"] },
  { href: "/facade-lab", k: "L3", title: "Facade Lab", steps: ["Facade Lab"] },
  { href: "/references", k: "R", title: "Meet the team", steps: ["Meet the team"] },
];
export const STORY_MINUTES = 20;

export function store<T>(key: string, val?: T): T | null {
  try {
    if (val === undefined) { const raw = localStorage.getItem("combweb." + key); return raw ? (JSON.parse(raw) as T) : null; }
    localStorage.setItem("combweb." + key, JSON.stringify(val));
  } catch { /* storage blocked: the site works without it */ }
  return null;
}
