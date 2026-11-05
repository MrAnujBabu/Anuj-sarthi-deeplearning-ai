# Bache hue kaam ka plan

## 1. Admin account (aapki permission chahiye)
- anujkumar75yadav@gmail.com ka account banana; admin role apne aap mil jayega.
- Password aap khud set karenge (reset email se).
- Check: Admin page par sign in karke memory/settings khulna.

## 2. NCERT Deep Scan theek karna
- Class 11 Ch 1: check saari lines reject kar raha hai — dekhna ki check bahut sakht hai ya nikala hua text galat hai; sahi lines pass ho, galat text save na ho.
- Class 12 Ch 3: NCERT page dhoondhne ka tareeka sudharna (chapter naam/number se behtar search, fallback).
- Check: dono chapters ka scan chala kar dekhna ki sahi lines save hoti hain.

## 3. Sarvam awaaz
- Aap ready hon to connect card kholna, ya aapki apni key secure form se lena.
- Tab tak: Sarvam na jude hone par app chupchaap Lovable ki voice par chale, 503 error na dikhe.

## 4. Google Sheets (optional)
- Admin import ke liye — chahiye to connect card kholna.

## 5. Purana data
- 84 chapter outlines aur settings: purane project se backup file milne par Admin page ke restore se daalna.

## 6. Aakhri jaanch
- Saare automatic checks + end-to-end test, phir GitHub main par push.

## Technical notes
- Sarvam fallback: src/routes/api/sarvam-speech.ts 503 ko client side par Lovable TTS fallback trigger banana.
- NCERT: src/lib/ncert-scan.server.ts verification threshold aur source discovery.
