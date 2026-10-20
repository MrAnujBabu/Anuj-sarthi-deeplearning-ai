/**
 * Deep NCERT Biology question bank for the voice quiz. Every question is written from a
 * line of the NCERT Class 11/12 Biology textbook (rationalised edition) and tagged with
 * its chapter, so the tutor asks real NCERT content and names the chapter exactly.
 */
import { chapterLabel, ncertChapter, type NcertChapter } from "@/lib/ncert-biology";

type Four = [string, string, string, string];
type Base = { id: string; cls: 11 | 12; ch: number; why: string };
export type BankQuestion = Base &
  (
    | { type: "mcq"; stem: string; /** first option is correct */ options: Four }
    | { type: "ar"; assertion: string; reason: string; answer: "A" | "B" | "C" | "D" }
    | { type: "match"; left: Four; right: Four; /** Column II index for a, b, c, d */ key: [number, number, number, number] }
  );

export const AR_OPTIONS: Four = [
  "Both A and R are true, and R explains A",
  "Both A and R are true, but R does not explain A",
  "A is true, but R is false",
  "A is false, but R is true",
];

export const NCERT_BANK: BankQuestion[] = [
  // ---------- Class 11 ----------
  { id: "11-1-mcq", cls: 11, ch: 1, type: "mcq", stem: "In the scientific name Mangifera indica, which statement follows the rules of binomial nomenclature?", options: ["The generic name starts with a capital letter and the specific epithet with a small letter", "Both words start with capital letters", "The specific epithet is written before the generic name", "Both words are written in normal print without italics or underlining"], why: "NCERT: the first word denoting the genus starts with a capital letter while the specific epithet starts with a small letter; names are printed in italics or underlined separately when handwritten." },
  { id: "11-1-match", cls: 11, ch: 1, type: "match", left: ["Man", "Housefly", "Mango", "Wheat"], right: ["Anacardiaceae", "Muscidae", "Hominidae", "Poaceae"], key: [2, 1, 0, 3], why: "NCERT table of organisms with taxonomic categories: Man – Hominidae, Housefly – Muscidae, Mango – Anacardiaceae, Wheat – Poaceae." },
  { id: "11-2-mcq", cls: 11, ch: 2, type: "mcq", stem: "Which of these was NOT a main criterion used by R.H. Whittaker for the five kingdom classification?", options: ["Number of cotyledons in the seed", "Cell structure", "Mode of nutrition", "Phylogenetic relationships"], why: "NCERT: Whittaker's main criteria were cell structure, body organisation, mode of nutrition, reproduction and phylogenetic relationships." },
  { id: "11-2-ar", cls: 11, ch: 2, type: "ar", assertion: "Viruses find no place in Whittaker's five kingdom classification.", reason: "Viruses are non-cellular organisms with an inert crystalline structure outside the living cell.", answer: "A", why: "NCERT: the five kingdom system makes no mention of acellular organisms like viruses, viroids and prions, because they are not truly 'living' outside a host cell." },
  { id: "11-3-mcq", cls: 11, ch: 3, type: "mcq", stem: "Agar, used to grow microbes and in ice-creams and jellies, is obtained from which algae?", options: ["Gelidium and Gracilaria", "Laminaria and Sargassum", "Chlorella and Spirulina", "Fucus and Dictyota"], why: "NCERT: Agar, one of the commercial products obtained from Gelidium and Gracilaria (red algae), is used to grow microbes and in preparations of ice-creams and jellies." },
  { id: "11-3-match", cls: 11, ch: 3, type: "match", left: ["Marchantia", "Selaginella", "Cycas", "Volvox"], right: ["Gymnosperm", "Alga", "Pteridophyte", "Bryophyte (liverwort)"], key: [3, 2, 0, 1], why: "NCERT Plant Kingdom examples: Marchantia – liverwort, Selaginella – pteridophyte, Cycas – gymnosperm, Volvox – green alga." },
  { id: "11-4-mcq", cls: 11, ch: 4, type: "mcq", stem: "Which phylum has eight external rows of ciliated comb plates that help in locomotion?", options: ["Ctenophora", "Coelenterata (Cnidaria)", "Platyhelminthes", "Aschelminthes"], why: "NCERT: Ctenophores (sea walnuts / comb jellies) have eight external rows of ciliated comb plates for locomotion; bioluminescence is well marked." },
  { id: "11-4-ar", cls: 11, ch: 4, type: "ar", assertion: "Aschelminthes are called pseudocoelomates.", reason: "In them the body cavity is not lined by mesoderm; mesoderm is present as scattered pouches between the ectoderm and endoderm.", answer: "A", why: "NCERT: such a body cavity is called a pseudocoelom, and animals possessing it, e.g. aschelminthes, are pseudocoelomates." },
  { id: "11-5-mcq", cls: 11, ch: 5, type: "mcq", stem: "Vexillary aestivation, with a large standard petal overlapping two wings that overlap two keel petals, is seen in:", options: ["Pea and bean", "Calotropis", "China rose and cotton", "Cassia and gulmohur"], why: "NCERT: valvate – Calotropis; twisted – China rose, lady's finger, cotton; imbricate – Cassia, gulmohur; vexillary (papilionaceous) – pea and bean." },
  { id: "11-5-match", cls: 11, ch: 5, type: "match", left: ["Marginal placentation", "Axile placentation", "Parietal placentation", "Free central placentation"], right: ["Dianthus", "Pea", "Mustard", "Tomato"], key: [1, 3, 2, 0], why: "NCERT: marginal – pea; axile – China rose, tomato, lemon; parietal – mustard, Argemone; free central – Dianthus, Primrose." },
  { id: "11-6-mcq", cls: 11, ch: 6, type: "mcq", stem: "Conjoint, open vascular bundles with endarch protoxylem arranged in a ring are characteristic of:", options: ["Dicot stem", "Monocot stem", "Dicot root", "Monocot root"], why: "NCERT: in the dicot stem the vascular bundles are arranged in a ring and each is conjoint, open and with endarch protoxylem; monocot bundles are closed and scattered; roots have radial bundles." },
  { id: "11-6-ar", cls: 11, ch: 6, type: "ar", assertion: "Bulliform cells are present in the upper epidermis of grass leaves.", reason: "When bulliform cells are turgid, the leaves curl inwards to minimise water loss.", answer: "C", why: "NCERT: when bulliform cells are turgid the leaf surface is exposed; when they are flaccid due to water stress they make the leaves curl inwards." },
  { id: "11-7-mcq", cls: 11, ch: 7, type: "mcq", stem: "Which cell junctions perform cementing to keep neighbouring cells together?", options: ["Adhering junctions", "Tight junctions", "Gap junctions", "Plasmodesmata"], why: "NCERT: tight junctions stop substances from leaking across a tissue, adhering junctions perform cementing, gap junctions connect cytoplasm for rapid transfer of ions and molecules." },
  { id: "11-7-match", cls: 11, ch: 7, type: "match", left: ["Areolar tissue", "Adipose tissue", "Tendon", "Ligament"], right: ["Attaches bone to bone", "Specialised to store fats", "Attaches skeletal muscle to bone", "Present beneath the skin"], key: [3, 1, 2, 0], why: "NCERT (connective tissue): areolar tissue lies beneath the skin, adipose stores fat, tendons attach muscles to bones, ligaments attach bone to bone." },
  { id: "11-8-mcq", cls: 11, ch: 8, type: "mcq", stem: "Prokaryotic ribosomes and their subunits are:", options: ["70S, made of 50S and 30S subunits", "80S, made of 60S and 40S subunits", "70S, made of 60S and 40S subunits", "80S, made of 50S and 30S subunits"], why: "NCERT: in prokaryotes ribosomes are about 15 nm by 20 nm, made of two subunits 50S and 30S that together form 70S ribosomes." },
  { id: "11-8-ar", cls: 11, ch: 8, type: "ar", assertion: "Lysosomes are rich in hydrolytic enzymes that are optimally active at acidic pH.", reason: "Lysosomal vesicles are formed by the process of packaging in the Golgi apparatus.", answer: "B", why: "NCERT: lysosomes are membrane-bound vesicles formed by packaging in the Golgi apparatus; they contain lipases, proteases, carbohydrases optimally active at acidic pH. The origin does not explain the pH." },
  { id: "11-9-mcq", cls: 11, ch: 9, type: "mcq", stem: "Which of the following is a homopolymer made only of glucose units?", options: ["Cellulose", "Inulin", "Chitin", "Lecithin"], why: "NCERT: cellulose is a polymeric polysaccharide of only one type of monosaccharide, glucose (a homopolymer); inulin is a polymer of fructose; chitin is a complex polysaccharide; lecithin is a phospholipid." },
  { id: "11-9-match", cls: 11, ch: 9, type: "match", left: ["Oxidoreductases", "Transferases", "Hydrolases", "Lyases"], right: ["Remove groups from substrates leaving double bonds", "Hydrolyse ester, ether, peptide and glycosidic bonds", "Transfer a group other than hydrogen between substrates", "Catalyse oxido-reduction between two substrates"], key: [3, 2, 1, 0], why: "NCERT classification of enzymes into six classes: oxidoreductases/dehydrogenases, transferases, hydrolases, lyases, isomerases and ligases." },
  { id: "11-10-mcq", cls: 11, ch: 10, type: "mcq", stem: "Crossing over between non-sister chromatids of homologous chromosomes occurs during which stage of prophase I?", options: ["Pachytene", "Leptotene", "Zygotene", "Diplotene"], why: "NCERT: pachytene is characterised by recombination nodules, the sites where crossing over occurs; it is enzyme-mediated by recombinase." },
  { id: "11-10-ar", cls: 11, ch: 10, type: "ar", assertion: "X-shaped chiasmata become visible during diplotene.", reason: "In diplotene the synaptonemal complex dissolves and recombined homologues separate except at the sites of crossovers.", answer: "A", why: "NCERT: diplotene begins with dissolution of the synaptonemal complex; homologues separate except at crossover sites, and these X-shaped structures are called chiasmata." },
  { id: "11-11-mcq", cls: 11, ch: 11, type: "mcq", stem: "In C4 plants, the primary CO2 acceptor in mesophyll cells is:", options: ["Phosphoenol pyruvate (PEP), a 3-carbon molecule", "Ribulose bisphosphate (RuBP), a 5-carbon molecule", "Oxaloacetic acid (OAA), a 4-carbon molecule", "3-phosphoglyceric acid (PGA)"], why: "NCERT: the primary CO2 acceptor in the Hatch and Slack pathway is PEP, present in mesophyll cells, and the enzyme is PEP carboxylase; the first product is OAA." },
  { id: "11-11-ar", cls: 11, ch: 11, type: "ar", assertion: "Photorespiration does not occur in C4 plants.", reason: "C4 plants have a mechanism that increases the concentration of CO2 at the RuBisCO site in bundle sheath cells.", answer: "A", why: "NCERT: in C4 plants photorespiration does not occur because they have a mechanism that increases the concentration of CO2 at the enzyme site." },
  { id: "11-12-mcq", cls: 11, ch: 12, type: "mcq", stem: "When the fat tripalmitin is used as the respiratory substrate, the respiratory quotient (RQ) is about:", options: ["0.7", "1.0", "1.3", "Infinity"], why: "NCERT: when fats are used in respiration the RQ is less than 1; for tripalmitin 102 CO2 / 145 O2 = 0.7. Carbohydrates give RQ 1." },
  { id: "11-12-ar", cls: 11, ch: 12, type: "ar", assertion: "Glycolysis occurs in the cytoplasm of the cell and is present in all living organisms.", reason: "In glycolysis, glucose undergoes partial oxidation to form two molecules of pyruvic acid.", answer: "B", why: "NCERT states both facts about glycolysis (EMP pathway); partial oxidation is what happens, not the reason it is universal or cytoplasmic." },
  { id: "11-13-mcq", cls: 11, ch: 13, type: "mcq", stem: "Bolting (internode elongation just before flowering) in beet and cabbage is promoted by:", options: ["Gibberellins", "Auxins", "Cytokinins", "Abscisic acid"], why: "NCERT: gibberellins promote bolting in beet, cabbages and many plants with rosette habit." },
  { id: "11-13-match", cls: 11, ch: 13, type: "match", left: ["Auxin", "Cytokinin", "Ethylene", "Abscisic acid"], right: ["Stomatal closure", "Apical dominance", "Delays leaf senescence", "Promotes fruit ripening"], key: [1, 2, 3, 0], why: "NCERT PGR functions: auxins cause apical dominance, cytokinins delay leaf senescence, ethylene promotes ripening, ABA stimulates stomatal closure." },
  { id: "11-14-mcq", cls: 11, ch: 14, type: "mcq", stem: "Vital capacity (VC) of the lungs is equal to:", options: ["ERV + TV + IRV", "TV + IRV", "ERV + RV", "TV + RV + ERV"], why: "NCERT: vital capacity is the maximum volume of air a person can breathe in after a forced expiration, which includes ERV, TV and IRV." },
  { id: "11-14-ar", cls: 11, ch: 14, type: "ar", assertion: "Every 100 ml of oxygenated blood delivers about 10 ml of O2 to the tissues under normal conditions.", reason: "The partial pressure of oxygen in the alveoli is higher than that in the tissues.", answer: "D", why: "NCERT: every 100 ml of oxygenated blood can deliver around 5 ml of O2 to the tissues; alveolar pO2 (104 mm Hg) is higher than tissue pO2 (40 mm Hg)." },
  { id: "11-15-mcq", cls: 11, ch: 15, type: "mcq", stem: "In a standard ECG, the QRS complex represents:", options: ["Depolarisation of the ventricles", "Depolarisation of the atria", "Repolarisation of the ventricles", "Repolarisation of the atria"], why: "NCERT: the P-wave is atrial depolarisation, the QRS complex is ventricular depolarisation and the T-wave is the return of the ventricles to the normal state." },
  { id: "11-15-match", cls: 11, ch: 15, type: "match", left: ["Blood group A", "Blood group B", "Blood group AB", "Blood group O"], right: ["No antibodies", "Anti-A and anti-B", "Anti-B", "Anti-A"], key: [2, 3, 0, 1], why: "NCERT ABO table: group A has anti-B, group B has anti-A, group AB has none (universal recipient), group O has anti-A and anti-B (universal donor)." },
  { id: "11-16-mcq", cls: 11, ch: 16, type: "mcq", stem: "Which part of the nephron is impermeable to water but allows transport of electrolytes?", options: ["Ascending limb of the loop of Henle", "Descending limb of the loop of Henle", "Proximal convoluted tubule", "Collecting duct"], why: "NCERT: the descending limb is permeable to water but almost impermeable to electrolytes; the ascending limb is impermeable to water but allows transport of electrolytes." },
  { id: "11-16-ar", cls: 11, ch: 16, type: "ar", assertion: "Atrial Natriuretic Factor (ANF) can cause vasodilation and decrease blood pressure.", reason: "The ANF mechanism acts as a check on the renin–angiotensin mechanism.", answer: "B", why: "NCERT: increased blood flow to the atria releases ANF, which causes vasodilation and lowers BP; therefore it acts as a check on the renin–angiotensin mechanism (a consequence, not the explanation)." },
  { id: "11-17-mcq", cls: 11, ch: 17, type: "mcq", stem: "Which pairs of human ribs are called floating ribs?", options: ["11th and 12th pairs", "8th, 9th and 10th pairs", "1st to 7th pairs", "6th and 7th pairs"], why: "NCERT: the first seven pairs are true ribs, the 8th–10th are vertebrochondral (false) ribs, and the last two pairs (11th and 12th) are floating ribs." },
  { id: "11-17-match", cls: 11, ch: 17, type: "match", left: ["Ball and socket joint", "Hinge joint", "Pivot joint", "Saddle joint"], right: ["Between atlas and axis", "Knee joint", "Between carpal and metacarpal of thumb", "Between humerus and pectoral girdle"], key: [3, 1, 0, 2], why: "NCERT synovial joints: ball and socket – humerus and pectoral girdle; hinge – knee; pivot – atlas and axis; gliding – carpals; saddle – carpal and metacarpal of thumb." },
  { id: "11-18-mcq", cls: 11, ch: 18, type: "mcq", stem: "When a neuron is not conducting an impulse (resting state), its axonal membrane is:", options: ["Comparatively more permeable to K+ and nearly impermeable to Na+", "More permeable to Na+ and nearly impermeable to K+", "Equally permeable to Na+ and K+", "Impermeable to both Na+ and K+"], why: "NCERT: at rest the axonal membrane is comparatively more permeable to potassium ions and nearly impermeable to sodium ions; the fluid inside has high K+ and low Na+." },
  { id: "11-18-ar", cls: 11, ch: 18, type: "ar", assertion: "Myelinated nerve fibres are found in spinal and cranial nerves.", reason: "Unmyelinated nerve fibres are enclosed by a Schwann cell that forms a myelin sheath around the axon.", answer: "C", why: "NCERT: unmyelinated fibres are enclosed by a Schwann cell that does NOT form a myelin sheath; they are common in autonomous and somatic neural systems." },
  { id: "11-19-mcq", cls: 11, ch: 19, type: "mcq", stem: "The pars intermedia of the pituitary secretes only one hormone. Which one?", options: ["Melanocyte stimulating hormone (MSH)", "Oxytocin", "Prolactin", "Adrenocorticotrophic hormone (ACTH)"], why: "NCERT: the pars intermedia secretes only MSH; in humans it is almost merged with the pars distalis. Oxytocin is released from the neurohypophysis." },
  { id: "11-19-match", cls: 11, ch: 19, type: "match", left: ["Thyroid gland", "Parathyroid gland", "Pineal gland", "Thymus"], right: ["Melatonin", "Thymosins", "Thyrocalcitonin (TCT)", "Parathyroid hormone (PTH)"], key: [2, 3, 0, 1], why: "NCERT: thyroid also secretes thyrocalcitonin, parathyroids secrete PTH (raises blood Ca2+), pineal secretes melatonin, thymus secretes thymosins." },
  // ---------- Class 12 ----------
  { id: "12-1-mcq", cls: 12, ch: 1, type: "mcq", stem: "During double fertilisation, the second male gamete fuses with which cell to form the primary endosperm nucleus?", options: ["Central cell with two polar nuclei", "Egg cell", "Synergid", "Antipodal cell"], why: "NCERT: the other male gamete fuses with the two polar nuclei in the central cell to produce a triploid primary endosperm nucleus (triple fusion)." },
  { id: "12-1-ar", cls: 12, ch: 1, type: "ar", assertion: "Pollen grains are well preserved as fossils.", reason: "The exine of pollen is made of sporopollenin, one of the most resistant organic materials known.", answer: "A", why: "NCERT: sporopollenin withstands high temperatures, strong acids and alkali; pollen grains are well preserved as fossils because of it." },
  { id: "12-2-mcq", cls: 12, ch: 2, type: "mcq", stem: "Which cells of the testis synthesise and secrete testicular hormones called androgens?", options: ["Leydig (interstitial) cells", "Sertoli cells", "Spermatogonia", "Spermatids"], why: "NCERT: Leydig cells in the interstitial spaces synthesise and secrete androgens; Sertoli cells provide nutrition to germ cells." },
  { id: "12-2-match", cls: 12, ch: 2, type: "match", left: ["Acrosome", "Middle piece of sperm", "Sertoli cells", "Leydig cells"], right: ["Secrete androgens", "Enzymes that help fertilisation of the ovum", "Nutrition to male germ cells", "Numerous mitochondria for motility energy"], key: [1, 3, 2, 0], why: "NCERT: the acrosome is filled with enzymes for fertilisation, the middle piece has mitochondria, Sertoli cells nourish germ cells, Leydig cells secrete androgens." },
  { id: "12-3-mcq", cls: 12, ch: 3, type: "mcq", stem: "Copper-releasing IUDs such as CuT and Multiload 375 prevent conception mainly by:", options: ["Suppressing sperm motility and the fertilising capacity of sperms", "Inhibiting ovulation", "Releasing hormones that make the cervix hostile to sperms", "Blocking the fallopian tubes surgically"], why: "NCERT: Cu ions released suppress sperm motility and fertilising capacity; hormone-releasing IUDs make the uterus unsuitable for implantation and the cervix hostile." },
  { id: "12-3-ar", cls: 12, ch: 3, type: "ar", assertion: "Lactational amenorrhea can work as a natural method of contraception after parturition.", reason: "Ovulation, and therefore the menstrual cycle, does not occur during the period of intense lactation.", answer: "A", why: "NCERT: lactational amenorrhea is based on the absence of ovulation during intense lactation; it is effective only up to a maximum of six months after parturition." },
  { id: "12-4-mcq", cls: 12, ch: 4, type: "mcq", stem: "The ABO blood group system in humans is a good example of:", options: ["Multiple alleles with codominance of IA and IB", "Incomplete dominance only", "Polygenic inheritance", "Sex-linked inheritance"], why: "NCERT: ABO blood grouping is controlled by gene I with three alleles (multiple alleles); IA and IB are completely dominant over i but codominant with each other." },
  { id: "12-4-match", cls: 12, ch: 4, type: "match", left: ["Haemophilia", "Sickle-cell anaemia", "Down's syndrome", "Turner's syndrome"], right: ["45 chromosomes with XO", "Trisomy of chromosome 21", "Autosome-linked recessive disorder", "Sex-linked recessive disorder"], key: [3, 2, 1, 0], why: "NCERT genetic disorders: haemophilia – sex-linked recessive; sickle-cell anaemia – autosome-linked recessive (GAG→GUG); Down's – trisomy 21; Turner's – 45 with XO." },
  { id: "12-5-mcq", cls: 12, ch: 5, type: "mcq", stem: "A double-stranded DNA sample has 20% cytosine. According to Chargaff's rule, the percentage of adenine is:", options: ["30%", "20%", "40%", "60%"], why: "NCERT: Chargaff showed that in double-stranded DNA A = T and G = C. So C = G = 20%, A + T = 60%, A = 30%." },
  { id: "12-5-ar", cls: 12, ch: 5, type: "ar", assertion: "In the lac operon, lactose (or allolactose) acts as an inducer.", reason: "The repressor protein of the lac operon is coded by the z gene.", answer: "C", why: "NCERT: the i gene codes for the repressor; z codes β-galactosidase, y permease, a transacetylase. The inducer inactivates the repressor so RNA polymerase can transcribe." },
  { id: "12-6-mcq", cls: 12, ch: 6, type: "mcq", stem: "Which pair represents analogous structures (convergent evolution)?", options: ["Wings of butterfly and of birds", "Forelimbs of whale and bat", "Thorns of Bougainvillea and tendrils of Cucurbita", "Hearts of different vertebrates"], why: "NCERT: wings of butterfly and birds, eyes of octopus and mammals, flippers of penguins and dolphins are analogous; vertebrate forelimbs, hearts and Bougainvillea thorns / Cucurbita tendrils are homologous." },
  { id: "12-6-match", cls: 12, ch: 6, type: "match", left: ["Australopithecines", "Homo habilis", "Homo erectus", "Neanderthal man"], right: ["Brain about 1400 cc, buried their dead", "Brain 650–800 cc, probably did not eat meat", "Brain about 900 cc, probably ate meat", "Lived in East African grasslands about 2 mya"], key: [3, 1, 2, 0], why: "NCERT human evolution: Australopithecines ~2 mya in East African grasslands; Homo habilis 650–800 cc; Homo erectus ~1.5 mya, ~900 cc; Neanderthals 1400 cc, buried their dead." },
  { id: "12-7-mcq", cls: 12, ch: 7, type: "mcq", stem: "Plasmodium enters the human body through the bite of an infected female Anopheles mosquito as:", options: ["Sporozoites", "Gametocytes", "Merozoites", "Trophozoites"], why: "NCERT: Plasmodium enters the human body as sporozoites (infectious form); the parasites multiply in liver cells and then attack RBCs." },
  { id: "12-7-ar", cls: 12, ch: 7, type: "ar", assertion: "Antibodies are produced by T-lymphocytes.", reason: "B-lymphocytes and T-lymphocytes are responsible for the acquired immune response.", answer: "D", why: "NCERT: B-lymphocytes produce antibodies; T-cells do not secrete antibodies but help B cells produce them. Both cell types mediate acquired immunity." },
  { id: "12-8-mcq", cls: 12, ch: 8, type: "mcq", stem: "Statins, used as blood-cholesterol-lowering agents, are produced by the yeast:", options: ["Monascus purpureus", "Trichoderma polysporum", "Saccharomyces cerevisiae", "Aspergillus niger"], why: "NCERT: statins from Monascus purpureus competitively inhibit the enzyme of cholesterol synthesis; cyclosporin A comes from Trichoderma polysporum; citric acid from Aspergillus niger." },
  { id: "12-8-match", cls: 12, ch: 8, type: "match", left: ["Aspergillus niger", "Acetobacter aceti", "Clostridium butylicum", "Lactobacillus"], right: ["Butyric acid", "Lactic acid", "Citric acid", "Acetic acid"], key: [2, 3, 0, 1], why: "NCERT organic acid producers: Aspergillus niger – citric acid; Acetobacter aceti – acetic acid; Clostridium butylicum – butyric acid; Lactobacillus – lactic acid." },
  { id: "12-9-mcq", cls: 12, ch: 9, type: "mcq", stem: "The restriction enzyme EcoRI recognises and cuts the DNA sequence:", options: ["GAATTC", "GGATCC", "AAGCTT", "CTGCAG"], why: "NCERT: EcoRI cuts the DNA between bases G and A only when the sequence GAATTC is present, producing sticky ends." },
  { id: "12-9-ar", cls: 12, ch: 9, type: "ar", assertion: "Bacterial cells are treated with a specific concentration of a divalent cation such as calcium before transformation.", reason: "This makes the cells competent by increasing the efficiency with which DNA enters the bacterium through pores in its cell wall.", answer: "A", why: "NCERT: since DNA is hydrophilic it cannot pass the membrane, so cells are made competent with Ca2+; then incubated on ice, given a heat shock at 42°C and returned to ice." },
  { id: "12-10-mcq", cls: 12, ch: 10, type: "mcq", stem: "The protein encoded by which cry gene controls the corn borer?", options: ["cryIAb", "cryIAc", "cryIIAb", "cryIAc and cryIIAb together"], why: "NCERT: proteins encoded by cryIAc and cryIIAb control cotton bollworms; the protein of cryIAb controls corn borer." },
  { id: "12-10-match", cls: 12, ch: 10, type: "match", left: ["RNA interference (RNAi)", "ADA deficiency", "ELISA", "Eli Lilly (1983)"], right: ["First clinical gene therapy (1990)", "Nematode (Meloidogyne incognita) resistance in tobacco", "Two DNA sequences for chains A and B of human insulin", "Based on the principle of antigen–antibody interaction"], key: [1, 0, 3, 2], why: "NCERT: RNAi silences nematode mRNA in tobacco roots; the first gene therapy (1990) was for ADA deficiency; ELISA uses antigen–antibody interaction; Eli Lilly made human insulin chains A and B in 1983." },
  { id: "12-11-mcq", cls: 12, ch: 11, type: "mcq", stem: "An orchid growing as an epiphyte on a mango branch is an example of:", options: ["Commensalism", "Mutualism", "Parasitism", "Amensalism"], why: "NCERT: commensalism is an interaction where one species benefits and the other is neither harmed nor benefited, e.g. orchid on a mango branch, barnacles on whales." },
  { id: "12-11-ar", cls: 12, ch: 11, type: "ar", assertion: "According to Gause, two closely related species competing for the same resources can co-exist indefinitely.", reason: "In such competition, the competitively inferior species is eliminated eventually.", answer: "D", why: "NCERT: Gause's Competitive Exclusion Principle states that two closely related species competing for the same resources cannot co-exist indefinitely and the competitively inferior one will be eliminated eventually." },
  { id: "12-12-mcq", cls: 12, ch: 12, type: "mcq", stem: "Which ecological pyramid is always upright and can never be inverted?", options: ["Pyramid of energy", "Pyramid of biomass", "Pyramid of numbers", "Pyramid of biomass in the sea"], why: "NCERT: the pyramid of energy is always upright because some energy is always lost as heat at each step; the pyramid of biomass in the sea is generally inverted." },
  { id: "12-12-match", cls: 12, ch: 12, type: "match", left: ["Gross primary productivity", "Net primary productivity", "Secondary productivity", "Standing crop"], right: ["GPP minus respiration losses", "Mass of living material at a trophic level at a particular time", "Rate of production of organic matter during photosynthesis", "Rate of formation of new organic matter by consumers"], key: [2, 0, 3, 1], why: "NCERT Ecosystem: GPP is the rate of production of organic matter during photosynthesis; GPP – R = NPP; secondary productivity is formation of new organic matter by consumers; standing crop is living material at a trophic level." },
  { id: "12-13-mcq", cls: 12, ch: 13, type: "mcq", stem: "Among the 'Evil Quartet', which is the most important cause driving animals and plants to extinction?", options: ["Habitat loss and fragmentation", "Over-exploitation", "Alien species invasions", "Co-extinctions"], why: "NCERT: the four major causes are habitat loss and fragmentation (the most important), over-exploitation, alien species invasions and co-extinctions." },
  { id: "12-13-ar", cls: 12, ch: 13, type: "ar", assertion: "Tropical latitudes have greater biological diversity than temperate regions.", reason: "Tropical latitudes were subjected to frequent glaciations in the geological past.", answer: "C", why: "NCERT: temperate regions were subjected to frequent glaciations, while tropical latitudes remained relatively undisturbed for millions of years, allowing more species diversification." },
];

const ROMAN = ["i", "ii", "iii", "iv"];
const LETTERS = ["A", "B", "C", "D"] as const;
const combo = (key: number[]) => key.map((r, i) => `${"abcd"[i]}-${ROMAN[r]}`).join(", ");

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Plausible Match distractors: the key with two pairs swapped. */
function matchDistractors(key: number[], rng: () => number): string[] {
  const right = combo(key);
  const seen = new Set([right]);
  const out: string[] = [];
  const pairs = shuffle([[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [0, 1, 2], [1, 2, 3]], rng);
  for (const p of pairs) {
    const k = [...key];
    const first = k[p[0]!]!;
    for (let i = 0; i < p.length - 1; i++) k[p[i]!] = k[p[i + 1]!]!;
    k[p[p.length - 1]!] = first;
    const c = combo(k);
    if (!seen.has(c)) { seen.add(c); out.push(c); }
    if (out.length === 3) break;
  }
  return out;
}

export type RenderedQuestion = { id: string; chapter: NcertChapter; text: string; answer: "A" | "B" | "C" | "D"; answerText: string; why: string; fingerprint: string };

/** Written exactly the way the quiz card and the spoken tutor expect it. */
export function renderQuestion(q: BankQuestion, rng: () => number = Math.random): RenderedQuestion {
  const chapter = ncertChapter(q.cls, q.ch)!;
  const head = chapterLabel(chapter);
  let body: string;
  let opts: string[];
  let answer: number;
  let fingerprint: string;
  if (q.type === "mcq") {
    opts = shuffle(q.options, rng);
    answer = opts.indexOf(q.options[0]);
    body = q.stem;
    fingerprint = q.stem;
  } else if (q.type === "ar") {
    opts = AR_OPTIONS;
    answer = LETTERS.indexOf(q.answer);
    body = `Assertion (A): ${q.assertion}\nReason (R): ${q.reason}`;
    fingerprint = q.assertion;
  } else {
    const right = combo(q.key);
    opts = shuffle([right, ...matchDistractors(q.key, rng)], rng);
    answer = opts.indexOf(right);
    body = `Match Column I with Column II.\nColumn I:\n${q.left.map((l, i) => `${"abcd"[i]}. ${l}`).join("\n")}\nColumn II:\n${q.right.map((r, i) => `${ROMAN[i]}. ${r}`).join("\n")}`;
    fingerprint = `a. ${q.left[0]} b. ${q.left[1]}`;
  }
  const text = `${head}\n${body}\n${opts.map((o, i) => `(${LETTERS[i]}) ${o}`).join("\n")}`;
  return { id: q.id, chapter, text, answer: LETTERS[answer]!, answerText: opts[answer]!, why: q.why, fingerprint };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** True when a tutor reply actually asked this bank question (not just mentioned the chapter). */
export function askedQuestion(reply: string, q: RenderedQuestion): boolean {
  const said = norm(reply);
  const words = norm(q.fingerprint).split(" ").slice(0, 6).join(" ");
  // Fallback for a lightly reworded stem: the official chapter name plus the correct option's text.
  return (words.length > 0 && said.includes(words)) || (said.includes(norm(q.chapter.name)) && said.includes(norm(q.answerText)));
}

/**
 * Per-call deck: offers the next unasked question of the allowed types, remembers the one
 * awaiting an answer (with its key for grading) and avoids repeating a chapter back-to-back.
 */
export function createNcertDeck(types: { matchQ: boolean; assertionQ: boolean }, rng: () => number = Math.random) {
  const allowed = new Set<BankQuestion["type"]>(types.matchQ || types.assertionQ ? [...(types.matchQ ? ["match" as const] : []), ...(types.assertionQ ? ["ar" as const] : [])] : ["mcq", "ar", "match"]);
  const pool = NCERT_BANK.filter((q) => allowed.has(q.type));
  const asked = new Set<string>();
  let offered: RenderedQuestion | undefined;
  let pending: RenderedQuestion | undefined;
  let lastType: BankQuestion["type"] | undefined;
  let lastChapter = "";
  function draw(): RenderedQuestion {
    if (pool.every((q) => asked.has(q.id))) asked.clear();
    const fresh = pool.filter((q) => !asked.has(q.id));
    // Alternate types when more than one is allowed, and never repeat the same chapter twice in a row.
    const preferred = fresh.filter((q) => `${q.cls}-${q.ch}` !== lastChapter && (allowed.size === 1 || q.type !== lastType));
    const from = preferred.length ? preferred : fresh;
    return renderQuestion(from[Math.floor(rng() * from.length)]!, rng);
  }
  return {
    next(): RenderedQuestion { offered ??= draw(); return offered; },
    pending(): RenderedQuestion | undefined { return pending; },
    /** Call with each delivered tutor reply. */
    observe(reply: string) {
      if (!offered || !askedQuestion(reply, offered)) return;
      pending = offered;
      asked.add(offered.id);
      const q = NCERT_BANK.find((x) => x.id === offered!.id)!;
      lastType = q.type;
      lastChapter = `${q.cls}-${q.ch}`;
      offered = undefined;
    },
  };
}

/** Backend instructions for one delegation in deep NCERT mode. */
export function ncertDeckPrompt(next: RenderedQuestion, pending?: RenderedQuestion): string {
  const parts = [
    "\n\nNCERT QUESTION BANK (deep mode). Use only these real NCERT Biology questions; never invent one.",
  ];
  if (pending)
    parts.push(
      `\nQuestion now awaiting the student's answer — ${chapterLabel(pending.chapter)}. Answer key (secret until graded): (${pending.answer}) ${pending.answerText}. NCERT basis: ${pending.why}` +
        `\nWhen grading it: start with Sahi or Galat, then say "Sahi jawab option ${pending.answer} hai — ${pending.answerText}", give 2–3 short explanation sentences from the NCERT basis, and say "Yeh ${chapterLabel(pending.chapter).replace(" · ", ", ").replace(" — ", ", ")} se tha."`,
    );
  parts.push(
    `\nWhen you give the next question, copy this exactly, keeping the first chapter line and every line break, then ask for the answer:\n${next.text}`,
  );
  return parts.join("");
}
