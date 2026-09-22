import * as THREE from 'three';

/**
 * High-performance procedural 3D grass field
 * Uses InstancedMesh (5,500 blades) with silky-smooth GPU vertex wind waves
 * and coordinated world-space physics.
 */

export class GrassField {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.count = options.count || 5500;
    this.radius = options.radius || 11.5;
    this.windTime = 0;
    this.initGrass();
  }

  createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 128, 0, 0);
    grad.addColorStop(0, '#0f2409');    // deep earthy shadow at root
    grad.addColorStop(0.2, '#1a4611');  // lush forest green
    grad.addColorStop(0.65, '#41821e'); // vibrant sun-kissed green
    grad.addColorStop(1, '#a1c836');    // golden sunlight highlight
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  createBladeGeometry() {
    // Sculpted curved blade of grass (4 vertical segments for smooth organic arching)
    const geom = new THREE.PlaneGeometry(0.08, 1.05, 1, 4);
    // Base anchored at y=0, blade extends to y=1.05
    geom.translate(0, 0.525, 0);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const ny = THREE.MathUtils.clamp(y / 1.05, 0, 1);

      // Taper blade gracefully to tip
      x *= (1.0 - ny * 0.82);

      // Natural resting arch forward
      z += Math.pow(ny, 1.9) * 0.16;

      pos.setXYZ(i, x, y, z);
    }

    geom.computeVertexNormals();
    return geom;
  }

  initGrass() {
    const bladeGeom = this.createBladeGeometry();
    const grassTex = this.createGrassTexture();

    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // Custom GPU Wind Vertex Shader (Silky smooth, continuous phase)
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = { value: 0 };
      grassMat.userData.shader = shader;

      shader.vertexShader = `
        uniform float uWindTime;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>

        // Height along blade: 0.0 at root, 1.0 at tip
        float ny = clamp(position.y / 1.05, 0.0, 1.0);

        // Instance origin in world space
        vec4 instWorld = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

        // Continuous spatial wind waves across the field
        float wave1 = sin(uWindTime * 2.4 + instWorld.x * 0.38 + instWorld.z * 0.30);
        float wave2 = cos(uWindTime * 1.6 + instWorld.x * 0.22 - instWorld.z * 0.32);
        float gust = sin(uWindTime * 0.85 + instWorld.x * 0.12 + instWorld.z * 0.12) * 0.5 + 0.5;

        // Unified world-space wind displacement vector
        vec3 worldWind = vec3(
          (wave1 * 0.30 + wave2 * 0.10) * (0.8 + gust * 0.45),
          0.0,
          (wave2 * 0.22 + wave1 * 0.07) * (0.8 + gust * 0.45)
        );

        // Convert world wind into blade's local coordinate system
        // (Ensures all blades sway together in the same world direction)
        mat3 instRot = mat3(instanceMatrix);
        vec3 localWind = worldWind * instRot;

        // Quadratic curve: roots are firmly pinned, tips sway freely in the breeze
        float bend = pow(ny, 1.75);
        transformed.xyz += localWind * bend;
        transformed.y -= length(localWind.xz) * 0.15 * bend;
        `
      );
    };

    this.instancedGrass = new THREE.InstancedMesh(bladeGeom, grassMat, this.count);
    this.instancedGrass.castShadow = true;
    this.instancedGrass.receiveShadow = true;

    // Distribute instances across the garden mound
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.count; i++) {
      // Uniform disc distribution
      const r = Math.sqrt(Math.random()) * this.radius;
      const theta = Math.random() * Math.PI * 2;

      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = 0.02;

      dummy.position.set(x, y, z);

      // Random rotation around Y axis
      dummy.rotation.y = Math.random() * Math.PI * 2;
      // Slight natural tilt
      dummy.rotation.x = (Math.random() - 0.5) * 0.26;
      dummy.rotation.z = (Math.random() - 0.5) * 0.26;

      // Random natural scale
      const scaleH = THREE.MathUtils.lerp(0.75, 1.4, Math.random());
      const scaleW = THREE.MathUtils.lerp(0.85, 1.25, Math.random());
      dummy.scale.set(scaleW, scaleH, scaleW);

      dummy.updateMatrix();
      this.instancedGrass.setMatrixAt(i, dummy.matrix);
    }

    this.instancedGrass.instanceMatrix.needsUpdate = true;
    this.scene.add(this.instancedGrass);
    this.material = grassMat;
  }

  update(delta, audioIntensity = 0) {
    // Integrated continuous time to eliminate any phase jumping
    this.windTime += delta * (1.65 + audioIntensity * 0.6);

    if (this.material && this.material.userData.shader) {
      this.material.userData.shader.uniforms.uWindTime.value = this.windTime;
    }
  }
}
