import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# ==========================================
# 1. PAGE & UI CONFIGURATION
# ==========================================
st.set_page_config(page_title="NEET Sarathi: NTA Secret Panel", page_icon="🩺", layout="centered")

st.title("🩺 NEET Sarathi: Dr. Sharma & Director Pradeep")
st.markdown("### `Head of NTA Secret Panel` | Deepthink Engine Active 🧠")
st.caption("Powered by Gemini 1.5 Flash & Firebase Memory")

# ==========================================
# 2. SIDEBAR & CONNECTION STATUS
# ==========================================
with st.sidebar:
    st.header("⚙️ Examiner Controls")
    if st.button("🗑️ Reset Interview"):
        st.session_state.messages = []
        st.rerun()
    st.markdown("---")
    st.success("✅ Deepthink Engine: ACTIVATED")
    
# ==========================================
# 3. SECURE CONNECTIONS (Using Secrets)
# ==========================================

# A. Gemini Connection
try:
    if "GOOGLE_API_KEY" in st.secrets:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    else:
        st.error("⚠️ Google API Key missing in Secrets!")
except Exception as e:
    st.error(f"Error configuring Gemini: {e}")

# B. Firebase Connection
# Check karte hain agar firebase pehle se connected to nahi
if not firebase_admin._apps:
    try:
        # Streamlit me hum file path nahi, secrets se JSON text padhte hain
        key_dict = json.loads(st.secrets["FIREBASE_KEY"])
        cred = credentials.Certificate(key_dict)
        firebase_admin.initialize_app(cred)
        st.sidebar.success("✅ Memory Database: CONNECTED")
    except Exception as e:
        st.sidebar.error(f"❌ Firebase Error: {e}")

db = firestore.client()

# ==========================================
# 4. LOGIC FUNCTIONS (Brain Parts)
# ==========================================

def log_mistake_to_db(mistake_text):
    """Galti ko database mein save karega"""
    try:
        db.collection("mistakes").add({
            "mistake": mistake_text,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return "✅ Note kar liya bhai (Database Updated)!"
    except Exception as e:
        return f"❌ Error saving: {e}"

def get_past_mistakes():
    """Purani galtiyan wapas layega"""
    try:
        docs = db.collection("mistakes").stream()
        mistakes = [f"- {d.to_dict().get('mistake')}" for d in docs]
        return "\n".join(mistakes) if mistakes else "Koi purani galti record nahi mili."
    except Exception as e:
        return f"Error reading DB: {e}"

def detect_preferred_language(text):
    """Detects if user is using Hindi words"""
    hindi_keywords = ['hai', 'ho', 'ka', 'ki', 'mein', 'se', 'ko', 'na', 'kya', 'bhai', 'batao', 'samjhao', 'karein']
    words = text.lower().split()
    if any(word in hindi_keywords for word in words):
        return "Hinglish (70% Hindi + 30% English)"
    return "English (Professional Medical Tone)"

# ==========================================
# 5. THE SYSTEM PROMPT (Dr. Sharma Persona)
# ==========================================

FINAL_BOT_ROLE = """
You are 'NEET Sarathi' - Anuj's 24/7 AI Mentor & Strategic Coach.
Simultaneously, you possess the mind of 'Dr. Sharma' (Former NEET Paper Setter, 25+ Yrs Exp) & 'Director Pradeep' (NTA Head).

## 🧠 CORE INTELLIGENCE (The Deepthink Engine):
You must synthesize answers using these layers before replying:
1. **Layer 1 (Direct Data):** Past 15 Years NEET/AIPMT Papers.
2. **Layer 2 (Deep History):** Past 50 Years Medical Entrance trends.
3. **Layer 3 (Global Patterns):** Trends from millions of students, reference books, and global exams.
4. **Reasoning:** Never rote learn. Always connect dots (Bio -> Chem -> Physics).

## 🎯 YOUR DUAL IDENTITY:
1. **The Coach (Sarathi):** Supportive, motivates, manages stress, tracks plans.
2. **The Examiner (Dr. Sharma):** Sets traps, asks tricky questions, reveals how paper setters think.

## ⚙️ MODES (Switch Automatically):
1. **GUIDANCE MODE:** If Anuj is stressed, be a supportive friend.
2. **EXAMINER MODE (Quiz):** If asked to quiz, use the "Examiner's Playbook":
   - **Level 1:** NCERT Lines (Filter 30% students).
   - **Level 2:** Concept Mixing (Filter 50% students).
   - **Level 3:** Selection Quality (Top 20% students).
3. **MISTAKE LOG:** Handle '/log' and 'Revise mistakes' commands rigidly.
4. **RAPID FIRE:** Ask 20 questions back-to-back. High speed.
5. **PREDICTIVE ENGINE:** Predict questions based on "Statistical Hotspots" & "Future Trends".
6. **ROLEPLAY:** "Act like [Topic]" -> Become that topic in First Person (e.g., "I am DNA...").

## ⚠️ THE EXAMINER'S BLUEPRINT (Confidential):
Focus on these high-weightage areas:
- **Bio:** Human Phys (45-50 marks), Genetics (40-45), Reproduction (35-40).
- **Chem:** Organic Named Rxns, Biomolecules, Equilibrium.
- **Physics:** Mechanics, Electrostatics, Optics.

## 🛡️ TRAP DETECTION (Teach Anuj to avoid these):
1. **"Almost Right":** Options that look correct but change one word.
2. **"Too Specific":** Correct fact, wrong context.
3. **"Diagram Deception":** Modified NCERT diagrams.

## 📝 RESPONSE TEMPLATE (For Concepts):
1. **Examiner's View:** "Main is topic se kya puchunga..."
2. **Concept Explanation:** Clear Hinglish.
3. **Common Traps:** "60% students yahan galti karte hain..."
4. **Practice Question:** Give 1 Level 2 or Level 3 question.
5. **Memory Hack:** Mnemonic or Trick.

## 🗣️ LANGUAGE & TONE:
- Use **Smart Hinglish** (Technical terms in English, logic in Hindi).
- Use Emojis: 🧬, 🩺, 💊, ⚡.
- Always end with an ACTIONABLE step.
"""

# ==========================================
# 6. CHAT INTERFACE & LOOP
# ==========================================

# Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display Old Messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# User Input Handling
prompt = st.chat_input("Ask Dr. Sharma (e.g., /log, Quiz me, Act like DNA)...")

if prompt:
    # 1. Show User Message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 2. Logic Processing
    response_text = ""
    
    # Model Init
    model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=FINAL_BOT_ROLE)

    # --- SPECIAL COMMANDS ---
    if prompt.startswith("/log"):
        msg = prompt.replace("/log", "").strip()
        if msg:
            status = log_mistake_to_db(msg)
            # AI Context for Confirmation
            ai_prompt = f"[SYSTEM: User logged a mistake: '{msg}'. Confirm save & motivate briefly.]"
            response = model.generate_content(ai_prompt)
            response_text = f"**[System]:** {status}\n\n{response.text}"
        else:
            response_text = "⚠️ Galti log karne ke liye '/log' ke baad text likhein."
            
    elif "revise mistake" in prompt.lower():
        past_data = get_past_mistakes()
        ai_prompt = f"[SYSTEM: Here are past mistakes from DB:\n{past_data}\n. Quiz Anuj based on these traps. Be strict.]"
        response = model.generate_content(ai_prompt)
        response_text = response.text
        
    else:
        # --- NORMAL CHAT + LANGUAGE DETECTION ---
        lang_mode = detect_preferred_language(prompt)
        
        # Hidden Context Injection
        context_input = f"{prompt} \n\n[SYSTEM INSTRUCTION: User prefers tone: {lang_mode}. Apply 'Dr. Sharma' Examiner persona.]"
        
        # Chat History Context
        history_for_ai = [{"role": m["role"], "parts": [m["content"]]} for m in st.session_state.messages]
        
        # Start Chat
        chat = model.start_chat(history=history_for_ai)
        response = chat.send_message(context_input)
        response_text = response.text

    # 3. Show AI Response
    with st.chat_message("assistant"):
        st.markdown(response_text)
    
    st.session_state.messages.append({"role": "assistant", "content": response_text})
