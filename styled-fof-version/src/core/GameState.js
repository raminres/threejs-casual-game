import { eventBus } from './EventBus.js';
import { LEVEL_CONFIGS } from '../config/LevelConfigs.js';

export class GameState {
  constructor() {
    // Economy & Progress
    this.coins = 1000;
    this.spins = 10;
    this.maxSpins = 50;
    this.keys = 0
    this.stars = 0;
    this.currentIslandLevel = 1;

    // Progression Rules
    this.MAX_BUILDING_LEVEL = 4; // Each building caps at 4 upgrades (12 total per island)

    // Building levels on current island (0 = unbuilt, 1..4 = upgraded)
    this.buildings = {
      dock: 0,
      lighthouse: 0,
      boat: 0
    };
  }

  /**
   * Alias for buyBuilding called by main.js
   */
  buyBuilding(type, islandScene) {
    return this.upgradeBuilding(type, islandScene);
  }

  /**
   * Calculates the coin cost for the next upgrade of a building type
   */
  getUpgradeCost(type) {
    const nextLevel = (this.buildings[type] || 0) + 1;
    if (nextLevel > this.MAX_BUILDING_LEVEL) return Infinity;

    // 1. Try to read from LEVEL_CONFIGS
    const config = LEVEL_CONFIGS?.[this.currentIslandLevel]?.buildings?.[type];
    if (config && Array.isArray(config.costs) && config.costs[nextLevel - 1] !== undefined) {
      return config.costs[nextLevel - 1];
    }

    // 2. Dynamic fallback formula if config is not defined
    const baseCosts = { dock: 100, lighthouse: 250, boat: 150 };
    const base = baseCosts[type] || 100;
    return Math.floor(base * Math.pow(1.6, nextLevel - 1));
  }

  /**
   * Handles building purchase and elastic scale upgrade in 3D scene
   * @param {string} type - 'dock' | 'lighthouse' | 'boat'
   * @param {IslandScene} islandScene - Reference to current IslandScene
   * @returns {boolean} - True if upgrade succeeded
   */
  upgradeBuilding(type, islandScene) {
    if (!this.buildings.hasOwnProperty(type)) {
      console.warn(`Invalid building type: ${type}`);
      return false;
    }

    // 1. Check building level cap (Max 4)
    if (this.buildings[type] >= this.MAX_BUILDING_LEVEL) {
      console.log(`⚠️ ${type} is maxed out at Level ${this.MAX_BUILDING_LEVEL}! Upgrade remaining buildings.`);
      eventBus.emit('UI_MESSAGE', { message: `${type} is fully upgraded!` });
      return false;
    }

    // 2. Check coin balance
    const cost = this.getUpgradeCost(type);
    if (this.coins < cost) {
      console.log(`❌ Not enough coins for ${type}! Need ${cost}, have ${this.coins}`);
      eventBus.emit('UI_MESSAGE', { message: 'Not enough coins!' });
      return false;
    }

    // 3. Deduct currency & increment levels
    this.coins -= cost;
    this.buildings[type] += 1;
    this.stars += 1;
    const newLevel = this.buildings[type];

    // 4. Update 3D scene (spawns model or animates elastic scale boost)
    if (islandScene && typeof islandScene.addBuilding === 'function') {
      islandScene.addBuilding(type, newLevel);
    }

    // 5. Emit state changes across event bus
    eventBus.emit('COINS_CHANGED', { coins: this.coins });
    eventBus.emit('STARS_CHANGED', { stars: this.stars });
    eventBus.emit('BUILDING_UPGRADED', {
      type,
      level: newLevel,
      maxLevel: this.MAX_BUILDING_LEVEL,
      nextCost: this.getUpgradeCost(type),
      buildings: { ...this.buildings }
    });

    console.log(`🎉 Upgraded ${type} to Level ${newLevel}/${this.MAX_BUILDING_LEVEL} for ${cost} coins.`);

    // 6. Check island completion condition (4 + 4 + 4 = 12 upgrades)
    if (this.isIslandFullyUpgraded()) {
      this.onIslandCompleted(islandScene);
    }

    return true;
  }

  /**
   * Returns true only when dock, lighthouse, and boat are all at level 4
   */
  isIslandFullyUpgraded() {
    return Object.values(this.buildings).every(
      (level) => level >= this.MAX_BUILDING_LEVEL
    );
  }

  /**
   * Triggered when all 3 buildings reach level 4
   */
  onIslandCompleted(islandScene) {
    console.log(`🏝️ Island ${this.currentIslandLevel} Complete! Preparing next island...`);

    eventBus.emit('ISLAND_COMPLETED', {
      completedLevel: this.currentIslandLevel,
      nextLevel: this.currentIslandLevel + 1
    });

    // Advance island level & reset individual building progress
    this.currentIslandLevel += 1;
    this.buildings = { dock: 0, lighthouse: 0, boat: 0 };

    // Clear meshes from old scene if needed
    if (islandScene && typeof islandScene.clearBuildings === 'function') {
      islandScene.clearBuildings();
    }
  }
  startBoxGame(initialKeys = 3) {
    this.keys = initialKeys;
    eventBus.emit('STATE_CHANGED', this);
  }
  addReward(reward) {
    if (!reward) return;

    if (reward.type === 'coin') {
      this.addCoins(reward.val);
    } else if (reward.type === 'spin') {
      this.addSpins(reward.val);
    }

    eventBus.emit('STATE_CHANGED', this);
  }

  /**
   * Deducts 1 key when opening a box
   */
  useKey() {
    if (this.keys <= 0) return false;
    this.keys -= 1;
    eventBus.emit('STATE_CHANGED', this);
    return true;
  }

  /**
   * Applies rewards won from opening a chest box
   */
  addKeyReward(reward) {
    if (!reward) return;

    if (reward.type === 'coin') {
      this.addCoins(reward.val);
    } else if (reward.type === 'key') {
      this.keys += reward.val;
    }

    eventBus.emit('STATE_CHANGED', this);
  }

  // --- Economy Methods ---

  addCoins(amount) {
    this.coins += amount;
    eventBus.emit('COINS_CHANGED', { coins: this.coins });
  }

  addSpins(amount) {
    this.spins += amount;
    eventBus.emit('SPINS_CHANGED', { spins: this.spins });
  }

  useSpin() {
    if (this.spins <= 0) return false;
    this.spins -= 1;
    eventBus.emit('SPINS_CHANGED', { spins: this.spins });
    return true;
  }
}


// Singleton Export
export const gameState = new GameState();