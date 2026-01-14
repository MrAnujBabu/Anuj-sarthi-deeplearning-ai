import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# ==========================================
# 1. PAGE CONFIGURATION
# ==========================================
st.set_page_config(page_title="NEET Sarathi: NTA Secret Panel", page_icon="🩺", layout="centered")

st.title("🩺 NEET Sarathi: Dr. Sharma Edition")
st.markdown("### `Head of NTA Secret Panel` | Deepthink Engine Active 🧠")

# ==========================================
# 2. SECURE CONNECTION (Safety Mode 🛡️)
# ==========================================

# A. Gemini Connection
try:
    if "GOOGLE_API_KEY" in st.secrets:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    else:
        st.error("⚠️ Google API Key missing! Please check Streamlit Secrets.")
        st.stop()
except Exception as e:
    st.error(f"Error configuring Gemini: {e}")

# B. Firebase Connection (Crash Proof Logic)
db = None  # Default state empty rakhenge

# Check karte hain ki kya Firebase pehle se connected hai?
if not firebase_admin._apps:
    try:
        if "FIREBASE_KEY" in st.secrets:
            # Secrets se JSON text padhkar use Dictionary banayenge
            key_dict = json.loads(st.secrets["FIREBASE_KEY"])
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
            st.sidebar.success("✅ Memory Database: CONNECTED")
        else:
            st.sidebar.warning("⚠️ Firebase Key not found. Memory disabled.")
    except Exception as e:
        st.error(f"❌ Firebase Error: {e}")
        st.stop()  # Agar key galat hai toh yahi ruk jao

# Agar connection safal raha, tabhi Client banao
if firebase_admin._apps:
    db = firestore.client()

# ==========================================
# 3. LOGIC FUNCTIONS
# ==========================================

def log_mistake_to_db(mistake_text):
    if db is None: 
        return "⚠️ Database not connected. Check Secrets."
    try:
        db.collection("mistakes").add({
            "mistake": mistake_text,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return "✅ Note kar liya bhai (Database Updated)!"
    except Exception as e:
        return f"❌ Error saving: {e}"

def get_past_mistakes():
    if db is None: 
        return "⚠️ Database not connected."
    try:
        docs = db.collection("mistakes").stream()
        mistakes = [f"- {d.to_dict().get('mistake')}" for d in docs]
        return "\n".join(mistakes) if mistakes else "Koi purani galti record nahi mili."
    except Exception as e:
        return f"Error reading DB: {e}"

def detect_preferred_language(text):
    hindi_keywords = ['hai', 'ho', 'ka', 'ki', 'mein', 'se', 'ko', 'na', 'kya', 'bhai', 'batao', 'samjhao']
    words = text.lower().split()
    if any(word in hindi_keywords for word in words):
        return "Hinglish (70% Hindi + 30% English)"
    return "English (Professional Medical Tone)"

# ==========================================
# 4. SYSTEM PROMPT
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

## 🗣️ LANGUAGE & TONE:
- Use **Smart Hinglish** (Technical terms in English, logic in Hindi).
- Use Emojis: 🧬, 🩺, 💊, ⚡.
- Always end with an ACTIONABLE step.
"""

# ==========================================
# 5. CHAT LOOP
# ==========================================

# Sidebar Reset
if st.sidebar.button("🗑️ Reset Interview"):
    st.session_state.messages = []
    st.rerun()

if "messages" not in st.session_state:
    st.session_state.messages = []

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

prompt = st.chat_input("Ask Dr. Sharma (e.g., /log, Quiz me)...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Brain Initialization
    model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=FINAL_BOT_ROLE)
    response_text = ""

    # Special Commands
    if prompt.startswith("/log"):
        msg = prompt.replace("/log", "").strip()
        status = log_mistake_to_db(msg)
        # AI se confirmation message
        ai_prompt = f"[SYSTEM: User logged: '{msg}'. Confirm save & motivate.]"
        response = model.generate_content(ai_prompt)
        response_text = f"**[System]:** {status}\n\n{response.text}"
            
    elif "revise mistake" in prompt.lower():
        past_data = get_past_mistakes()
        ai_prompt = f"[SYSTEM: Past mistakes:\n{past_data}\n. Quiz Anuj strictly based on these.]"
        response = model.generate_content(ai_prompt)
        response_text = response.text
        
    else:
        # Normal Chat
        lang_mode = detect_preferred_language(prompt)
        context_input = f"{prompt} \n\n[SYSTEM INSTRUCTION: User prefers: {lang_mode}. Apply 'Dr. Sharma' persona.]"
        
        history_for_ai = [{"role": m["role"], "parts": [m["content"]]} for m in st.session_state.messages]
        chat = model.start_chat(history=history_for_ai)
        response = chat.send_message(context_input)
        response_text = response.text

    # Show Response
    with st.chat_message("assistant"):
        st.markdown(response_text)
    
    st.session_state.messages.append({"role": "assistant", "content": response_text})
