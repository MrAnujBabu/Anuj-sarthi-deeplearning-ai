import streamlit as st
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, firestore
import json
import urllib.parse # Obsidian Link Creator

# ==========================================
# 1. PAGE SETUP
# ==========================================
st.set_page_config(page_title="NEET Sarathi AI", page_icon="🩺", layout="centered")
st.title("🩺 NEET Sarathi: Dr. Sharma Edition")
st.markdown("### `Head of NTA Secret Panel` | Deepthink Engine Active 🧠")

# ==========================================
# 2. SMART CONNECTIONS
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
# 3. HELPER FUNCTIONS
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

def detect_language(text):
    hindi_keywords = ['hai', 'ho', 'ka', 'ki', 'mein', 'se', 'ko', 'na', 'kya', 'samjhao']
    return "Hinglish" if any(w in text.lower() for w in hindi_keywords) else "English"

# --- 💜 OBSIDIAN LINK GENERATOR ---
def get_obsidian_link(title, content, vault_name):
    """
    Creates a direct link to open Obsidian and save the note.
    """
    encoded_title = urllib.parse.quote(title.strip())
    encoded_content = urllib.parse.quote(content.strip())
    return f"obsidian://new?vault={vault_name}&name={encoded_title}&content={encoded_content}"

# ==========================================
# 4. SIDEBAR SETTINGS
# ==========================================
with st.sidebar:
    st.header("💜 Obsidian Setup")
    vault_name = st.text_input("Vault Name:", value="Vault", help="Apne Obsidian Vault ka naam yahan likhein.")
    
    if st.button("🗑️ Reset Chat"):
        st.session_state.messages = []
        st.rerun()

# ==========================================
# 5. THE ULTIMATE SYSTEM PROMPT (FULL DEEPTHINK) 🧠
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
# 6. CHAT LOOP & DISPLAY
# ==========================================

# Initialize
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "user", "content": f"[SYSTEM_HIDDEN]: {FINAL_BOT_ROLE}"},
        {"role": "model", "content": "Hello Anuj! Dr. Sharma here. Deepthink Engine Activated. 🧠"}
    ]

# Display Loop (Buttons are inside here so they persist)
for i, msg in enumerate(st.session_state.messages):
    if i < 2: continue 
    
    role = "user" if msg["role"] == "user" else "assistant"
    
    with st.chat_message(role):
        st.markdown(msg["content"])
        
        # --- NEW ACTION BAR ---
        if role == "assistant":
            st.markdown("---")
            # 3 Columns for Buttons
            c1, c2, c3 = st.columns([1, 1, 1.5])
            
            # 1. DOWNLOAD BUTTON (Existing)
            with c1:
                st.download_button(
                    label="📥 Download",
                    data=msg["content"],
                    file_name=f"Dr_Sharma_Note_{i}.md",
                    mime="text/markdown",
                    key=f"dl_{i}"
                )

            # 2. COPY AS MARKDOWN (New)
            with c2:
                # Popover opens raw code to copy
                with st.popover("📋 Copy MD"):
                    st.code(msg["content"], language="markdown")

            # 3. SHARE TO OBSIDIAN (Updated)
            with c3:
                # URL Limits check (Browser limit is around 2000 chars)
                if len(msg["content"]) < 2000:
                    note_title = f"NEET_Note_{i}"
                    obsidian_url = get_obsidian_link(note_title, msg["content"], vault_name)
                    
                    link_html = f'''
                    <a href="{obsidian_url}" target="_blank" style="text-decoration:none;">
                        <button style="
                            background-color: #7c3aed; 
                            color: white; 
                            border: none; 
                            padding: 6px 10px; 
                            border-radius: 4px; 
                            cursor: pointer;
                            font-size: 14px;">
                            💜 Share to Obsidian
                        </button>
                    </a>
                    '''
                    st.markdown(link_html, unsafe_allow_html=True)
                else:
                    # Agar note bahut lamba hai to button disable karke info denge
                    st.caption("⚠️ Note too long for direct share. Use 'Copy MD' & paste in Obsidian.")

# ==========================================
# 7. INPUT HANDLING
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
        history.append({"role": "user", "parts": [FINAL_BOT_ROLE]})
        history.append({"role": "model", "parts": ["Understood. I am Dr. Sharma."]})
        
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

        # Save & Rerun to show buttons
        st.session_state.messages.append({"role": "model", "content": response_text})
        st.rerun()

    except Exception as e:
        st.error(f"⚠️ Error: {e}")
