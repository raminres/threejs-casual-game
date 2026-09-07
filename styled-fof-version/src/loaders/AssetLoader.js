// src/loaders/AssetLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetLoader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map();
  }

  /**
   * Loads a GLTF/GLB model asynchronously with caching
   * @param {string} path - Path to the .glb file
   * @returns {Promise<THREE.Group>} Cloned THREE.Group of the model
   */
  loadGLTF(path) {
    if (this.cache.has(path)) {
      return Promise.resolve(this.cache.get(path).clone());
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          this.cache.set(path, gltf.scene);
          // Return a clone so multiple instances don't share transforms
          resolve(gltf.scene.clone());
        },
        undefined,
        (error) => {
          console.error(`Error loading model at ${path}:`, error);
          reject(error);
        }
      );
    });
  }

  static createTextTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 128);
    ctx.font = '900 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 6;
    ctx.strokeText(text, 128, 64);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}

export const assetLoader = new AssetLoader();