import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# 1. PAGE SETUP
st.set_page_config(page_title="NEET Sarathi AI", page_icon="🩺", layout="centered")
st.title("🩺 NEET Sarathi: Dr. Sharma Edition")

# 2. CONNECTIONS
# Gemini Setup
try:
    if "GOOGLE_API_KEY" in st.secrets:
        genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
    else:
        st.error("⚠️ Google API Key missing!")
        st.stop()
except Exception as e:
    st.error(f"Error configuring API: {e}")

# Firebase Setup
db = None
if not firebase_admin._apps:
    try:
        if "FIREBASE_KEY" in st.secrets:
            raw_key = st.secrets["FIREBASE_KEY"].replace("“", '"').replace("”", '"')
            key_dict = json.loads(raw_key, strict=False)
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
    except Exception as e:
        st.sidebar.error(f"Database Error: {e}")

if firebase_admin._apps:
    db = firestore.client()

# --- 🧠 SMART MODEL SELECTOR (THE FIX) ---
def get_valid_model():
    """Google se puchho ki kaunsa model available hai"""
    try:
        # Available models ki list nikalo
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
        
        # Debugging ke liye sidebar me dikhao (Taaki humein pata chale)
        st.sidebar.code(f"Found: {len(available_models)} Models")
        
        # Priority wise select karo
        if "models/gemini-1.5-flash" in available_models:
            return "models/gemini-1.5-flash"
        elif "models/gemini-1.5-pro" in available_models:
            return "models/gemini-1.5-pro"
        elif "models/gemini-pro" in available_models:
            return "models/gemini-pro"
        elif len(available_models) > 0:
            return available_models[0] # Jo bhi pehla mile lelo
        else:
            return None
    except Exception as e:
        st.sidebar.error(f"Listing Error: {e}")
        return "gemini-1.5-flash" # Fallback

# Valid Model dhundo
MODEL_NAME = get_valid_model()
st.sidebar.success(f"🤖 Connected to: {MODEL_NAME}")

if not MODEL_NAME:
    st.error("❌ No working Gemini model found for your API Key. Check Google AI Studio.")
    st.stop()

# 3. HELPER FUNCTIONS
def log_mistake_to_db(mistake_text):
    if db is None: return "⚠️ DB disconnected."
    try:
        db.collection("mistakes").add({
            "mistake": mistake_text,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        return "✅ Note kar liya bhai!"
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

# 4. SYSTEM PROMPT
FINAL_BOT_ROLE = """
You are 'NEET Sarathi' & 'Dr. Sharma' (NTA Head).
MISSION: Help Anuj crack NEET.
MODES: Guidance, Quiz (NCERT based), Mistake Log, Revision.
TONE: Hinglish. Use Emojis 🧬🩺.
"""

# 5. CHAT LOOP
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "user", "content": f"[SYSTEM]: {FINAL_BOT_ROLE}"},
        {"role": "model", "content": "Hello Anuj! Dr. Sharma here."}
    ]

for i, message in enumerate(st.session_state.messages):
    if i >= 2:
        role = "user" if message["role"] == "user" else "assistant"
        with st.chat_message(role):
            st.markdown(message["content"])

prompt = st.chat_input("Ask Dr. Sharma...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    try:
        # Use the AUTO-DETECTED model name
        model = genai.GenerativeModel(MODEL_NAME)
        
        history = []
        for m in st.session_state.messages:
            role = "user" if m["role"] == "user" else "model"
            history.append({"role": role, "parts": [m["content"]]})

        chat = model.start_chat(history=history)
        
        response_text = ""
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
            response = chat.send_message(prompt)
            response_text = response.text

        with st.chat_message("assistant"):
            st.markdown(response_text)
        st.session_state.messages.append({"role": "model", "content": response_text})

    except Exception as e:
        st.error(f"⚠️ Error: {e}")
