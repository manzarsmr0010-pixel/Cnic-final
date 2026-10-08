# CNIC Scanner Web

A browser-based CNIC crop/straighten prototype.

## Run
The easiest option is to serve this folder with any static web server, then open it on an iPhone.

For example:
- VS Code + Live Server
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

Open `index.html` if your browser allows local files, but a web server is recommended because OpenCV.js is loaded from the OpenCV CDN.

## Features
- Camera/photo picker on iPhone
- Client-side image processing
- Quadrilateral/rectangle detection
- CNIC-like aspect ratio scoring
- Perspective correction
- JPEG result download

## Important
This is an MVP. Very messy photos, occlusion, shadows, patterned backgrounds, or multiple cards may cause detection failures.

For a printing-shop production version, add:
- manual 4-corner adjustment
- stronger CNIC-specific detection
- rotate button
- brightness/contrast cleanup
- 1/2/4/6-copy A4 printing layout
- PDF generation
- print button
- offline PWA support
- optional PIN/password for shop settings

No CNIC OCR or server upload is included.
