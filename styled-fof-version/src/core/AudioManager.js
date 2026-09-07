// src/core/AudioManager.js
import { eventBus } from './EventBus.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null; // 🔊 Master Gain Node for global volume
    this.buffers = new Map();
    this.isUnlocked = false;

    this.soundManifest = {
      AU_Spin: './public/sounds/AU_Spin.mp3',
      AU_Spin_Click: './public/sounds/AU_Spin_Click.mp3',
      AU_Popping: './public/sounds/AU_Popping.mp3',
      AU_Cheer: './public/sounds/AU_Cheer.mp3',
      AU_Box_Open: './public/sounds/AU_Box_Open.mp3',
      AU_Click: './public/sounds/AU_Click.mp3',
      AU_Coin: './public/sounds/AU_Coin.mp3',
    };

    this.init();
  }

  init() {
    // 1. Listen for global sound emission events
    eventBus.on('PLAY_SOUND', (soundKey) => this.playSound(soundKey));

    // 2. Setup user interaction listener to unlock AudioContext on first click/touch
    const unlockAudio = () => {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();

          // 🔊 Create Master Gain Node & set volume to 50% (0.5)
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.5;
          this.masterGain.connect(this.ctx.destination);

          this.preloadSounds();
        }
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isUnlocked = true;
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }

  /**
   * Preloads and decodes sound files into memory buffers
   */
  async preloadSounds() {
    for (const [key, path] of Object.entries(this.soundManifest)) {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const decodedData = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(key, decodedData);
      } catch (err) {
        console.warn(`[AudioManager] Failed to load sound '${key}' from ${path}`, err);
      }
    }
  }

  /**
   * Plays a preloaded sound buffer routed through the Master Gain
   */
  playSound(key) {
    if (!this.ctx || this.ctx.state !== 'running') return;

    const buffer = this.buffers.get(key);
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // 🔊 Route audio through masterGain node instead of directly to destination
    if (this.masterGain) {
      source.connect(this.masterGain);
    } else {
      source.connect(this.ctx.destination);
    }

    source.start(0);
  }

  /**
   * Dynamically adjust global volume on the fly (0.0 to 1.0)
   */
  setVolume(volume = 0.5) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager();