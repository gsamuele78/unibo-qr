"use strict";
// Test helpers: rasterise a module matrix to RGBA and decode it with jsQR
// (an independent decoder), so tests verify scannability, not just structure.
const jsQR = require("jsqr");

function rasterize(qr, { scale = 4, quietZone = 4, logo = null } = {}) {
  const total = qr.size + quietZone * 2;
  const px = total * scale;
  const data = new Uint8ClampedArray(px * px * 4).fill(255);
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (!qr.getModule(x, y)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + quietZone) * scale + dy) * px + (x + quietZone) * scale + dx) * 4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
      }
    }
  }
  if (logo) {
    // Simulate worst case: logo area fully occluded by a solid mid-grey block.
    const x0 = Math.floor((logo.x - logo.pad) * scale);
    const y0 = Math.floor((logo.y - logo.pad) * scale);
    const s = Math.ceil((logo.size + logo.pad * 2) * scale);
    for (let y = y0; y < y0 + s; y++) {
      for (let x = x0; x < x0 + s; x++) {
        const i = (y * px + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 128;
      }
    }
  }
  return { data, width: px, height: px };
}

function decode(img) {
  const res = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
  return res ? res.data : null;
}

module.exports = { rasterize, decode };
