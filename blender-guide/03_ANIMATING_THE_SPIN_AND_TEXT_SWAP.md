# 🔄 Chapter 3: Animating the $720^\circ$ Spin & Dual-Stage Text Swap

In this chapter, we will make Ben spin 2 full circles ($720^\circ$), and make the chart board text dynamically switch from **`COUNTDOWN 31`** on Spin 1 to **`ROUND END ROUND 31`** on Spin 2!

---

## ⏱️ Step 1: Set Up the Timeline Duration

Look at the very bottom of your screen — that horizontal bar with numbers `1, 20, 40, 60...` is the **Animation Timeline**.

1. Look at the bottom-right corner of the timeline:
   - You will see: **`Start: 1`** and **`End: 250`**.
2. Click on **`250`** and change it to **`120`** (this sets our animation to exactly 4 seconds at 30 FPS: 2 seconds for Spin 1 + 2 seconds for Spin 2).

```
[ Start: 1 ] ---------------------------------------- [ End: 120 ]
  Frame 1: 0°               Frame 60: 360°              Frame 120: 720°
  Text: "COUNTDOWN 31"       Text Swaps ➔               Text: "ROUND END ROUND 31"
```

---

## 🌪️ Step 2: Animate the $720^\circ$ Double Spin

1. **Left-click on Ben The Cow** to select him (orange outline).
2. Press **`N`** on your keyboard to open the right-side transform sidebar (you will see Rotation X, Y, Z).

### Keyframe 1 (Start at 0°):
* Click on **Frame 1** on the bottom timeline.
* Look at the right sidebar: Make sure **Rotation Z** is **`0`**.
* Move your mouse cursor into the 3D viewport over the cow $\to$ press **`I`** on your keyboard $\to$ click **`Rotation`**.
*(A small yellow diamond will appear on Frame 1 in the timeline).*

### Keyframe 2 (End of Spin 1 at 360°):
* On the bottom timeline, click on **Frame 60**.
* In the right sidebar, click the number next to **Rotation Z** $\to$ type **`360`** (and press Enter).
* Move your mouse over the cow $\to$ press **`I`** $\to$ click **`Rotation`**.

### Keyframe 3 (End of Spin 2 at 720°):
* On the bottom timeline, click on **Frame 120**.
* In the right sidebar, click **Rotation Z** $\to$ type **`720`** (and press Enter).
* Move your mouse over the cow $\to$ press **`I`** $\to$ click **`Rotation`**.

---

## 🔀 Step 3: Create the Second Text ("ROUND END ROUND 31")

1. **Left-click on your `COUNTDOWN 31` 3D text**.
2. Press **`Shift + D`** (Duplicate) $\to$ then press **`Enter`** (places the copy in the exact same position).
3. Press **`Tab`** to enter typing mode $\to$ delete the words and type:
   **`ROUND END ROUND 31`**
4. Press **`Tab`** again to exit typing mode.
5. If the text is slightly too wide, press **`S`** to scale it down so it fits neatly inside the board.

---

## 🎭 Step 4: Keyframe the Text Swap (Frame 1–60 vs Frame 61–120)

We want **Text 1 ("COUNTDOWN 31")** visible during Spin 1, and **Text 2 ("ROUND END ROUND 31")** visible during Spin 2.

The easiest, foolproof way to do this in Blender is **Scale Keyframing**:

### A. For Text 1 ("COUNTDOWN 31"):
1. Select **Text 1**.
2. Go to **Frame 1** on the timeline $\to$ press **`I`** $\to$ click **`Scaling`** *(Normal size)*.
3. Go to **Frame 60** $\to$ press **`I`** $\to$ click **`Scaling`** *(Still normal size)*.
4. Go to **Frame 61** (one frame forward):
   - In the right sidebar (`N`), set **Scale X, Y, Z to `0`** (hides it instantly!).
   - Press **`I`** $\to$ click **`Scaling`**.

---

### B. For Text 2 ("ROUND END ROUND 31"):
1. Select **Text 2**.
2. Go to **Frame 1**:
   - In the right sidebar (`N`), set **Scale X, Y, Z to `0`** (starts hidden!).
   - Press **`I`** $\to$ click **`Scaling`**.
3. Go to **Frame 60**:
   - In the right sidebar (`N`), keep **Scale at `0`**.
   - Press **`I`** $\to$ click **`Scaling`**.
4. Go to **Frame 61**:
   - In the right sidebar (`N`), set **Scale X, Y, Z back to `1`** (pops open!).
   - Press **`I`** $\to$ click **`Scaling`**.
5. Go to **Frame 120**:
   - Press **`I`** $\to$ click **`Scaling`** *(stays open until end)*.

---

## ▶️ Step 5: Test the Complete Animation!

1. Click on **Frame 1** on the timeline.
2. Press the **`Spacebar`** on your keyboard!
3. **Watch the magic**:
   - Ben spins $360^\circ$ holding the chart saying **`COUNTDOWN 31`**!
   - At 2 seconds, he continues into the second spin while the text flips to **`ROUND END ROUND 31`**! 🐮✨

---

👉 **Almost done! Let's render the video in [Chapter 4: Lighting, Camera & Transparent Export](./04_LIGHTING_CAMERA_AND_EXPORT.md)!**
