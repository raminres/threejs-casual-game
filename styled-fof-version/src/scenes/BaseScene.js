// src/scenes/BaseScene.js
import * as THREE from 'three';
import { LIGHTING_CONFIGS } from '../config/LevelConfigs.js';

export class BaseScene {
  constructor() {
    this.group = new THREE.Group();
  }

  handleClick(raycaster) {}

  applyLightingConfig(sceneKey) {
    const config = LIGHTING_CONFIGS[sceneKey];
    if (!config) return;

    // 1. Skylight (Hemisphere Light)
    if (config.skylight) {
      const skylight = new THREE.HemisphereLight(
        config.skylight.skyColor,
        config.skylight.groundColor,
        config.skylight.intensity
      );
      this.group.add(skylight);
    }

    // 2. Directional Light
    if (config.directional) {
      const dirLight = new THREE.DirectionalLight(
        config.directional.color,
        config.directional.intensity
      );
      const [x, y, z] = config.directional.position;
      dirLight.position.set(x, y, z);
      dirLight.castShadow = !!config.directional.castShadow;

      if (dirLight.castShadow) {
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
      }

      this.group.add(dirLight);
    }
  }
}