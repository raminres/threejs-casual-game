// src/core/App.js
import * as THREE from 'three';
import { CameraManager } from './CameraManager.js';
import { eventBus } from './EventBus.js';
import { gameState } from './GameState.js'; // Use exported singleton
import { audioManager } from './AudioManager.js';
import { confettiVFX } from '../effects/ConfettiVFX.js';

export class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    this.cameraManager = new CameraManager(window.innerWidth / window.innerHeight);
    this.camera = this.cameraManager.camera;

    // 1. WebGL Renderer Initialization
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 🔑 ENABLE SHADOW MAP HERE
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Smooth soft shadow edges

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scenes = {};
    this.activeSceneKey = 'island';
    this.uiManager = null; // 🟢 Stores UIManager reference

    this.setupLighting();
    this.setupListeners();
  }

  /**
   * 🟢 Binds UIManager to App and links MapScene if already registered
   */
  setUIManager(uiManager) {
    this.uiManager = uiManager;
    if (this.scenes['map']) {
      this.uiManager.setMapScene(this.scenes['map']);
    }
  }

  setupLighting() {
    // 💡 Lower ambient light intensity (was 0.8) so shadows don't get washed out
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);
  }

  registerScene(key, sceneInstance) {
    this.scenes[key] = sceneInstance;
    this.scene.add(sceneInstance.group);
    sceneInstance.group.visible = false;

    // 🟢 Auto-bind MapScene to window & UIManager when registered
    if (key === 'map') {
      window.mapScene = sceneInstance;
      if (this.uiManager) {
        this.uiManager.setMapScene(sceneInstance);
      }
    }
  }

  switchToScene(key) {
    Object.keys(this.scenes).forEach(k => {
      this.scenes[k].group.visible = (k === key);
    });

    this.activeSceneKey = key;

    if (key === 'island') {
      // Fixed: use gameState.currentIslandLevel instead of currentLevel
      this.cameraManager.setIslandCamera(gameState.currentIslandLevel); 
    } else if (key === 'spin') {
      this.cameraManager.setSpinCamera();
    } else if (key === 'map') {
      this.cameraManager.setMapCamera();
    } else if (key === 'box') {
      this.cameraManager.setBoxCamera();
    }
  }

  setupListeners() {
    window.addEventListener('resize', () => {
      this.cameraManager.updateAspect(window.innerWidth / window.innerHeight);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('click', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const activeScene = this.scenes[this.activeSceneKey];
      if (activeScene && activeScene.handleClick) {
        activeScene.handleClick(this.raycaster);
      }
    });

    eventBus.on('SWITCH_SCENE', (key) => this.switchToScene(key));
    
    eventBus.on('MODE_CHANGED', (mode) => {
      if (mode === 'polished') {
        this.renderer.shadowMap.enabled = true;
        //this.dirLight.castShadow = true;
        //this.dirLight.intensity = 1.5;
      } else {
        this.renderer.shadowMap.enabled = false;
        //this.dirLight.castShadow = false;
        //this.dirLight.intensity = 1.2;
      }
    });
  }

  start() {
    const animate = () => {
      requestAnimationFrame(animate);

      // 🟢 Update active scene (enables smooth OrbitControls damping in MapScene)
      const activeScene = this.scenes[this.activeSceneKey];
      if (activeScene && typeof activeScene.update === 'function') {
        activeScene.update();
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}