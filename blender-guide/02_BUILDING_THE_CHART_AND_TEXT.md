# 🪵 Chapter 2: Building the 3D Chart Board & 3D Text

In this chapter, we will build a 3D rectangular signboard, place it high above Ben's head, add thick 3D golden letters saying **`COUNTDOWN 31`**, and lock everything to the cow so they move as one!

---

## 📦 Step 1: Create the 3D Chart Board

1. Press **`Shift + A`** on your keyboard (this opens the "Add" menu).
2. Hover over **`Mesh`** $\to$ click **`Cube`**.
3. A cube will appear in the center of the grid. Let's move and shape it:

### A. Move the Board Above His Head:
* Press **`G`** (Grab) $\to$ then press **`Z`** (locks movement to Up/Down).
* Move your mouse upwards until the box is floating high above Ben's head/hands.
* **Left-click** once to set the position.

### B. Flatten and Stretch into a Signboard:
* **Make it Wide**: Press **`S`** (Scale) $\to$ then **`X`** $\to$ move mouse outward until it's wide enough for text $\to$ **Left-click**.
* **Make it Thin**: Press **`S`** $\to$ then **`Y`** $\to$ move mouse inward to make it thin like a board $\to$ **Left-click**.
* **Adjust Height**: Press **`S`** $\to$ then **`Z`** $\to$ adjust height to your liking $\to$ **Left-click**.

---

## 🎨 Step 2: Give the Board Color

1. With the chart board selected (orange outline):
2. Look at the **properties panel on the bottom-right of your screen**.
3. Click on the **Red Sphere / Ball Icon** (Material Properties).
4. Click the **`New`** button.
5. Click on the white rectangle next to **`Base Color`** $\to$ pick a rich dark arcade color (e.g. Dark Forest Green or Warm Dark Brown).

---

## ✍️ Step 3: Create the 3D Text ("COUNTDOWN 31")

1. Press **`Shift + A`** $\to$ click **`Text`**.
2. A flat word "Text" will appear on the floor. Let's stand it upright and type:

### A. Stand the Text Upright:
* With the text selected, press **`R`** (Rotate) $\to$ then press **`X`** $\to$ type **`90`** on your keyboard $\to$ press **`Enter`**.

### B. Type "COUNTDOWN 31":
* Press **`Tab`** on your keyboard (this puts you into text typing mode).
* Use **`Backspace`** to delete the default word "Text".
* Type in all caps: **`COUNTDOWN 31`**.
* Press **`Tab`** again to exit typing mode.

### C. Make the Letters 3D (Thick Extrusion):
* Look at the right-side properties panel.
* Click on the **green `a` icon** (Object Data Properties).
* Expand the **`Geometry`** dropdown menu.
* Look for **`Extrude`** $\to$ click on it and type **`0.05`** (and press Enter).
* *Notice the letters now have real 3D depth and thickness!*

---

## 🌟 Step 4: Color the Text Golden Yellow & Position on Board

1. With the 3D text selected:
2. Go to the **Red Ball Icon** (Material Properties) on the right panel $\to$ click **`New`**.
3. Click the **`Base Color`** box $\to$ choose a bright **Golden Yellow / Amber** color!
4. **Position the text inside the board**:
   * Press **`G`** (Grab) and move the text so it sits centered directly on the front face of your chart board.
   * If the text is too big, press **`S`** to scale it down until it fits neatly inside the board.

---

## 🔗 Step 5: Lock Board & Text to the Cow (Parenting)

Right now, if the cow moves, the board and text would stay behind. Let's link them together permanently:

1. **Left-click on the 3D Text** (it turns orange).
2. Hold down the **`Shift`** key on your keyboard, and **Left-click on the Chart Board**.
3. Still holding **`Shift`**, **Left-click on Ben The Cow** (or his skeleton/armature).
   *(Ben should now have a bright yellow-orange outline, while the text and board have a dark orange outline).*
4. Release the Shift key.
5. Press **`Ctrl + P`** on your keyboard (Parenting shortcut).
6. In the small popup menu that appears, click **`Object (Keep Transform)`**.

🎉 **Congratulations! The Chart Board and 3D Text are now locked to the cow! If you move or rotate the cow, everything moves in 100% sync!**

---

👉 **Ready to animate? Move to [Chapter 3: Animating the $720^\circ$ Spin & Text Swap](./03_ANIMATING_THE_SPIN_AND_TEXT_SWAP.md)!**
