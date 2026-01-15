import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# ==========================================
# 1. PAGE SETUP
# ==========================================
st.set_page_config(page_title="NEET Sarathi AI", page_icon="🩺", layout="centered")
st.title("🩺 NEET Sarathi: Dr. Sharma Edition")
st.markdown("### `Head of NTA Secret Panel` | Deepthink Engine Active 🧠")

# ==========================================
# 2. NEET 2026 DETAILED SYLLABUS DATABASE
# ==========================================
# Updated: Manzil Sequence with Detailed Topics & High-Yield Notes
NEET_SYLLABUS = {
    "Physics": {
        "1. Basic Mathematics & Vector": [
            "Manzil Topics: Additions: Vectors (Addition, Subtraction, Resolution), Differentiation, Integration basics, Graphs, Trigonometry for Physics.",
            "Detailed: Scalars and Vectors, Vector Addition and subtraction, scalar and vector products, Unit Vector, Resolution of a Vector."
        ],
        "2. Units, Measurements and Error": [
            "Manzil Topics: System of Units, SI Units, Least count, significant figures, Errors in measurements, Dimensions and dimensional analysis.",
            "Detailed: Units of measurements, System of Units, SI Units, fundamental and derived units.",
            "Detailed: Least count, significant figures, Errors in measurements.",
            "Detailed: Dimensions of Physics quantities, dimensional analysis, and its applications.",
            "Experimental Skills: Vernier calipers (internal/external diameter, depth), Screw gauge (thickness/diameter)."
        ],
        "3. Motion in a Straight Line": [
            "Manzil Topics: Frame of reference, Position-time graph, Speed & Velocity, Uniformly accelerated motion, Relative Velocity.",
            "Detailed: The frame of reference, motion in a straight line, Position-time graph, speed and velocity.",
            "Detailed: Uniform and non-uniform motion, average speed and instantaneous velocity.",
            "Detailed: Uniformly accelerated motion, velocity-time, position-time graph, relations for uniformly accelerated motion."
        ],
        "4. Motion in a Plane": [
            "Manzil Topics: Scalars and Vectors, Projectile Motion, Uniform Circular Motion.",
            "Detailed: Relative Velocity, Motion in a plane, Projectile Motion, Uniform Circular Motion."
        ],
        "5. Newton's Laws of Motion & Friction": [
            "Manzil Topics: Newton’s Three Laws, Momentum, Impulse, Conservation of linear momentum, Equilibrium, Static and Kinetic friction, Banking of roads.",
            "Detailed: Force and inertia, Newton’s First law of motion; Momentum, Newton’s Second Law of motion, Impulses; Newton’s Third Law of motion.",
            "Detailed: Law of conservation of linear momentum and its applications.",
            "Detailed: Equilibrium of concurrent forces.",
            "Detailed: Static and Kinetic friction, laws of friction, rolling friction.",
            "Detailed: Dynamics of uniform circular motion: centripetal force and its applications: vehicle on a level circular road, vehicle on a banked road."
        ],
        "6. Work Power and Energy": [
            "Manzil Topics: Work by constant/variable force, Kinetic/Potential energies, Work-energy theorem, Spring PE, Vertical circle, Collisions.",
            "Detailed: Work done by a constant force and a variable force; kinetic and potential energies, work-energy theorem, power.",
            "Detailed: The potential energy of spring, conservation of mechanical energy, conservative and non-conservative forces.",
            "Detailed: Motion in a vertical circle: Elastic and inelastic collisions in one and two dimensions."
        ],
        "7. Center of mass & Collision": [
            "Manzil Topics: Centre of mass (two-particle, rigid body), Elastic and Inelastic collisions.",
            "Detailed: Centre of the mass of a two-particle system, Centre of the mass of a rigid body."
        ],
        "8. System of Particles and Rotational Motion": [
            "Manzil Topics: Torque, Angular momentum, Moment of inertia, Radius of gyration, Parallel/Perpendicular axes theorems, Rolling motion.",
            "Detailed: Basic concepts of rotational motion; moment of a force; torque, angular momentum, conservation of angular momentum and its applications.",
            "Detailed: The moment of inertia, the radius of gyration, values of moments of inertia for simple geometrical objects, parallel and perpendicular axes theorems, and their applications.",
            "Detailed: Equilibrium of rigid bodies, rigid body rotation and equations of rotational motion, comparison of linear and rotational motions.",
            "Experimental Skills: Metre Scale (mass by principle of moments)."
        ],
        "9. Mechanical Properties of Solids": [
            "Manzil Topics: Stress-strain, Hooke's Law, Young's/Bulk/Rigidity modulus.",
            "Detailed: Elastic behaviour, Stress-strain relationship, Hooke's Law. Young's modulus, bulk modulus, modulus of rigidity.",
            "Experimental Skills: Young's modulus of elasticity of the material of a metallic wire."
        ],
        "10. Mechanical Properties of Fluids": [
            "Manzil Topics: Pascal's law, Viscosity, Stokes' law, Terminal velocity, Bernoulli's principle, Surface tension.",
            "Detailed: Pressure due to a fluid column; Pascal's law and its applications. Effect of gravity on fluid pressure.",
            "Detailed: Viscosity. Stokes' law. terminal velocity, streamline, and turbulent flow. Critical velocity. Bernoulli's principle and its applications.",
            "Detailed: Surface energy and surface tension, angle of contact, excess of pressure across a curved surface, application of surface tension - drops, bubbles, and capillary rise.",
            "Experimental Skills: Surface tension (capillary rise), Co-efficient of Viscosity (terminal velocity)."
        ],
        "11. Thermal Properties of Matter": [
            "Manzil Topics: Thermal expansion, Calorimetry, Latent heat, Heat transfer (Conduction, Convection, Radiation), Newton's law of cooling.",
            "Detailed: Heat, temperature, thermal expansion; specific heat capacity, calorimetry; change of state, latent heat.",
            "Detailed: Heat transfer - conduction, convection, and radiation.",
            "Experimental Skills: Specific heat capacity of solid/liquid (method of mixtures)."
        ],
        "12. KTG & Thermodynamics": [
            "Manzil Topics: Zeroth, First & Second law, Isothermal/Adiabatic processes, Kinetic Theory: RMS speed, Degrees of freedom.",
            "Thermodynamics: Thermal equilibrium, zeroth law of thermodynamics, concept of temperature. Heat, work, and internal energy. First law, isothermal/adiabatic processes. Second law: reversible/irreversible processes.",
            "KTG: Equation of state of a perfect gas, work done on compressing a gas. Kinetic theory assumptions, concept of pressure. Kinetic interpretation of temperature: RMS speed, Degrees of freedom. Law of equipartition of energy, specific heat capacities, Mean free path. Avogadro's number."
        ],
        "13. Simple Harmonic Motion": [
            "Manzil Topics: Periodic motion, SHM equation, Phase, Spring oscillations, Simple pendulum.",
            "Detailed: Oscillations and periodic motion – time period, frequency, displacement as a function of time. Periodic functions.",
            "Detailed: Simple harmonic motion (S.H.M.) and its equation; phase: oscillations of a spring - restoring force and force constant: energy in S.H.M. - Kinetic and potential energies.",
            "Detailed: Simple pendulum - derivation of expression for its time period.",
            "Experimental Skills: Simple Pendulum (dissipation of energy graph)."
        ],
        "14. Wave Motion": [
            "Manzil Topics: Longitudinal/Transverse waves, Superposition, Standing waves, Beats, Doppler effect.",
            "Detailed: Wave motion. Longitudinal and transverse waves, speed of travelling wave.",
            "Detailed: Displacement relation for a progressive wave. Principle of superposition of waves, reflection of waves.",
            "Detailed: Standing waves in strings and organ pipes, fundamental mode and harmonics. Beats.",
            "Experimental Skills: Speed of sound in air (resonance tube)."
        ],
        "15. Electric Charges and Field": [
            "Manzil Topics: Coulomb's law, Electric field, Dipole, Gauss's law applications.",
            "Detailed: Conservation of charge. Coulomb's law forces between two point charges, forces between multiple charges: superposition principle.",
            "Detailed: Electric field due to point charge, field lines. Electric dipole, Field due to dipole. Torque on a dipole.",
            "Detailed: Electric flux. Gauss's law and applications (infinite wire, infinite plane sheet, thin spherical shell)."
        ],
        "16. Electrostatic Potential and Capacitance": [
            "Manzil Topics: Potential, Equipotential surfaces, Capacitors (Series/Parallel, Dielectrics).",
            "Detailed: Electric potential (point charge, dipole, system of charges); potential difference, Equipotential surfaces, Electrical potential energy.",
            "Detailed: Conductors and insulators. Dielectrics and polarization, capacitors and capacitances, series and parallel combination, capacitance of parallel plate capacitor with/without dielectric. Energy stored."
        ],
        "17. Gravitation": [
            "Manzil Topics: Universal law, Acceleration due to gravity, Kepler’s laws, Escape velocity, Satellite motion.",
            "Detailed: The universal law of gravitation. Acceleration due to gravity and its variation with altitude and depth.",
            "Detailed: Kepler’s law of planetary motion.",
            "Detailed: Gravitational potential energy; gravitational potential. Escape velocity, Motion of a satellite, orbital velocity, time period and energy of satellite."
        ],
        "18. Current Electricity": [
            "Manzil Topics: Ohm's law, Drift velocity, Kirchhoff’s laws, Wheatstone & Metre Bridge, Potentiometer.",
            "Detailed: Electric current. Drift velocity, mobility. Ohm's law. Electrical resistance. V-l characteristics. Electrical energy and power. Resistivity and conductivity.",
            "Detailed: Series/parallel resistors; Temperature dependence. Internal resistance, potential difference, emf of a cell, combination of cells.",
            "Detailed: Kirchhoff’s laws, Wheatstone bridge, Metre Bridge.",
            "Experimental Skills: Resistivity (metre bridge), Resistance (Ohm's law)."
        ],
        "19. Magnetic Effects of Current": [
            "Manzil Topics: Biot-Savart law, Ampere's law, Force on moving charge, Moving coil galvanometer.",
            "Detailed: Biot - Savart law (circular loop). Ampere's law (straight wire, solenoid).",
            "Detailed: Force on moving charge in uniform magnetic/electric fields.",
            "Detailed: Force on current-carrying conductor in magnetic field. Force between two parallel currents (definition of ampere).",
            "Detailed: Torque on current loop: Moving coil galvanometer, sensitivity, conversion to ammeter/voltmeter.",
            "Experimental Skills: Resistance and figure of merit of galvanometer."
        ],
        "20. Magnetism and matter": [
            "Manzil Topics: Bar magnet, Magnetic field lines, Earth's magnetic field, Para/Dia/Ferromagnetic substances.",
            "Detailed: Current loop as magnetic dipole, moment. Bar magnet as solenoid, field lines.",
            "Detailed: Magnetic field due to dipole (axis/perpendicular). Torque on magnetic dipole.",
            "Detailed: Para-, dia- and ferromagnetic substances, effect of temperature."
        ],
        "21. Electromagnetic Induction": [
            "Manzil Topics: Faraday's law, Lenz’s Law, Eddy currents, Self and Mutual inductance.",
            "Detailed: Faraday's law. Induced emf and current: Lenz’s Law, Eddy currents. Self and mutual inductance."
        ],
        "22. AC & EM Waves": [
            "Manzil Topics: LCR circuit, Resonance, Transformers, AC Generator, EM Spectrum, Displacement current.",
            "AC: Alternating currents, peak/RMS value: reactance and impedance: LCR series circuit, resonance: power in AC circuits, wattless current. AC generator and transformer.",
            "EM Waves: Displacement current. EM waves characteristics, Transverse nature. EM spectrum (radio, micro, infrared, visible, UV, X-rays, Gamma rays), Applications."
        ],
        "23. Ray Optics": [
            "Manzil Topics: Reflection (Mirrors), Refraction (Lenses, Prism), Total internal reflection, Microscope & Telescope.",
            "Detailed: Reflection of light, spherical mirrors, mirror formula.",
            "Detailed: Refraction at plane/spherical surfaces, thin lens formula, lens maker formula. Total internal reflection.",
            "Detailed: Magnification. Power of a Lens. Combination of lenses. Refraction through prism.",
            "Detailed: Microscope and Astronomical Telescope (reflecting and refracting).",
            "Experimental Skills: Focal length (Mirrors/Lens), Angle of deviation vs incidence (Prism), Refractive index (Glass slab)."
        ],
        "24. Wave Optics": [
            "Manzil Topics: Huygens' principle, Interference (YDSE), Diffraction, Polarization.",
            "Detailed: Wavefront and Huygens' principle. Laws of reflection/refraction using Huygens.",
            "Detailed: Interference, Young's double-slit experiment (fringe width), coherent sources.",
            "Detailed: Diffraction due to single slit.",
            "Detailed: Polarization, plane-polarized light: Brewster's law, uses of Polaroid."
        ],
        "25. Dual Nature of Radiation and Matter": [
            "Manzil Topics: Photoelectric effect, Einstein's equation, De Broglie relation.",
            "Detailed: Photoelectric effect. Hertz and Lenard's observations; Einstein's equation: particle nature.",
            "Detailed: Matter waves-wave nature of particle, de Broglie relation."
        ],
        "26. Atoms & Nuclei": [
            "Manzil Topics: Bohr model, Hydrogen spectrum, Radioactivity, Mass-energy relation, Fission & Fusion.",
            "Atoms: Alpha-particle scattering; Rutherford's model; Bohr model, energy levels, hydrogen spectrum.",
            "Nuclei: Composition/size of nucleus, atomic masses, Mass-energy relation, mass defect; binding energy per nucleon, nuclear fission, and fusion."
        ],
        "27. Semiconductor": [
            "Manzil Topics: I-V characteristics, Diode as rectifier, LED, Photodiode, Solar cell, Zener diode, Logic gates.",
            "Detailed: Semiconductors; semiconductor diode: I-V characteristics (forward/reverse); diode as rectifier.",
            "Detailed: I-V characteristics of LED, photodiode, solar cell, Zener diode (voltage regulator).",
            "Detailed: Logic gates (OR, AND, NOT, NAND and NOR).",
            "Experimental Skills: Characteristic curves of p-n junction and Zener diode. Identification of components."
        ]
    },
    "Chemistry": {
        "1. Mole Concept": [
            "Manzil Topics: Dalton's theory, Mole concept, Molar mass, Stoichiometry.",
            "Detailed: Matter and its nature, Dalton's atomic theory.",
            "Detailed: Laws of chemical combination; Atomic/molecular masses, mole concept, molar mass, percentage composition, empirical/molecular formulae: Chemical equations and stoichiometry."
        ],
        "2. Liquid Solutions": [
            "Manzil Topics: Concentration terms, Raoult's Law, Colligative properties, Van’t Hoff factor.",
            "Detailed: Concentration: molality, molarity, mole fraction, percentage.",
            "Detailed: Vapour pressure of solutions and Raoult's Law (Ideal/non-ideal).",
            "Detailed: Colligative properties: relative lowering of VP, depression of freezing point, elevation of boiling point, osmotic pressure.",
            "Detailed: Abnormal molar mass, van’t Hoff factor."
        ],
        "3. Chemical Kinetics": [
            "Manzil Topics: Rate of reaction, Order & Molecularity, Arrhenius equation, Activation energy.",
            "Detailed: Factors affecting rate (concentration, temp, pressure, catalyst).",
            "Detailed: Elementary/complex reactions, order and molecularity, rate law/constant. Zero and first-order reactions (characteristics, half-lives).",
            "Detailed: Arrhenius theory, activation energy, collision theory (no derivation).",
            "Experimental Skills: Kinetic study of iodide ions with H2O2."
        ],
        "4. Thermodynamics": [
            "Manzil Topics: First Law (Enthalpy, Internal Energy), Hess’s law, Entropy, Gibbs Energy.",
            "Detailed: System/surroundings, extensive/intensive properties, state functions.",
            "Detailed: First law: Work, heat, internal energy, enthalpy, heat capacity. Hess’s law.",
            "Detailed: Second law: Spontaneity, ΔS of universe, ΔG of system. ΔG° and equilibrium constant."
        ],
        "5. Thermochemistry": [
            "Manzil Topics: Enthalpies of formation, combustion, bond dissociation.",
            "Detailed: Enthalpies of bond dissociation, combustion, formation, atomization, sublimation, phase transition, hydration, ionization, and solution.",
            "Experimental Skills: Enthalpy of solution (CuSO4), Enthalpy of neutralization."
        ],
        "6. Chemical Equillibrium": [
            "Manzil Topics: Law of mass action, Kp & Kc, Le Chatelier’s principle.",
            "Detailed: Dynamic equilibrium. Physical processes (Solid-liquid, liquid-gas, Henry's law).",
            "Detailed: Chemical processes: Law of chemical equilibrium, Kp and Kc, significance of ΔG/ΔG°. Factors affecting equilibrium (Le Chatelier’s principle)."
        ],
        "7. Ionic Equilibrium": [
            "Manzil Topics: Acids/Bases, pH scale, Buffer solutions, Solubility product.",
            "Detailed: Weak/strong electrolytes, ionization. Acids/bases (Arrhenius, Bronsted-Lowry, Lewis).",
            "Detailed: pH scale, common ion effect, hydrolysis of salts, solubility product, buffer solutions."
        ],
        "8. Redox Reactions and Volumetric analysis": [
            "Manzil Topics: Oxidation number, Balancing redox reactions, Titration principles.",
            "Detailed: Oxidation and reduction, oxidation number, balancing redox reactions.",
            "Experimental Skills: Titrimetric exercises (Acids/bases indicators, oxalic acid vs KMnO4, Mohr’s salt vs KMnO4)."
        ],
        "9. Electrochemistry": [
            "Manzil Topics: Nernst equation, Kohlrausch’s law, Galvanic/Electrolytic cells, Batteries.",
            "Detailed: Electrolytic/metallic conduction, conductance, molar conductivities, Kohlrausch’s law.",
            "Detailed: Electrochemical cells (Electrolytic/Galvanic), electrode potentials, Nernst equation. Cell potential and Gibbs energy. Dry cell, lead accumulator, Fuel cells."
        ],
        "10. Atomic Structure": [
            "Manzil Topics: Bohr model, Quantum numbers, Shapes of orbitals, Electronic configuration.",
            "Detailed: EM radiation, photoelectric effect, Hydrogen spectrum.",
            "Detailed: Bohr model (postulates, energy/radii relations). Dual nature (de Broglie), Heisenberg uncertainty.",
            "Detailed: Quantum mechanical model, Atomic orbitals, Quantum numbers, Shapes of s, p, d orbitals. Spin.",
            "Detailed: Rules for filling electrons (Aufbau, Pauli, Hund). Electronic configuration, stability of half/fully filled."
        ],
        "11. IUPAC Naming": [
            "Manzil Topics: Nomenclature of organic compounds.",
            "Detailed: Nomenclature (Trivial and IUPAC)."
        ],
        "12. Isomerism": [
            "Manzil Topics: Structural & Stereoisomerism.",
            "Detailed: Isomerism - structural and stereoisomerism."
        ],
        "13. G.O.C (General Organic Chemistry)": [
            "Manzil Topics: Inductive, Mesomeric effects, Carbocations, Carbanions, Free radicals.",
            "Detailed: Tetravalency of carbon, hybridization.",
            "Detailed: Covalent bond fission (Homolytic/heterolytic), free radicals, carbocations, carbanions; stability. Electrophiles/nucleophiles.",
            "Detailed: Electronic displacement: Inductive, electromeric, resonance, hyperconjugation."
        ],
        "14. Hydrocarbons": [
            "Manzil Topics: Alkanes, Alkenes, Alkynes, Aromatic Hydrocarbons (Benzene).",
            "Detailed: Alkanes: Conformations (Sawhorse/Newman), Halogenation mechanism.",
            "Detailed: Alkenes: Geometrical isomerism, Electrophilic addition (H2, X2, H2O, HX - Markownikoff/Peroxide), Ozonolysis, polymerization.",
            "Detailed: Alkynes: Acidic character, Addition reactions, Polymerization.",
            "Detailed: Aromatic: Benzene (structure/aromaticity). Electrophilic substitution (halogenation, nitration, Friedel-Craft's). Directive influence."
        ],
        "15. Haloalkanes and Haloarenes": [
            "Manzil Topics: SN1 & SN2 mechanisms, Optical rotation, Uses.",
            "Detailed: Preparation, properties, reactions. Nature of C-X bond. Substitution mechanisms.",
            "Detailed: Uses: Environmental effects of chloroform, iodoform, freons, DDT."
        ],
        "16. Alcohols, Ethers and Phenols": [
            "Manzil Topics: Preparation & Properties, Reimer-Tiemann, Dehydration.",
            "Detailed: Alcohols: Identification (1°, 2°, 3°), dehydration mechanism.",
            "Detailed: Phenols: Acidic nature, Electrophilic substitution (halogenation, nitration, sulphonation), Reimer-Tiemann.",
            "Detailed: Ethers: Structure."
        ],
        "17. Periodic Table": [
            "Manzil Topics: Modern periodic law, Trends (Radii, Ionization, Electronegativity).",
            "Detailed: Modern periodic law, s, p, d, f blocks.",
            "Detailed: Periodic trends: atomic/ionic radii, ionization enthalpy, electron gain enthalpy, valence, oxidation states, chemical reactivity."
        ],
        "18. Carbonyl Compounds and Carboxylic Acid": [
            "Manzil Topics: Nucleophilic addition, Aldol & Cannizzaro, Acidic strength.",
            "Detailed: Aldehyde/Ketones: Nucleophilic addition, Reactivity. Grignard reagent, Oxidation/Reduction (Wolf Kishner, Clemmensen). Acidity of α-hydrogen (Aldol), Cannizzaro, Haloform. Tests to distinguish.",
            "Detailed: Carboxylic Acids: Acidic strength and factors affecting it.",
            "Experimental Skills: Detection of Carbonyl/Carboxyl groups."
        ],
        "19. Chemical Bonding": [
            "Manzil Topics: VSEPR theory, Hybridization, MOT, Hydrogen bonding.",
            "Detailed: Ionic/Covalent bonds. Lattice enthalpy. Electronegativity, Fajan’s rule, Dipole moment. VSEPR theory.",
            "Detailed: Valence bond theory, Hybridization (s, p, d), Resonance.",
            "Detailed: MOT: LCAO, bonding/antibonding, sigma/pi bonds, bond order/length/energy.",
            "Detailed: Hydrogen bonding."
        ],
        "20. Amines and Diazonium Salt": [
            "Manzil Topics: Basic character of amines, Diazonium salt reactions.",
            "Detailed: Amines: Classification, structure, Basic character, Identification (1°, 2°, 3°).",
            "Detailed: Diazonium Salts: Importance in synthetic chemistry.",
            "Experimental Skills: Preparation of Acetanilide, p-nitro acetanilide, aniline yellow."
        ],
        "21. Coordination Compounds": [
            "Manzil Topics: IUPAC nomenclature, Werner's theory, VBT & CFT.",
            "Detailed: Werner's theory; ligands, coordination number, denticity, chelation.",
            "Detailed: IUPAC nomenclature, isomerism.",
            "Detailed: Bonding: VBT and Crystal field theory (CFT), colour, magnetic properties."
        ],
        "22. Biomolecules & Purification and Test": [
            "Manzil Topics: Carbohydrates, Proteins, Vitamins, Nucleic Acids, Purification methods.",
            "Detailed: Carbohydrates: Aldoses/ketoses, monosaccharides (glucose/fructose), oligosaccharides.",
            "Detailed: Proteins: Amino acids, peptide bond. Structure (primary to quaternary), denaturation, enzymes.",
            "Detailed: Vitamins: Classification/functions. Nucleic Acids: DNA/RNA. Hormones.",
            "Detailed: Purification: Crystallization, sublimation, distillation, chromatography.",
            "Detailed: Qualitative Analysis: Detection of N, S, P, Halogens.",
            "Detailed: Quantitative Analysis: Principles for C, H, N, X, S, P."
        ],
        "23. D and F block": [
            "Manzil Topics: Transition elements, K2Cr2O7 & KMnO4, Lanthanoids & Actinoids.",
            "Detailed: Transition Elements: Trends (properties, ionization, oxidation states, radii, colour, magnetic, complex formation, interstitial, alloys).",
            "Detailed: Preparation/properties of K2Cr2O7 and KMnO4.",
            "Detailed: Lanthanoids: Contraction, oxidation states. Actinoids."
        ],
        "24. P- BLOCK ELEMENTS": [
            "Manzil Topics: Group 13 to 18 trends and properties.",
            "Detailed: Group 13 to 18 Elements: Electronic configuration, general trends in physical/chemical properties. Unique behaviour of first element."
        ],
        "25. Salt Analysis": [
            "Manzil Topics: Qualitative analysis of Cations and Anions.",
            "Detailed: Cations: Pb2+, Cu2+, Al3+, Fe3+, Zn2+, Ni2+, Ca2+, Ba2+, Mg2+, NH4+.",
            "Detailed: Anions: CO3 2-, S2-, SO3 2-, NO3-, NO2-, Cl-, Br-, I-."
        ]
    },
    "Botany": {
        "1. Cell: The unit of Life": [
            "Manzil Topics: Prokaryotic vs Eukaryotic, Organelles (Mitochondria, Plastids, etc.).",
            "Detailed: Cell theory, Prokaryotic/Eukaryotic cell structure. Cell envelope, membrane, wall.",
            "Detailed: Endomembrane system (ER, Golgi, Lysosomes, Vacuoles). Mitochondria, Ribosomes, Plastids, Cytoskeleton, Cilia, Flagella, Centrioles, Nucleus.",
            "🔥 High-Yield: Cell organelles: Nucleus, Mitochondria, Ribosomes, ER, Golgi bodies, Lysosomes, Plastids.",
            "🔥 High-Yield: Cell membrane: Structure and function."
        ],
        "2. Cell cycle and Cell division": [
            "Manzil Topics: Mitosis, Meiosis, Cell cycle phases.",
            "Detailed: Cell cycle, mitosis, meiosis and their significance.",
            "🔥 High-Yield: Phases of cell cycle, Mitosis, Meiosis (Prophase-I)."
        ],
        "3. Biological Classification": [
            "Manzil Topics: Five kingdom classification, Monera, Protista, Fungi, Viruses.",
            "Detailed: Five kingdom classification; Monera, Protista, Fungi (major groups), Lichens, Viruses, Viroids.",
            "🔥 High-Yield: Biological classification (Monera, Protista, Fungi, Viruses, Viroids).",
            "🔥 High-Yield: Taxonomic classification."
        ],
        "4. Plant Kingdom": [
            "Manzil Topics: Algae, Bryophytes, Pteridophytes, Gymnosperms, Angiosperms.",
            "Detailed: Classification of plants: Algae, Bryophytes, Pteridophytes, Gymnosperms (salient features).",
            "🔥 High-Yield: Algae, Bryophytes, Pteridophytes, Gymnosperms, Angiosperms."
        ],
        "5. Living World": [
            "Manzil Topics: Biodiversity, Taxonomy, Binomial nomenclature.",
            "Detailed: What is living? Biodiversity; Taxonomy & Systematics; Species concept; Binomial nomenclature.",
            "🔥 High-Yield: Base of classification."
        ],
        "6. Morphology of Flowering Plants": [
            "Manzil Topics: Root, Stem, Leaf, Flower, Fruit, Seed, Families: Malvaceae, Cruciferae, Solanaceae, Fabaceae, Liliaceae.",
            "Detailed: Morphology/modifications: Root, stem, leaf, inflorescence (cymose/racemose), flower, fruit, seed.",
            "Detailed: Families: Malvaceae, Cruciferae, Leguminoceae (Fabaceae), Compositae, Graminae. (Note: Manzil lists Solanaceae/Liliaceae, Syllabus file adds others. Study all mentioned).",
            "🔥 High-Yield: Androecium, Gynoecium, Placentation, Flower structure."
        ],
        "7. Photosynthesis in Higher Plants": [
            "Manzil Topics: Light reaction, C3 & C4 pathways, Photorespiration.",
            "Detailed: Site of photosynthesis, pigments. Photochemical/biosynthetic phases. Cyclic/non-cyclic photophosphorylation. Chemiosmotic hypothesis. Photorespiration C3/C4 pathways. Factors affecting.",
            "🔥 High-Yield: Light and dark reactions, Photosystems (PSI & PSII), C4 cycle, Photorespiration, Factors affecting rate."
        ],
        "8. Respiration in Plants": [
            "Manzil Topics: Glycolysis, Krebs cycle, ETS, RQ.",
            "Detailed: Exchange of gases; Cellular respiration (glycolysis, fermentation, TCA cycle, ETS). Energy relations (ATP). Amphibolic pathways; RQ.",
            "🔥 High-Yield: Glycolysis, Krebs cycle, ETS, Aerobic/anaerobic respiration, Fermentation."
        ],
        "9. Plant growth and Development": [
            "Manzil Topics: Growth regulators (Auxin, Gibberellin, Cytokinin, Ethylene, ABA).",
            "Detailed: Seed germination; Phases of growth; Differentiation, dedifferentiation, redifferentiation.",
            "Detailed: Growth regulators: auxin, gibberellin, cytokinin, ethylene, ABA.",
            "🔥 High-Yield: Auxin, Cytokinin, Ethylene, Photoperiodism, Vernalization, Dormancy."
        ],
        "10. Anatomy of Flowering Plants": [
            "Manzil Topics: Tissues (Meristematic, Permanent), Anatomy of Root, Stem, Leaf.",
            "Detailed: Tissues; Anatomy/functions of Root, stem, leaf.",
            "🔥 High-Yield: T.S. of root, stem, leaf (Dicot and Monocot comparison)."
        ],
        "11. Sexual Reproduction in Flowering Plants": [
            "Manzil Topics: Pollination, Double fertilization, Embryo & Endosperm.",
            "Detailed: Flower structure; Male/female gametophytes; Pollination; Outbreeding devices; Pollen-Pistil interaction; Double fertilization.",
            "Detailed: Post fertilization (Endosperm/embryo, seed/fruit). Apomixis, parthenocarpy, polyembryony.",
            "🔥 High-Yield: Structure of anther/pistil, Pollination, Pollen-pistil interaction, Double fertilization, Embryo/Seed/Fruit development, Apomixis, Polyembryony."
        ],
        "12. Principles of Inheritance and Variation": [
            "Manzil Topics: Mendelian genetics, Linkage, Genetic disorders.",
            "Detailed: Mendelian Inheritance; Deviations (Incomplete dominance, Co-dominance, Multiple alleles, Blood groups, Pleiotropy, Polygenic).",
            "Detailed: Chromosome theory; Sex determination (Human, bird, honey bee). Linkage/crossing over.",
            "Detailed: Disorders: Haemophilia, Colour blindness, Thalassemia, Down’s, Turner’s, Klinefelter’s.",
            "🔥 High-Yield: Mendelian inheritance, Linkage and recombination, Sex determination, Co-dominance, Polygenic inheritance, Multiple alleles, Chromosomal theory."
        ],
        "13. Molecular Basis of Inheritance": [
            "Manzil Topics: DNA structure, Replication, Transcription, Translation, Lac Operon.",
            "Detailed: DNA as genetic material; Structure DNA/RNA; Packaging; Replication; Central dogma; Transcription, genetic code, translation.",
            "Detailed: Gene expression (Lac Operon); Human Genome Project; DNA fingerprinting.",
            "🔥 High-Yield: DNA structure (Watson-Crick), Packaging, Transcription, Genetic code, Translation, Gene expression, Lac operon, HGP, DNA fingerprinting."
        ],
        "14. Microbes in Human Welfare": [
            "Manzil Topics: Household & Industrial applications, Sewage treatment, Biofertilizers.",
            "Detailed: Household food processing, industrial production, sewage treatment, energy generation, biocontrol agents, biofertilizers.",
            "🔥 High-Yield: Household applications, Industrial applications, Sewage treatment, Biogas, Biofertilizers."
        ],
        "15. Organisms and Populations": [
            "Manzil Topics: Population interactions, Adaptations, Attributes.",
            "Detailed: Population interactions (mutualism, competition, predation, parasitism). Population attributes (growth, birth/death rate, age distribution).",
            "🔥 High-Yield: Population interactions (Mutualism, Commensalism, Parasitism, Competition), Population growth models, Carrying capacity."
        ],
        "16. Ecosystem": [
            "Manzil Topics: Energy flow, Pyramids, Decomposition, Productivity.",
            "Detailed: Patterns, components; productivity and decomposition; Energy flow; Pyramids (number, biomass, energy).",
            "🔥 High-Yield: Structure, Productivity (GPP, NPP), Energy flow, Food chains, Ecological pyramids, Decomposition."
        ],
        "17. Biodiversity and Conservation": [
            "Manzil Topics: Patterns of biodiversity, Loss, Conservation methods.",
            "Detailed: Concept, Patterns, Importance, Loss of Biodiversity. Conservation (Hotspots, endangered, Red Data Book, biosphere reserves, National parks, Sacred Groves).",
            "🔥 High-Yield: Patterns, Conservation (In-situ, Ex-situ), Hotspots, Biosphere reserves, National parks, Sacred groves."
        ]
    },
    "Zoology": {
        "1. Breathing and Exchange of Gases": [
            "Manzil Topics: Respiratory organs, Mechanism, Gas transport.",
            "Detailed: Respiratory organs; Mechanism of breathing and regulation; Gas exchange/transport; Respiratory volumes.",
            "Detailed: Disorders: Asthma, Emphysema, Occupational disorders.",
            "🔥 High-Yield: Pulmonary volumes/capacities, O2-Hb dissociation curve, Transport of O2, Altitude sickness, Partial pressure."
        ],
        "2. Body Fluids and Circulation": [
            "Manzil Topics: Blood, Heart structure, Cardiac cycle, ECG, Double circulation.",
            "Detailed: Composition of blood, groups, coagulation; Lymph. Human circulatory system (Heart, vessels).",
            "Detailed: Cardiac cycle, output, ECG, Double circulation; Regulation. Disorders (Hypertension, CAD, Angina, Heart failure).",
            "🔥 High-Yield: Heart conduction, ECG, Blood groups, Clotting, Types of WBC, RBC."
        ],
        "3. Excretory Products and Their Elimination": [
            "Manzil Topics: Nephron structure, Urine formation, Regulation.",
            "Detailed: Modes of excretion; Human system; Urine formation, Osmoregulation. Regulation (Renin-angiotensin, ANF, ADH).",
            "Detailed: Disorders (Uraemia, Renal failure, Calculi, Nephritis); Dialysis.",
            "🔥 High-Yield: Nephron function, Juxtamedullary nephron, Hormonal regulation, JG apparatus, RAAS."
        ],
        "4. Locomotion and Movement": [
            "Manzil Topics: Muscle contraction, Skeletal system, Joints.",
            "Detailed: Types of movement; Skeletal muscle (contractile proteins, contraction). Skeletal system; Joints.",
            "Detailed: Disorders (Myasthenia gravis, Tetany, MD, Arthritis, Osteoporosis, Gout).",
            "🔥 High-Yield: Types of muscles, Joints, Disorders, Muscle contraction mechanism."
        ],
        "5. Neural Control and Coordination": [
            "Manzil Topics: Neuron, CNS & PNS, Nerve impulse, Eye & Ear.",
            "Detailed: Neuron and nerves; CNS, PNS, Visceral system. Generation/conduction of nerve impulse.",
            "🔥 High-Yield: Brain structure/function, Limbic system, Synapses, Nerve impulse conduction."
        ],
        "6. Chemical Coordination and Integration": [
            "Manzil Topics: Endocrine glands, Hormones mechanism.",
            "Detailed: Endocrine glands (Hypothalamus, Pituitary, Pineal, Thyroid, Parathyroid, Adrenal, Pancreas, Gonads).",
            "Detailed: Hormone action mechanism; Role as messengers. Hypo/hyperactivity disorders (Dwarfism, Acromegaly, Goiter, Diabetes, etc.).",
            "🔥 High-Yield: Hormones (Steroid, mechanism), Endocrine glands (Adrenal, Testis, Ovary, Pancreas)."
        ],
        "7. Structural Organisation in Animals": [
            "Manzil Topics: Animal tissues, Cockroach (Morphology & Anatomy), Frog (Brief account).",
            "Detailed: Animal tissues.",
            "Detailed: Morphology, anatomy, functions of systems of Frog.",
            "Detailed: Cockroach: Morphology, anatomy (digestive, circulatory, respiratory, nervous, reproductive).",
            "🔥 High-Yield: Cockroach (Systems), Frog (Morphology/Anatomy), Tissues (Epithelial, Connective, Junctions)."
        ],
        "8. Animal Kingdom": [
            "Manzil Topics: Non-chordates, Chordates (Class level features).",
            "Detailed: Classification: Non-chordate (up to phyla), Chordate (up to classes). Salient features and examples.",
            "🔥 High-Yield: Invertebrates, Vertebrates, Fish characteristics, Mammals, Chordata/Non-chordata features, Birds. Examples (Canidae, Felidae, Earthworm, Frog)."
        ],
        "9. Biomolecules": [
            "Manzil Topics: Enzymes, Proteins, Carbohydrates, Lipids.",
            "Detailed: Biomolecules structure/function (proteins, carbohydrates, lipids, nucleic acids).",
            "Detailed: Enzymes-types, properties, action, classification.",
            "🔥 High-Yield: Primary/secondary metabolites, Carbohydrates (bonds), Proteins, Enzymes (nomenclature, action)."
        ],
        "10. Human Reproduction": [
            "Manzil Topics: Male & Female systems, Gametogenesis, Menstrual cycle, Fertilization.",
            "Detailed: Male/Female reproductive systems; Microscopic anatomy of testis/ovary.",
            "Detailed: Gametogenesis (spermatogenesis & oogenesis); Menstrual cycle; Fertilisation, implantation; Pregnancy, placenta; Parturition; Lactation.",
            "🔥 High-Yield: Gametogenesis, Menstrual cycle, Fertilization, Embryo development."
        ],
        "11. Reproductive Health": [
            "Manzil Topics: Contraceptives, MTP, ART (IVF, ZIFT, GIFT), STDs.",
            "Detailed: Need for reproductive health; STDs; Birth control (Contraception, MTP); Amniocentesis; Infertility and ART (IVF, ZIFT, GIFT).",
            "🔥 High-Yield: Contraceptives, IUD, STD, MTP, ART."
        ],
        "12. Human Health and Diseases": [
            "Manzil Topics: Malaria, Typhoid, Immunity, AIDS, Cancer, Drug abuse.",
            "Detailed: Pathogens/parasites (Malaria, Filariasis, Ascariasis, Typhoid, Pneumonia, Amoebiasis, Ring worm, Dengue, Chikungunya).",
            "Detailed: Immunology-vaccines; Cancer, HIV/AIDS; Adolescence, drug/alcohol/tobacco abuse.",
            "🔥 High-Yield: Common diseases, Immunity, HIV/AIDS, Cancer, Drug abuse."
        ],
        "13. Biotechnology - Principle and Processes": [
            "Manzil Topics: rDNA technology, Restriction enzymes, PCR.",
            "Detailed: Genetic engineering (Recombinant DNA technology).",
            "🔥 High-Yield: Tools of rDNA (Vectors, Restriction enzymes, PCR, Gel electrophoresis). Steps in rDNA, Gene gun, Selectable markers."
        ],
        "14. Biotechnology and Its Application": [
            "Manzil Topics: Insulin production, Gene therapy, Bt crops.",
            "Detailed: Health/Agriculture: Insulin, vaccine, gene therapy; GMOs (Bt crops); Transgenic Animals; Biosafety, Biopiracy, patents.",
            "🔥 High-Yield: Genetically engineered insulin, Gene therapy, Molecular diagnosis, BT plants, Transgenic animals, Ethical issues."
        ],
        "15. Evolution": [
            "Manzil Topics: Origin of life, Darwinism, Hardy-Weinberg, Human evolution.",
            "Detailed: Origin of life; Biological evolution evidences (Paleontology, anatomy, embryology, molecular).",
            "Detailed: Darwin’s contribution, Modern Synthetic theory; Mechanism (Mutation, Recombination, Natural Selection); Gene flow, Drift; Hardy-Weinberg; Adaptive Radiation; Human evolution.",
            "🔥 High-Yield: Evidences, Darwinism, Mutation theory, Natural selection, Genetic drift, Hardy-Weinberg, Adaptive radiation, Human evolution."
        ]
    }
}

# ==========================================
# 3. SMART CONNECTIONS
# ==========================================
# Gemini Setup
try:
    if "GOOGLE_API_KEY" in st.secrets:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    else:
        st.error("⚠️ Google API Key missing!")
        st.stop()
except Exception as e:
    st.error(f"API Error: {e}")

# Firebase Setup
db = None
if not firebase_admin._apps:
    try:
        if "FIREBASE_KEY" in st.secrets:
            # Mobile quotes fix
            raw_key = st.secrets["FIREBASE_KEY"].replace("“", '"').replace("”", '"')
            key_dict = json.loads(raw_key, strict=False)
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
            st.sidebar.success("✅ Memory Database: CONNECTED")
    except Exception as e:
        st.sidebar.error(f"DB Error: {e}")

if firebase_admin._apps:
    db = firestore.client()

# Model Selector (Ladder Logic: Thinking -> Pro -> Flash) 🪜
def get_valid_model():
    try:
        # Step 1: Google se pucho abhi kaun se models available hain
        available = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        # Step 2: Priority Check karo (Fail-Safe Ladder)
        
        # 🥇 Priority 1: Gemini 2.0 Thinking (Physics & Logic ke liye Best)
        if "models/gemini-2.0-flash-thinking-exp-01-21" in available: 
            return "models/gemini-2.0-flash-thinking-exp-01-21"
        if "models/gemini-2.0-flash-thinking-exp" in available: 
            return "models/gemini-2.0-flash-thinking-exp"
            
        # 🥈 Priority 2: Gemini 1.5 Pro (Reasoning ke liye Backup)
        if "models/gemini-1.5-pro" in available: 
            return "models/gemini-1.5-pro"
            
        # 🥉 Priority 3: Gemini 1.5 Flash (Speed & PDF ke liye Backup)
        if "models/gemini-1.5-flash" in available: 
            return "models/gemini-1.5-flash"
            
        # Step 3: Agar upar wala koi nahi mila, to list ka pehla model utha lo
        return available[0] if available else "models/gemini-1.5-flash"
        
    except Exception as e:
        # Agar Internet/API error aaye, to sabse halka model return karo
        return "models/gemini-1.5-flash"

MODEL_NAME = get_valid_model()

# ==========================================
# 4. HELPER FUNCTIONS
# ==========================================
def log_mistake_to_db(text):
    if db is None: return "⚠️ DB disconnected."
    try:
        db.collection("mistakes").add({"mistake": text, "timestamp": firestore.SERVER_TIMESTAMP})
        return "✅ Note kar liya bhai!"
    except: return "❌ Error saving."

def get_past_mistakes():
    if db is None: return "⚠️ DB disconnected."
    try:
        docs = db.collection("mistakes").stream()
        mistakes = [f"- {d.to_dict().get('mistake')}" for d in docs]
        return "\n".join(mistakes) if mistakes else "No mistakes found."
    except: return "Error fetching."

# --- TRACKER FUNCTIONS ---
def get_syllabus_status():
    if db is None: return {}
    try:
        doc = db.collection("tracker").document("anuj_progress").get()
        if doc.exists: return doc.to_dict()
        else: return {}
    except: return {}

def update_syllabus_status(key, status):
    if db is None: return
    try:
        db.collection("tracker").document("anuj_progress").set({key: status}, merge=True)
    except: pass

def detect_language(text):
    hindi_keywords = ['hai', 'ho', 'ka', 'ki', 'mein', 'se', 'ko', 'na', 'kya', 'samjhao']
    return "Hinglish" if any(w in text.lower() for w in hindi_keywords) else "English"

# ==========================================
# 5. SIDEBAR: SYLLABUS TRACKER UI
# ==========================================
current_status = get_syllabus_status()
completed_topics = []

with st.sidebar:
    st.header("📊 Syllabus Tracker")
    st.caption("Mark chapters as DONE ✅")
    
    # Iterate through Subjects -> Units -> Topics
    for subject, units in NEET_SYLLABUS.items():
        with st.expander(f"📘 {subject}"):
            for unit_name, topics in units.items():
                st.markdown(f"**{unit_name}**")
                # Using the Unit Name as the key for simplicity in tracking
                db_key = f"{subject}_{unit_name}".replace(" ", "_")
                is_checked = current_status.get(db_key, False)
                checked = st.checkbox("Mark Completed", value=is_checked, key=db_key)
                
                if checked:
                    # Add detailed topics to context if checked
                    completed_topics.append(f"{unit_name}: {', '.join(topics[:3])}...") 
                
                if checked != is_checked:
                    update_syllabus_status(db_key, checked)
                    st.rerun()

    if st.button("🗑️ Reset Chat"):
        st.session_state.messages = []
        st.rerun()

# ==========================================
# 6. THE SYSTEM PROMPT (MERGED WITH SYLLABUS CONTEXT)
# ==========================================

# Prepare Syllabus Context for AI
syllabus_context_str = "None"
if completed_topics:
    syllabus_context_str = "\n".join(completed_topics)

FINAL_BOT_ROLE = f"""
You are 'NEET Sarathi' - Anuj's 24/7 AI Mentor & Strategic Coach.
Simultaneously, you possess the mind of 'Dr. Sharma' (Former NEET Paper Setter, 25+ Yrs Exp).

## 📊 STUDENT CONTEXT (COMPLETED SYLLABUS):
The student has completed the following units. **Ask questions from these topics with higher difficulty (Layer 2 & 3). For other topics, teach from basics.**
{syllabus_context_str}

## 📜 STRICT SYLLABUS BOUNDARY:
You are a strict Syllabus guardian. Use ONLY the provided context to answer. 
If the student asks about something not in NCERT (Latest 2024-2025) or the NEET 2026 Syllabus, politely refuse. 
Explain concepts with examples from the text provided.

## 🧠 CORE INTELLIGENCE (The Deepthink Engine):
You must synthesize answers using these layers before replying:
1. **Layer 1 (Direct Data):** Past 15 Years NEET/AIPMT Papers.
2. **Layer 2 (Deep History):** Past 50 Years Medical Entrance trends.
3. **Layer 3 (Global Patterns):** Trends from millions of students.
4. **Reasoning:** Never rote learn. Always connect dots (Bio -> Chem -> Physics).

## 🎯 YOUR DUAL IDENTITY:
1. **The Coach (Sarathi):** Supportive, motivates, manages stress, tracks plans.
2. **The Examiner (Dr. Sharma):** Sets traps, asks tricky questions, reveals how paper setters think.

## ⚙️ MODES (Switch Automatically):
1. **GUIDANCE MODE:** If Anuj is stressed, be a supportive friend.
2. **EXAMINER MODE (Quiz):** If asked to quiz, use the "Examiner's Playbook".
3. **MISTAKE LOG:** Handle '/log' and 'Revise mistakes' commands rigidly.
4. **RAPID FIRE:** Ask 20 questions back-to-back. High speed.
5. **PREDICTIVE ENGINE:** Predict questions based on "Statistical Hotspots".
6. **ROLEPLAY:** "Act like [Topic]" -> Become that topic in First Person.

## 🛡️ TRAP DETECTION:
Identify "Almost Right" options, "Too Specific" details, and "Diagram Deception".

## 📝 RESPONSE TEMPLATE:
Examiner's View -> Concept Explanation -> Common Traps -> Practice Question.

TONE: Hinglish (Technical terms in English, logic in Hindi).
"""

# ==========================================
# 7. CHAT LOOP & DISPLAY
# ==========================================

# Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "user", "content": f"[SYSTEM_HIDDEN]: {FINAL_BOT_ROLE}"},
        {"role": "model", "content": "Hello Anuj! Dr. Sharma here. Deepthink Engine Activated with Strict Syllabus Mode. 🧠"}
    ]

# Display Loop
for i, msg in enumerate(st.session_state.messages):
    if i < 2: continue 
    
    role = "user" if msg["role"] == "user" else "assistant"
    
    with st.chat_message(role):
        st.markdown(msg["content"])
        
        # --- ACTION BAR (Minimal Icon) ---
        if role == "assistant":
            st.markdown("---")
            st.download_button(
                label="📥",  # Sirf Icon
                data=msg["content"],
                file_name=f"Dr_Sharma_Note_{i}.md",
                mime="text/markdown",
                key=f"dl_{i}",
                help="Download Note"
            )

# ==========================================
# 8. INPUT HANDLING
# ==========================================
prompt = st.chat_input("Ask Dr. Sharma...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # Build Context (System + Recent History)
        recent_msgs = st.session_state.messages[-10:] 
        history = []
        # Inject Updated System Prompt
        history.append({"role": "user", "parts": [FINAL_BOT_ROLE]})
        history.append({"role": "model", "parts": ["Understood. I am Dr. Sharma. I will follow the strict syllabus."]})
        
        for m in recent_msgs:
            if "[SYSTEM" in m["content"]: continue
            role_map = "user" if m["role"] == "user" else "model"
            history.append({"role": role_map, "parts": [m["content"]]})

        chat = model.start_chat(history=history)
        
        response_text = ""
        # Logic
        if prompt.startswith("/log"):
            msg = prompt.replace("/log", "").strip()
            status = log_mistake_to_db(msg)
            response = chat.send_message(f"User logged: '{msg}'. Status: {status}. Confirm.")
            response_text = f"**[System]:** {status}\n\n{response.text}"
        elif "revise mistake" in prompt.lower():
            past = get_past_mistakes()
            response = chat.send_message(f"Past mistakes:\n{past}\n. Quiz user.")
            response_text = response.text
        else:
            lang = detect_language(prompt)
            response = chat.send_message(f"{prompt} (Reply in {lang})")
            response_text = response.text

        # Save & Rerun
        st.session_state.messages.append({"role": "model", "content": response_text})
        st.rerun()

    except Exception as e:
        st.error(f"⚠️ Error: {e}")