import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
import time

# ==========================================
# 1. PAGE CONFIGURATION
# ==========================================
st.set_page_config(page_title="NEET Sarathi: NTA Secret Panel", page_icon="🩺", layout="centered")

st.title("🩺 NEET Sarathi: Dr. Sharma Edition")
st.markdown("### `Head of NTA Secret Panel` | Deepthink Engine Active 🧠")

# ==========================================
# 2. SECURE CONNECTION
# ==========================================

# A. Gemini Connection
try:
    if "GOOGLE_API_KEY" in st.secrets:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    else:
        st.error("⚠️ Google API Key missing!")
        st.stop()
except Exception as e:
    st.error(f"Error configuring Gemini: {e}")

# B. Firebase Connection
db = None 
if not firebase_admin._apps:
    try:
        if "FIREBASE_KEY" in st.secrets:
            raw_key = st.secrets["FIREBASE_KEY"]
            raw_key = raw_key.replace("“", '"').replace("”", '"')
            key_dict = json.loads(raw_key, strict=False)
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
            st.sidebar.success("✅ Memory Database: CONNECTED")
        else:
            st.sidebar.warning("⚠️ Firebase Key not found.")
    except Exception as e:
        st.sidebar.error(f"⚠️ Database Error: {e}")
        
if firebase_admin._apps:
    db = firestore.client()

# ==========================================
# 3. LOGIC FUNCTIONS
# ==========================================

def log_mistake_to_db(mistake_text):
    if db is None: return "⚠️ Database disconnected."
    try:
        db.collection("mistakes").add({
            "mistake": mistake_text,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return "✅ Note kar liya bhai (Database Updated)!"
    except Exception as e:
        return f"❌ Error saving: {e}"

def get_past_mistakes():
    if db is None: return "⚠️ Database disconnected."
    try:
        docs = db.collection("mistakes").stream()
        mistakes = [f"- {d.to_dict().get('mistake')}" for d in docs]
        return "\n".join(mistakes) if mistakes else "Koi purani galti record nahi mili."
    except Exception as e:
        return f"Error reading DB: {e}"

def detect_language(text):
    hindi_keywords = ['hai', 'ho', 'ka', 'ki', 'mein', 'se', 'ko', 'na', 'kya']
    return "Hinglish" if any(w in text.lower() for w in hindi_keywords) else "English"

# ==========================================
# 4. SYSTEM PROMPT (One-Time Load)
# ==========================================
FINAL_BOT_ROLE = """
You are 'NEET Sarathi' & 'Dr. Sharma' (NTA Head).
MISSION: Help Anuj crack NEET.
MODES:
1. GUIDANCE: Supportive friend.
2. EXAMINER: Tricky questions (NCERT based).
3. MISTAKE LOG: Confirm saves briefly.
4. REVISION: Quiz based on past mistakes.
TONE: Hinglish. Use Emojis 🧬🩺.
"""

# ==========================================
# 5. CHAT LOOP (Optimized)
# ==========================================

if st.sidebar.button("🗑️ Reset Interview"):
    st.session_state.messages = []
    st.rerun()

# Initialize Chat with System Prompt (Only once)
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "user", "content": f"[SYSTEM_INSTRUCTION]: {FINAL_BOT_ROLE}"},
        {"role": "model", "content": "Hello Anuj! Dr. Sharma here. Ready to guide you."}
    ]

# Display Messages (Hide System Prompt)
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

    # 2. Model Setup (With Retry Logic)
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
    except:
        model = genai.GenerativeModel("gemini-pro")

    # 3. Create Chat Object from History
    # (Yeh sabse important hai - Hum purani history use karenge context ke liye)
    gemini_history = []
    for m in st.session_state.messages:
        role = "user" if m["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [m["content"]]})
    
    chat = model.start_chat(history=gemini_history)
    
    response_text = ""

    # 4. Logic Handling
    try:
        if prompt.startswith("/log"):
            msg = prompt.replace("/log", "").strip()
            status = log_mistake_to_db(msg)
            # Simple prompt sends less data = No Timeout
            response = chat.send_message(f"User logged: '{msg}'. Just confirm with '{status}' and give 1 line motivation.")
            response_text = response.text
            
        elif "revise mistake" in prompt.lower():
            past_data = get_past_mistakes()
            response = chat.send_message(f"Past mistakes:\n{past_data}\n. Ask a tricky question based on this.")
            response_text = response.text
            
        else:
            # Normal Chat
            lang = detect_language(prompt)
            response = chat.send_message(f"{prompt} (Reply in {lang} as Dr. Sharma)")
            response_text = response.text

    except Exception as e:
        response_text = f"⚠️ Network Error: {e}. Please try again."

    # 5. Show Response
    with st.chat_message("assistant"):
        st.markdown(response_text)
    
    st.session_state.messages.append({"role": "model", "content": response_text})
