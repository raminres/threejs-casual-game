## Game Modes
* **Primitive Version**: Only for seeing the game logic.
* **Styled FOF Version**: Includes custom models, keyframe animations, basic lighting setup, decoupled system to easily manage systems, scenes and gameplay.
---
## How to play
* 1 - **Open the Visual Studio Project**
* 2 - **Terminal > New Terminal**
* 3 - **npm install** and **npm run dev**
---
##  Folder Structure

```text
threejs-casual-game/
├── index.html             # Main HTML entry point & DOM UI container
├── README.md              # Readme file
├── assets                 # Blender and raw audio files.
└── primitive-version
    ├── main.js             # Application bootstrapper for primitve version
    ├── index.html          # Level balance, reward pools, & lighting
    └── style.css           # Styling for primitive version
└── styled-fof-version  
    ├── public              #.glb and .mp3 files
    ├── src                 # all .js files
        ├── assets
        ├── config          
        ├── core
        ├── effects
        ├── loaders
        ├── scenes
        └── ui
        ├── index.html
        └── style.css       # styling for stylized-fof-version
```
## Core Architecture & Execution Flow

### 1. Root Engine & Singletons (`/src/core`)

* **`index.html` & `main.js`**: Defines the canvas element (`#game-canvas`) and HUD overlays (`#ui-container`) before bootstrapping the app.
* **`App.js`**: Initializes the global `WebGLRenderer`, manages the main animation frame loop (`requestAnimationFrame`), and handles scene visibility toggling via `EventBus`.
* **`CameraManager.js`**: Houses a single `PerspectiveCamera` with preset field-of-view, position, and orientation configurations for each active scene.
* **`GameState.js`**: Global singleton tracking player resources (coins, spins, keys), upgrade cost formulas, and island completion rules.
* **`AudioManager.js`**: Decodes `.mp3` audio files into Web Audio API buffers and routes sound output through a master gain node set to 50% volume.
* **`EventBus.js`**: Centralized pub/sub event emitter decoupling UI triggers, audio playback, and 3D scene transitions.

---

### 2. Scene Subsystems (`/src/scenes`)

All interactive scenes extend a common base scene and are registered directly to `App.js`:

* **`IslandScene`**: Renders island terrain, handles building placement (`dock`, `lighthouse`, `boat`), and performs elastic bounce scale animations upon upgrading.
* **`SpinScene`**: Renders a 3D prize wheel featuring dynamic 2D canvas text labels and programmatic rotation easing to award coins, spins, or chest keys.
* **`BoxOpeningScene`**: Renders a 3x3 grid of GLTF chest models using Blender skeletal keyframe animations via `AnimationMixer` to reveal random rewards.
* **`MapScene`**: Displays island progression paths and executes boat travel animations driven by Blender NLA keyframe tracks.

---

### 3. Utilities & Support Modules (`/src/...`)

* **`LevelConfigs.js` (`/src/config`)**: Defines per-island building cost curves, environment ground/sea colors, and standardized scene lighting configurations (`skylight` & `directional`).
* **`AssetLoader.js` (`/src/loaders`)**: Asynchronously loads and caches GLTF 3D models to eliminate duplicate network requests.
* **`ConfettiVFX.js` (`/src/effects`)**: Manages a 2D canvas particle explosion triggered on celebration events.