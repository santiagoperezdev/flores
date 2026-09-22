import * as THREE from 'three';

/**
 * Procedural 3D Sunflowers & Wildflowers Generator
 * Multi-layer petals radiating 360° around Fibonacci disc,
 * botanical calyx, smooth organic bloom animation, and wind physics.
 */

export class FlowerGarden {
  constructor(scene) {
    this.scene = scene;
    this.flowers = [];
    this.grassMeshes = [];
    this.bloomProgress = 0;
    this.targetBloom = 0;

    this.initTextures();
    this.initSharedGeometries();
    this.buildGarden();
    this.buildWildFlowers();
  }

  initTextures() {
    // 1. Sunflower center floret texture (Fibonacci phyllotaxis)
    const discCanvas = document.createElement('canvas');
    discCanvas.width = 512;
    discCanvas.height = 512;
    const ctx = discCanvas.getContext('2d');

    // Velvety brown radial gradient
    const bgGrad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    bgGrad.addColorStop(0, '#231105');
    bgGrad.addColorStop(0.5, '#381b08');
    bgGrad.addColorStop(0.8, '#592e0a');
    bgGrad.addColorStop(0.96, '#94530f');
    bgGrad.addColorStop(1, '#caa025');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Procedural seeds in golden spiral (Fibonacci)
    const goldenAngle = 137.507764 * (Math.PI / 180);
    const totalSeeds = 950;
    for (let i = 0; i < totalSeeds; i++) {
      const r = (Math.sqrt(i) / Math.sqrt(totalSeeds)) * 242;
      const theta = i * goldenAngle;
      const x = 256 + Math.cos(theta) * r;
      const y = 256 + Math.sin(theta) * r;

      ctx.beginPath();
      ctx.arc(x, y, 2.2 + (r / 242) * 1.6, 0, Math.PI * 2);

      if (r > 200) {
        ctx.fillStyle = (i % 2 === 0) ? '#ffb703' : '#fb8500';
      } else if (r > 130) {
        ctx.fillStyle = '#6e380f';
      } else {
        ctx.fillStyle = '#1e0c03';
      }
      ctx.fill();
    }

    this.discTexture = new THREE.CanvasTexture(discCanvas);

    // 2. Petal gradient texture (Deep honey amber base -> Sunny radiant tip)
    const petalCanvas = document.createElement('canvas');
    petalCanvas.width = 128;
    petalCanvas.height = 256;
    const pCtx = petalCanvas.getContext('2d');

    const petalGrad = pCtx.createLinearGradient(0, 256, 0, 0);
    petalGrad.addColorStop(0, '#d95d00');    // deep amber base
    petalGrad.addColorStop(0.22, '#f68e00'); // golden orange
    petalGrad.addColorStop(0.65, '#ffc200'); // radiant sunflower yellow
    petalGrad.addColorStop(1, '#fff5b8');    // soft bright sunlight tip
    pCtx.fillStyle = petalGrad;
    pCtx.fillRect(0, 0, 128, 256);

    // Delicate longitudinal veins
    pCtx.strokeStyle = 'rgba(210, 80, 0, 0.22)';
    pCtx.lineWidth = 1.8;
    for (let x = 20; x <= 108; x += 16) {
      pCtx.beginPath();
      pCtx.moveTo(64, 256);
      pCtx.quadraticCurveTo(x, 120, x, 0);
      pCtx.stroke();
    }

    this.petalTexture = new THREE.CanvasTexture(petalCanvas);

    // Shared Materials
    this.stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d5c22,
      roughness: 0.65,
      metalness: 0.08
    });

    this.leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x32531a,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.calyxMaterial = new THREE.MeshStandardMaterial({
      color: 0x274315,
      roughness: 0.7,
      metalness: 0.05
    });

    this.petalMaterial = new THREE.MeshStandardMaterial({
      map: this.petalTexture,
      roughness: 0.32,
      metalness: 0.05,
      emissive: new THREE.Color(0xffaa00),
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide
    });

    this.discMaterial = new THREE.MeshStandardMaterial({
      map: this.discTexture,
      roughness: 0.82,
      metalness: 0.08
    });
  }

  // Sculpted petal mesh with base at y=0, extending along +Y, with natural cupping
  createSculptedPetalGeometry(width = 0.34, length = 1.35) {
    const geom = new THREE.PlaneGeometry(width, length, 8, 16);
    // Shift origin so base is at (0, 0, 0) and petal extends along +Y to y = length
    geom.translate(0, length / 2, 0);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const ny = THREE.MathUtils.clamp(y / length, 0, 1);

      // Teardrop taper: wide in the middle, narrow base & pointy tip
      const taper = Math.sin(ny * Math.PI);
      x *= Math.pow(taper, 0.68);

      // Longitudinal trough (cup curve)
      z += Math.sin(ny * Math.PI) * (width * 0.38);

      // Tip gentle curve backward
      z -= Math.pow(ny, 2.2) * (width * 0.28);

      pos.setXYZ(i, x, y, z);
    }

    geom.computeVertexNormals();
    return geom;
  }

  createSculptedLeafGeometry(width = 0.65, length = 1.35) {
    const geom = new THREE.PlaneGeometry(width, length, 6, 12);
    geom.translate(0, length / 2, 0);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const ny = THREE.MathUtils.clamp(y / length, 0, 1);
      x *= Math.sin(ny * Math.PI);
      z += Math.sin(ny * Math.PI) * 0.18;

      pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();
    return geom;
  }

  initSharedGeometries() {
    this.petalGeomOuter = this.createSculptedPetalGeometry(0.35, 1.38);
    this.petalGeomInner = this.createSculptedPetalGeometry(0.29, 1.12);
    this.sepalGeom = this.createSculptedPetalGeometry(0.22, 0.65);
    this.leafGeom = this.createSculptedLeafGeometry(0.65, 1.35);
  }

  createSunflower(config = {}) {
    const {
      height = 4.2,
      discRadius = 0.65,
      petalCount = 34,
      position = new THREE.Vector3(0, 0, 0),
      swayOffset = 0,
      scale = 1.0,
      lookTargetOffset = new THREE.Vector3(0, 0.8, 4.0)
    } = config;

    const flowerGroup = new THREE.Group();
    flowerGroup.position.copy(position);
    flowerGroup.scale.setScalar(scale);

    // 1. Organic Sinuous Stem (Curve)
    const curvePoints = [];
    const segments = 6;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = Math.sin(t * Math.PI * 0.8) * 0.3 * (config.tiltX || 1);
      const z = Math.sin(t * Math.PI * 0.6) * 0.25 * (config.tiltZ || 1);
      const y = t * height;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    const stemCurve = new THREE.CatmullRomCurve3(curvePoints);
    const stemGeom = new THREE.TubeGeometry(stemCurve, 24, 0.085, 8, false);
    const stemMesh = new THREE.Mesh(stemGeom, this.stemMaterial);
    stemMesh.castShadow = true;
    stemMesh.receiveShadow = true;
    flowerGroup.add(stemMesh);

    // 2. Foliage Leaves along stem
    const leafCount = 3;
    for (let l = 1; l <= leafCount; l++) {
      const t = l / (leafCount + 1);
      const point = stemCurve.getPoint(t);
      const leafGroup = new THREE.Group();
      leafGroup.position.copy(point);

      leafGroup.rotation.y = l * 2.3 + swayOffset;
      leafGroup.rotation.x = 0.75;
      leafGroup.rotation.z = (l % 2 === 0 ? 0.35 : -0.35);

      const leafMesh = new THREE.Mesh(this.leafGeom, this.leafMaterial);
      leafMesh.castShadow = true;
      leafGroup.add(leafMesh);
      flowerGroup.add(leafGroup);
    }

    // 3. Sunflower Head Group at stem tip
    const tipPoint = stemCurve.getPoint(1);
    const headGroup = new THREE.Group();
    headGroup.position.copy(tipPoint);

    // Heliotropism: Sunflower face (+Z) faces towards the sun/camera
    const target = tipPoint.clone().add(lookTargetOffset);
    headGroup.lookAt(target);

    // Flower Receptacle Back (Green calyx backing)
    const calyxGeom = new THREE.CylinderGeometry(discRadius * 0.98, discRadius * 0.7, 0.16, 32);
    const calyxMesh = new THREE.Mesh(calyxGeom, this.calyxMaterial);
    calyxMesh.rotation.x = Math.PI / 2;
    calyxMesh.position.z = -0.09;
    calyxMesh.castShadow = true;
    headGroup.add(calyxMesh);

    // Front Center Disc (Fibonacci Seed Center facing +Z)
    const discGeom = new THREE.CylinderGeometry(discRadius, discRadius * 0.98, 0.12, 32);
    const discMesh = new THREE.Mesh(discGeom, this.discMaterial);
    discMesh.rotation.x = Math.PI / 2;
    discMesh.position.z = 0.04;
    discMesh.castShadow = true;
    headGroup.add(discMesh);

    // Sepals (Green leafy bracts on the calyx rim)
    const sepalCount = 22;
    for (let s = 0; s < sepalCount; s++) {
      const angle = (s / sepalCount) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.rotation.z = angle;

      const sepal = new THREE.Mesh(this.sepalGeom, this.calyxMaterial);
      sepal.position.set(0, discRadius * 0.92, -0.08);
      sepal.rotation.x = 0.45; // flare slightly backward around calyx
      pivot.add(sepal);
      headGroup.add(pivot);
    }

    // Two Interleaved Concentric Layers of Golden Petals
    const petalHinges = [];
    const outerCount = Math.floor(petalCount * 0.58);
    const innerCount = petalCount - outerCount;

    // Layer 1: Outer Petals (360° circle)
    for (let p = 0; p < outerCount; p++) {
      const angle = (p / outerCount) * Math.PI * 2;
      const pivot = new THREE.Group();
      pivot.rotation.z = angle;

      // Hinge at the disc perimeter
      const hinge = new THREE.Group();
      hinge.position.set(0, discRadius * 0.92, 0.01);

      const petalMesh = new THREE.Mesh(this.petalGeomOuter, this.petalMaterial);
      petalMesh.castShadow = true;
      hinge.add(petalMesh);

      // Data for blooming animation
      // closed: folded forward like a bud (+0.8 rad)
      // open: spread flat and slightly curved backward (-0.12 rad)
      hinge.userData = {
        closedAngle: 0.85 + (p % 3) * 0.05,
        openAngle: -0.12 + (Math.random() - 0.5) * 0.08,
        flutterOffset: p * 0.4
      };
      hinge.rotation.x = hinge.userData.closedAngle;

      pivot.add(hinge);
      headGroup.add(pivot);
      petalHinges.push(hinge);
    }

    // Layer 2: Inner Petals (offset angle for dense lush look)
    const angleOffset = Math.PI / innerCount;
    for (let p = 0; p < innerCount; p++) {
      const angle = (p / innerCount) * Math.PI * 2 + angleOffset;
      const pivot = new THREE.Group();
      pivot.rotation.z = angle;

      const hinge = new THREE.Group();
      hinge.position.set(0, discRadius * 0.8, 0.06);

      const petalMesh = new THREE.Mesh(this.petalGeomInner, this.petalMaterial);
      petalMesh.castShadow = true;
      hinge.add(petalMesh);

      hinge.userData = {
        closedAngle: 0.95 + (p % 2) * 0.05,
        openAngle: -0.05 + (Math.random() - 0.5) * 0.06,
        flutterOffset: p * 0.5 + 1.2
      };
      hinge.rotation.x = hinge.userData.closedAngle;

      pivot.add(hinge);
      headGroup.add(pivot);
      petalHinges.push(hinge);
    }

    flowerGroup.add(headGroup);
    this.scene.add(flowerGroup);

    const flowerData = {
      group: flowerGroup,
      headGroup: headGroup,
      petalHinges: petalHinges,
      basePos: position.clone(),
      height: height,
      swayOffset: swayOffset,
      swaySpeed: 1.1 + Math.random() * 0.35,
      scale: scale
    };

    this.flowers.push(flowerData);
    return flowerData;
  }

  buildGarden() {
    // Rich, lush arrangement of 14 majestic sunflowers
    const configs = [
      // 1. Grand central sunflower (the queen)
      { height: 4.8, discRadius: 0.72, petalCount: 40, position: new THREE.Vector3(0, 0, 0), tiltX: 0.1, tiltZ: 0.1, swayOffset: 0, scale: 1.2, lookTargetOffset: new THREE.Vector3(0, 0.6, 5) },

      // Inner Core Ring (4 prominent sunflowers)
      { height: 4.3, discRadius: 0.64, petalCount: 36, position: new THREE.Vector3(-1.3, 0, 0.4), tiltX: -0.6, tiltZ: 0.3, swayOffset: 1.2, scale: 1.05, lookTargetOffset: new THREE.Vector3(0.4, 0.7, 4.5) },
      { height: 4.4, discRadius: 0.65, petalCount: 36, position: new THREE.Vector3(1.3, 0, 0.2), tiltX: 0.7, tiltZ: -0.2, swayOffset: 2.5, scale: 1.08, lookTargetOffset: new THREE.Vector3(-0.4, 0.7, 4.5) },
      { height: 3.8, discRadius: 0.58, petalCount: 32, position: new THREE.Vector3(-0.5, 0, 1.2), tiltX: -0.2, tiltZ: 0.7, swayOffset: 3.8, scale: 0.98, lookTargetOffset: new THREE.Vector3(0, 0.8, 4) },
      { height: 5.1, discRadius: 0.68, petalCount: 38, position: new THREE.Vector3(0.4, 0, -1.3), tiltX: 0.3, tiltZ: -0.6, swayOffset: 5.0, scale: 1.15, lookTargetOffset: new THREE.Vector3(0, 1.0, 5) },

      // Mid-Field Ring (5 sunflowers giving depth and volume)
      { height: 3.9, discRadius: 0.60, petalCount: 34, position: new THREE.Vector3(-2.3, 0, -0.6), tiltX: -0.9, tiltZ: -0.2, swayOffset: 1.8, scale: 1.0, lookTargetOffset: new THREE.Vector3(0.8, 0.9, 4.5) },
      { height: 4.1, discRadius: 0.62, petalCount: 34, position: new THREE.Vector3(2.4, 0, -0.4), tiltX: 0.9, tiltZ: -0.3, swayOffset: 3.2, scale: 1.02, lookTargetOffset: new THREE.Vector3(-0.8, 0.9, 4.5) },
      { height: 3.4, discRadius: 0.54, petalCount: 30, position: new THREE.Vector3(-1.8, 0, 1.3), tiltX: -0.5, tiltZ: 0.8, swayOffset: 4.4, scale: 0.92, lookTargetOffset: new THREE.Vector3(0.6, 0.8, 4.2) },
      { height: 3.5, discRadius: 0.55, petalCount: 30, position: new THREE.Vector3(1.8, 0, 1.1), tiltX: 0.6, tiltZ: 0.7, swayOffset: 2.1, scale: 0.94, lookTargetOffset: new THREE.Vector3(-0.6, 0.8, 4.2) },
      { height: 4.6, discRadius: 0.64, petalCount: 36, position: new THREE.Vector3(-1.0, 0, -1.8), tiltX: -0.3, tiltZ: -0.8, swayOffset: 5.7, scale: 1.08, lookTargetOffset: new THREE.Vector3(0.3, 1.1, 5) },

      // Foreground & Flanks (4 sunflowers close and warm)
      { height: 2.8, discRadius: 0.50, petalCount: 28, position: new THREE.Vector3(0.8, 0, 2.1), tiltX: 0.3, tiltZ: 0.9, swayOffset: 0.9, scale: 0.88, lookTargetOffset: new THREE.Vector3(-0.2, 0.7, 3.8) },
      { height: 2.9, discRadius: 0.52, petalCount: 28, position: new THREE.Vector3(-1.0, 0, 2.2), tiltX: -0.4, tiltZ: 0.9, swayOffset: 3.4, scale: 0.90, lookTargetOffset: new THREE.Vector3(0.2, 0.7, 3.8) },
      { height: 4.5, discRadius: 0.63, petalCount: 34, position: new THREE.Vector3(1.2, 0, -1.9), tiltX: 0.4, tiltZ: -0.8, swayOffset: 4.8, scale: 1.06, lookTargetOffset: new THREE.Vector3(-0.3, 1.1, 5) },
      { height: 3.3, discRadius: 0.54, petalCount: 30, position: new THREE.Vector3(2.9, 0, 0.8), tiltX: 0.8, tiltZ: 0.4, swayOffset: 2.9, scale: 0.92, lookTargetOffset: new THREE.Vector3(-0.9, 0.8, 4.2) }
    ];

    configs.forEach(cfg => this.createSunflower(cfg));
  }

  buildWildFlowers() {
    // Carpet of 85 wild daisies & dandelions on the meadow
    const wildCount = 85;
    const miniPetalGeom = this.createSculptedPetalGeometry(0.12, 0.48);
    const miniDiscGeom = new THREE.CylinderGeometry(0.12, 0.11, 0.05, 14);

    const miniMat = new THREE.MeshStandardMaterial({
      color: 0xffcd2b,
      roughness: 0.38,
      emissive: new THREE.Color(0xffaa00),
      emissiveIntensity: 0.22,
      side: THREE.DoubleSide
    });

    const miniDiscMat = new THREE.MeshStandardMaterial({
      color: 0x4a2408,
      roughness: 0.8
    });

    for (let i = 0; i < wildCount; i++) {
      const radius = Math.random() * 5.2 + 1.2;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = Math.random() * 1.3 + 0.5;

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      // Stem
      const stemGeom = new THREE.CylinderGeometry(0.018, 0.026, h, 6);
      stemGeom.translate(0, h / 2, 0);
      const stem = new THREE.Mesh(stemGeom, this.stemMaterial);
      group.add(stem);

      // Head
      const head = new THREE.Group();
      head.position.set(0, h, 0);
      head.lookAt(new THREE.Vector3(x * 0.4, h + 1.5, z * 0.4 + 2.0));

      const disc = new THREE.Mesh(miniDiscGeom, miniDiscMat);
      disc.rotation.x = Math.PI / 2;
      head.add(disc);

      const pCount = 16;
      for (let p = 0; p < pCount; p++) {
        const pAng = (p / pCount) * Math.PI * 2;
        const pivot = new THREE.Group();
        pivot.rotation.z = pAng;

        const petal = new THREE.Mesh(miniPetalGeom, miniMat);
        petal.position.set(0, 0.11, 0.01);
        petal.rotation.x = 0.05;
        pivot.add(petal);
        head.add(pivot);
      }

      group.add(head);
      this.scene.add(group);
      this.grassMeshes.push({ group, offset: i, speed: 1.4 + Math.random() * 0.6 });
    }
  }

  triggerBloom() {
    this.targetBloom = 1.0;
  }

  update(delta, time, audioIntensity = 0) {
    // Smooth bloom transition (0 to 1)
    this.bloomProgress += (this.targetBloom - this.bloomProgress) * (delta * 1.4);

    // Update Sunflowers
    this.flowers.forEach((flower) => {
      const swayTime = time * flower.swaySpeed + flower.swayOffset;
      const audioBoost = 1.0 + audioIntensity * 0.45;

      // Natural stem breeze oscillation
      flower.group.rotation.z = Math.sin(swayTime) * 0.045 * audioBoost;
      flower.group.rotation.x = Math.cos(swayTime * 0.85) * 0.03 * audioBoost;

      // Radial 360° blooming for every petal hinge
      flower.petalHinges.forEach(hinge => {
        const targetRot = THREE.MathUtils.lerp(
          hinge.userData.closedAngle,
          hinge.userData.openAngle,
          this.bloomProgress
        );
        // Gentle organic breeze flutter along the petal's radial hinge
        const flutter = Math.sin(time * 3.8 + hinge.userData.flutterOffset) * 0.035;
        hinge.rotation.x = targetRot + flutter;
      });

      // Subtle living head breathing
      flower.headGroup.rotation.z = Math.sin(time * 0.6 + flower.swayOffset) * 0.04;
    });

    // Sway wild daisies
    this.grassMeshes.forEach(item => {
      item.group.rotation.z = Math.sin(time * item.speed + item.offset) * 0.05;
      item.group.rotation.x = Math.cos(time * item.speed * 0.8 + item.offset) * 0.035;
    });
  }
}
