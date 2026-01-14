import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# ==========================================
# 1. PAGE SETUP & CONFIGURATION
# ==========================================
st.set_page_config(page_title="NEET Sarathi AI", page_icon="🩺", layout="centered")
st.title("🩺 NEET Sarathi: Dr. Sharma Edition")
st.markdown("### `Head of NTA Secret Panel` | Deepthink Engine Active 🧠")

# ==========================================
# 2. SMART CONNECTIONS (Dynamic & Safe)
# ==========================================

# A. Gemini Setup
try:
    if "GOOGLE_API_KEY" in st.secrets:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    else:
        st.error("⚠️ Google API Key missing!")
        st.stop()
except Exception as e:
    st.error(f"API Error: {e}")

# B. Firebase Setup
db = None
if not firebase_admin._apps:
    try:
        if "FIREBASE_KEY" in st.secrets:
            # Smart fix for mobile quotes
            raw_key = st.secrets["FIREBASE_KEY"].replace("“", '"').replace("”", '"')
            key_dict = json.loads(raw_key, strict=False)
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
            st.sidebar.success("✅ Memory Database: CONNECTED")
    except Exception as e:
        st.sidebar.error(f"DB Error: {e}")

if firebase_admin._apps:
    db = firestore.client()

# C. Smart Model Selector (Prevents 404 Errors)
def get_valid_model():
    try:
        # Check available models dynamically
        available = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        # Priority List: Flash -> Pro -> Any
        if "models/gemini-1.5-flash" in available: return "models/gemini-1.5-flash"
        if "models/gemini-pro" in available: return "models/gemini-pro"
        return available[0] if available else None
    except:
        return "models/gemini-pro" # Fallback

MODEL_NAME = get_valid_model()

# ==========================================
# 3. HELPER FUNCTIONS
# ==========================================
def log_mistake_to_db(text):
    if db is None: return "⚠️ DB disconnected."
    try:
        db.collection("mistakes").add({"mistake": text, "timestamp": firestore.SERVER_TIMESTAMP})
        return "✅ Note kar liya bhai!"
    except Exception as e: return f"❌ Error: {e}"

def get_past_mistakes():
    if db is None: return "⚠️ DB disconnected."
    try:
        docs = db.collection("mistakes").stream()
        mistakes = [f"- {d.to_dict().get('mistake')}" for d in docs]
        return "\n".join(mistakes) if mistakes else "No mistakes found."
    except: return "Error fetching mistakes."

def detect_language(text):
    hindi_keywords = ['hai', 'ho', 'ka', 'ki', 'mein', 'se', 'ko', 'na', 'kya', 'samjhao']
    return "Hinglish" if any(w in text.lower() for w in hindi_keywords) else "English"

# ==========================================
# 4. SYSTEM PROMPT (THE BRAIN)
# ==========================================
FINAL_BOT_ROLE = """
You are 'NEET Sarathi' & 'Dr. Sharma' (NTA Head).
MISSION: Help Anuj crack NEET using Deepthink Logic.
IDENTITY: Strict Examiner + Supportive Mentor.

MODES:
1. GUIDANCE: Handle stress.
2. EXAMINER: Tricky NCERT Questions (Layers 1, 2 & 3).
3. MISTAKE LOG: Save errors strictly.
4. REVISION: Quiz based on past mistakes.

TONE: Hinglish (70% Hindi, 30% English). Use Emojis 🧬🩺.
ALWAYS: End with a counter-question or actionable step.
"""

# ==========================================
# 5. CHAT LOOP & UI
# ==========================================

if st.sidebar.button("🗑️ Reset Chat"):
    st.session_state.messages = []
    st.rerun()

# Initialize Chat
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "user", "content": f"[SYSTEM_HIDDEN]: {FINAL_BOT_ROLE}"},
        {"role": "model", "content": "Hello Anuj! Dr. Sharma here. Ready for Deepthink Analysis."}
    ]

# Display History (Skip System Prompt)
for i, message in enumerate(st.session_state.messages):
    if i >= 2:
        role = "user" if message["role"] == "user" else "assistant"
        with st.chat_message(role):
            st.markdown(message["content"])

# --- MAIN INPUT LOGIC ---
prompt = st.chat_input("Ask Dr. Sharma...")

if prompt:
    # 1. Show User Message
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    try:
        # 2. Init Model (Using Smart Selector)
        model = genai.GenerativeModel(MODEL_NAME)
        
        # 3. Build History
        history = [{"role": ("user" if m["role"]=="user" else "model"), "parts": [m["content"]]} 
                   for m in st.session_state.messages]

        # 4. Generate Response
        chat = model.start_chat(history=history)
        
        response_text = ""
        
        # Logic Handling
        if prompt.startswith("/log"):
            msg = prompt.replace("/log", "").strip()
            status = log_mistake_to_db(msg)
            response = chat.send_message(f"User logged: '{msg}'. Status: {status}. Confirm & Motivate.")
            response_text = f"**[System]:** {status}\n\n{response.text}"
            
        elif "revise mistake" in prompt.lower():
            past = get_past_mistakes()
            response = chat.send_message(f"Past mistakes:\n{past}\n. Quiz strictly on these traps.")
            response_text = response.text
            
        else:
            lang = detect_language(prompt)
            response = chat.send_message(f"{prompt} (Reply in {lang} as Dr. Sharma)")
            response_text = response.text

        # 5. Show Response & PRO ACTION BAR 🛠️
        with st.chat_message("assistant"):
            st.markdown(response_text)
            
            # --- PROFESSIONAL ACTION BAR ---
            st.markdown("---") 
            col1, col2, col3 = st.columns([1, 1, 4]) 
            
            with col1:
                # 📄 COPY BUTTON
                with st.popover("📄 Copy"):
                    st.caption("Top-right corner icon 👇")
                    st.code(response_text, language="markdown")
            
            with col2:
                # 📥 DOWNLOAD BUTTON
                st.download_button(
                    label="📥 Save",
                    data=response_text,
                    file_name="Dr_Sharma_Notes.md",
                    mime="text/markdown",
                    help="Save notes to phone"
                )

        # 6. Save to History
        st.session_state.messages.append({"role": "model", "content": response_text})

    except Exception as e:
        st.error(f"⚠️ Network/Model Error: {e}. Please Refresh.")
