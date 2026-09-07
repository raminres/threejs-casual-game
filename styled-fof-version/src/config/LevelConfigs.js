
export const LEVEL_CONFIGS = {
  1: {
    id: 1,
    title: "Level 1",
    groundColor: 0x22c55e,
    seaColor: 0x0284c7,
    mapY: -4.0,
    buildings: {
      dock: { costs: [100, 160, 250, 400] },
      lighthouse: { costs: [250, 400, 640, 1020] },
      boat: { costs: [150, 240, 380, 600] }
    }
  },
  2: {
    id: 2,
    title: "Level 2",
    groundColor: 0x10b981,
    seaColor: 0x06b6d4,
    mapY: 0.0,
    buildings: {
      dock: { costs: [200, 320, 500, 800] },
      lighthouse: { costs: [500, 800, 1280, 2040] },
      boat: { costs: [300, 480, 760, 1200] }
    }
  },
  3: {
    id: 3,
    title: "Level 3",
    groundColor: 0x8b5cf6,
    seaColor: 0x3b82f6,
    mapY: 4.0,
    buildings: {
      dock: { costs: [400, 640, 1000, 1600] },
      lighthouse: { costs: [1000, 1600, 2560, 4080] },
      boat: { costs: [600, 960, 1520, 2400] }
    }
  }
};

// ☀️ Standardized island lighting profile across all scenes
const UNIFORM_LIGHTING = {
  backgroundColor: 0x87ceeb, // Sky blue
  skylight: {
    skyColor: 0xfaffff,
    groundColor: 0x334155,
    intensity: 4.3 // Kept low to maintain sharp directional shadow contrast
  },
  directional: {
    color: 0xfffaed,
    intensity: 4.5,
    position: [10, 30, 15],
    castShadow: true
  }
};
const BOX_SCENE_LIGHTING = {
  backgroundColor: 0x87ceeb, // Sky blue
  skylight: {
    skyColor: 0xfaffff,
    groundColor: 0x334155,
    intensity: 5.0
  },
  directional: {
    color: 0xfffaed,
    intensity: 1.0,
    position: [10, 30, 15],
    castShadow: true
  }
};

export const LIGHTING_CONFIGS = {
  island: UNIFORM_LIGHTING,
  spin: UNIFORM_LIGHTING,
  box: BOX_SCENE_LIGHTING
};