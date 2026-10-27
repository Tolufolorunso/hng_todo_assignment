import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf) {
  if (typeof zlib.crc32 === "function") {
    return zlib.crc32(buf);
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // 8 bits per channel
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rawOffset = y * rowSize;
    raw[rawOffset] = 0; // filter type 0 (None)
    const srcOffset = y * width * 4;
    rgbaBuffer.copy(raw, rawOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const idatData = zlib.deflateSync(raw);
  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", idatData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function renderTaskFlowLogo(size) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 32;

  const pad = 2 * scale;
  const boxW = 28 * scale;
  const boxH = 28 * scale;
  const r = 8 * scale;
  const cx1 = pad + r;
  const cy1 = pad + r;
  const cx2 = pad + boxW - r;
  const cy2 = pad + boxH - r;

  const chk1X = 8.5 * scale, chk1Y = 16.5 * scale;
  const chk2X = 13.5 * scale, chk2Y = 21.5 * scale;
  const chk3X = 23.5 * scale, chk3Y = 10.5 * scale;
  const chkThick = 1.6 * scale; // half thickness (total 3.2)

  const dotX = 23.5 * scale, dotY = 18.5 * scale;
  const dotR = 1.5 * scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check rounded rectangle bounds
      let inBox = false;
      let alpha = 0;

      const px = x + 0.5;
      const py = y + 0.5;

      if (px >= pad && px <= pad + boxW && py >= pad && py <= pad + boxH) {
        let insideCorners = true;
        if (px < cx1 && py < cy1) {
          insideCorners = Math.hypot(px - cx1, py - cy1) <= r;
        } else if (px > cx2 && py < cy1) {
          insideCorners = Math.hypot(px - cx2, py - cy1) <= r;
        } else if (px < cx1 && py > cy2) {
          insideCorners = Math.hypot(px - cx1, py - cy2) <= r;
        } else if (px > cx2 && py > cy2) {
          insideCorners = Math.hypot(px - cx2, py - cy2) <= r;
        }

        if (insideCorners) {
          inBox = true;
          alpha = 255;
        }
      }

      if (!inBox) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Gradient background (#6366f1 to #7c3aed)
      const t = Math.max(0, Math.min(1, (px + py) / (size * 2)));
      let red = Math.round(99 + (124 - 99) * t);
      let green = Math.round(102 + (58 - 102) * t);
      let blue = Math.round(241 + (237 - 241) * t);

      // Checkmark overlay
      const d1 = distToSegment(px, py, chk1X, chk1Y, chk2X, chk2Y);
      const d2 = distToSegment(px, py, chk2X, chk2Y, chk3X, chk3Y);
      const minChkDist = Math.min(d1, d2);

      if (minChkDist <= chkThick) {
        const chkT = Math.max(0, Math.min(1, (chkThick - minChkDist) / (scale * 0.8 || 1)));
        red = Math.round(red * (1 - chkT) + 255 * chkT);
        green = Math.round(green * (1 - chkT) + 255 * chkT);
        blue = Math.round(blue * (1 - chkT) + 255 * chkT);
      }

      // Accent circle overlay
      const dDot = Math.hypot(px - dotX, py - dotY);
      if (dDot <= dotR) {
        const dotT = Math.max(0, Math.min(1, (dotR - dDot) / (scale * 0.5 || 1)));
        red = Math.round(red * (1 - dotT) + 199 * dotT);
        green = Math.round(green * (1 - dotT) + 210 * dotT);
        blue = Math.round(blue * (1 - dotT) + 254 * dotT);
      }

      buf[idx] = red;
      buf[idx + 1] = green;
      buf[idx + 2] = blue;
      buf[idx + 3] = alpha;
    }
  }

  return buf;
}

function buildIco(sizes) {
  const pngBuffers = sizes.map((s) => {
    const rgba = renderTaskFlowLogo(s);
    return {
      size: s,
      png: encodePng(s, s, rgba),
    };
  });

  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + dirEntrySize * pngBuffers.length;

  let currentOffset = dirSize;
  const entries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry[0] = item.size >= 256 ? 0 : item.size; // Width
    entry[1] = item.size >= 256 ? 0 : item.size; // Height
    entry[2] = 0; // Colors (0 = no palette)
    entry[3] = 0; // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.png.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data
    entries.push(entry);
    currentOffset += item.png.length;
  }

  const iconDir = Buffer.alloc(headerSize);
  iconDir.writeUInt16LE(0, 0); // Reserved
  iconDir.writeUInt16LE(1, 2); // 1 = ICO
  iconDir.writeUInt16LE(pngBuffers.length, 4); // Count

  const parts = [iconDir].concat(entries, pngBuffers.map((i) => i.png));
  return Buffer.concat(parts);
}

const targetDir = "apps/windows/TaskFlow/Assets";
fs.mkdirSync(targetDir, { recursive: true });

// Build multi-resolution ICO (16, 32, 48, 64, 128, 256)
const icoBuf = buildIco([16, 32, 48, 64, 128, 256]);
fs.writeFileSync(path.join(targetDir, "app.ico"), icoBuf);

// Build 128x128 standalone PNG for in-app header branding
const logoRgba = renderTaskFlowLogo(128);
const logoPng = encodePng(128, 128, logoRgba);
fs.writeFileSync(path.join(targetDir, "logo.png"), logoPng);

console.log("Successfully generated apps/windows/TaskFlow/Assets/app.ico and logo.png");
