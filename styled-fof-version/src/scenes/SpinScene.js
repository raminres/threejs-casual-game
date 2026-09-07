import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseScene } from './BaseScene.js';
import { WHEEL_REWARDS, SLICE_COUNT } from '../config/RewardsConfig.js';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { Sky } from 'three/addons/objects/Sky.js';

export class SpinScene extends BaseScene {
  constructor() {
    super();
    this.isSpinning = false;
    this.sliceAngle = (Math.PI * 2) / SLICE_COUNT;
    this.gltfLoader = new GLTFLoader();

    this.wheelGroup = new THREE.Group();
    this.buttonGroup = new THREE.Group();
    this.frameGroup = new THREE.Group();
    this.envGroup = new THREE.Group();
    this.pointerGroup = new THREE.Group();
    
    this.initScene();
  }

  async initScene() {
    this.applyLightingConfig('spin');
    this.setupSkybox(); // ☀️ Add procedural sky setup matching IslandScene
    
    this.group.position.set(0, 0, 2.6);

    this.group.add(this.envGroup);
    this.group.add(this.wheelGroup);
    this.group.add(this.frameGroup);
    this.group.add(this.buttonGroup);
    this.group.add(this.pointerGroup);

    this.buttonGroup.position.set(0, 0.3, 0);
    this.frameGroup.position.set(0, 0.3, 0);
    this.pointerGroup.position.set(0, 0.2, 0.3);

    await Promise.all([
      this.loadModel('./public/models/spin_scene_1.glb', this.envGroup),
      this.loadModel('./public/models/spinner.glb', this.wheelGroup),
      this.loadModel('./public/models/spin_button_frame.glb', this.frameGroup),
      this.loadModel('./public/models/spin_button.glb', this.buttonGroup),
      this.loadModel('./public/models/spinner_triangle.glb', this.pointerGroup)
    ]);

    this.buildRewardLabels();
    this.buildSpinButtonText();
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
   * Adds 'SPIN!' text overlay to top of spin button
   */
  buildSpinButtonText() {
    const textTex = this.createTextTexture('SPIN!');
    const textGeo = new THREE.PlaneGeometry(1.0, 0.5);
    const textMat = new THREE.MeshBasicMaterial({
      map: textTex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const textMesh = new THREE.Mesh(textGeo, textMat);
    // Positioned at (0, 0.501, 0) relative to buttonGroup
    textMesh.position.set(0, 0.501, 0);
    textMesh.rotation.x = -Math.PI / 2;

    this.buttonGroup.add(textMesh);
  }

  buildRewardLabels() {
    const labelRadius = 1.35;
    const labelY = 0.30;

    WHEEL_REWARDS.forEach((reward, i) => {
      const angle = i * this.sliceAngle;

      const labelTex = this.createTextTexture(reward.label);
      const labelGeo = new THREE.PlaneGeometry(0.9, 0.45);
      const labelMat = new THREE.MeshBasicMaterial({
        map: labelTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const labelMesh = new THREE.Mesh(labelGeo, labelMat);

      labelMesh.position.x = Math.sin(angle) * labelRadius;
      labelMesh.position.y = labelY;
      labelMesh.position.z = -Math.cos(angle) * labelRadius;

      labelMesh.rotation.x = -Math.PI / 2;
      labelMesh.rotation.z = -angle;

      this.wheelGroup.add(labelMesh);
    });
  }

  createTextTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }


  loadModel(path, targetGroup) {
    return new Promise((resolve) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 0, 0);

          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          targetGroup.add(model);
          resolve();
        },
        undefined,
        (error) => {
          console.warn(`Failed to load model at path: ${path}`, error);
          resolve();
        }
      );
    });
  }

  handleClick(raycaster) {
    if (this.isSpinning || (gameState.spins ?? 0) <= 0) return;

    const intersects = raycaster.intersectObjects(this.buttonGroup.children, true);
    if (intersects.length > 0) {
    eventBus.emit('PLAY_SOUND', 'AU_Spin_Click'); // 🔊 Button click
    this.animateButtonPress(() => this.triggerSpin());
  }
}

  animateButtonPress(onComplete) {
    const startY = 0.3;
    const pressedY = 0.05;
    const pressTime = 100;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      if (elapsed < pressTime) {
        this.buttonGroup.position.y = THREE.MathUtils.lerp(startY, pressedY, elapsed / pressTime);
        requestAnimationFrame(step);
      } else if (elapsed < pressTime * 2) {
        this.buttonGroup.position.y = THREE.MathUtils.lerp(pressedY, startY, (elapsed - pressTime) / pressTime);
        requestAnimationFrame(step);
      } else {
        this.buttonGroup.position.y = startY;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(step);
  }

// src/scenes/SpinScene.js
triggerSpin() {
  if (!gameState.useSpin()) return;
  eventBus.emit('PLAY_SOUND', 'AU_Spin'); // 🔊 Wheel starts spinning
  this.isSpinning = true;

  this.isSpinning = true;
  const winningIndex = Math.floor(Math.random() * SLICE_COUNT);
  const reward = WHEEL_REWARDS[winningIndex];

  const targetAngle = winningIndex * this.sliceAngle;
  const currentRot = this.wheelGroup.rotation.y;
  let diff = (targetAngle - (currentRot % (Math.PI * 2))) % (Math.PI * 2);
  if (diff > 0) diff -= Math.PI * 2;

  const finalRotation = currentRot - (Math.PI * 2 * 5) + diff;
  const duration = 4000;
  const startTime = performance.now();
  const startRotation = this.wheelGroup.rotation.y;

  const animateSpin = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);

    this.wheelGroup.rotation.y = startRotation + (finalRotation - startRotation) * easeOut;

    if (progress < 1) {
      requestAnimationFrame(animateSpin);
    } else {
      this.isSpinning = false;

      // ✅ Robust check for Chest reward (handles 'chest' or 'CHEST' or val === 'CHEST')
      const isChest = 
        (reward.type && reward.type.toLowerCase() === 'chest') || 
        reward.val === 'CHEST';

      if (isChest) {
        gameState.startBoxGame();
        eventBus.emit('SWITCH_SCENE', 'box');
      } else {
        gameState.addReward(reward);
      }
    }
  };
  requestAnimationFrame(animateSpin);
}
}