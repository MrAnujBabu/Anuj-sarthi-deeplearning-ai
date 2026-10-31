# YouTube जाँच — 31 अक्टूबर 2026

## निष्कर्ष
पूरी तरह सफल end-to-end प्रमाण अभी नहीं मिला। नई workspace में GitHub API जुड़ा है। कोई reset, disconnect या पुराने GitHub code का overwrite नहीं किया गया।

## वास्तविक लंबी वीडियो
- वीडियो: `Lt54CX9DmS4`, “How to Study for Exams - An Evidence-Based Masterclass”.
- वास्तविक फ़ोन-आकार की जाँच: 451 × 787; 329 timestamped हिस्से मिले। Manual paste नहीं किया गया।
- अंतिम प्रत्यक्ष निगरानी: **48/329 Hindi हिस्से sandbox browser में save थे**। यह पूरे वीडियो का परिणाम नहीं है और न ही उपयोगकर्ता के फ़ोन का saved-data count है।
- Workspace move के बाद अस्थायी screenshots/checkpoint खो गए। वर्तमान durable progress अज्ञात है; 48 हिस्से वापस उपलब्ध होने का दावा नहीं।
- पूर्ण Hindi conversion, 2h49m uninterrupted आवाज़/video playback, download और reload का संयुक्त परीक्षण अधूरा है।

## ठीक किए गए code gaps
1. बदले हुए source/timestamps पर समान-count पुराना Hindi reuse नहीं होगा: normalized source का versioned SHA-256 digest मिलना आवश्यक है।
2. गलत reviewer note अब reviewed counter नहीं बढ़ाता; माँगी गई review का X/Y coverage दिखता है, अधूरी जाँच छिपती नहीं।
3. Matching saved translations को दोबारा translate नहीं किया जाता; review माँगने पर फिर जाँचा जाता है। Browser data को verified review receipt नहीं माना जाता; उस जाँच के credits लग सकते हैं।
4. Latest study/library लिखने के बाद ही recovery checkpoint हटता है; checkpoint writes क्रम से होते हैं और failure दिखता है। Completed checkpoint भी recovery के लिए उपलब्ध रहता है।
5. Dub के fulfilled promises हटते हैं; अलग read-aloud में खत्म हुए audio sources हटते हैं और generation look-ahead सीमित है।
6. Sarvam/Lovable बदलने पर पुराना dub buffer और prepared WAV invalidate होते हैं; engine चयन प्रति operation सुरक्षित रहता है।
7. Buffered consumers को Sarvam के HTTP 200 लेकिन टूटे audio stream पर एक Lovable backup मिलता है; intentional Stop पर fallback नहीं।
8. Native paused seek का pause intent सुरक्षित रहता है; silent gap में पहले की slow video rate आगे नहीं चलती। Voice pitch/speed नहीं बदले।
9. Title/caption track अब explicit private/age/removed restriction को override नहीं करता। Bot-check पर existing independent listener path बरकरार है। वास्तविक YouTube प्रतिबंध मिटाने की guarantee नहीं।
10. अलग conversions की library identity और uploaded media identity अलग हैं; केवल filename के आधार पर गलत video restore नहीं होगी।
11. Listener limit और segment count clipping का truncation flag सुरक्षित है; meaningful bracketed speech अब generic noise नहीं माना जाता।

## परीक्षण प्रमाण
- नवीनतम पूर्ण suite (आखिरी focused changes से पहले): **569 passed, 2 skipped, zero failed**।
- बाद में बदले recovery/library/restriction/audio के focused checks: **16 passed**।
- नवीनतम देखा automatic build: **OK, 05:07:46 UTC**।
- Phone दृश्य निरीक्षण: input, voice toggle, review toggle और running state दिखाई दिए; observed run में horizontal overflow तथा page errors नहीं थे। वास्तविक फ़ोन speaker/iOS background behavior प्रमाणित नहीं।

## कठोर health gate
इसे certified तभी माना जाएगा जब सभी शर्तें पास हों; कोई औसत score critical failure छिपाएगा नहीं।

| शर्त | कठिन pass मानदंड | अभी स्थिति |
|---|---|---|
| Auto source | बिना paste 329/329 हिस्से, कोई silent clipping नहीं | 329 source हिस्से मिले; पूर्ण pipeline अधूरी |
| Hindi fidelity | शुरुआत/मध्य/अंत और dense factual हिस्सों में सभी numbers, negations, names और speaker viewpoint सुरक्षित; beginner को पहली सुनवाई में स्पष्ट | वास्तविक outputs का स्वतंत्र पूरा मूल्यांकन बाकी |
| Review | माँगी गई जाँच में 329/329 valid reviews, zero false approval | counter bug ठीक; पूरी live coverage बाकी |
| Sync | हर boundary पर measured phase error ≤0.5s; pause में unwanted speech नहीं; forward/backward seek सही हिस्सा | logic tests पास; long measured clocks बाकी |
| Recovery | Stop/network/reload के बाद saved translation न खोए; अलग source का Hindi reuse न हो | focused tests पास; real lost-network/quota run बाकी |
| Long memory | 3h playback में retained decoded audio plateau; settled pending requests zero; buffer cache ≤8 | retention defect ठीक; browser heap measurement बाकी |
| Engine | switch पर पुराने provider audio का reuse नहीं; broken stream backup once; cancellation पर zero backup | buffered fallback tests पास; real provider switching बाकी |
| Export | पूरा valid WAV save/read-back, स्पष्ट narration scope; phone memory failure न हो | long download बाकी |

## Credits का हिसाब
- **एक पूरी वीडियो का exact credit खर्च अभी अज्ञात है**: सफल complete run और उसकी पूरी scoped request ledger उपलब्ध नहीं है। Partial calls से full-video bill नहीं निकाला गया।
- पहले workspace की 25–31 Oct, 04:44 UTC तक की baseline में 6.2 build credits और 0.113333288 AI credits recorded थे। वह AI row `gpt-live-1` voice call की थी, YouTube transcription की नहीं; इसे इस वीडियो की लागत नहीं कहना चाहिए।
- उसके बाद long-video interpretation/review की सफल calls दिखीं, पर run अधूरा रहा और workspace बदल गया; उनका exact full-video total नहीं दिया गया।
- अलग लागत चरण: source captions या AI listening; terminology brief; Hindi interpretation; second-model review; narration synthesis। Retries और requested re-review भी खर्च कर सकते हैं। Sarvam का direct-account billing Lovable credits से अलग है।
- केवल cache से compatible completed Hindi खोलना नई interpretation request नहीं करता; नया audio बनाना अलग synthesis work है। बिना सफल full run कोई per-video estimate प्रस्तुत नहीं।

## शेष gaps / blockers
- नई workspace में services, AI funding, Sarvam और existing database access फिर verify करना होगा। Sarvam key update का फ़ॉर्म cancelled था; नई key save होने का प्रमाण नहीं।
- User के वास्तविक फ़ोन/browser में checkpoint उपलब्ध है या नहीं, agent के fresh browser से ज्ञात नहीं होता। Storage clear न करें।
- Full target conversion/playback/cost capture अभी अधूरा। Move से पहले शुरू किया run अब background में चलता रहने का दावा नहीं।
- Large narration export अभी concatenated narration है, timestamp-aligned movie soundtrack नहीं; long memory budget/streaming export बाकी।
- Signed review receipts, strict semantic review validation, per-batch paid-call idempotency, complete per-piece listening recovery और deployed caller protection की स्वतंत्र verification अभी नहीं हुई।
- Preset narration original-speaker cloning या exact lip-sync नहीं है।