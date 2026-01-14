import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# 1. PAGE SETUP
st.set_page_config(page_title="NEET Sarathi: NTA Secret Panel", page_icon="🩺", layout="centered")
st.title("🩺 NEET Sarathi: Dr. Sharma Edition")
st.markdown("### `Head of NTA Secret Panel` | Deepthink Engine Active 🧠")

# 2. CONNECTIONS
# Gemini Setup
try:
    if "GOOGLE_API_KEY" in st.secrets:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    else:
        st.error("⚠️ Google API Key missing!")
        st.stop()
except Exception as e:
    st.error(f"Error: {e}")

# Firebase Setup
db = None
if not firebase_admin._apps:
    try:
        if "FIREBASE_KEY" in st.secrets:
            # Fix mobile copy-paste quotes
            raw_key = st.secrets["FIREBASE_KEY"].replace("“", '"').replace("”", '"')
            key_dict = json.loads(raw_key, strict=False)
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
            st.sidebar.success("✅ Memory Database: CONNECTED")
        else:
            st.sidebar.warning("⚠️ Firebase Key not found.")
    except Exception as e:
        st.sidebar.error(f"⚠️ DB Error: {e}")

if firebase_admin._apps:
    db = firestore.client()

# 3. HELPER FUNCTIONS
def log_mistake_to_db(mistake_text):
    if db is None: return "⚠️ DB disconnected."
    try:
        db.collection("mistakes").add({
            "mistake": mistake_text,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return "✅ Note kar liya bhai (Saved)!"
    except Exception as e:
        return f"❌ Error: {e}"

def get_past_mistakes():
    if db is None: return "⚠️ DB disconnected."
    try:
        docs = db.collection("mistakes").stream()
        mistakes = [f"- {d.to_dict().get('mistake')}" for d in docs]
        return "\n".join(mistakes) if mistakes else "No mistakes found."
    except Exception as e:
        return f"Error: {e}"

def detect_language(text):
    hindi_keywords = ['hai', 'ho', 'ka', 'ki', 'mein', 'se', 'ko', 'na', 'kya', 'samjhao']
    return "Hinglish" if any(w in text.lower() for w in hindi_keywords) else "English"

# 4. THE ULTIMATE SYSTEM PROMPT (BRAIN) 🧠
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

# 5. CHAT LOOP
if st.sidebar.button("🗑️ Reset"):
    st.session_state.messages = []
    st.rerun()

# History Initialize (With Hidden System Prompt)
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "user", "content": f"[SYSTEM_INSTRUCTION_HIDDEN]: {FINAL_BOT_ROLE}"},
        {"role": "model", "content": "Hello Anuj! Dr. Sharma here. Ready to guide you with Deepthink Logic."}
    ]

# Display Messages (Hide the huge system prompt from UI)
for i, message in enumerate(st.session_state.messages):
    if i >= 2:
        role = "user" if message["role"] == "user" else "assistant"
        with st.chat_message(role):
            st.markdown(message["content"])

prompt = st.chat_input("Ask Dr. Sharma...")

if prompt:
    # 1. User Message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # 2. Model Selection (STRICTLY GEMINI PRO)
    # Humne 'flash' ko hata diya hai kyunki wo 404 error de raha tha.
    # 'gemini-pro' universal hai aur hamesha chalta hai.
    try:
        model = genai.GenerativeModel("gemini-pro")
    except Exception as e:
        st.error(f"Model Init Error: {e}")
        st.stop()

    # 3. Create Chat History
    history = []
    for m in st.session_state.messages:
        role = "user" if m["role"] == "user" else "model"
        history.append({"role": role, "parts": [m["content"]]})

    # 4. Logic & Response
    try:
        chat = model.start_chat(history=history)
        
        response_text = ""
        if prompt.startswith("/log"):
            msg = prompt.replace("/log", "").strip()
            status = log_mistake_to_db(msg)
            # Context for AI
            response = chat.send_message(f"User logged: '{msg}'. Status: {status}. Confirm briefly & motivate.")
            response_text = f"**[System]:** {status}\n\n{response.text}"
            
        elif "revise mistake" in prompt.lower():
            past = get_past_mistakes()
            response = chat.send_message(f"Here are past mistakes:\n{past}\n. Quiz Anuj strictly based on these traps.")
            response_text = response.text
            
        else:
            lang = detect_language(prompt)
            # Add hidden context for tone
            response = chat.send_message(f"{prompt} (Reply in {lang} as Dr. Sharma)")
            response_text = response.text

        # 5. Show Response
        with st.chat_message("assistant"):
            st.markdown(response_text)
        st.session_state.messages.append({"role": "model", "content": response_text})

    except Exception as e:
        st.error(f"⚠️ Network Error: {e}. Please Refresh.")
