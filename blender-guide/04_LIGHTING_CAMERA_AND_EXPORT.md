# 🎥 Chapter 4: Lighting, Camera & Transparent Video Export

In this final chapter, we will frame the cow with a cinematic camera, set up warm stadium lighting, turn on transparency (zero background), and render the finished animation as an **MP4 / WebM video** ready for the game!

---

## 📷 Step 1: Add and Position the Camera

1. Press **`Shift + A`** $\to$ click **`Camera`**.
2. **Snap the camera to what you are looking at**:
   - Rotate your view in the 3D viewport until the cow and chart board look nicely framed from the front.
   - Press **`Ctrl + Alt + Numpad 0`** on your keyboard.
   *(Or go to top menu: `View ➔ Align View ➔ Align Active Camera to View`).*
3. You will now see a rectangle border showing the camera frame!

### To Adjust the Camera Framing:
* Press **`N`** on your keyboard to open the right sidebar.
* Click on the **`View`** tab on that sidebar.
* Check the box: **`Camera to View`** ✅.
* Now, whenever you orbit, zoom, or pan with your mouse wheel, the camera moves with you!
* Center Ben and the chart board inside the rectangle frame, then **uncheck `Camera to View`** when done!

---

## 💡 Step 2: Add Stadium Studio Lighting

Let's make the cow look vibrant, glossy, and warm:

1. Press **`Shift + A`** $\to$ hover over **`Light`** $\to$ click **`Sun`**.
2. With the Sun selected, look at the bottom-right properties panel.
3. Click on the **Green Lightbulb Icon** (Object Data Properties).
4. Set **`Strength`** to **`3.5`**.
5. Set **`Color`** to a soft warm sunlight (very slight pale golden-yellow).
6. Press **`R`** (Rotate) to angle the sun down toward the front of the cow.

---

## 🏁 Step 3: Enable Transparent Background (No Grey/Black BG)

To use this video seamlessly inside your Next.js game with no background:

1. Look at the properties panel on the right.
2. Click on the **Camera Icon** at the top of the properties panel (Render Properties).
3. Scroll down and click to expand the **`Film`** section.
4. Check the box: **`Transparent`** ✅.
*(You will see the background turn into a grey-and-white checkered grid, meaning 100% transparency!)*

---

## ⚙️ Step 4: Output Video Settings

1. Click on the **Printer Icon** on the right properties panel (Output Properties).
2. Set **Resolution**: `X: 1080`, `Y: 1080` (Square 1:1 format for game avatars / modals).
3. Set **Frame Rate**: `30 fps` (or `60 fps`).
4. Set **Frame Range**: `Frame Start: 1`, `Frame End: 120`.
5. Under **Output**:
   - Click the small **Folder Icon** next to `/tmp\` and choose where to save the video on your laptop (e.g. `Downloads` or `Desktop`).
   - Change **`File Format`** from `PNG` to **`FFmpeg Video`**.
6. Expand the **`Encoding`** dropdown:
   - **Container**: Choose **`WebM`** or **`QuickTime (.mov)`**.
   - **Video Codec**: Choose **`WebM / VP9`** or **`ProRes`** or **`PNG`**.
   - **Color**: Click **`RGBA`** (The **`A`** stands for Alpha / Transparency!).

---

## 🚀 Step 5: Render the Finished Animation!

1. Look at the very top menu bar of Blender: Click **`Render`**.
2. Click **`Render Animation`** (or press **`Ctrl + F12`** on your keyboard).
3. A render window will open, and Blender will render all 120 frames in high quality!
4. When Frame 120 completes, close the render window.

---

## 🎮 How to Put it in Your Game!

Your finished video file will be sitting in the folder you picked! You can drop it directly into `Frontend/public/assets/` and use it anywhere in Next.js:

```tsx
<video
  src="/assets/spinning-cow-31.webm"
  autoPlay
  loop
  muted
  playsInline
  className="w-72 h-72 object-contain drop-shadow-2xl"
/>
```

---

🎉 **You are DONE! You have created a professional, smooth 3D spinning cow animation with dynamic dual-stage text!** 🐮🏆
