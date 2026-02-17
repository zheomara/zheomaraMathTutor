# Zheomara Math Tutor PWA

A production-ready PWA web app that acts as a math tutor, using a hosted Llama 3 model on Groq for reasoning.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```bash
GROQ_API_KEY=your_groq_api_key_here
# Optional: Set to true to use mock data without API usage
MOCK_AI=false 
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

## Features
- **Access Control**: Password protected ("Zheomara").
- **Integrity**: Terms of Service acceptance required.
- **AI Powered**: Uses Llama 3 on Groq for generic math solving.
- **PWA**: Installable on mobile devices with offline shell.
- **Image Input**: Camera capture and image upload support.
- **PDF Export**: Download solutions as PDF.
- **History**: Local persistence of past problems.

## Deployment
Deploy easily to Vercel:
1. Push to GitHub.
2. Import project in Vercel.
3. Add `GROQ_API_KEY` to Environment Variables.
4. Deploy.

## Build for Android (APK)
This project uses **Capacitor** to generate a native Android app.

### 1. Configure Remote API
The APK needs a remote backend. Set your API URL in `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://your-deployed-app.vercel.app
```

### 2. Sync and Build
```bash
npm run build
npx cap sync
```

### 3. Build APK in Android Studio
1. Open the `android` folder in **Android Studio**.
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Locate the `.apk` file in the generated output folder.
