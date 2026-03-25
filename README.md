# 💍 ELIITOZE JEWELZ – GitHub Pages Jewellery Shop

Elegant online jewellery shop built with pure HTML, CSS & JavaScript.
Runs completely on **GitHub Pages** – no server needed!

---

## 📁 File Structure

```
your-repo/
├── index.html        → Shop Page (customer)
├── cart.html         → Cart Page
├── admin.html        → Admin/Owner Panel
├── style.css         → Design & Layout
├── script.js         → Site Logic
├── products.js       → ⭐ Product Data
├── images/           → ⭐ Product Photos
│   ├── product1.jpg
│   └── ...
└── videos/           → ⭐ Product Videos
    ├── product1.mp4
    └── ...
```

---

## 🚀 Setup on GitHub Pages

1. Create a GitHub repository
2. Upload all these files
3. Go to **Settings → Pages → Source: main branch / root**
4. Your site will be live at: `https://yourusername.github.io/repo-name/`

---

## ➕ How to Add Products

### Step 1 – Upload Images & Videos
- Upload product photo to `images/` folder (e.g. `product7.jpg`)
- Upload product video to `videos/` folder (e.g. `product7.mp4`)

### Step 2 – Edit products.js

Add a new product object inside the `products` array:

```js
{
  id: 7,
  name: "Gold Ring Set",
  price: 2500,
  discountPrice: 1999,  // Set 0 for no discount
  image: "images/product7.jpg",
  video: "videos/product7.mp4",
  qty: 10,
  description: "Beautiful gold ring set"
},
```

### Step 3 – Set WhatsApp Number

In `products.js`, find this line and update your number:
```js
const WHATSAPP_NUMBER = "919876543210";
```

---

## 📦 Stock Management

- `qty > 0` → Product available ✅
- `qty = 0` → Shows "Out of Stock" ❌

---

## 🛒 Features

- ✅ Responsive grid layout (mobile friendly)
- ✅ Video preview popup on product click
- ✅ Discount price with strikethrough display
- ✅ Out of Stock auto detection
- ✅ Cart with quantity control
- ✅ Free Shipping above ₹2000 with progress bar
- ✅ WhatsApp order message generation
- ✅ Admin panel with product code generator
- ✅ All data from products.js (works on every device)

---

## 💡 Video Tips

- Keep videos **5–10 seconds** only
- Compress before uploading (use **HandBrake** – free)
- Keep file size **under 5MB** for fast loading
- Format: **MP4 (H.264)** recommended

---

## ⚠️ Important Notes

- Products load from `products.js` – visible to ALL customers on any device
- Cart data uses `localStorage` – per browser (normal cart behaviour)
- Admin panel is for guidance – actual changes need GitHub edits
- No backend/server required – pure static site!

---

*Built for ELIITOZE JEWELZ · GitHub Pages*
