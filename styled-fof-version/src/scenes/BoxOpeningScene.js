import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BaseScene } from './BaseScene.js';
import { BOX_REWARDS_POOL } from '../config/RewardsConfig.js';
import { AssetLoader } from '../loaders/AssetLoader.js';
import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';
import { Sky } from 'three/addons/objects/Sky.js';

export class BoxOpeningScene extends BaseScene {
  constructor() {
    super();
    this.boxObjects = [];
    this.gltfLoader = new GLTFLoader();
    this.buildScene();
  }

  async buildScene() {
    this.applyLightingConfig('box');
    this.setupSkybox();
    // 1. Load Scene Environment Model (box_opening_scene_1.glb)
    try {
      const sceneGltf = await new Promise((resolve, reject) => {
        this.gltfLoader.load(
          './public/models/box_opening_scene_1.glb',
          (gltf) => resolve(gltf),
          undefined,
          (err) => reject(err)
        );
      });
      
      const envScene = sceneGltf.scene;
      envScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.group.add(envScene);
    } catch (err) {
      console.warn('box_opening_scene_1.glb not found or failed to load.', err);
    }

    // 2. Load GLTF Chest Model & Animation Clips
    let chestGltf = null;
    try {
      chestGltf = await new Promise((resolve, reject) => {
        this.gltfLoader.load(
          './public/models/chest.glb',
          (gltf) => resolve(gltf),
          undefined,
          (err) => reject(err)
        );
      });
    } catch (err) {
      console.warn('chest.glb not found or failed to load. Using primitive fallback.', err);
    }

    // 3. Grid Arrangement Dimensions
    // Chest Bounding Box: Width = 1.0 (X), Height = 1.6 (Y), Depth = 0.7 (Z)
    const spacingX = 2.5; // 1.0 unit model width + 1.0 unit gap
    const spacingZ = 2.5; // 0.7 unit model depth + 0.9 unit gap
    this.boxObjects = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const container = new THREE.Group();
        
        // Center the 3x3 grid on the platform
        const posX = (col - 1) * spacingX;
        const posZ = (row - 1) * spacingZ;
        container.position.set(posX, 0, posZ);

        let chestMesh = null;
        let mixer = null;
        let action = null;
        let lidPivotFallback = null;

        if (chestGltf) {
          // Clone GLTF Scene for this grid slot
          chestMesh = chestGltf.scene.clone(true);
          chestMesh.position.set(0, 0, 0);
          chestMesh.rotation.y = THREE.MathUtils.degToRad(270);

          chestMesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.userData.boxIndex = index;
            }
          });

          container.add(chestMesh);

          // Setup Animation Mixer & Keyframe Action
          if (chestGltf.animations && chestGltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(chestMesh);
            action = mixer.clipAction(chestGltf.animations[0]);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
        } else {
          // --- PRIMITIVE FALLBACK ---
          const baseGeo = new THREE.BoxGeometry(1.0, 0.8, 0.7);
          const baseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 });
          const baseMesh = new THREE.Mesh(baseGeo, baseMat);
          baseMesh.position.y = 0.4;
          baseMesh.userData = { boxIndex: index };
          container.add(baseMesh);
          chestMesh = baseMesh;

          lidPivotFallback = new THREE.Group();
          lidPivotFallback.position.set(0, 0.8, -0.35);
          container.add(lidPivotFallback);

          const lidGeo = new THREE.BoxGeometry(1.05, 0.25, 0.75);
          const lidMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.4 });
          const lidMesh = new THREE.Mesh(lidGeo, lidMat);
          lidMesh.position.set(0, 0.125, 0.375);
          lidPivotFallback.add(lidMesh);
        }

        // Floating Reward Label (Hovering above the 1.6-unit tall chest)
        const labelGeo = new THREE.PlaneGeometry(1.8, 0.9);
        const labelMat = new THREE.MeshBasicMaterial({
          transparent: true,
          side: THREE.DoubleSide,
          visible: false
        });
        const labelMesh = new THREE.Mesh(labelGeo, labelMat);
        labelMesh.position.set(0, 1.95, 0);
        labelMesh.rotation.x = -Math.PI / 6;
        container.add(labelMesh);

        this.group.add(container);

        this.boxObjects.push({
          boxIndex: index,
          container,
          chestMesh,
          mixer,
          action,
          lidPivotFallback,
          labelMat,
          isOpened: false,
          reward: null
        });
      }
    }

    // Assign initial rewards to boxes
    this.resetBoxes();
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

  resetBoxes() {
    const shuffled = [...BOX_REWARDS_POOL].sort(() => Math.random() - 0.5);
    this.boxObjects.forEach((box, i) => {
      box.isOpened = false;
      box.reward = shuffled[i];

      // Reset Animation Action
      if (box.action) {
        box.action.stop();
        box.action.reset();
      }

      // Reset Primitive Fallback
      if (box.lidPivotFallback) {
        box.lidPivotFallback.rotation.x = 0;
      }

      box.labelMat.visible = false;
    });
  }

  handleClick(raycaster) {
    if (gameState.keys <= 0) return;

    // Collect all raycastable meshes
    const clickableMeshes = [];
    this.boxObjects.forEach((box) => {
      if (box.chestMesh) {
        box.chestMesh.traverse((child) => {
          if (child.isMesh) {
            child.userData.boxIndex = box.boxIndex;
            clickableMeshes.push(child);
          }
        });
      }
    });

    const intersects = raycaster.intersectObjects(clickableMeshes);

    if (intersects.length > 0) {
      const index = intersects[0].object.userData.boxIndex;
      if (index !== undefined) {
        this.openBox(index);
      }
    }
  }

  openBox(index) {
    const box = this.boxObjects[index];
    if (!box || box.isOpened || !gameState.useKey()) return;

    box.isOpened = true;
    eventBus.emit('PLAY_SOUND', 'AU_Box_Open'); // 🔊 Opening box sound

    // 1. Play Blender Keyframe Animation
    if (box.action && box.mixer) {
      box.action.reset();
      box.action.play();

      // Step mixer forward while animation is running
      const clock = new THREE.Clock();
      const updateMixer = () => {
        const delta = clock.getDelta();
        if (box.mixer) box.mixer.update(delta);
        if (box.action && box.action.isRunning()) {
          requestAnimationFrame(updateMixer);
        }
      };
      updateMixer();
    } 
    // Fallback Lerp Animation
    else if (box.lidPivotFallback) {
      const startTime = performance.now();
      const animateLid = (now) => {
        const t = Math.min((now - startTime) / 300, 1);
        box.lidPivotFallback.rotation.x = THREE.MathUtils.lerp(0, -Math.PI * 0.75, t);
        if (t < 1) requestAnimationFrame(animateLid);
      };
      requestAnimationFrame(animateLid);
    }

    // 2. Reveal Reward Texture
    box.labelMat.map = AssetLoader.createTextTexture(box.reward.label);
    box.labelMat.needsUpdate = true;
    box.labelMat.visible = true;

    // 3. Award Reward
    gameState.addKeyReward(box.reward);

    // 4. Return to Spin Scene when keys run out
    if (gameState.keys <= 0) {
      setTimeout(() => {
        eventBus.emit('SWITCH_SCENE', 'spin');
      }, 1500);
    }
  }
}