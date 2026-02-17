# Installation Guide: Zheomara Math Tutor

This guide covers how to install and run the Zheomara Math Tutor app on Windows and Android devices.

---

## 💻 Windows Installation

### Option 1: Run as a Web App (PWA) - Recommended
Since this is a Progressive Web App (PWA), you can "install" it directly from your browser.
1.  **Open the App**: Navigate to your deployed URL (e.g., https://your-math-tutor.vercel.app) in Chrome or Edge.
2.  **Install**:
    *   **Chrome**: Click the **Install Icon** (computer with arrow) in the address bar.
    *   **Edge**: Click **Settings (...) > Apps > Install this site as an app**.
3.  **Result**: The app will now appear on your Desktop/Taskbar and run in its own window without browser tabs.

### Option 2: Local Development
If you want to run the code locally:
1.  **Install Node.js**: Ensure [Node.js](https://nodejs.org/) is installed.
2.  **Install Dependencies**:
    ```powershell
    npm install
    ```
3.  **Configure API**: Create a `.env.local` file and add `GROQ_API_KEY=your_key`.
4.  **Launch**:
    ```powershell
    npm run dev
    ```
5.  Access at [http://localhost:3000](http://localhost:3000).

---

## 📱 Android Installation

The project uses **Capacitor** to wrap the Next.js app into a native Android application.

### Prerequisites
*   [Android Studio](https://developer.android.com/studio) installed.
*   [Java JDK 17+](https://www.oracle.com/java/technologies/downloads/) installed.

### Step 1: Build the Web Project
First, generate the optimized web files:
```powershell
npm run build
```

### Step 2: Sync with Android
Copy the web build into the Android project folder:
```powershell
npx cap sync android
```

### Step 3: Build the APK
1.  Open **Android Studio**.
2.  Select **Open an existing project** and choose the `android` folder inside your project directory.
3.  Wait for Gradle to finish syncing.
4.  Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5.  Once finished, a notification will appear. Click **locate** to find your `app-debug.apk`.

### 🛠️ Troubleshooting: Offline Gradle Setup
If Android Studio gets stuck downloading Gradle:
1.  **Move the Zip**: Put your downloaded `gradle-8.x-all.zip` in a permanent folder (e.g., `C:\Gradle\`).
2.  **Configure Android Studio**:
    - Go to **File > Settings > Build, Execution, Deployment > Gradle**.
    - Change **Use Gradle from** to **'Specified location'**.
    - Select the folder where you extracted the Gradle zip.
3.  **Alternative (Sync via Wrapper)**:
    - Edit `android/gradle/wrapper/gradle-wrapper.properties`.
    - Change `distributionUrl` to point to your local file (use forward slashes):
    - `distributionUrl=file:///C:/Gradle/gradle-8.14.3-all.zip`
4.  **Try Again**: Click **File > Sync Project with Gradle Files**.

---

## 🔑 Activating Access
Regardless of the platform, the first time you open the app:
1.  Enter the access code: **Matipa@2021**.
2.  The app will fetch internet time to grant you a **31-day license**.
3.  After 31 days, you will be prompted to enter the code again.
