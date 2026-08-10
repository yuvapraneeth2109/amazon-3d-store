# Amazon 3D Showcase

An interactive, responsive 3D e-commerce product showcase built with **Vite**, **Three.js**, and **WebGL**. Users can interactively view 3D product models in real-time with full rotation controls and test dynamic color options using product swatches.

![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=flat&logo=vercel)
![Three.js](https://img.shields.io/badge/Three.js-r170+-black?style=flat&logo=three.js)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite)

---

## 🌟 Features

* **3D Interactive Viewing:** View product models in real time with OrbitControls (drag to rotate, scroll to zoom).
* **Dynamic Color Customization:** Real-time material recoloring using color swatches for each product card.
* **Auto Centering & Scaling:** Standardized model positioning and bounds calculation using Three.js bounding boxes.
* **Optimized Production Build:** Built with Vite for rapid development and light production bundles hosted on Vercel.

---

## 🛠️ Tech Stack

* **Frontend Framework/Bundler:** Vite
* **3D Graphics Engine:** Three.js (GLTFLoader, OrbitControls)
* **Styling:** Modern CSS3 Grid & Flexbox
* **Deployment:** Vercel

---

## 📁 Project Structure

```text
amazon-3d-store/
├── public/
│   └── models/          # Static .glb 3D asset files
│       ├── model1.glb
│       ├── model2.glb
│       ├── model3.glb
│       ├── model4.glb
│       └── model5.glb
├── src/
│   ├── main.js          # Three.js initialization & app logic
│   └── style.css        # E-commerce grid styling
├── index.html           # Main HTML entry point
├── package.json
└── README.md