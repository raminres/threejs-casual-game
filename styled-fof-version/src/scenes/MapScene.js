// src/scenes/MapScene.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseScene } from './BaseScene.js';
import { LEVEL_CONFIGS } from '../config/LevelConfigs.js';
import { Sky } from 'three/addons/objects/Sky.js';

export class MapScene extends BaseScene {
  constructor() {
    super();

    this.gltfLoader = new GLTFLoader();
    this.mapSceneMesh = null;
    this.boatMesh = null;
    this.mixer = null;
    this.animations = [];
    this.activeAction = null;

    this.initScene();
  }

  async initScene() {
    // 1. Apply spin scene lighting configuration
    this.applyLightingConfig('spin');
    this.setupSkybox();

    // 2. Load GLTF Models for map scene and boat
    await Promise.all([
      this.loadMapEnvironment('./public/models/map_scene.glb'),
      this.loadBoatModel('./public/models/map_boat.glb')
    ]);

    // Fallback: Render procedural islands if map GLTF is missing
    if (!this.mapSceneMesh) {
      this.buildProceduralFallbackMap();
    }
  }
  setupSkybox() {
    const sky = new Sky();
    sky.scale.setScalar(450000);
    this.group.add(sky);

    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 2.2;
    skyUniforms['rayleigh'].value = 0.1;
    skyUniforms['mieCoefficient'].value = 0.003;
    skyUniforms['mieDirectionalG'].value = 0.85;

    const sunPosition = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 62);
    const theta = THREE.MathUtils.degToRad(145);

    sunPosition.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sunPosition);
  }

  /**
   * Scene animation frame hook
   */
  update() {
    // Kept clean - camera handled by CameraManager, boat handled by AnimationMixer
  }

  /**
   * Loads the 3-Island Environment GLTF Model
   */
  async loadMapEnvironment(path) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        this.gltfLoader.load(path, resolve, undefined, reject);
      });

      this.mapSceneMesh = gltf.scene;
      this.mapSceneMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.group.add(this.mapSceneMesh);
    } catch (err) {
      console.warn(`map_scene.glb not found at ${path}. Using procedural fallback map.`, err);
    }
  }

  /**
   * Loads the Boat GLTF Model & extracts NLA keyframe animation tracks
   */
  async loadBoatModel(path) {
    
    try {
      const gltf = await new Promise((resolve, reject) => {
        this.gltfLoader.load(path, resolve, undefined, reject);
      });
      if (gltf.animations && gltf.animations.length > 0) {
  this.mixer = new THREE.AnimationMixer(this.boatMesh);
  this.animations = gltf.animations;
  
  // Log exact string names that Three.js imports
  console.log('Available Clip Names:', gltf.animations.map(c => c.name));
}

      this.boatMesh = gltf.scene;
      this.boatMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.group.add(this.boatMesh);

      // Setup Animation Mixer for NLA Tracks (level1to2, level2to3)
      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(this.boatMesh);
        this.animations = gltf.animations;
      }
    } catch (err) {
      console.warn(`map_boat.glb not found at ${path}. Using procedural fallback ship.`, err);
      this.buildProceduralShip();
    }
  }

  /**
   * Plays travel animations strictly using Blender NLA keyframe tracks
   */
  animateTravel(fromLevel, toLevel, onComplete) {
    const safeFrom = LEVEL_CONFIGS[fromLevel] ? fromLevel : 1;
    const safeTo = LEVEL_CONFIGS[toLevel] ? toLevel : Math.min(safeFrom + 1, Object.keys(LEVEL_CONFIGS).length);

    // Matches Blender NLA Action names: "level1to2", "level2to3"
    const clipName = `level${safeFrom}to${safeTo}`;
    const clip = this.animations.length ? THREE.AnimationClip.findByName(this.animations, clipName) : null;

    if (this.mixer && clip) {
      if (this.activeAction) {
        this.activeAction.stop();
      }

      this.activeAction = this.mixer.clipAction(clip);
      this.activeAction.setLoop(THREE.LoopOnce, 1);
      this.activeAction.clampWhenFinished = true; // Retain ending keyframe state
      this.activeAction.reset();
      this.activeAction.play();

      // Step animation mixer frame-by-frame
      const clock = new THREE.Clock();
      let isAnimating = true;

      const updateAnimation = () => {
        if (!isAnimating) return;

        const delta = clock.getDelta();
        if (this.mixer) this.mixer.update(delta);

        if (this.activeAction && this.activeAction.isRunning()) {
          requestAnimationFrame(updateAnimation);
        } else {
          isAnimating = false;
          setTimeout(() => {
            if (typeof onComplete === 'function') onComplete();
          }, 300);
        }
      };

      updateAnimation();
    } else {
      console.warn(`No NLA clip found for "${clipName}". Skipping travel animation.`);
      if (typeof onComplete === 'function') onComplete();
    }
  }

  /**
   * Resets boat keyframe animation back to initial state
   */
  resetShip() {
    if (this.activeAction) {
      this.activeAction.stop();
      this.activeAction.reset();
    }
  }

  /**
   * Procedural Fallback Map (used only if map_scene.glb fails to load)
   */
  buildProceduralFallbackMap() {
    const levelKeys = Object.keys(LEVEL_CONFIGS).map(Number).sort((a, b) => a - b);
    const minLevel = levelKeys[0] || 1;
    const maxLevel = levelKeys[levelKeys.length - 1] || 3;

    const startY = LEVEL_CONFIGS[minLevel]?.mapY ?? -4.0;
    const endY = LEVEL_CONFIGS[maxLevel]?.mapY ?? 4.0;

    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, startY, 0),
      new THREE.Vector3(0, endY, 0)
    ]);
    const lineMat = new THREE.LineDashedMaterial({ color: 0xfbbf24, dashSize: 0.3, gapSize: 0.2 });
    const routeLine = new THREE.Line(lineGeo, lineMat);
    routeLine.computeLineDistances();
    this.group.add(routeLine);

    Object.values(LEVEL_CONFIGS).forEach((cfg) => {
      const geo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 32);
      const mat = new THREE.MeshStandardMaterial({ color: cfg.groundColor || 0x22c55e });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, cfg.mapY ?? 0, 0);
      this.group.add(mesh);
    });
  }

  /**
   * Procedural Fallback Ship (used only if map_boat.glb fails to load)
   */
  buildProceduralShip() {
    const pyramidGeo = new THREE.ConeGeometry(0.5, 1.2, 4);
    const pyramidMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.3, roughness: 0.2 });
    this.shipMesh = new THREE.Mesh(pyramidGeo, pyramidMat);
    const startY = (LEVEL_CONFIGS[1]?.mapY ?? -4.0) + 0.6;
    this.shipMesh.position.set(0, startY, 0.2);
    this.group.add(this.shipMesh);
  }

  onResize(width, height) {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
}