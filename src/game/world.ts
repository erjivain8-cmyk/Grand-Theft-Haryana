import * as THREE from 'three';
import { WorldTextures } from './textures';
import {
  buildChaupalBanyan,
  buildCyberTower,
  buildHaveli,
  buildHighwayGantry,
  buildTauDhaba,
} from './models';
import { MinimapEntity } from './types';

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface TrafficWaypoint {
  x: number;
  z: number;
}

export interface WorldRefs {
  root: THREE.Group;
  colliders: ColliderBox[];
  nightEmissiveMeshes: THREE.Mesh[];
  waterMesh: THREE.Mesh;
  landmarkMarkers: MinimapEntity[];
  trafficLoopA: TrafficWaypoint[];
  trafficLoopB: TrafficWaypoint[];
  rainSystem: THREE.Points;
  dispose: () => void;
}

// Smooth ground height function: flat plains across roads, village & Cyber City, rolling Morni Hills in SE corner
export function groundHeightAt(x: number, z: number): number {
  // Keep main roads & hubs completely flat for crisp vehicle contact
  if (Math.abs(z) < 20 || Math.abs(x + 85) < 22 || Math.abs(x - 115) < 22) {
    // Allow gentle rise only past z > 75 on Morni spur
    if (!(x > 125 && z > 65)) {
      return 0;
    }
  }
  const dx = x - 185;
  const dz = z - 145;
  const distSq = dx * dx + dz * dz;
  if (distSq < 95 * 95) {
    const t = 1 - Math.sqrt(distSq) / 95;
    return Math.pow(t, 1.5) * 14.5;
  }
  return 0;
}

export function getDistrictAt(x: number, z: number): { en: string; hi: string } {
  if (x > 65 && z < -35) return { en: 'Gurugram · Cyber City', hi: 'गुरुग्राम · साइबर सिटी' };
  if (x < -30 && z > 35) return { en: 'Kheri Kalan Village', hi: 'खेड़ी कलां गाँव' };
  if (x < -45 && z < -45) return { en: 'Kurukshetra · Sarovar Ghat', hi: 'कुरुक्षेत्र · सरोवर घाट' };
  if (x > 95 && z > 65) return { en: 'Morni Hills Ridge', hi: 'मोरनी हिल्स पहाड़ी' };
  if (Math.abs(x) < 35 && Math.abs(z - 15) < 30) return { en: 'Tau Da Dhaba · NH-48', hi: 'ताऊ दा ढाबा · NH-48' };
  if (Math.abs(z) <= 22) return { en: 'NH-48 Expressway (Sonipat–Gurugram)', hi: 'NH-48 एक्सप्रेसवे' };
  if (x < -120) return { en: 'Rohtak–Hisar Agri Belt', hi: 'रोहतक–हिसार क्षेत्र' };
  return { en: 'Haryana Heartland · Karnal Plains', hi: 'हरियाणा · करनाल मैदान' };
}

export function buildHaryanaWorld(textures: WorldTextures): WorldRefs {
  const root = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const nightEmissiveMeshes: THREE.Mesh[] = [];
  const landmarkMarkers: MinimapEntity[] = [];

  const addBoxCollider = (cx: number, cz: number, w: number, d: number) => {
    colliders.push({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
    });
  };

  // 1. Extended Terrain Mesh (1400 x 1400 with vertex height for Morni Hills)
  const terrainGeo = new THREE.PlaneGeometry(1400, 1400, 72, 72);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(vx, vz));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.terrainGrass,
    roughness: 0.94,
    metalness: 0.0,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  root.add(terrain);

  // 2. Road Network (offset by >= 0.04m on Y to avoid Z-fighting)
  const buildAsphaltSegment = (x: number, z: number, len: number, width: number, horizontal: boolean) => {
    const tex = textures.asphaltRoad.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, Math.max(1, Math.round(len / 28)));
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.82,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, len), mat);
    mesh.rotation.x = -Math.PI / 2;
    if (horizontal) mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, 0.05, z);
    mesh.receiveShadow = true;
    root.add(mesh);
  };

  // NH-48 Main East-West Expressway (x: -240 to +240 at z = 0)
  buildAsphaltSegment(0, 0, 480, 20, true);
  // Gurugram Cyber City North-South Avenue (z: -170 to +110 at x = 115)
  buildAsphaltSegment(115, -30, 280, 16, false);
  // Kurukshetra Link North (z: -160 to 0 at x = -85)
  buildAsphaltSegment(-85, -80, 160, 14, false);
  // Outer North Ring Connector (x: -160 to +160 at z = -155)
  buildAsphaltSegment(0, -155, 320, 14, true);

  // Kheri Kalan Kharanja Brick Village Road (z: 0 to +155 at x = -85)
  const vTex = textures.villageRoad.clone();
  vTex.needsUpdate = true;
  vTex.repeat.set(1, 9);
  const villageRoadMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 155),
    new THREE.MeshStandardMaterial({
      map: vTex,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  villageRoadMesh.rotation.x = -Math.PI / 2;
  villageRoadMesh.position.set(-85, 0.06, 77.5);
  villageRoadMesh.receiveShadow = true;
  root.add(villageRoadMesh);

  // Village cross-lane at z = +88
  const vTexCross = textures.villageRoad.clone();
  vTexCross.needsUpdate = true;
  vTexCross.repeat.set(1, 6);
  const villageCross = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 120),
    new THREE.MeshStandardMaterial({ map: vTexCross, roughness: 0.9 })
  );
  villageCross.rotation.x = -Math.PI / 2;
  villageCross.rotation.z = Math.PI / 2;
  villageCross.position.set(-85, 0.065, 88);
  villageCross.receiveShadow = true;
  root.add(villageCross);

  // 3. Mustard (Sarson) & Wheat Agricultural Fields
  const fieldMat = new THREE.MeshStandardMaterial({ map: textures.mustardField, roughness: 0.92 });
  const fieldCoords: [number, number, number, number][] = [
    [-145, 55, 58, 44],
    [-145, 125, 58, 46],
    [-35, 132, 52, 44],
    [-35, -55, 54, 42],
    [35, -62, 56, 48],
    [38, 82, 62, 54],
  ];
  fieldCoords.forEach(([fx, fz, fw, fd]) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), fieldMat);
    f.rotation.x = -Math.PI / 2;
    f.position.set(fx, 0.04, fz);
    f.receiveShadow = true;
    root.add(f);
  });

  // 4. Kheri Kalan Village Buildings & Chaupal
  const chaupal = buildChaupalBanyan(textures);
  chaupal.position.set(-64, 0, 72);
  root.add(chaupal);
  addBoxCollider(-64, 72, 10, 10);
  landmarkMarkers.push({ id: 'lm_village', x: -85, z: 85, kind: 'landmark', label: 'Kheri Kalan' });

  const haveliPlacements: [number, number, number, number][] = [
    [-106, 66, Math.PI / 2, 1.0],
    [-106, 108, Math.PI / 2, 0.95],
    [-64, 108, -Math.PI / 2, 1.05],
    [-122, 88, 0, 0.9],
  ];
  haveliPlacements.forEach(([hx, hz, rot, sc]) => {
    const h = buildHaveli(textures, sc);
    h.position.set(hx, 0, hz);
    h.rotation.y = rot;
    root.add(h);
    addBoxCollider(hx, hz, 12 * sc, 10 * sc);
  });

  // 5. Tau Da Dhaba (NH-48 Pit-Stop)
  const dhaba = buildTauDhaba(textures);
  dhaba.group.position.set(0, 0, 20);
  dhaba.group.rotation.y = Math.PI; // Faces NH-48 at z=0
  root.add(dhaba.group);
  nightEmissiveMeshes.push(...dhaba.lamps);
  addBoxCollider(0, 23, 15, 7);
  landmarkMarkers.push({ id: 'lm_dhaba', x: 0, z: 20, kind: 'landmark', label: 'Tau Da Dhaba' });

  // 6. NH-48 Overhead Expressway Gantry Sign
  const gantry = buildHighwayGantry(textures);
  gantry.position.set(48, 0, 0);
  gantry.rotation.y = Math.PI / 2;
  root.add(gantry);

  // 7. Gurugram Cyber City Towers & Plaza
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(92, 92),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72, metalness: 0.15 })
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(152, 0.045, -100);
  plaza.receiveShadow = true;
  root.add(plaza);
  landmarkMarkers.push({ id: 'lm_cyber', x: 120, z: -100, kind: 'landmark', label: 'Cyber City' });

  const towerSpecs: [number, number, number, number, number, number][] = [
    [152, -78, 20, 18, 42, 0x38bdf8],
    [186, -104, 22, 20, 56, 0xf59e0b],
    [148, -132, 18, 16, 36, 0x22d3ee],
    [90, -76, 16, 16, 34, 0xf97316],
    [88, -124, 18, 18, 44, 0x38bdf8],
  ];
  towerSpecs.forEach(([tx, tz, w, d, h, accent]) => {
    const tower = buildCyberTower(textures, w, d, h, accent);
    tower.group.position.set(tx, 0, tz);
    root.add(tower.group);
    nightEmissiveMeshes.push(tower.accentBeacon);
    addBoxCollider(tx, tz, w + 3, d + 3);
  });

  // 8. Kurukshetra Brahma Sarovar Inspired Ghat
  const sarovarGroup = new THREE.Group();
  sarovarGroup.position.set(-125, 0, -105);
  const ghatDeck = new THREE.Mesh(
    new THREE.BoxGeometry(46, 0.6, 46),
    new THREE.MeshStandardMaterial({ map: textures.stoneGhat, roughness: 0.85 })
  );
  ghatDeck.position.y = 0.3;
  ghatDeck.receiveShadow = true;
  sarovarGroup.add(ghatDeck);

  const waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.MeshPhysicalMaterial({
      color: 0x0e7490,
      roughness: 0.12,
      metalness: 0.25,
      clearcoat: 1.0,
    })
  );
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = 0.64;
  sarovarGroup.add(waterMesh);

  // Sacred Chhatri Pavilion in center
  const pavilionBase = new THREE.Mesh(
    new THREE.BoxGeometry(8, 1.1, 8),
    new THREE.MeshStandardMaterial({ map: textures.stoneGhat, roughness: 0.8 })
  );
  pavilionBase.position.y = 0.85;
  sarovarGroup.add(pavilionBase);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 })
  );
  dome.position.y = 4.2;
  dome.castShadow = true;
  sarovarGroup.add(dome);

  [
    [-2.5, -2.5],
    [2.5, -2.5],
    [-2.5, 2.5],
    [2.5, 2.5],
  ].forEach(([px, pz]) => {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 3.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xe7d6bd, roughness: 0.75 })
    );
    col.position.set(px, 2.7, pz);
    sarovarGroup.add(col);
  });

  root.add(sarovarGroup);
  addBoxCollider(-125, -105, 8, 8);
  landmarkMarkers.push({ id: 'lm_sarovar', x: -125, z: -105, kind: 'landmark', label: 'Sarovar Ghat' });

  // Morni Hills marker
  landmarkMarkers.push({ id: 'lm_morni', x: 175, z: 135, kind: 'landmark', label: 'Morni Hills' });

  // 9. Highway Streetlamps (Instanced poles + glowing bulbs)
  const lampPositions: [number, number][] = [];
  for (let x = -210; x <= 210; x += 35) {
    if (Math.abs(x) > 15) {
      lampPositions.push([x, -11.5]);
      lampPositions.push([x, 11.5]);
    }
  }
  for (let z = -150; z <= 90; z += 35) {
    if (Math.abs(z) > 16) {
      lampPositions.push([105, z]);
      lampPositions.push([125, z]);
    }
  }

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.78, roughness: 0.35 });
  const poleInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, 6.8, 8), poleMat, lampPositions.length);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfbbf24, emissiveIntensity: 0.25 });
  const dummy = new THREE.Object3D();

  lampPositions.forEach(([lx, lz], idx) => {
    const gy = groundHeightAt(lx, lz);
    dummy.position.set(lx, gy + 3.4, lz);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(idx, dummy.matrix);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), bulbMat);
    bulb.position.set(lx, gy + 6.9, lz);
    root.add(bulb);
    nightEmissiveMeshes.push(bulb);
  });
  poleInst.computeBoundingSphere();
  root.add(poleInst);

  // 10. Instanced Trees (Neem, Kikar & Morni Pines) with per-instance scale & tint variation
  const treeCoords: [number, number][] = [];
  for (let i = 0; i < 110; i++) {
    const angle = i * 2.39996;
    const radius = 55 + ((i * 19) % 210);
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    // Keep off roads & main plazas
    if (Math.abs(tz) < 18 || Math.abs(tx + 85) < 18 || Math.abs(tx - 115) < 18) continue;
    if (Math.abs(tz + 155) < 16) continue;
    if (tx > 75 && tz < -45) continue;
    if (tx < -95 && tx > -155 && tz < -75 && tz > -135) continue;
    if (Math.abs(tx) < 28 && Math.abs(tz - 22) < 22) continue;
    treeCoords.push([tx, tz]);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.48, 3.6, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 });
  const canopyGeo = new THREE.DodecahedronGeometry(2.4, 1);
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 });

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
  const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCoords.length);
  trunkInst.castShadow = true;
  canopyInst.castShadow = true;
  canopyInst.receiveShadow = true;

  const tintColor = new THREE.Color();
  treeCoords.forEach(([tx, tz], idx) => {
    const gy = groundHeightAt(tx, tz);
    const s = 0.85 + ((idx * 17) % 30) / 100; // ±15% scale variation

    dummy.position.set(tx, gy + 1.8 * s, tz);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = idx * 0.7;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(tx, gy + 4.4 * s, tz);
    dummy.scale.set(s * 1.05, s * 0.95, s * 1.05);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(idx, dummy.matrix);

    const gHue = 0.25 + ((idx * 13) % 10) * 0.008;
    const light = 0.26 + ((idx * 7) % 10) * 0.014;
    tintColor.setHSL(gHue, 0.48, light);
    canopyInst.setColorAt(idx, tintColor);
  });

  trunkInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
  root.add(trunkInst, canopyInst);

  // 11. Monsoon Rain Particle System (hidden unless WeatherMode === 'rain')
  const rainCount = 1200;
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 140;
    rainPos[i * 3 + 1] = Math.random() * 48;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 140;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0xcbd5e1,
    size: 0.24,
    transparent: true,
    opacity: 0.65,
  });
  const rainSystem = new THREE.Points(rainGeo, rainMat);
  rainSystem.visible = false;
  root.add(rainSystem);

  // Traffic Loop A (Main NH-48 & Cyber City Ring)
  const trafficLoopA: TrafficWaypoint[] = [
    { x: -85, z: 4.5 },
    { x: 115, z: 4.5 },
    { x: 119, z: -155 },
    { x: -89, z: -155 },
  ];

  // Traffic Loop B (Counter-flow)
  const trafficLoopB: TrafficWaypoint[] = [
    { x: 111, z: -4.5 },
    { x: -81, z: -4.5 },
    { x: -81, z: -150 },
    { x: 111, z: -150 },
  ];

  return {
    root,
    colliders,
    nightEmissiveMeshes,
    waterMesh,
    landmarkMarkers,
    trafficLoopA,
    trafficLoopB,
    rainSystem,
    dispose: () => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    },
  };
}
