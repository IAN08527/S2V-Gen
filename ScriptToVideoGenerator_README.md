
# 🎬 Script to Video Generator using GenAI

A full-stack web application that transforms written scripts into narrated, visually-rich short videos using open-source GenAI tools. Users can input blogs, stories, or paragraphs, and the app will convert the text into a video with scene-wise narration, stock visuals, and optional subtitles — all generated and assembled automatically.

---

## 🚀 Features

- 📝 **Script Input**: Accepts long-form text or short articles.
- 🧠 **Scene Breakdown**: Splits text into logical scenes using NLP.
- 🔍 **Keyword Extraction**: Extracts keywords from each scene to find visuals.
- 🖼️ **Visual Search**: Fetches relevant stock images or videos via Pexels API.
- 🗣️ **Text-to-Speech**: Generates realistic narration using free TTS tools.
- 🎥 **Video Compilation**: Combines visuals and voiceover into an MP4 video.
- 📥 **Downloadable Output**: Final video available for download or preview.
- 🌐 **Deployed using Free Tools**: Entire stack uses only free and open APIs and libraries.

---

## 🧰 Tech Stack

### ⚙️ Full-Stack Framework
- [Next.js](https://nextjs.org/) – Used for both frontend and backend (API routes)

### 🧠 GenAI & Processing (Free Only)
| Task                    | Tool / Library                |
|-------------------------|-------------------------------|
| Text Segmentation       | Hugging Face Transformers (`T5`, `BART`, etc.) |
| Keyword Extraction      | `RAKE`, `YAKE`, or `KeyBERT`  |
| Text-to-Speech          | `gTTS` (Google TTS) or `Coqui TTS` |
| Media Search            | Pexels API (free stock images/videos) |
| Video Composition       | `moviepy` (Python) or `ffmpeg.wasm` (JS) |
| Subtitles (Optional)    | WebVTT or hardcoded via moviepy |

---

## 📂 Folder Structure

```
/script-to-video-generator
│
├── /pages
│   ├── index.js            # Home UI with script input form
│   └── /api
│       └── generate.js     # Main API route to handle generation
│
├── /components             # React UI components
├── /lib                    # Utility functions (e.g. extractKeywords.js, tts.js)
├── /styles                 # Tailwind or CSS modules
├── /utils                  # Pexels wrapper, scene splitter logic
└── /public                 # Static assets (logo, loading animation)
```

---

## 📦 Project Workflow

```
1. User enters script on the frontend
2. Backend (Next.js API route) processes:
    a. Segment script into scenes (Hugging Face / custom logic)
    b. Extract keywords per scene
    c. Search Pexels API for images/videos
    d. Generate voiceover using gTTS or Coqui
    e. Assemble audio + visuals using moviepy or ffmpeg
3. Final MP4 video returned for download
```

---

## ☁️ Deployment Plan

| Layer       | Platform         |
|-------------|------------------|
| Frontend    | [Vercel](https://vercel.com/) |
| Backend     | [Render](https://render.com/) / [Railway](https://railway.app/) |
| Media Store | Local/Temp (during processing) |
| Optional DB | Supabase / Firebase (for user history or analytics) |

---

## ⚠️ Notes & Limitations

- Hugging Face Inference API is **rate-limited**; local model loading is recommended for heavy use.
- TTS can be done locally to avoid usage limits.
- FFmpeg requires server-side processing — will need a backend (e.g., Flask on Render) or use [`ffmpeg.wasm`](https://github.com/ffmpegwasm/ffmpeg.wasm) for browser-based compilation.

---

## 🌱 Future Enhancements

- 🎤 User voice input as custom narration
- 🌐 Multilingual support (Hindi, Spanish, etc.)
- 🧠 Mood-aware visuals (sentiment-based image retrieval)
- 📹 Direct upload to YouTube Shorts / Reels format
- 🎨 Add branding overlays or music tracks

---

## 👥 Contributors

- Ian Nilesh Lopes (Project Lead)
- [Your Teammates’ Names Here]

---

## 📜 License

This project is open-source and free to use under the MIT License.

---

## 💬 Contact / Demo Request

Want a demo or technical breakdown? Contact us at [Your Email or GitHub].
