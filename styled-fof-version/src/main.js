import './style.css';
import { App } from './core/App.js';
import { gameState } from './core/GameState.js';
import { eventBus } from './core/EventBus.js';
import { UIManager } from './ui/UIManager.js';

import { IslandScene } from './scenes/IslandScene.js';
import { SpinScene } from './scenes/SpinScene.js';
import { MapScene } from './scenes/MapScene.js';
import { BoxOpeningScene } from './scenes/BoxOpeningScene.js';

// Boot Engine
const canvas = document.getElementById('game-canvas');
const app = new App(canvas);
const ui = new UIManager();

// Instantiate Scenes
const islandScene = new IslandScene();
const spinScene = new SpinScene();
const mapScene = new MapScene();
const boxScene = new BoxOpeningScene();

// 🟢 Connect MapScene to UI and Window
ui.setMapScene(mapScene);
window.mapScene = mapScene;

app.registerScene('island', islandScene);
app.registerScene('spin', spinScene);
app.registerScene('map', mapScene);
app.registerScene('box', boxScene);

// Wire Global Event Logic

// 1. Safe Building Purchase Event
eventBus.on('BUY_BUILDING', (data) => {
  const type = typeof data === 'object' ? data?.type : data;
  if (type) {
    gameState.buyBuilding(type, islandScene);
  }
});

eventBus.on('BUILDING_UPGRADED', (data) => {
  const { type, level, nextCost } = data;
  console.log(`Updated ${type} to level ${level}. Next cost: ${nextCost}`);
});

// 2. Scene Switch Handler
eventBus.on('SWITCH_SCENE', (sceneKey) => {
  if (sceneKey === 'box' && typeof boxScene.resetBoxes === 'function') {
    boxScene.resetBoxes();
  }
  if (ui && typeof ui.showSceneHUD === 'function') {
    ui.showSceneHUD(sceneKey);
  }
});

// 3. Level Completion & Map Transition Handler
eventBus.on('TRIGGER_LEVEL_TRANSITION', () => {
  if (ui.levelCompleteModalEl) {
    ui.levelCompleteModalEl.classList.add('hidden');
  }

  const currentLevel = gameState.currentIslandLevel || 1;

  // Restart game if max level (3) was completed
  if (currentLevel > 3) {
    gameState.currentIslandLevel = 1;
    gameState.buildings = { dock: 0, lighthouse: 0, boat: 0 };
    islandScene.clearBuildings();
    if (typeof mapScene.resetShip === 'function') {
      mapScene.resetShip();
    }
    eventBus.emit('SWITCH_SCENE', 'island');
    eventBus.emit('STATE_CHANGED', gameState);
    return;
  }

  // Calculate transitions safely
  const toLevel = currentLevel;
  const fromLevel = Math.max(1, toLevel - 1);

  // Switch to Map Scene for ship travel animation
  eventBus.emit('SWITCH_SCENE', 'map');

  mapScene.animateTravel(fromLevel, toLevel, () => {
    // Clear old island building meshes
    islandScene.clearBuildings();

    // Optional theme change if set up in IslandScene
    if (typeof islandScene.setTheme === 'function') {
      islandScene.setTheme(toLevel);
    }

    // Return to the island scene with fresh state
    eventBus.emit('SWITCH_SCENE', 'island');
    eventBus.emit('STATE_CHANGED', gameState);
  });
});

// Boot into island scene immediately
app.start();
eventBus.emit('SWITCH_SCENE', 'island');
eventBus.emit('STATE_CHANGED', gameState);