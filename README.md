Here is the **Professional `README.md` file** for your GitHub repository.

This is written in a mix of **English (for technical professionalism)** and **Hinglish (for storytelling and connection)**, exactly as you requested. It documents not just *what* the code is, but *how* it was built, the struggles faced, and the future vision for **Naveen Bharat**.

---

# 🩺 NEET Sarathi: Dr. Sharma Edition (AI Mentor)

**`Head of NTA Secret Panel` | Deepthink Engine Active 🧠 | Powered by Gemini & Firebase**

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://anujsarthiai.streamlit.app/)
*(Click above to Open Live App)*

---

## 📖 About The Project (परिचय)

**NEET Sarathi** is not just a chatbot; it is a **Personalized Cognitive Augmentation Tool** for medical aspirants.
Yeh project ek ordinary student ki problem solve karne ke liye banaya gaya hai: *"Padhte sab hain, par apni galtiyan yaad kaun rakhta hai?"*

Isme humne **Google Gemini (The Brain)** ko **Firebase Firestore (The Memory)** ke saath joda hai. Result? Ek aisa AI Mentor ("Dr. Sharma") jo na sirf Biology/Physics padhata hai, balki aapki purani galtiyon ko yaad rakhkar aapko sudharta bhi hai.

### 🌟 Key Features (खासियतें)
1.  ** Deepthink Engine:** Uses a multi-layered reasoning approach (Layer 1: Past Papers, Layer 2: NCERT Deep Dive, Layer 3: Trap Detection).
2.  **💾 Permanent Memory (Firebase):** Stores user mistakes (`/log`) permanently. Even if you refresh, Dr. Sharma remembers your weak points.
3.  **🛡️ Smart Model Selector:** Automatically detects available Gemini models (`gemini-pro` vs `flash`) to prevent 404/Crash errors.
4.  **💜 Obsidian Integration:** One-click integration to save notes directly into your local Obsidian Vault using URI Schemes (No cloud clutter).
5.  **👔 Professional UI:** Action bars with Copy & Download options that persist even after chat updates.

---

## 🛠️ Tech Stack & Architecture

*   **Frontend:** [Streamlit](https://streamlit.io/) (Python based UI).
*   **AI Model:** Google Gemini API (`gemini-pro` / `gemini-1.5-flash`).
*   **Database:** Firebase Firestore (NoSQL Cloud Database).
*   **Logic:** Python 3.x.
*   **Hosting:** Streamlit Cloud.

---

## 🧗‍♂️ The Prompt Engineering Journey (Challenges & Solutions)

Yeh project banana aasan nahi tha. Mobile se coding karte waqt humein kai technical challenges aaye. Future developers ke liye yahan hamara **Analysis & Resolution** log hai:

### 1. The "Amnesia" Problem (Bhulakkad AI)
*   **Problem:** Streamlit refresh hote hi chat ud jati thi.
*   **Resolution:** Humne **Firebase Firestore** integrate kiya. Lekin, humne poori chat save nahi ki (to save cost/storage). Humne sirf **"Mistakes"** ko DB me dala aur Chat History ko Session State + Local Cache se handle kiya.

### 2. The "404 Model Not Found" Nightmare
*   **Problem:** Code `gemini-1.5-flash` mang raha tha, par server purani library use kar raha tha.
*   **Resolution:**
    1.  `requirements.txt` me version lock kiya: `google-generativeai>=0.8.3`.
    2.  Ek smart function `get_valid_model()` banaya jo Google se puchta hai *"Kaunsa model zinda hai?"* aur wahi connect karta hai.

### 3. The "Disappearing Buttons" Glitch
*   **Problem:** Chat aage badhte hi Copy/Save buttons gayab ho jate the.
*   **Resolution:** Humne buttons ko `if` condition se nikal kar **Display Loop** ke andar daal diya. Ab `st.rerun()` hone par bhi buttons wapas render hote hain.

### 4. JSON Formatting on Mobile
*   **Problem:** Phone se API Keys copy karne par Smart Quotes (`“`) aa jate the, jisse app crash hota tha.
*   **Resolution:** Added a sanitizer: `.replace("“", '"')` before parsing JSON.

---

## 🚀 Installation & Local Setup

Agar aap isse apne laptop par run karna chahte hain:

1.  **Clone the Repo:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/Anuj-sarthi-deeplearning-ai.git
    cd Anuj-sarthi-deeplearning-ai
    ```

2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Setup Secrets (`.streamlit/secrets.toml`):**
    Create a file named `secrets.toml` inside a `.streamlit` folder and add your keys:
    ```toml
    GOOGLE_API_KEY = "YOUR_GEMINI_API_KEY"
    FIREBASE_KEY = """
    {
      "type": "service_account",
      "project_id": "...",
      ... (Your Firebase JSON content here)
    }
    """
    ```

4.  **Run App:**
    ```bash
    streamlit run app.py
    ```

---

## 🔮 Future Vision: Naveen Bharat Platform 🇮🇳

Yeh project sirf shuruwat hai. Hamara lakshya (Goal) bada hai:

1.  **📘 Amazon KDP Book:**
    *   Hum jald hi ek book launch karenge: *"Build Your Own AI Tutor on Mobile"* logic par.
    *   Isme hum ye sikhaenge ki kaise bina heavy coding background ke, Logic aur AI ke dam par problems solve ki jati hain.

2.  **🎓 Offline Course Integration:**
    *   **Naveen Bharat** platform ke under hum students ko "Ratta Maarna" nahi, balki "AI Tools Banana" sikhaenge.
    *   Students will learn **Prompt Engineering** and **Logic Building** to create their own subject-specific bots.

3.  **Next Tech Upgrade:**
    *   Voice Interaction (Baat karne wala Dr. Sharma).
    *   Image Analysis (Question ki photo khinch kar solution).

---

## 🤝 Contributing

Contributions are welcome! Agar aapke paas naye "Traps" ya "Deepthink Layers" ke ideas hain, to Pull Request bhejein.

**Developed with ❤️ & Logic by Anuj**
*Targeting Creating System with Infinite Intelligence| Building Naveen Bharat* 🇮🇳
