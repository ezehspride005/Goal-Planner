import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate high quality SVG icon with feminine aesthetic
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFAF7" />
      <stop offset="100%" stop-color="#F8DDE3" />
    </linearGradient>
    <linearGradient id="sageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#A9C2A5" />
      <stop offset="100%" stop-color="#3F5A44" />
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#4A3038" flood-opacity="0.15" />
    </filter>
  </defs>
  
  <!-- Outer Rounded Square -->
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  
  <!-- Soft Inner Circle Target / Goal Ring -->
  <circle cx="256" cy="256" r="170" fill="none" stroke="#F8DDE3" stroke-width="28" />
  <circle cx="256" cy="256" r="120" fill="none" stroke="#A9C2A5" stroke-width="18" stroke-dasharray="14 10" />
  
  <!-- Center Bullseye & Star / Sparkle in Deep Sage -->
  <circle cx="256" cy="256" r="64" fill="url(#sageGrad)" filter="url(#softShadow)" />
  
  <!-- Warm Sparkle Star in center -->
  <path d="M256 220 L266 246 L292 256 L266 266 L256 292 L246 266 L220 256 L246 246 Z" fill="#FFFAF7" />

  <!-- Accent Botanical Leaf / Sprout representing growth -->
  <path d="M320 180 C345 160 375 165 385 185 C385 210 355 230 320 220 C320 205 320 190 320 180 Z" fill="#A9C2A5" opacity="0.9" />
  <path d="M320 220 C310 245 295 260 275 265" fill="none" stroke="#3F5A44" stroke-width="4" stroke-linecap="round" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon, 'utf8');

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Generate simple raster PNG buffer with RGBA pixels
function createPng(width, height, isMaskable = false) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image scanlines
  // Color palette:
  // Background Ivory #FFFAF7 => rgb(255, 250, 247)
  // Soft Pink #F8DDE3 => rgb(248, 221, 227)
  // Sage Green #A9C2A5 => rgb(169, 194, 165)
  // Deep Sage #3F5A44 => rgb(63, 90, 68)
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const rOuter = (width * (isMaskable ? 0.35 : 0.44));
  const rRing = rOuter * 0.72;
  const rCenter = rOuter * 0.38;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: Ivory #FFFAF7
      let r = 255, g = 250, b = 247, a = 255;

      if (dist <= rCenter) {
        // Center deep sage #3F5A44 with a tiny sparkle
        if (Math.abs(dx) <= 3 && Math.abs(dy) <= 12 || Math.abs(dy) <= 3 && Math.abs(dx) <= 12) {
          // White sparkle
          r = 255; g = 255; b = 255;
        } else {
          r = 63; g = 90; b = 68;
        }
      } else if (dist <= rRing && dist >= rRing - (width * 0.04)) {
        // Sage green ring #A9C2A5
        r = 169; g = 194; b = 165;
      } else if (dist <= rOuter && dist >= rOuter - (width * 0.06)) {
        // Soft pink ring #F8DDE3
        r = 248; g = 221; b = 227;
      } else if (!isMaskable && dist > rOuter + (width * 0.02)) {
        // Gentle soft pink corner tint
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy)) / (width / 2);
        if (cornerDist > 0.85) {
          r = 248; g = 221; b = 227;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Generate 192x192, 512x512, 512x512 maskable, 180x180 apple touch icon
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, false));

console.log('Successfully generated all PWA icons!');
