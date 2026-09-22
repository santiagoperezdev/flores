import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FlowerGarden } from './flowers.js';
import { ParticleSystem } from './particles.js';
import { GrassField } from './grass.js';

export class WorldScene {
  constructor(container, audioManager) {
    this.container = container;
    this.audioManager = audioManager;
    this.clock = new THREE.Clock();

    // Camera animation state initialized before initCamera
    this.isIntroAnimating = true;
    this.introProgress = 0;
    this.cameraStartPos = new THREE.Vector3(0, 11, 17);
    this.cameraTargetPos = new THREE.Vector3(0, 4.2, 9.2);

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLighting();
    this.initEnvironment();
    this.initPostProcessing();
    this.initInteractions();

    // Garden, Grass & Particles
    this.grass = new GrassField(this.scene);
    this.garden = new FlowerGarden(this.scene);
    this.particles = new ParticleSystem(this.scene);

    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'highp'
    });

    // Native crisp retina resolution (up to 2.0x DPR)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e0e18);
    this.scene.fog = new THREE.FogExp2(0x0e0e18, 0.038);
  }

  initCamera() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;

    // Responsive FOV: In portrait mobile (aspect < 1.0), widen FOV so entire garden is in frame
    const baseFov = 45;
    const fov = aspect < 1.0 ? Math.min(64, baseFov / (aspect * 1.12)) : baseFov;

    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 18;
    this.controls.target.set(0, 2.6, 0);
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.55;

    // Mobile touch controls optimization
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Camera targets based on screen orientation
    if (aspect < 1.0) {
      this.cameraStartPos.set(0, 12, 19);
      this.cameraTargetPos.set(0, 4.4, 11.5);
    } else {
      this.cameraStartPos.set(0, 11, 17);
      this.cameraTargetPos.set(0, 4.2, 9.2);
    }
    this.camera.position.copy(this.cameraStartPos);
  }

  initLighting() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;

    // 1. Soft atmospheric ambient
    const ambientLight = new THREE.AmbientLight(0x3a2e48, 1.25);
    this.scene.add(ambientLight);

    // 2. Main Golden Sun light (Directional)
    const sunLight = new THREE.DirectionalLight(0xffb84d, 3.2);
    sunLight.position.set(7, 13, 8);
    sunLight.castShadow = true;
    // 1024 high resolution shadow map
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 28;
    sunLight.shadow.camera.left = -8;
    sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 9;
    sunLight.shadow.camera.bottom = -2;
    sunLight.shadow.bias = -0.001;
    this.scene.add(sunLight);

    // 3. Golden Rim / Backlight for petal highlights
    const rimLight = new THREE.DirectionalLight(0xffdd80, 2.4);
    rimLight.position.set(-8, 8, -8);
    this.scene.add(rimLight);

    // 4. Subtle Warm Point Light inside flower bouquet
    this.bouquetGlow = new THREE.PointLight(0xffaa00, 2.5, 12);
    this.bouquetGlow.position.set(0, 3.0, 0);
    this.scene.add(this.bouquetGlow);
  }

  initEnvironment() {
    // Grassy Mound Terrain (enlarged for dense field)
    const groundGeom = new THREE.CylinderGeometry(11.5, 13.0, 2.5, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x162613,
      roughness: 0.88,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.y = -1.25;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant background star sphere
    const starsGeom = new THREE.BufferGeometry();
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 40 + Math.random() * 10;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 1; // upper hemisphere
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starsGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xfff3c4,
      size: 0.45,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const stars = new THREE.Points(starsGeom, starMat);
    this.scene.add(stars);
  }

  initPostProcessing() {
    const renderPass = new RenderPass(this.scene, this.camera);

    // Full resolution dreamy cinematic bloom
    const bloomRes = new THREE.Vector2(window.innerWidth, window.innerHeight);

    this.bloomPass = new UnrealBloomPass(
      bloomRes,
      0.88, // strength
      0.42, // radius
      0.65  // threshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);
  }

  initInteractions() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    let pointerDownPos = { x: 0, y: 0 };

    const handlePointer = (event) => {
      const clientX = event.clientX !== undefined ? event.clientX : (event.changedTouches ? event.changedTouches[0].clientX : 0);
      const clientY = event.clientY !== undefined ? event.clientY : (event.changedTouches ? event.changedTouches[0].clientY : 0);

      this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);

      if (hits.length > 0) {
        const firstHit = hits[0];
        this.particles.createBurst(firstHit.point);

        // Check if user tapped a sunflower head or petal
        const flowerHit = hits.find(h => 
          h.object.material === this.garden.discMaterial ||
          h.object.material === this.garden.petalMaterial
        );

        if (flowerHit && this.onFlowerClick) {
          this.onFlowerClick(flowerHit);
        }
      } else {
        const fallbackPos = new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          Math.random() * 2 + 2,
          (Math.random() - 0.5) * 3
        );
        this.particles.createBurst(fallbackPos);
      }
    };

    this.container.addEventListener('pointerdown', (e) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.container.addEventListener('pointerup', (e) => {
      if (e.target.closest('.modal-overlay')) return;
      // If user dragged more than 10 pixels, it was a camera rotation gesture
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 10) return;

      handlePointer(e);
    });
  }

  bindEvents() {
    const handleResize = () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      const aspect = width / height;

      this.camera.aspect = aspect;
      // Dynamically widen FOV if vertical mobile, or restore if landscape/desktop
      const baseFov = 45;
      this.camera.fov = aspect < 1.0 ? Math.min(64, baseFov / (aspect * 1.12)) : baseFov;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);

      if (this.bloomPass) {
        this.bloomPass.resolution.set(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 150);
    });
  }

  startExperience() {
    this.isIntroAnimating = true;
    this.introProgress = 0;
    this.garden.triggerBloom();
    this.particles.createBurst(new THREE.Vector3(0, 3, 0));
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Audio intensity hook for dynamic pulsing
    const audioIntensity = this.audioManager ? this.audioManager.getAudioIntensity() : 0;

    // Smooth Intro Camera Sweep
    if (this.isIntroAnimating) {
      this.introProgress += delta * 0.45;
      if (this.introProgress >= 1) {
        this.introProgress = 1;
        this.isIntroAnimating = false;
      }
      const ease = 1 - Math.pow(1 - this.introProgress, 3); // Cubic out
      this.camera.position.lerpVectors(this.cameraStartPos, this.cameraTargetPos, ease);
      this.controls.update();
    } else {
      this.controls.update();
    }

    // Light pulsing with music
    if (this.bouquetGlow) {
      this.bouquetGlow.intensity = 1.8 + Math.sin(time * 2.5) * 0.3 + audioIntensity * 1.5;
    }

    // Update Flower garden, Grass & Particles
    this.grass.update(delta, audioIntensity);
    this.garden.update(delta, time, audioIntensity);
    this.particles.update(delta, time, audioIntensity);

    // Render using post-processing bloom
    this.composer.render();
  }
}
