// src/ui/UIManager.js
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class UIManager {
  constructor(mapSceneInstance = null) {
    this.mapScene = mapSceneInstance;
    this.previousCoins = gameState.coins ?? 0;
    this.bindDOM();
    this.bindEvents();
    
    // Auto-render debug panel on startup
    this.renderDebugPanel();
  }

  setMapScene(mapSceneInstance) {
    this.mapScene = mapSceneInstance;
  }

  bindDOM() {
    this.topCenterHud = document.getElementById('top-center-hud');
    this.bottomCenterHud = document.getElementById('bottom-center-hud');

    this.coinBoxEl = document.getElementById('coin-box');
    this.coinCountEl = document.getElementById('coin-count');
    this.progressTextEl = document.getElementById('progress-text');
    this.progressFillEl = document.getElementById('progress-fill');
    this.progressWrapperEl = document.getElementById('progress-wrapper');

    this.spinEnergyWrapperEl = document.getElementById('spin-energy-wrapper');
    this.spinEnergyTextEl = document.getElementById('spin-energy-text');
    this.spinEnergyFillEl = document.getElementById('spin-energy-fill');

    this.boxHudOverlayEl = document.getElementById('box-hud-overlay');
    this.keyCountEl = document.getElementById('key-count');

    this.bottomBarEl = document.getElementById('bottom-bar');
    this.spinBarEl = document.getElementById('spin-bar');
    this.backIslandBarEl = document.getElementById('back-island-bar');

    this.btnDock = document.getElementById('btn-dock');
    this.btnLighthouse = document.getElementById('btn-lighthouse');
    this.btnBoat = document.getElementById('btn-boat');

    this.btnGoSpin = document.getElementById('btn-go-spin');
    this.btnBackIsland = document.getElementById('btn-back-island');

    this.levelCompleteModalEl = document.getElementById('level-complete-modal');
    this.completeTitleEl = document.getElementById('complete-title');
    this.btnNextIsland = document.getElementById('btn-next-island');
  }

  /**
   * Calculates the lowest coin cost among remaining available building upgrades
   */
  getMinUpgradeCost(state = gameState) {
    const maxLvl = state.MAX_BUILDING_LEVEL || 4;
    const buildings = state.buildings || { dock: 0, lighthouse: 0, boat: 0 };

    const dockCost = (buildings.dock || 0) < maxLvl 
      ? (typeof state.getUpgradeCost === 'function' ? state.getUpgradeCost('dock') : 100) 
      : Infinity;

    const lighthouseCost = (buildings.lighthouse || 0) < maxLvl 
      ? (typeof state.getUpgradeCost === 'function' ? state.getUpgradeCost('lighthouse') : 250) 
      : Infinity;

    const boatCost = (buildings.boat || 0) < maxLvl 
      ? (typeof state.getUpgradeCost === 'function' ? state.getUpgradeCost('boat') : 150) 
      : Infinity;

    return Math.min(dockCost, lighthouseCost, boatCost);
  }

  bindEvents() {
    // Building Actions
    if (this.btnDock) {
      this.btnDock.addEventListener('click', () => {
        eventBus.emit('PLAY_SOUND', 'AU_Popping');
        eventBus.emit('BUY_BUILDING', { type: 'dock' });
      });
    }
    if (this.btnLighthouse) {
      this.btnLighthouse.addEventListener('click', () => {
        eventBus.emit('PLAY_SOUND', 'AU_Popping');
        eventBus.emit('BUY_BUILDING', { type: 'lighthouse' });
      });
    }
    if (this.btnBoat) {
      this.btnBoat.addEventListener('click', () => {
        eventBus.emit('PLAY_SOUND', 'AU_Popping');
        eventBus.emit('BUY_BUILDING', { type: 'boat' });
      });
    }

    // Scene Triggers
    if (this.btnGoSpin) {
      this.btnGoSpin.addEventListener('click', () => {
        eventBus.emit('PLAY_SOUND', 'AU_Click');
        if (typeof gameState.resetSpinsOnEnter === 'function') {
          gameState.resetSpinsOnEnter();
        }
        eventBus.emit('SWITCH_SCENE', 'spin');
      });
    }

    if (this.btnBackIsland) {
      this.btnBackIsland.addEventListener('click', () => {
        const minCost = this.getMinUpgradeCost();
        const currentCoins = gameState.coins ?? 0;
        const currentSpins = gameState.spins ?? 0;

        // 🔒 NAVIGATION GUARD: If player lacks coins for upgrades BUT still has spins left
        if (currentCoins < minCost && currentSpins > 0) {
          eventBus.emit('PLAY_SOUND', 'AU_Error');
          eventBus.emit('UI_MESSAGE', { 
            message: `Need at least ${minCost} 🪙 for upgrades! Keep spinning! ⚡` 
          });

          this.btnBackIsland.classList.add('shake');
          setTimeout(() => this.btnBackIsland.classList.remove('shake'), 400);
          return; // Stop navigation
        }

        eventBus.emit('PLAY_SOUND', 'AU_Click');
        eventBus.emit('SWITCH_SCENE', 'island');
      });
    }

    if (this.btnNextIsland) {
      this.btnNextIsland.addEventListener('click', () => {
        eventBus.emit('PLAY_SOUND', 'AU_Click');
        eventBus.emit('TRIGGER_LEVEL_TRANSITION');
      });
    }

    // Reactive State Listeners
    eventBus.on('STATE_CHANGED', (state) => this.render(state));
    eventBus.on('COINS_CHANGED', () => {
      this.handleCoinChange();
      this.render();
    });
    eventBus.on('BUILDING_UPGRADED', () => this.render());
    eventBus.on('SPINS_CHANGED', () => this.render());
  }

  /**
   * Renders Map Debugger buttons automatically in the top-left corner
   */
  renderDebugPanel() {
    if (document.getElementById('debug-panel')) return;

    const container = document.createElement('div');
    container.id = 'debug-panel';
    container.style.cssText = `
      position: fixed;
      top: 15px;
      left: 15px;
      z-index: 999999;
      background: rgba(15, 23, 42, 0.9);
      border: 2px solid #38bdf8;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    `;

    container.innerHTML = `
      <div style="color: #38bdf8; font-weight: bold; font-size: 13px; margin-bottom: 2px;">🛠 MAP DEBUGGER</div>
      <button id="btn-dbg-map" style="cursor:pointer; padding:6px 12px; background:#0284c7; color:white; border:none; border-radius:4px; font-weight:bold;">View Map Scene</button>
      <button id="btn-dbg-island" style="cursor:pointer; padding:6px 12px; background:#334155; color:white; border:none; border-radius:4px;">Back to Island</button>
      <button id="btn-dbg-spin" style="cursor:pointer; padding:6px 12px; background:#10b981; color:white; border:none; border-radius:4px;">Go to Spin Scene</button>
      <button id="btn-dbg-box" style="cursor:pointer; padding:6px 12px; background:#8b5cf6; color:white; border:none; border-radius:4px;">Go to Box Scene</button>
      <button id="btn-dbg-anim1" style="cursor:pointer; padding:6px 12px; background:#f59e0b; color:white; border:none; border-radius:4px;">Test: Level 1 ➔ 2</button>
      <button id="btn-dbg-anim2" style="cursor:pointer; padding:6px 12px; background:#f59e0b; color:white; border:none; border-radius:4px;">Test: Level 2 ➔ 3</button>
    `;

    document.body.appendChild(container);

    // Button Listeners
    document.getElementById('btn-dbg-map').onclick = () => {
      eventBus.emit('PLAY_SOUND', 'AU_Click');
      eventBus.emit('SWITCH_SCENE', 'map');
    };

    document.getElementById('btn-dbg-island').onclick = () => {
      eventBus.emit('PLAY_SOUND', 'AU_Click');
      eventBus.emit('SWITCH_SCENE', 'island');
    };

    document.getElementById('btn-dbg-spin').onclick = () => {
      eventBus.emit('PLAY_SOUND', 'AU_Click');
      eventBus.emit('SWITCH_SCENE', 'spin');
    };

    document.getElementById('btn-dbg-box').onclick = () => {
      eventBus.emit('PLAY_SOUND', 'AU_Click');
      eventBus.emit('SWITCH_SCENE', 'box');
    };

    document.getElementById('btn-dbg-anim1').onclick = () => {
      eventBus.emit('PLAY_SOUND', 'AU_Click');
      eventBus.emit('SWITCH_SCENE', 'map');
      const targetMapScene = this.mapScene || window.mapScene;
      if (targetMapScene) {
        targetMapScene.animateTravel(1, 2, () => console.log('Arrived at Island 2'));
      } else {
        console.warn('MapScene instance not bound to UIManager yet.');
      }
    };

    document.getElementById('btn-dbg-anim2').onclick = () => {
      eventBus.emit('PLAY_SOUND', 'AU_Click');
      eventBus.emit('SWITCH_SCENE', 'map');
      const targetMapScene = this.mapScene || window.mapScene;
      if (targetMapScene) {
        targetMapScene.animateTravel(2, 3, () => console.log('Arrived at Island 3'));
      } else {
        console.warn('MapScene instance not bound to UIManager yet.');
      }
    };
  }

  /**
   * Checks coin gain delta and triggers the flying particle burst and HUD jiggle
   */
  handleCoinChange() {
    const currentCoins = gameState.coins ?? 0;
    const diff = currentCoins - this.previousCoins;

    if (diff > 0) {
      this.spawnFlyingCoins(Math.min(diff, 8), () => {
        this.triggerCoinJiggle();
      });
    }

    this.previousCoins = currentCoins;
  }

  /**
   * Triggers the CSS scale/jiggle keyframe animation on the coin HUD element
   */
  triggerCoinJiggle() {
    const target = this.coinBoxEl || this.coinCountEl;
    if (!target) return;

    target.classList.remove('coin-counter-jiggle');
    void target.offsetWidth; 
    target.classList.add('coin-counter-jiggle');
  }

  /**
   * Spawns flying coin HTML elements from screen center toward the top coin box
   */
  spawnFlyingCoins(count = 5, onComplete) {
    eventBus.emit('PLAY_SOUND', 'AU_Coin');
    const targetEl = this.coinBoxEl || this.coinCountEl;
    const targetRect = targetEl 
      ? targetEl.getBoundingClientRect() 
      : { left: window.innerWidth / 2, top: 30, width: 32, height: 32 };

    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    let finishedCount = 0;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const coin = document.createElement('div');
        coin.className = 'flying-coin-particle';

        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;

        const initialX = startX + offsetX;
        const initialY = startY + offsetY;

        coin.style.transform = `translate3d(${initialX}px, ${initialY}px, 0) scale(1.2)`;
        document.body.appendChild(coin);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            coin.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(0.35)`;
          });
        });

        setTimeout(() => {
          coin.style.opacity = '0';
          setTimeout(() => {
            if (coin.parentNode) coin.parentNode.removeChild(coin);
            finishedCount++;

            if (finishedCount === count && onComplete) {
              onComplete();
            }
          }, 150);
        }, 550);

      }, i * 60);
    }
  }

  render(state = gameState) {
    if (!state) return;

    // Coins & Keys
    if (this.coinCountEl) this.coinCountEl.innerText = state.coins ?? 0;
    if (this.keyCountEl) this.keyCountEl.innerText = state.keys ?? 0;

    const buildings = state.buildings || { dock: 0, lighthouse: 0, boat: 0 };
    const currentProgress = state.progress ?? (buildings.dock + buildings.lighthouse + buildings.boat);
    const maxProgress = state.maxProgress ?? (state.MAX_BUILDING_LEVEL ? state.MAX_BUILDING_LEVEL * 3 : 12);
    const currentLevel = state.currentIslandLevel ?? state.currentLevel ?? 1;

    if (this.progressTextEl) {
      this.progressTextEl.innerText = `Level ${currentLevel}: ${currentProgress} / ${maxProgress}`;
    }
    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${Math.min((currentProgress / maxProgress) * 100, 100)}%`;
    }

    // Spins / Energy HUD
    const maxSpins = state.maxSpins ?? 50;
    const currentSpins = state.spins ?? 0;
    if (this.spinEnergyTextEl) {
      this.spinEnergyTextEl.innerText = `⚡ Spins: ${currentSpins} / ${maxSpins}`;
    }
    if (this.spinEnergyFillEl) {
      this.spinEnergyFillEl.style.width = `${Math.min((currentSpins / maxSpins) * 100, 100)}%`;
    }

    // Level Complete Modal
    if (currentProgress >= maxProgress && this.levelCompleteModalEl) {
      if (currentLevel < 3) {
        if (this.completeTitleEl) this.completeTitleEl.innerText = `LEVEL ${currentLevel} COMPLETE!`;
        if (this.btnNextIsland) this.btnNextIsland.innerText = "Travel to Next Island 🏝️";
      } else {
        if (this.completeTitleEl) this.completeTitleEl.innerText = `ALL LEVELS COMPLETE! 🎉`;
        if (this.btnNextIsland) this.btnNextIsland.innerText = "Restart Game 🔄";
      }
      if (this.levelCompleteModalEl.classList.contains('hidden')) {
        eventBus.emit('PLAY_SOUND', 'AU_Cheer');
      }
      this.levelCompleteModalEl.classList.remove('hidden');
    } else if (this.levelCompleteModalEl) {
      this.levelCompleteModalEl.classList.add('hidden');
    }

    // Dynamic Building Upgrade Costs & Buttons
    const maxLvl = state.MAX_BUILDING_LEVEL || 4;
    const dockLevel = buildings.dock || 0;
    const lighthouseLevel = buildings.lighthouse || 0;
    const boatLevel = buildings.boat || 0;

    const dockCost = state.buildingCosts?.dock ?? (typeof gameState.getUpgradeCost === 'function' ? gameState.getUpgradeCost('dock') : 100);
    const lighthouseCost = state.buildingCosts?.lighthouse ?? (typeof gameState.getUpgradeCost === 'function' ? gameState.getUpgradeCost('lighthouse') : 250);
    const boatCost = state.buildingCosts?.boat ?? (typeof gameState.getUpgradeCost === 'function' ? gameState.getUpgradeCost('boat') : 150);

    // Dock Button
    if (this.btnDock) {
      const isMax = dockLevel >= maxLvl;
      this.btnDock.innerHTML = `Dock<br>${isMax ? '(MAX)' : `(${dockCost} 🪙)`}`;
      this.btnDock.style.opacity = (!isMax && state.coins >= dockCost) ? '1' : '0.5';
    }

    // Lighthouse Button
    if (this.btnLighthouse) {
      const isMax = lighthouseLevel >= maxLvl;
      this.btnLighthouse.innerHTML = `Lighthouse<br>${isMax ? '(MAX)' : `(${lighthouseCost} 🪙)`}`;
      this.btnLighthouse.style.opacity = (!isMax && state.coins >= lighthouseCost) ? '1' : '0.5';
    }

    // Boat Button
    if (this.btnBoat) {
      const isMax = boatLevel >= maxLvl;
      this.btnBoat.innerHTML = `Boat<br>${isMax ? '(MAX)' : `(${boatCost} 🪙)`}`;
      this.btnBoat.style.opacity = (!isMax && state.coins >= boatCost) ? '1' : '0.5';
    }

    // Auto-trigger Spin button when broke
    if (this.spinBarEl) {
      const minCost = this.getMinUpgradeCost(state);

      if (state.coins < minCost && currentProgress < maxProgress) {
        this.spinBarEl.classList.remove('hidden');
      } else {
        this.spinBarEl.classList.add('hidden');
      }
    }
  }

  showSceneHUD(sceneKey) {
    if (this.progressWrapperEl) this.progressWrapperEl.classList.add('hidden');
    if (this.bottomBarEl) this.bottomBarEl.classList.add('hidden');
    if (this.spinBarEl) this.spinBarEl.classList.add('hidden');
    if (this.spinEnergyWrapperEl) this.spinEnergyWrapperEl.classList.add('hidden');
    if (this.backIslandBarEl) this.backIslandBarEl.classList.add('hidden');
    if (this.boxHudOverlayEl) this.boxHudOverlayEl.classList.add('hidden');

    if (sceneKey === 'island') {
      if (this.progressWrapperEl) this.progressWrapperEl.classList.remove('hidden');
      if (this.bottomBarEl) this.bottomBarEl.classList.remove('hidden');
    } else if (sceneKey === 'spin') {
      if (this.spinEnergyWrapperEl) this.spinEnergyWrapperEl.classList.remove('hidden');
      if (this.backIslandBarEl) this.backIslandBarEl.classList.remove('hidden');
    } else if (sceneKey === 'box') {
      if (this.boxHudOverlayEl) this.boxHudOverlayEl.classList.remove('hidden');
    }
  }
}

// Standalone Helper Export
export function createDebugPanel(eventBus, mapScene) {
  if (window.uiManager) {
    window.uiManager.setMapScene(mapScene);
    window.uiManager.renderDebugPanel();
  }
}