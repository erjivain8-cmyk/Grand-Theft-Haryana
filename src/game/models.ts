import * as THREE from 'three';
import { PlayableCharacterId, VehicleCustomization, VehicleType } from './types';
import { WorldTextures } from './textures';

export interface CharacterRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torso: THREE.Mesh;
}

export interface VehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  lightbarMesh?: THREE.Mesh;
  paintMeshes: THREE.Mesh[];
  wheelRadius: number;
  length: number;
  width: number;
}

export function buildCharacterModel(charId: PlayableCharacterId, contactShadowTex: THREE.Texture): CharacterRig {
  const root = new THREE.Group();

  // Contact shadow disc grounded at y=0.02
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.48 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const skinColor = charId === 'ritu' ? 0xd9a077 : 0xc68b61;
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.72, metalness: 0.04 });

  const outfitColor =
    charId === 'veer' ? 0x1e293b : charId === 'ritu' ? 0x1d4ed8 : 0xf1f5f9;
  const pantsColor =
    charId === 'veer' ? 0x0f172a : charId === 'ritu' ? 0x1e293b : 0xe2e8f0;

  const torsoMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.78, metalness: 0.06 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.82, metalness: 0.02 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x271c15, roughness: 0.55, metalness: 0.15 });

  // Legs (pivoted at hip y = 0.88)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.88, 0);
    const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.74, 0.24), pantsMat);
    legMesh.position.y = -0.37;
    legMesh.castShadow = true;
    legPivot.add(legMesh);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.32), bootMat);
    boot.position.set(0, -0.78, 0.04);
    boot.castShadow = true;
    legPivot.add(boot);
    return legPivot;
  };

  const leftLeg = makeLeg(-0.15);
  const rightLeg = makeLeg(0.15);
  root.add(leftLeg, rightLeg);

  // Torso (kurta / jacket)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.32), torsoMat);
  torso.position.y = 1.24;
  torso.castShadow = true;
  root.add(torso);

  // Accent scarf / waistcoat for authentic Haryana silhouette
  if (charId === 'veer' || charId === 'baljeet') {
    const vestColor = charId === 'baljeet' ? 0x78350f : 0x991b1b;
    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.44, 0.34),
      new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.75, metalness: 0.05 })
    );
    vest.position.y = 1.33;
    vest.castShadow = true;
    root.add(vest);
  }

  // Arms (pivoted at shoulder y = 1.54)
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.54, 0);
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.48, 0.19), torsoMat);
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), skinMat);
    hand.position.y = -0.52;
    armPivot.add(hand);
    return armPivot;
  };

  const leftArm = makeArm(-0.37);
  const rightArm = makeArm(0.37);
  root.add(leftArm, rightArm);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
  head.position.y = 1.78;
  head.castShadow = true;
  root.add(head);

  // Hair / Pagdi / Aviator Shades
  if (charId === 'baljeet') {
    // Traditional Haryanvi Pagdi (Turban)
    const pagdiMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0.02 });
    const pagdi = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.22, 12), pagdiMat);
    pagdi.position.y = 1.97;
    pagdi.castShadow = true;
    root.add(pagdi);

    const pagdiCrest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.28), pagdiMat);
    pagdiCrest.position.set(0, 2.04, 0.04);
    root.add(pagdiCrest);
  } else {
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), hairMat);
    hair.position.y = 1.96;
    root.add(hair);

    if (charId === 'ritu') {
      const ponytail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.12), hairMat);
      ponytail.position.set(0, 1.82, -0.2);
      root.add(ponytail);
    }
  }

  // Sunglasses for Veer & Ritu
  if (charId !== 'baljeet') {
    const shades = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.08, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.85 })
    );
    shades.position.set(0, 1.81, 0.16);
    root.add(shades);
  }

  return { root, leftLeg, rightLeg, leftArm, rightArm, torso };
}

export function buildVehicleModel(
  type: VehicleType,
  customization: VehicleCustomization,
  contactShadowTex: THREE.Texture,
  isSoftwareGl: boolean
): VehicleRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const wheels: THREE.Object3D[] = [];
  const frontSteerPivots: THREE.Object3D[] = [];
  const headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];
  const paintMeshes: THREE.Mesh[] = [];

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(customization.paintColor),
    roughness: 0.24,
    metalness: 0.65,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.72, metalness: 0.18 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.16, metalness: 0.92 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.88, metalness: 0.05 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e293b,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.72,
    clearcoat: 1.0,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });

  const makeWheel = (radius: number, width: number, rimColor = 0xd4d4d8) => {
    const wheelGroup = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, width + 0.02, 12),
      new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.22, metalness: 0.88 })
    );
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width + 0.04, 8),
      darkTrimMat
    );
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);
    return wheelGroup;
  };

  let wheelRadius = 0.42;
  let length = 4.6;
  let width = 2.05;
  let lightbarMesh: THREE.Mesh | undefined;

  if (type === 'suv') {
    // Garuda 4x4 SUV (Bolero / Scorpio inspired muscular Haryanvi SUV)
    wheelRadius = 0.44;
    length = 4.7;
    width = 2.1;
    const lift = customization.liftKit ? 0.14 : 0;

    // Contact shadow
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 5.4),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.55 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    root.add(shadow);

    // Lower chassis & bumpers
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.62, 4.45), paintMat);
    chassis.position.set(0, 0.72 + lift, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    bodyGroup.add(chassis);
    paintMeshes.push(chassis);

    // Hood / bonnet bulge
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.16, 1.35), paintMat);
    hood.position.set(0, 1.07 + lift, 1.48);
    hood.castShadow = true;
    bodyGroup.add(hood);
    paintMeshes.push(hood);

    // Cabin / greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.74, 2.55), paintMat);
    cabin.position.set(0, 1.38 + lift, -0.42);
    cabin.castShadow = true;
    bodyGroup.add(cabin);
    paintMeshes.push(cabin);

    // Tinted glass wrap
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.54, 0.08), glassMat);
    windshield.position.set(0, 1.38 + lift, 0.87);
    windshield.rotation.x = -0.22;
    bodyGroup.add(windshield);

    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.83, 0.48, 2.15), glassMat);
    sideGlass.position.set(0, 1.4 + lift, -0.45);
    bodyGroup.add(sideGlass);

    // Front bullbar & chrome slatted grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.36, 0.1), chromeMat);
    grille.position.set(0, 0.8 + lift, 2.24);
    bodyGroup.add(grille);

    const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.24, 0.24), darkTrimMat);
    bullbar.position.set(0, 0.56 + lift, 2.34);
    bullbar.castShadow = true;
    bodyGroup.add(bullbar);

    // Wheel arches / cladding
    const sideSteps = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.09, 2.2), darkTrimMat);
    sideSteps.position.set(0, 0.42 + lift, -0.1);
    bodyGroup.add(sideSteps);

    // Rear spare wheel mounted on tailgate
    const spare = makeWheel(0.38, 0.22);
    spare.rotation.y = Math.PI / 2;
    spare.position.set(0, 0.92 + lift, -2.32);
    bodyGroup.add(spare);

    // Roof rails & optional off-road LED lightbar
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.1), chromeMat);
    railL.position.set(-0.76, 1.79 + lift, -0.42);
    const railR = railL.clone();
    railR.position.x = 0.76;
    bodyGroup.add(railL, railR);

    lightbarMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.1, 0.14),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: customization.lightbar ? 1.5 : 0,
        roughness: 0.2,
      })
    );
    lightbarMesh.position.set(0, 1.82 + lift, 0.52);
    lightbarMesh.visible = customization.lightbar;
    bodyGroup.add(lightbarMesh);

    // Headlights & Taillights
    [-0.74, 0.74].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.08), headMat.clone());
      hl.position.set(x, 0.84 + lift, 2.23);
      bodyGroup.add(hl);
      headlights.push(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.08), tailMat.clone());
      tl.position.set(x * 1.12, 0.88 + lift, -2.23);
      bodyGroup.add(tl);
      taillights.push(tl);
    });

    // 4 wheels
    const wheelCoords: [number, number, boolean][] = [
      [-0.96, 1.44, true],
      [0.96, 1.44, true],
      [-0.96, -1.42, false],
      [0.96, -1.42, false],
    ];
    wheelCoords.forEach(([wx, wz, isFront]) => {
      const pivot = new THREE.Group();
      pivot.position.set(wx, wheelRadius, wz);
      const w = makeWheel(wheelRadius, 0.32);
      pivot.add(w);
      root.add(pivot);
      wheels.push(w);
      if (isFront) frontSteerPivots.push(pivot);
    });
  } else if (type === 'bike') {
    // Sher-e-Haryana 500 Cruiser Motorcycle (Bullet-inspired)
    wheelRadius = 0.36;
    length = 2.3;
    width = 0.85;

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.8),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.45 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 1.35), darkTrimMat);
    frame.position.set(0, 0.56, 0);
    frame.castShadow = true;
    bodyGroup.add(frame);

    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.42), chromeMat);
    engineBlock.position.set(0, 0.46, 0.08);
    bodyGroup.add(engineBlock);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.26, 0.62), paintMat);
    tank.position.set(0, 0.84, 0.24);
    tank.castShadow = true;
    bodyGroup.add(tank);
    paintMeshes.push(tank);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.68), darkTrimMat);
    seat.position.set(0, 0.78, -0.35);
    bodyGroup.add(seat);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.25, 10), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.22, 0.34, -0.34);
    bodyGroup.add(exhaust);

    // Steerable front fork + handlebars + headlamp
    const forkPivot = new THREE.Group();
    forkPivot.position.set(0, 0.82, 0.78);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.78, 8), chromeMat);
    fork.position.set(0, -0.25, 0.06);
    fork.rotation.x = -0.32;
    forkPivot.add(fork);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.76, 8), chromeMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 0.16, -0.02);
    forkPivot.add(handlebar);

    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12), headMat.clone());
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 0.06, 0.16);
    forkPivot.add(hl);
    headlights.push(hl);

    bodyGroup.add(forkPivot);
    frontSteerPivots.push(forkPivot);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), tailMat.clone());
    tl.position.set(0, 0.72, -0.84);
    bodyGroup.add(tl);
    taillights.push(tl);

    const frontWheel = makeWheel(wheelRadius, 0.14, 0xd4d4d8);
    frontWheel.position.set(0, wheelRadius, 0.88);
    const rearWheel = makeWheel(wheelRadius, 0.17, 0xd4d4d8);
    rearWheel.position.set(0, wheelRadius, -0.78);
    root.add(frontWheel, rearWheel);
    wheels.push(frontWheel, rearWheel);
  } else if (type === 'tractor') {
    // Sarpanch 750 Tractor
    wheelRadius = 0.72;
    length = 4.0;
    width = 2.25;

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 4.6),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.55 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    root.add(shadow);

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 3.2), darkTrimMat);
    chassis.position.set(0, 0.68, 0);
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.78, 1.82), paintMat);
    hood.position.set(0, 1.18, 0.76);
    hood.castShadow = true;
    bodyGroup.add(hood);
    paintMeshes.push(hood);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.05, 10), darkTrimMat);
    exhaust.position.set(0.38, 1.92, 0.92);
    exhaust.castShadow = true;
    bodyGroup.add(exhaust);

    // Mudguards over massive rear wheels
    [-0.95, 0.95].forEach((x) => {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 1.45), paintMat);
      guard.position.set(x, 1.56, -0.95);
      guard.castShadow = true;
      bodyGroup.add(guard);
      paintMeshes.push(guard);
    });

    // Driver seat & high steering wheel
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.52), darkTrimMat);
    seat.position.set(0, 1.32, -0.78);
    bodyGroup.add(seat);

    const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8), darkTrimMat);
    steeringCol.position.set(0, 1.52, -0.2);
    steeringCol.rotation.x = 0.45;
    bodyGroup.add(steeringCol);

    const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 16), darkTrimMat);
    steeringWheel.rotation.x = Math.PI / 2 + 0.45;
    steeringWheel.position.set(0, 1.76, -0.32);
    bodyGroup.add(steeringWheel);

    // Headlights
    [-0.44, 0.44].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10), headMat.clone());
      hl.rotation.x = Math.PI / 2;
      hl.position.set(x, 1.24, 1.7);
      bodyGroup.add(hl);
      headlights.push(hl);
    });

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.08), tailMat.clone());
    tl.position.set(0, 1.32, -1.65);
    bodyGroup.add(tl);
    taillights.push(tl);

    // Big rear wheels + smaller front wheels
    [-0.96, 0.96].forEach((x) => {
      const rw = makeWheel(0.74, 0.42, 0xfacc15);
      rw.position.set(x, 0.74, -0.98);
      root.add(rw);
      wheels.push(rw);

      const fp = new THREE.Group();
      fp.position.set(x * 0.78, 0.44, 1.32);
      const fw = makeWheel(0.44, 0.24, 0xfacc15);
      fp.add(fw);
      root.add(fp);
      wheels.push(fw);
      frontSteerPivots.push(fp);
    });
  } else {
    // Haryana Tuk-Tuk Auto-Rickshaw
    wheelRadius = 0.28;
    length = 2.8;
    width = 1.45;

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.0, 3.2),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.48 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    root.add(shadow);

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.72, 2.35), paintMat);
    lowerBody.position.set(0, 0.62, -0.05);
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);
    paintMeshes.push(lowerBody);

    const greenBand = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.24, 2.37),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 })
    );
    greenBand.position.set(0, 0.42, -0.05);
    bodyGroup.add(greenBand);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 2.2), darkTrimMat);
    canopy.position.set(0, 1.68, -0.1);
    canopy.castShadow = true;
    bodyGroup.add(canopy);

    // Pillars
    [
      [-0.6, 0.85],
      [0.6, 0.85],
      [-0.6, -1.1],
      [0.6, -1.1],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.78, 8), darkTrimMat);
      p.position.set(px, 1.32, pz);
      bodyGroup.add(p);
    });

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.56, 0.06), glassMat);
    windshield.position.set(0, 1.24, 1.05);
    windshield.rotation.x = -0.2;
    bodyGroup.add(windshield);

    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10), headMat.clone());
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 0.64, 1.18);
    bodyGroup.add(hl);
    headlights.push(hl);

    [-0.5, 0.5].forEach((x) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.06), tailMat.clone());
      tl.position.set(x, 0.62, -1.24);
      bodyGroup.add(tl);
      taillights.push(tl);
    });

    const fp = new THREE.Group();
    fp.position.set(0, wheelRadius, 0.96);
    const fw = makeWheel(wheelRadius, 0.18);
    fp.add(fw);
    root.add(fp);
    wheels.push(fw);
    frontSteerPivots.push(fp);

    [-0.64, 0.64].forEach((x) => {
      const rw = makeWheel(wheelRadius, 0.2);
      rw.position.set(x, wheelRadius, -0.82);
      root.add(rw);
      wheels.push(rw);
    });
  }

  return {
    root,
    bodyGroup,
    wheels,
    frontSteerPivots,
    headlights,
    taillights,
    lightbarMesh,
    paintMeshes,
    wheelRadius,
    length,
    width,
  };
}

export function buildHaveli(textures: WorldTextures, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ map: textures.haveliBrick, roughness: 0.85, metalness: 0.02 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc2b29b, roughness: 0.9 });

  const main = new THREE.Mesh(new THREE.BoxGeometry(12, 6.2, 9), wallMat);
  main.position.y = 3.1;
  main.castShadow = true;
  main.receiveShadow = true;
  g.add(main);

  // Parapet roof rim
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.65, 9.4), roofMat);
  parapet.position.y = 6.45;
  parapet.castShadow = true;
  g.add(parapet);

  // Veranda porch
  const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.35, 3.2), roofMat);
  porchRoof.position.set(0, 3.4, 5.9);
  porchRoof.castShadow = true;
  g.add(porchRoof);

  [-4.4, -1.5, 1.5, 4.4].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.3, 10), roofMat);
    pillar.position.set(px, 1.65, 7.1);
    pillar.castShadow = true;
    g.add(pillar);
  });

  // Arched/wood Haveli Gate
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 0.25), woodMat);
  door.position.set(0, 1.5, 4.55);
  g.add(door);

  g.scale.setScalar(scale);
  return g;
}

export function buildTauDhaba(textures: WorldTextures): { group: THREE.Group; lamps: THREE.Mesh[] } {
  const g = new THREE.Group();
  const lamps: THREE.Mesh[] = [];

  const concrete = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.35, 13),
    new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.92 })
  );
  concrete.position.y = 0.175;
  concrete.receiveShadow = true;
  g.add(concrete);

  // Kitchen block
  const kitchen = new THREE.Mesh(
    new THREE.BoxGeometry(14, 4.0, 6),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 })
  );
  kitchen.position.set(0, 2.35, -3);
  kitchen.castShadow = true;
  kitchen.receiveShadow = true;
  g.add(kitchen);

  // Corrugated tin shed awning
  const shed = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.22, 7.2),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.48, metalness: 0.45 })
  );
  shed.position.set(0, 4.15, 2.2);
  shed.rotation.x = 0.08;
  shed.castShadow = true;
  g.add(shed);

  // Signboard
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 2.3, 0.25),
    new THREE.MeshStandardMaterial({ map: textures.dhabaSign, roughness: 0.45, emissive: 0x451a03, emissiveIntensity: 0.25 })
  );
  sign.position.set(0, 5.45, 2.6);
  sign.castShadow = true;
  g.add(sign);

  // Support poles & string bulbs + charpai seating
  [-6.8, -2.2, 2.2, 6.8].forEach((px) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 4.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 })
    );
    pole.position.set(px, 2.0, 5.3);
    pole.castShadow = true;
    g.add(pole);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.9 })
    );
    bulb.position.set(px, 3.85, 5.3);
    g.add(bulb);
    lamps.push(bulb);
  });

  // Charpais (traditional woven cots)
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.82 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.92 });
  [-4.4, 0, 4.4].forEach((cx) => {
    const cot = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 1.25), ropeMat);
    cot.position.set(cx, 0.68, 2.6);
    cot.castShadow = true;
    g.add(cot);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.35), woodMat);
    frame.position.set(cx, 0.48, 2.6);
    g.add(frame);
  });

  return { group: g, lamps };
}

export function buildCyberTower(
  textures: WorldTextures,
  width: number,
  depth: number,
  height: number,
  accentHex: number
): { group: THREE.Group; accentBeacon: THREE.Mesh } {
  const g = new THREE.Group();

  const podium = new THREE.Mesh(
    new THREE.BoxGeometry(width + 3, 5, depth + 3),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.6 })
  );
  podium.position.y = 2.5;
  podium.castShadow = true;
  podium.receiveShadow = true;
  g.add(podium);

  const glassMat = new THREE.MeshPhysicalMaterial({
    map: textures.cyberGlass,
    roughness: 0.15,
    metalness: 0.72,
    clearcoat: 0.85,
  });

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), glassMat);
  shaft.position.y = 5 + height / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.78, 3.2, depth * 0.78),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
  );
  crown.position.y = 5 + height + 1.6;
  g.add(crown);

  const accentBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.82, 0.55, depth * 0.82),
    new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );
  accentBeacon.position.y = 5 + height + 3.4;
  g.add(accentBeacon);

  return { group: g, accentBeacon };
}

export function buildChaupalBanyan(textures: WorldTextures): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.stoneGhat, roughness: 0.88 });

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.2, 0.9, 8), stoneMat);
  platform.position.y = 0.45;
  platform.receiveShadow = true;
  platform.castShadow = true;
  g.add(platform);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.94 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.45, 5.2, 10), trunkMat);
  trunk.position.y = 3.2;
  trunk.castShadow = true;
  g.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6f29, roughness: 0.85 });
  const canopyOffsets: [number, number, number, number][] = [
    [0, 7.0, 0, 3.8],
    [-2.4, 6.1, 1.6, 2.7],
    [2.5, 6.2, -1.5, 2.8],
    [0.8, 6.5, 2.3, 2.5],
    [-1.8, 6.4, -2.1, 2.6],
  ];
  canopyOffsets.forEach(([x, y, z, r]) => {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafMat);
    puff.position.set(x, y, z);
    puff.castShadow = true;
    puff.receiveShadow = true;
    g.add(puff);
  });

  return g;
}

export function buildHighwayGantry(textures: WorldTextures): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.82, roughness: 0.32 });

  [-11.5, 11.5].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 8.2, 10), steelMat);
    leg.position.set(x, 4.1, 0);
    leg.castShadow = true;
    g.add(leg);
  });

  const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 0.55, 0.55), steelMat);
  beam.position.set(0, 7.9, 0);
  beam.castShadow = true;
  g.add(beam);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(15.5, 3.4, 0.25),
    new THREE.MeshStandardMaterial({ map: textures.highwayGantry, roughness: 0.4, emissive: 0x064e3b, emissiveIntensity: 0.18 })
  );
  board.position.set(0, 7.5, 0.32);
  board.castShadow = true;
  g.add(board);

  return g;
}
