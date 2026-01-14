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
# 2. SECURE CONNECTION (Fixed & Safe 🛡️)
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

# B. Firebase Connection (Smart Fix Logic)
db = None 
if not firebase_admin._apps:
    try:
        if "FIREBASE_KEY" in st.secrets:
            # Smart fix for mobile quotes & hidden characters
            raw_key = st.secrets["FIREBASE_KEY"]
            raw_key = raw_key.replace("“", '"').replace("”", '"')
            key_dict = json.loads(raw_key, strict=False)
            
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
            st.sidebar.success("✅ Memory Database: CONNECTED")
        else:
            st.sidebar.warning("⚠️ Firebase Key not found. Memory disabled.")
    except Exception as e:
        st.sidebar.error(f"⚠️ Memory Error (Chat still works): {e}")
        
if firebase_admin._apps:
    db = firestore.client()

# ==========================================
# 3. LOGIC FUNCTIONS
# ==========================================

def log_mistake_to_db(mistake_text):
    if db is None: return "⚠️ Database not connected."
    try:
        db.collection("mistakes").add({
            "mistake": mistake_text,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return "✅ Note kar liya bhai (Database Updated)!"
    except Exception as e:
        return f"❌ Error saving: {e}"

def get_past_mistakes():
    if db is None: return "⚠️ Database not connected."
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
# 4. SYSTEM PROMPT (The Brain)
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
# 5. CHAT LOOP (Universal Fix Version)
# ==========================================

# Sidebar Reset
if st.sidebar.button("🗑️ Reset Interview"):
    st.session_state.messages = []
    st.rerun()

# Initialize Chat History with System Prompt (Best Practice for Compatibility)
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "user", "content": f"[SYSTEM INSTRUCTION (HIDDEN)]: {FINAL_BOT_ROLE}"},
        {"role": "model", "content": "Understood. I am ready as Dr. Sharma and NEET Sarathi. How can I help Anuj today?"}
    ]

# Display Old Messages (Hide System Prompt from UI)
for i, message in enumerate(st.session_state.messages):
    if i >= 2: # Skip first 2 system hidden messages
        role = "user" if message["role"] == "user" else "assistant"
        with st.chat_message(role):
            st.markdown(message["content"])

prompt = st.chat_input("Ask Dr. Sharma (e.g., /log, Quiz me)...")

if prompt:
    # 1. User Message Show
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 2. Model Initialization (Using gemini-pro as fallback if flash fails)
    # Note: We don't pass system_instruction here to avoid compatibility errors. 
    # It is already in the history.
    try:
        model = genai.GenerativeModel("gemini-1.5-flash") 
    except:
        model = genai.GenerativeModel("gemini-pro")

    response_text = ""

    # 3. Special Commands
    if prompt.startswith("/log"):
        msg = prompt.replace("/log", "").strip()
        status = log_mistake_to_db(msg)
        
        # Manually create context for AI
        full_context = f"{FINAL_BOT_ROLE}\n\n[SYSTEM: User logged a mistake: '{msg}'. Database Status: {status}. Confirm save & motivate briefly.]"
        try:
            response = model.generate_content(full_context)
            response_text = f"**[System]:** {status}\n\n{response.text}"
        except Exception as e:
            response_text = f"**[System]:** {status}\n\n(AI Motivation temporarily unavailable due to network)"
            
    elif "revise mistake" in prompt.lower():
        past_data = get_past_mistakes()
        full_context = f"{FINAL_BOT_ROLE}\n\n[SYSTEM: Here are past mistakes from DB:\n{past_data}\n. Quiz Anuj strictly based on these.]"
        response = model.generate_content(full_context)
        response_text = response.text
        
    else:
        # Normal Chat
        lang_mode = detect_preferred_language(prompt)
        # Prepare history for Gemini (Needs mapped roles)
        gemini_history = []
        for m in st.session_state.messages:
            role = "user" if m["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [m["content"]]})
            
        chat = model.start_chat(history=gemini_history)
        
        # Add hidden context to the prompt
        hidden_instruction = f" [Instruction: User prefers {lang_mode}. Apply Dr. Sharma persona.]"
        response = chat.send_message(prompt + hidden_instruction)
        response_text = response.text

    # 4. Show Response
    with st.chat_message("assistant"):
        st.markdown(response_text)
    
    st.session_state.messages.append({"role": "model", "content": response_text})
