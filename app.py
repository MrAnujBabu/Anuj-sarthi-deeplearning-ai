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
# This contains the full detailed syllabus with topics and high-yield notes.
NEET_SYLLABUS = {
    "Physics": {
        "UNIT 1: Physics and Measurement": [
            "Units of measurements, System of Units, SI Units, fundamental and derived units.",
            "Least count, significant figures, Errors in measurements.",
            "Dimensions of Physics quantities, dimensional analysis, and its applications."
        ],
        "UNIT 2: Kinematics": [
            "Frame of reference, motion in a straight line, Position-time graph, speed and velocity.",
            "Uniform and non-uniform motion, average speed and instantaneous velocity.",
            "Uniformly accelerated motion, velocity-time, position-time graph.",
            "Scalars and Vectors, Vector Addition and subtraction, Unit Vector, Resolution.",
            "Relative Velocity, Motion in a plane, Projectile Motion, Uniform Circular Motion."
        ],
        "UNIT 3: Laws of Motion": [
            "Force and inertia, Newton’s First, Second & Third Law of motion.",
            "Momentum, Impulse, Conservation of linear momentum.",
            "Equilibrium of concurrent forces.",
            "Static and Kinetic friction, laws of friction, rolling friction.",
            "Dynamics of uniform circular motion: centripetal force, banking of roads."
        ],
        "UNIT 4: Work, Energy, and Power": [
            "Work done by constant/variable force; kinetic and potential energies.",
            "Work-energy theorem, power.",
            "Potential energy of spring, conservation of mechanical energy.",
            "Conservative and non-conservative forces.",
            "Motion in a vertical circle; Elastic and inelastic collisions."
        ],
        "UNIT 5: Rotational Motion": [
            "Centre of mass (two-particle system, rigid body).",
            "Moment of force, torque, angular momentum conservation.",
            "Moment of inertia, radius of gyration, parallel/perpendicular axes theorems.",
            "Equilibrium of rigid bodies, rigid body rotation equations."
        ],
        "UNIT 6: Gravitation": [
            "Universal law of gravitation. Acceleration due to gravity (altitude/depth).",
            "Kepler’s laws of planetary motion.",
            "Gravitational potential energy; Escape velocity.",
            "Satellite motion (orbital velocity, time period, energy)."
        ],
        "UNIT 7: Properties of Solids and Liquids": [
            "Elastic behaviour, Stress-strain, Hooke's Law, Young's/bulk/rigidity modulus.",
            "Pressure (Pascal's law), Effect of gravity on fluid pressure.",
            "Viscosity, Stokes' law, Terminal velocity, Bernoulli's principle.",
            "Surface tension (drops, bubbles, capillary rise).",
            "Heat, temperature, thermal expansion, specific heat, calorimetry.",
            "Heat transfer (conduction, convection, radiation)."
        ],
        "UNIT 8: Thermodynamics": [
            "Thermal equilibrium, zeroth law.",
            "First law: Heat, work, internal energy.",
            "Isothermal and adiabatic processes.",
            "Second law: Reversible and irreversible processes."
        ],
        "UNIT 9: Kinetic Theory of Gases": [
            "Equation of state of a perfect gas.",
            "Kinetic theory assumptions, pressure concept.",
            "RMS speed, Degrees of freedom, Law of equipartition of energy.",
            "Mean free path, Avogadro's number."
        ],
        "UNIT 10: Oscillations and Waves": [
            "SHM and its equation; phase; spring oscillations.",
            "Simple pendulum (time period).",
            "Wave motion (Longitudinal/Transverse), speed of wave.",
            "Principle of superposition, Standing waves, Beats."
        ],
        "UNIT 11: Electrostatics": [
            "Coulomb's law, Superposition principle.",
            "Electric field (Point charge, Dipole, Torque).",
            "Gauss's law applications (Wire, Sheet, Shell).",
            "Electric potential, Equipotential surfaces, Potential energy.",
            "Capacitors (Series/Parallel, Dielectrics), Energy stored."
        ],
        "UNIT 12: Current Electricity": [
            "Drift velocity, Ohm's law, I-V characteristics.",
            "Resistivity, Conductivity, Color code.",
            "Series/Parallel resistors; Temp dependence.",
            "Internal resistance, EMF, Cells in series/parallel.",
            "Kirchhoff’s laws, Wheatstone bridge, Metre Bridge."
        ],
        "UNIT 13: Magnetic Effects of Current": [
            "Biot-Savart law, Ampere's law (Solenoid).",
            "Force on moving charge/conductor.",
            "Torque on current loop, Galvanometer conversion.",
            "Magnetic dipole, Bar magnet, Earth's magnetic field.",
            "Para-, dia- and ferromagnetic substances."
        ],
        "UNIT 14: EMI & AC": [
            "Faraday's law, Lenz’s Law, Eddy currents.",
            "Self and mutual inductance.",
            "Alternating currents (Peak/RMS), LCR series circuit, Resonance.",
            "AC generator and transformer."
        ],
        "UNIT 15: EM Waves": [
            "Displacement current.",
            "EM waves characteristics, Transverse nature.",
            "EM Spectrum (Radio to Gamma) & Applications."
        ],
        "UNIT 16: Optics": [
            "Ray Optics: Reflection (Mirrors), Refraction (Lenses, Prism).",
            "Total internal reflection; Microscope & Telescope.",
            "Wave Optics: Wavefront, Huygens' principle.",
            "Interference (Young's double-slit), Diffraction, Polarization."
        ],
        "UNIT 17: Dual Nature of Matter": [
            "Photoelectric effect, Einstein's equation.",
            "Matter waves (de Broglie relation)."
        ],
        "UNIT 18: Atoms and Nuclei": [
            "Alpha-particle scattering, Bohr model, Hydrogen spectrum.",
            "Nucleus composition, Mass-energy relation, Mass defect.",
            "Nuclear fission and fusion."
        ],
        "UNIT 19: Electronic Devices": [
            "Semiconductors, I-V characteristics (Diode).",
            "Diode as rectifier.",
            "LED, Photodiode, Solar cell, Zener diode.",
            "Logic gates (OR, AND, NOT, NAND, NOR)."
        ],
        "UNIT 20: Experimental Skills": [
            "Vernier calipers, Screw gauge, Pendulum.",
            "Metre Scale, Young's modulus, Surface tension.",
            "Speed of sound, Specific heat capacity.",
            "Resistivity (Metre bridge), Focal length (Mirrors/Lens)."
        ]
    },
    "Chemistry": {
        "UNIT 1: Some Basic Concepts": [
            "Dalton's theory, Mole concept, Molar mass.",
            "Percentage composition, Empirical/Molecular formulae.",
            "Stoichiometry."
        ],
        "UNIT 2: Atomic Structure": [
            "Bohr model, Dual nature (de Broglie), Heisenberg uncertainty.",
            "Quantum numbers, Shapes of s, p, d orbitals.",
            "Electronic configuration (Aufbau, Pauli, Hund)."
        ],
        "UNIT 3: Chemical Bonding": [
            "Ionic & Covalent bonding, VSEPR theory.",
            "Valence Bond Theory (Hybridization), MOT (LCAOs, Bond order).",
            "Hydrogen bonding."
        ],
        "UNIT 4: Thermodynamics": [
            "First Law: Internal Energy, Enthalpy, Hess’s law.",
            "Second Law: Entropy, Gibbs Energy (ΔG), Spontaneity."
        ],
        "UNIT 5: Solutions": [
            "Concentration methods, Raoult's Law.",
            "Colligative properties (RLVP, Elevation BP, Depression FP, Osmotic).",
            "van’t Hoff factor."
        ],
        "UNIT 6: Equilibrium": [
            "Le Chatelier’s principle, Kp/Kc.",
            "Ionic: Acids/Bases, pH, Buffer solutions, Solubility product."
        ],
        "UNIT 7: Redox & Electrochemistry": [
            "Oxidation number, Nernst equation.",
            "Conductance, Kohlrausch’s law.",
            "Cells: Galvanic, Dry cell, Fuel cells."
        ],
        "UNIT 8: Chemical Kinetics": [
            "Rate of reaction, Order/Molecularity.",
            "Zero & First-order reactions, Arrhenius equation."
        ],
        "UNIT 9: Classification of Elements": [
            "Modern periodic table.",
            "Periodic trends (Radii, Ionization, Electronegativity)."
        ],
        "UNIT 10: P-Block Elements": [
            "Group 13 to 18: Electronic config & General trends."
        ],
        "UNIT 11: d- and f-Block": [
            "Transition Elements properties.",
            "K2Cr2O7 and KMnO4.",
            "Lanthanoids & Actinoids."
        ],
        "UNIT 12: Co-ordination Compounds": [
            "Werner's theory, IUPAC, Isomerism.",
            "Bonding (VBT, CFT)."
        ],
        "UNIT 13: Purification & Characterisation": [
            "Crystallization, Distillation, Chromatography.",
            "Qualitative & Quantitative analysis."
        ],
        "UNIT 14: Basic Principles of Organic": [
            "IUPAC Nomenclature.",
            "Electronic effects (Inductive, Resonance).",
            "Fission (Homolytic/Heterolytic)."
        ],
        "UNIT 15: Hydrocarbons": [
            "Alkanes, Alkenes, Alkynes properties.",
            "Aromatic: Benzene, Electrophilic substitution."
        ],
        "UNIT 16: Organic Compounds (Halogens)": [
            "SN1/SN2 mechanisms.",
            "Chloroform, Iodoform, DDT uses."
        ],
        "UNIT 17: Organic Compounds (Oxygen)": [
            "Alcohols, Phenols, Ethers.",
            "Aldehydes & Ketones (Nucleophilic addition, Aldol, Cannizzaro).",
            "Carboxylic Acids."
        ],
        "UNIT 18: Organic Compounds (Nitrogen)": [
            "Amines (Basic character), Diazonium Salts."
        ],
        "UNIT 19: Biomolecules": [
            "Carbohydrates, Proteins, Vitamins, Nucleic Acids."
        ],
        "UNIT 20: Practical Chemistry": [
            "Salt Analysis (Cations/Anions).",
            "Titration (KMnO4 vs Oxalic/Mohr salt)."
        ]
    },
    "Biology": {
        "UNIT 1: Diversity in Living World": [
            "Taxonomy, Five kingdom classification.",
            "Plant Kingdom (Algae to Angiosperms).",
            "Animal Kingdom (Non-chordates to Chordates).",
            "High-Yield: Biological classification, Examples."
        ],
        "UNIT 2: Structural Organisation": [
            "Morphology (Root, Stem, Leaf, Flower).",
            "Families: Malvaceae, Cruciferae, Leguminoceae, Compositae, Graminae.",
            "Animal Tissues & Frog Anatomy.",
            "High-Yield: Plant families, Frog systems."
        ],
        "UNIT 3: Cell Structure & Function": [
            "Prokaryotic vs Eukaryotic cells.",
            "Organelles (Mitochondria, Plastids, Ribosomes etc.).",
            "Biomolecules (Proteins, Carbs, Enzymes).",
            "Cell Cycle: Mitosis, Meiosis.",
            "High-Yield: Cell cycle phases, Enzyme action."
        ],
        "UNIT 4: Plant Physiology": [
            "Photosynthesis (C3/C4, Light reaction).",
            "Respiration (Glycolysis, Krebs, ETS).",
            "Plant Growth Regulators (Auxin, Gibberellin, etc.).",
            "High-Yield: Cycles (Krebs, Calvin), Hormones."
        ],
        "UNIT 5: Human Physiology": [
            "Breathing & Exchange of Gases.",
            "Body Fluids & Circulation (ECG, Heart).",
            "Excretory Products (Nephron, Regulation).",
            "Locomotion (Muscle contraction, Joints).",
            "Neural Control (Eye, Ear, CNS).",
            "Chemical Coordination (Hormones).",
            "High-Yield: Hormonal regulation, ECG, Nephron."
        ],
        "UNIT 6: Reproduction": [
            "Sexual Reproduction in Flowering Plants.",
            "Human Reproduction (Gametogenesis, Cycle).",
            "Reproductive Health (Contraceptives, ART).",
            "High-Yield: Menstrual cycle, Double fertilization."
        ],
        "UNIT 7: Genetics & Evolution": [
            "Mendelian Genetics, Linkage, Disorders.",
            "Molecular Basis (DNA replication, Transcription, Translation, Lac Operon).",
            "Evolution (Darwinism, Hardy-Weinberg).",
            "High-Yield: Lac Operon, Genetic disorders, HGP."
        ],
        "UNIT 8: Biology & Human Welfare": [
            "Human Health & Disease (Malaria, AIDS, Cancer, Immunity).",
            "Microbes in Human Welfare.",
            "High-Yield: Life cycles (Plasmodium), Immunity types."
        ],
        "UNIT 9: Biotechnology": [
            "Principles (Restriction enzymes, PCR, rDNA).",
            "Applications (Insulin, Bt crops, RNAi).",
            "High-Yield: Tools of rDNA, Bt Cotton."
        ],
        "UNIT 10: Ecology": [
            "Organisms & Populations (Interactions).",
            "Ecosystem (Energy flow, Pyramids).",
            "Biodiversity & Conservation.",
            "High-Yield: Population interactions, Conservation examples."
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

# Model Selector (Auto-fix 404)
def get_valid_model():
    try:
        available = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        if "models/gemini-1.5-flash" in available: return "models/gemini-1.5-flash"
        if "models/gemini-pro" in available: return "models/gemini-pro"
        return available[0] if available else None
    except:
        return "models/gemini-pro"

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