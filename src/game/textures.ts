import * as THREE from 'three';

export interface WorldTextures {
  asphaltRoad: THREE.CanvasTexture;
  villageRoad: THREE.CanvasTexture;
  terrainGrass: THREE.CanvasTexture;
  mustardField: THREE.CanvasTexture;
  haveliBrick: THREE.CanvasTexture;
  cyberGlass: THREE.CanvasTexture;
  dhabaSign: THREE.CanvasTexture;
  highwayGantry: THREE.CanvasTexture;
  stoneGhat: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

export function createWorldTextures(maxAnisotropy: number): WorldTextures {
  // 1. Expressway Asphalt Road
  const [asphaltCanvas, aCtx] = makeCanvas(512, 512);
  aCtx.fillStyle = '#24272d';
  aCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4500; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137) % 512;
    const shade = 28 + (i % 24);
    aCtx.fillStyle = `rgb(${shade},${shade + 1},${shade + 4})`;
    aCtx.fillRect(x, y, 2, 2);
  }
  // White shoulder stripes
  aCtx.fillStyle = '#e2e8f0';
  aCtx.fillRect(18, 0, 10, 512);
  aCtx.fillRect(484, 0, 10, 512);
  // Center dashed yellow/white divider
  aCtx.fillStyle = '#f59e0b';
  for (let y = 16; y < 512; y += 96) {
    aCtx.fillRect(251, y, 10, 52);
  }
  // Lane dashes
  aCtx.fillStyle = 'rgba(226, 232, 240, 0.55)';
  for (let y = 0; y < 512; y += 64) {
    aCtx.fillRect(136, y + 10, 5, 30);
    aCtx.fillRect(371, y + 10, 5, 30);
  }
  const asphaltRoad = finalizeColorTexture(asphaltCanvas, maxAnisotropy, 1, 1);

  // 2. Village Kharanja Brick/Soil Road
  const [vCanvas, vCtx] = makeCanvas(512, 512);
  vCtx.fillStyle = '#8b6f52';
  vCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 32; row++) {
    for (let col = 0; col < 16; col++) {
      const offset = (row % 2) * 16;
      const shade = ((row * 17 + col * 31) % 3) * 10;
      vCtx.fillStyle = `rgb(${150 - shade}, ${105 - shade}, ${74 - shade})`;
      vCtx.fillRect(col * 32 + offset - 14, row * 16 + 2, 28, 12);
    }
  }
  // Dusty edges
  const gradL = vCtx.createLinearGradient(0, 0, 72, 0);
  gradL.addColorStop(0, '#9a805c');
  gradL.addColorStop(1, 'rgba(154,128,92,0)');
  vCtx.fillStyle = gradL;
  vCtx.fillRect(0, 0, 72, 512);
  const gradR = vCtx.createLinearGradient(440, 0, 512, 0);
  gradR.addColorStop(0, 'rgba(154,128,92,0)');
  gradR.addColorStop(1, '#9a805c');
  vCtx.fillStyle = gradR;
  vCtx.fillRect(440, 0, 72, 512);
  const villageRoad = finalizeColorTexture(vCanvas, maxAnisotropy, 1, 1);

  // 3. Haryana Fertile Plain Terrain
  const [gCanvas, gCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#4e6b35';
  gCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    const x = (i * 97) % 512;
    const y = (i * 193) % 512;
    const g = 88 + (i % 38);
    const r = 64 + (i % 26);
    gCtx.fillStyle = `rgb(${r},${g},${44 + (i % 16)})`;
    gCtx.fillRect(x, y, 4, 4);
  }
  const terrainGrass = finalizeColorTexture(gCanvas, maxAnisotropy, 40, 40);

  // 4. Sarson (Mustard) & Wheat Field Texture
  const [mCanvas, mCtx] = makeCanvas(512, 512);
  mCtx.fillStyle = '#3f5f24';
  mCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 24) {
    mCtx.fillStyle = '#344e1d';
    mCtx.fillRect(0, y, 512, 6);
    for (let x = 0; x < 512; x += 12) {
      const jitter = ((x * 13 + y * 7) % 9) - 4;
      mCtx.fillStyle = (x + y) % 3 === 0 ? '#facc15' : '#eab308';
      mCtx.fillRect(x + jitter, y + 8, 7, 10);
    }
  }
  const mustardField = finalizeColorTexture(mCanvas, maxAnisotropy, 4, 4);

  // 5. Brick Haveli Facade
  const [hCanvas, hCtx] = makeCanvas(512, 512);
  hCtx.fillStyle = '#d6c6ae';
  hCtx.fillRect(0, 0, 512, 512);
  // Lower terracotta brick wainscot
  hCtx.fillStyle = '#9b4d34';
  hCtx.fillRect(0, 290, 512, 222);
  for (let row = 0; row < 14; row++) {
    for (let col = 0; col < 16; col++) {
      const ox = (row % 2) * 16;
      hCtx.strokeStyle = '#7c3923';
      hCtx.lineWidth = 2;
      hCtx.strokeRect(col * 32 + ox, 292 + row * 16, 32, 16);
    }
  }
  // Upper limewash & decorative border
  hCtx.fillStyle = '#b45309';
  hCtx.fillRect(0, 272, 512, 18);
  hCtx.fillStyle = '#475569';
  hCtx.fillRect(64, 96, 88, 120);
  hCtx.fillRect(360, 96, 88, 120);
  hCtx.strokeStyle = '#f8fafc';
  hCtx.lineWidth = 6;
  hCtx.strokeRect(64, 96, 88, 120);
  hCtx.strokeRect(360, 96, 88, 120);
  const haveliBrick = finalizeColorTexture(hCanvas, maxAnisotropy, 1, 1);

  // 6. Gurugram Cyber City Glass Curtain Wall
  const [cCanvas, cCtx] = makeCanvas(512, 512);
  cCtx.fillStyle = '#0f172a';
  cCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 8; col++) {
      const lit = (row * 7 + col * 11) % 5 === 0;
      const warm = (row + col) % 7 === 0;
      cCtx.fillStyle = lit
        ? warm
          ? '#fde68a'
          : '#38bdf8'
        : (row + col) % 2 === 0
          ? '#1e293b'
          : '#172554';
      cCtx.fillRect(col * 64 + 4, row * 32 + 4, 56, 24);
    }
  }
  const cyberGlass = finalizeColorTexture(cCanvas, maxAnisotropy, 2, 4);

  // 7. Tau Da Dhaba Signboard
  const [dCanvas, dCtx] = makeCanvas(512, 192);
  dCtx.fillStyle = '#7c2d12';
  dCtx.fillRect(0, 0, 512, 192);
  dCtx.strokeStyle = '#f59e0b';
  dCtx.lineWidth = 10;
  dCtx.strokeRect(10, 10, 492, 172);
  dCtx.fillStyle = '#fef3c7';
  dCtx.font = 'bold 46px sans-serif';
  dCtx.textAlign = 'center';
  dCtx.fillText('TAU DA DHABA', 256, 88);
  dCtx.fillStyle = '#fbbf24';
  dCtx.font = '600 24px sans-serif';
  dCtx.fillText('NH-48 · DESI GHEE PARATHE & CHAI', 256, 138);
  const dhabaSign = finalizeColorTexture(dCanvas, maxAnisotropy);
  dhabaSign.wrapS = THREE.ClampToEdgeWrapping;
  dhabaSign.wrapT = THREE.ClampToEdgeWrapping;

  // 8. NH-48 Highway Overhead Gantry Sign
  const [gantryCanvas, ganCtx] = makeCanvas(1024, 256);
  ganCtx.fillStyle = '#065f46';
  ganCtx.fillRect(0, 0, 1024, 256);
  ganCtx.strokeStyle = '#f8fafc';
  ganCtx.lineWidth = 12;
  ganCtx.strokeRect(14, 14, 996, 228);
  ganCtx.fillStyle = '#ffffff';
  ganCtx.font = 'bold 48px sans-serif';
  ganCtx.textAlign = 'left';
  ganCtx.fillText('GURUGRAM CYBER CITY  ↗', 52, 92);
  ganCtx.fillText('←  KHERI KALAN · ROHTAK', 52, 168);
  ganCtx.fillStyle = '#fbbf24';
  ganCtx.font = 'bold 34px sans-serif';
  ganCtx.textAlign = 'right';
  ganCtx.fillText('NH-48 EXPRESSWAY', 964, 100);
  ganCtx.fillStyle = '#d1fae5';
  ganCtx.font = '600 26px sans-serif';
  ganCtx.fillText('PANIPAT · KARNAL · HISAR', 964, 168);
  const highwayGantry = finalizeColorTexture(gantryCanvas, maxAnisotropy);
  highwayGantry.wrapS = THREE.ClampToEdgeWrapping;
  highwayGantry.wrapT = THREE.ClampToEdgeWrapping;

  // 9. Brahma Sarovar Stone Ghat
  const [sCanvas, sCtx] = makeCanvas(512, 512);
  sCtx.fillStyle = '#c9ad88';
  sCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 8; col++) {
      sCtx.strokeStyle = '#9c7e59';
      sCtx.lineWidth = 3;
      sCtx.strokeRect(col * 64, row * 32, 64, 32);
    }
  }
  const stoneGhat = finalizeColorTexture(sCanvas, maxAnisotropy, 3, 3);

  // 10. Soft Radial Contact Shadow
  const [shCanvas, shCtx] = makeCanvas(256, 256);
  const rad = shCtx.createRadialGradient(128, 128, 16, 128, 128, 124);
  rad.addColorStop(0, 'rgba(0,0,0,0.68)');
  rad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  shCtx.fillStyle = rad;
  shCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  return {
    asphaltRoad,
    villageRoad,
    terrainGrass,
    mustardField,
    haveliBrick,
    cyberGlass,
    dhabaSign,
    highwayGantry,
    stoneGhat,
    contactShadow,
    dispose: () => {
      asphaltRoad.dispose();
      villageRoad.dispose();
      terrainGrass.dispose();
      mustardField.dispose();
      haveliBrick.dispose();
      cyberGlass.dispose();
      dhabaSign.dispose();
      highwayGantry.dispose();
      stoneGhat.dispose();
      contactShadow.dispose();
    },
  };
}
