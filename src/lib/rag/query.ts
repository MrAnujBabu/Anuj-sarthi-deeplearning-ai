/** Query parsing for retrieval (DeepLearning.AI RAG course, module 2): subject filter + follow-up expansion. No AI call. */

const SUBJECT_WORDS: Record<string, RegExp> = {
  biology: /\b(cell|mitochondri|chloroplast|dna|rna|gene|enzyme|photosynth|respirat|plant|animal|tissue|hormone|kidney|neuron|blood|heart|reproduct|ecosystem|evolution|protein|meiosis|mitosis|bacteria|virus|biolog)/i,
  physics: /\b(force|velocity|acceleration|momentum|energy|current|voltage|resistance|magnetic|lens|mirror|wave|optics|gravitation|torque|friction|capacitor|electric field|thermodynamic|newton|kinematic|physic)/i,
  chemistry: /\b(mole|bond|orbital|acid|base|ph\b|oxidation|reduction|electrochem|organic|alkane|alkene|benzene|isomer|periodic|equilibrium|salt|reaction|hybridi[sz]ation|chemis)/i,
};

/** Detect the single subject a question is about; null when unclear or mixed. */
export function detectSubject(text: string): string | null {
  const hits = Object.entries(SUBJECT_WORDS).filter(([, re]) => re.test(text)).map(([s]) => s);
  return hits.length === 1 ? hits[0]! : null;
}

/** Short follow-ups ("aur iska example?") carry no topic words, so prepend the previous question. */
export function expandFollowUp(question: string, previous?: string): string {
  const q = question.trim();
  if (!previous?.trim()) return q;
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  return words.length < 4 ? `${previous.trim().slice(0, 600)}\n${q}` : q;
}
