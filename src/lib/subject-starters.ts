/** Ready-made first questions per subject; tapping one fills the composer so the student can edit before sending. */
export type SubjectId = "physics" | "chemistry" | "biology";

export const SUBJECT_STARTERS: { id: SubjectId; label: string; hint: string; starters: string[] }[] = [
  {
    id: "physics",
    label: "Physics",
    hint: "Numericals, ray diagrams, circuits",
    starters: [
      "Kirchhoff ke laws ek NEET numerical ke saath samjhao",
      "Lens maker's formula ka derivation step by step",
      "Projectile motion ke important formulas aur traps",
    ],
  },
  {
    id: "chemistry",
    label: "Chemistry",
    hint: "Mechanisms, structures, stoichiometry",
    starters: [
      "SN1 vs SN2 mechanism — NEET ke liye difference",
      "Hybridisation kaise nikaalte hain? Short trick ke saath",
      "Mole concept ka ek tough NEET sawaal solve karo",
    ],
  },
  {
    id: "biology",
    label: "Biology",
    hint: "Diagrams, cycles, NCERT lines",
    starters: [
      "Krebs cycle NCERT ke hisaab se step by step",
      "Meiosis I aur Meiosis II ka difference — NCERT lines ke saath",
      "Human heart ka diagram aur blood flow samjhao",
    ],
  },
];
