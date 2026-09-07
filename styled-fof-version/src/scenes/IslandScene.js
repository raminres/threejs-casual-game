import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { LEVEL_CONFIGS, LIGHTING_CONFIGS } from '../config/LevelConfigs.js';
import { assetLoader } from '../loaders/AssetLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';

export class IslandScene extends BaseScene {
  constructor() {
    super();

    this.buildingMeshes = {
      dock: null,
      lighthouse: null,
      boat: null
    };

    this.islandModel = null;
    
    // 1. Apply central config settings
    this.initLighting();
    
    // 2. Load base island terrain
    this.loadIslandModel();
  }

  initLighting() {
    const config = LIGHTING_CONFIGS.island;

    // 💡 Skylight (Hemisphere Light) from Config
    const skylightConfig = config.skylight;
    this.skylight = new THREE.HemisphereLight(
      skylightConfig.skyColor,
      skylightConfig.groundColor,
      skylightConfig.intensity
    );
    this.skylight.position.set(0, 0, 0);
    this.group.add(this.skylight);

    // ☀️ Directional Light (Sun Light) from Config
    const dirConfig = config.directional;
    this.sunLight = new THREE.DirectionalLight(dirConfig.color, dirConfig.intensity);
    this.sunLight.position.set(...dirConfig.position);
    this.sunLight.castShadow = dirConfig.castShadow;

    // 🎯 Shadow Camera Setup
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;

    // Expand frustum size to cover island model completely
    const shadowBoxSize = 25; 
    this.sunLight.shadow.camera.left = -shadowBoxSize;
    this.sunLight.shadow.camera.right = shadowBoxSize;
    this.sunLight.shadow.camera.top = shadowBoxSize;
    this.sunLight.shadow.camera.bottom = -shadowBoxSize;
    this.sunLight.shadow.bias = -0.0005;

    this.group.add(this.sunLight);

    // Optional: Setup Skybox Shader (Comment out if using static scene.background color)
    this.setupSkybox();
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
    const elevation = 62;
    const azimuth = 145;

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);

    sunPosition.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sunPosition);
  }

  async loadIslandModel() {
    try {
      this.islandModel = await assetLoader.loadGLTF('./public/models/island_1.glb');

      this.islandModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Ensure imported materials react to light & shadows
          if (child.material && child.material.isMeshBasicMaterial) {
            child.material = new THREE.MeshStandardMaterial({
              color: child.material.color,
              map: child.material.map || null
            });
          }
        }
      });

      this.islandModel.position.set(0, 0, 0);
      this.group.add(this.islandModel);
      console.log('✅ Island 1 loaded successfully!');
    } catch (err) {
      console.warn('GLTF failed to load, falling back to primitive island:', err);
      this.buildFallbackIsland();
    }
  }

  // ... keep remaining building logic unchanged ...


  /**
   * Adds a building if it doesn't exist, or scales up the existing instance on upgrade.
   */
  async addBuilding(type, count) {
    const clampedCount = Math.min(count, 4);
    const targetScale = 1.0 + (count - 1) * 0.1;

    // --- CASE A: Building ALREADY exists on island -> Upgrade & scale existing mesh ---
    if (this.buildingMeshes[type]) {
      const existingMesh = this.buildingMeshes[type];
      const startScale = existingMesh.scale.x; // Current scale before upgrade

      // Elastic bounce from current scale to target scale
      this.animateElasticScale(existingMesh, startScale, targetScale);
      console.log(`⬆️ Upgraded existing ${type} to level ${count} (${targetScale.toFixed(2)}x)`);
      return;
    }

    // --- CASE B: Building DOES NOT exist yet -> Load GLTF once and spawn ---
    const modelPaths = {
      dock: './public/models/dock_1.glb',
      lighthouse: './public/models/lighthouse_1.glb',
      boat: './public/models/boat_1.glb'
    };

    const modelPath = modelPaths[type];
    if (!modelPath) return;

    try {
      const buildingMesh = await assetLoader.loadGLTF(modelPath);

      buildingMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Position once on the island
      this.applyBuildingTransform(buildingMesh, type);

      this.group.add(buildingMesh);
      this.buildingMeshes[type] = buildingMesh;

      // Elastic pop-in animation from 0 to initial scale
      this.animateElasticScale(buildingMesh, 0.001, targetScale);

      console.log(`✅ Spawned ${type} on island (Initial Scale: ${targetScale.toFixed(2)}x)`);
    } catch (err) {
      console.warn(`Failed to load GLTF for ${type}, using primitive fallback:`, err);
      this.addFallbackBuilding(type, targetScale);
    }
  }

  /**
   * Fixed positioning and rotation per building type
   */
  applyBuildingTransform(mesh, type) {
    if (type === 'dock') {
      mesh.position.set(0, 0.25, 0);
      mesh.rotation.y = THREE.MathUtils.degToRad(0);
    } else if (type === 'lighthouse') {
      mesh.position.set(-3.5, 0.0, 5.0);
      mesh.rotation.y = THREE.MathUtils.degToRad(-45);
    } else if (type === 'boat') {
      mesh.position.set(3.5, -0.1, -0.5);
      mesh.rotation.y = THREE.MathUtils.degToRad(0);
    }
  }

  /**
   * Smoothly animates mesh scale between startScale and targetScale with Elastic-Out easing
   */
  animateElasticScale(mesh, startScale, targetScale, duration = 850) {
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Elastic Out Easing Function
      const c4 = (2 * Math.PI) / 3;
      const easedProgress = progress === 0
        ? 0
        : progress === 1
        ? 1
        : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;

      const currentScale = startScale + (targetScale - startScale) * easedProgress;
      mesh.scale.set(currentScale, currentScale, currentScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  // Primitive fallback if GLTF model path is missing
  addFallbackBuilding(type, targetScale = 1.0) {
    let mesh = null;
    if (type === 'dock') {
      const geo = new THREE.BoxGeometry(1.5, 0.1, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x854d0e });
      mesh = new THREE.Mesh(geo, mat);
    } else if (type === 'lighthouse') {
      const geo = new THREE.CylinderGeometry(0.3, 0.5, 2, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
      mesh = new THREE.Mesh(geo, mat);
    } else if (type === 'boat') {
      const geo = new THREE.BoxGeometry(1.2, 0.3, 0.6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xd97706 });
      mesh = new THREE.Mesh(geo, mat);
    }

    if (mesh) {
      this.applyBuildingTransform(mesh, type);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.group.add(mesh);
      this.buildingMeshes[type] = mesh;

      this.animateElasticScale(mesh, 0.001, targetScale);
    }
  }

  clearBuildings() {
    Object.keys(this.buildingMeshes).forEach((type) => {
      if (this.buildingMeshes[type]) {
        this.group.remove(this.buildingMeshes[type]);
        this.buildingMeshes[type] = null;
      }
    });
  }
}