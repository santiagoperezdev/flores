import * as THREE from 'three';

/**
 * Creates and updates:
 * - Golden atmospheric pollen floating through the air
 * - Fireflies (luciérnagas) that glow and weave around the bouquet
 * - Dynamic touch/click burst particles
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pollenParticles = null;
    this.fireflies = [];
    this.bursts = [];

    this.initPollen();
    this.initFireflies();
  }

  // Soft glowing texture for particles generated via Canvas (no external image needed)
  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 245, 200, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 210, 80, 0.85)');
    gradient.addColorStop(0.5, 'rgba(240, 160, 20, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  createPetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.translate(32, 32);
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.bezierCurveTo(16, -14, 20, 12, 0, 26);
    ctx.bezierCurveTo(-20, 12, -16, -14, 0, -26);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, -26, 0, 26);
    grad.addColorStop(0, '#fff4a3');
    grad.addColorStop(0.6, '#ffcc00');
    grad.addColorStop(1, '#ff9900');
    ctx.fillStyle = grad;
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  initPollen() {
    const count = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const speedOffsets = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = Math.random() * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22;

      scales[i] = Math.random() * 0.45 + 0.15;

      speedOffsets[i * 3 + 0] = (Math.random() - 0.5) * 0.3;
      speedOffsets[i * 3 + 1] = Math.random() * 0.4 + 0.2; // upward drift
      speedOffsets[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      map: this.createGlowTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(0xffd700)
    });

    this.pollenParticles = new THREE.Points(geometry, material);
    this.pollenSpeedOffsets = speedOffsets;
    this.scene.add(this.pollenParticles);
  }

  initFireflies() {
    const count = 28;
    const glowMap = this.createGlowTexture();

    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: glowMap,
        color: new THREE.Color(0xffea78),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(mat);
      const scale = Math.random() * 0.35 + 0.25;
      sprite.scale.set(scale, scale, 1);

      this.fireflies.push({
        mesh: sprite,
        basePos: new THREE.Vector3(
          (Math.random() - 0.5) * 9,
          Math.random() * 5 + 0.5,
          (Math.random() - 0.5) * 9
        ),
        radius: Math.random() * 1.8 + 0.8,
        speed: Math.random() * 0.8 + 0.4,
        phase: Math.random() * Math.PI * 2,
        blinkSpeed: Math.random() * 2.5 + 1.2,
        baseScale: scale
      });

      this.scene.add(sprite);
    }
  }

  // Triggered on user touch or click
  createBurst(worldPos) {
    const count = 35;
    const glowMap = this.createGlowTexture();
    const petalMap = this.createPetalTexture();
    const group = new THREE.Group();

    const particles = [];
    for (let i = 0; i < count; i++) {
      const isPetal = Math.random() > 0.45;
      const mat = new THREE.SpriteMaterial({
        map: isPetal ? petalMap : glowMap,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 1
      });
      const sprite = new THREE.Sprite(mat);
      const size = isPetal ? Math.random() * 0.35 + 0.2 : Math.random() * 0.25 + 0.15;
      sprite.scale.set(size, size, 1);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4.5,
        Math.random() * 4.0 + 1.5,
        (Math.random() - 0.5) * 4.5
      );

      sprite.position.copy(worldPos);
      group.add(sprite);

      particles.push({
        mesh: sprite,
        vel: vel,
        rotSpeed: (Math.random() - 0.5) * 6,
        life: 1.0,
        decay: Math.random() * 0.5 + 0.6
      });
    }

    this.scene.add(group);
    this.bursts.push({ group, particles });
  }

  update(delta, time, audioIntensity = 0) {
    // Update Pollen Drift
    if (this.pollenParticles) {
      const positions = this.pollenParticles.geometry.attributes.position.array;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        positions[idx + 0] += Math.sin(time * 0.8 + i) * 0.006 + this.pollenSpeedOffsets[idx + 0] * delta;
        positions[idx + 1] += this.pollenSpeedOffsets[idx + 1] * delta * (1.0 + audioIntensity * 0.8);
        positions[idx + 2] += Math.cos(time * 0.8 + i) * 0.006 + this.pollenSpeedOffsets[idx + 2] * delta;

        // Reset if too high
        if (positions[idx + 1] > 12) {
          positions[idx + 1] = 0.2;
          positions[idx + 0] = (Math.random() - 0.5) * 22;
          positions[idx + 2] = (Math.random() - 0.5) * 22;
        }
      }
      this.pollenParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Update Fireflies
    this.fireflies.forEach(f => {
      const t = time * f.speed + f.phase;
      f.mesh.position.x = f.basePos.x + Math.sin(t) * f.radius;
      f.mesh.position.y = f.basePos.y + Math.sin(t * 1.5) * (f.radius * 0.6);
      f.mesh.position.z = f.basePos.z + Math.cos(t) * f.radius;

      // Glowing pulsating intensity
      const pulse = (Math.sin(time * f.blinkSpeed + f.phase) * 0.5 + 0.5) * (0.6 + audioIntensity * 0.4);
      const currentScale = f.baseScale * (0.8 + pulse * 0.6);
      f.mesh.scale.set(currentScale, currentScale, 1);
      f.mesh.material.opacity = 0.3 + pulse * 0.7;
    });

    // Update Bursts
    for (let b = this.bursts.length - 1; b >= 0; b--) {
      const burst = this.bursts[b];
      let aliveCount = 0;

      burst.particles.forEach(p => {
        p.life -= p.decay * delta;
        if (p.life > 0) {
          aliveCount++;
          p.vel.y -= 3.2 * delta; // gentle gravity
          p.vel.x *= 0.98;
          p.vel.z *= 0.98;
          p.mesh.position.addScaledVector(p.vel, delta);
          p.mesh.material.opacity = Math.max(0, p.life);
        } else {
          p.mesh.visible = false;
        }
      });

      if (aliveCount === 0) {
        this.scene.remove(burst.group);
        this.bursts.splice(b, 1);
      }
    }
  }
}
