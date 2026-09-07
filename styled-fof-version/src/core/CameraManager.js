import * as THREE from 'three';

// 🎥 Island level camera preset configurations
const ISLAND_CAMERA_CONFIGS = {
  1: { pos: { x: 15, y: 8, z: 15 }, fov: 60 },
  2: { pos: { x: 15, y: 8, z: 15 }, fov: 70 },
  3: { pos: { x: 15, y: 8, z: 15 }, fov: 75 }
};

export class CameraManager {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  }

  setIslandCamera(level = 1) {
    const config = ISLAND_CAMERA_CONFIGS[level] || ISLAND_CAMERA_CONFIGS[1];
    
    this.camera.fov = config.fov;
    this.camera.up.set(0, 2, 0);
    this.camera.position.set(config.pos.x, config.pos.y, config.pos.z);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  setSpinCamera() {
    this.camera.fov = 60;
    this.camera.up.set(0, 0, -1);
    this.camera.position.set(0, 5, 6);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  setMapCamera() {
    this.camera.fov = 60;
    this.camera.up.set(0, 1, 0);
    this.camera.position.set(0, 6, 6);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  setBoxCamera() {
    this.camera.fov = 55;
    this.camera.up.set(0, 0, -1);
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0.2);
    this.camera.updateProjectionMatrix();
  }

  updateAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}