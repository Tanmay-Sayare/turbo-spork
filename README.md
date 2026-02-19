# 🎮 TURBO SPORK - AI-Powered Platformer Battle Arena

A competitive platformer game where you can play against AI opponents or watch AIs battle each other. Features a custom level editor and smart A* pathfinding AI.

## 🌟 Features

### Game Modes
- **Human vs AI** - Challenge a smart AI opponent with A* pathfinding
- **AI vs AI** - Watch two AI players compete against each other

### Level Editor
- Drag-and-drop level creation
- Multiple platform types:
  - **Static** - Standard solid platforms
  - **Moving** - Platforms that move horizontally or vertically
  - **Collapsing** - Platforms that fall after being touched
- Spike obstacles with 4 directions (up, down, left, right)
- Set custom spawn points and goals
- Save/load custom levels
- Grid-based snapping for clean alignment

### AI Controller
- **A* Pathfinding Algorithm** - Finds optimal path to goal
- **Obstacle Avoidance** - Detects and avoids spikes
- **Dynamic Decision Making** - Adapts to moving platforms
- **Anti-Stuck Logic** - Recovers from getting stuck
- **Difficulty Levels** - Easy, Normal, Hard

### Default Levels
1. **Tutorial - Easy Start** - Simple introduction level
2. **The Jumper** - Test your jumping skills
3. **Collapsing Platforms** - Quick reflexes required
4. **Moving Madness** - Navigate moving platforms
5. **Hidden Danger** - Watch out for hidden spikes
6. **The Gauntlet** - Ultimate challenge combining all mechanics

## 🎯 Controls

### Gameplay
- **Arrow Keys** or **WASD** - Move left/right
- **Space** or **Up Arrow** or **W** - Jump
- **Advanced Mechanics**:
  - Coyote time (grace period after leaving platform)
  - Jump buffering (queue jump before landing)
  - Variable jump height

### Level Editor
- **Left Click** - Place object or drag to create platform
- **Right Click** - Delete object
- **Grid Snap** - Objects automatically align to 30px grid

## 🏗️ Technical Architecture

### Backend (FastAPI + MongoDB)
```
/api/levels         - Create and retrieve custom levels
/api/levels/:id     - Get specific level
/api/matches        - Save match results
```

### Frontend (React + Canvas)
- **GameEngine.js** - Complete physics and rendering system
- **AIController.js** - A* pathfinding and decision making
- **MainMenu.js** - Level selection and mode selection
- **GameScreen.js** - Game canvas with HUD
- **LevelEditor.js** - Visual level editor

### Physics System
- Gravity: 0.55
- Move Speed: 4.0
- Jump Force: -10.2
- Max Fall Speed: 13
- Friction: 0.78
- Coyote Frames: 7
- Jump Buffer: 5 frames

## 🚀 Setup & Installation

### Prerequisites
- Python 3.9+
- Node.js 16+
- MongoDB
- Yarn

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup
```bash
cd frontend
yarn install
yarn start
```

### Using Supervisor (Production)
```bash
sudo supervisorctl restart all
sudo supervisorctl status
```

## 🎨 Visual Design

- **Color Scheme**: Cyberpunk dark theme with neon accents
  - Cyan (#00F0FF) - Player and UI highlights
  - Yellow (#FAFF00) - AI player
  - Red (#FF003C) - Danger/spikes
  - Green (#39FF14) - Goal
  - Purple (#7928CA) - Accents and gradients

- **Effects**:
  - Particle explosions on death/win
  - Screen shake on collisions
  - Flash effects
  - Player trails
  - Glowing elements
  - Pulsing goal animation

## 📊 Database Schema

### Levels Collection
```json
{
  "id": "uuid",
  "name": "Level Name",
  "width": 960,
  "height": 540,
  "spawn": { "x": 50, "y": 480 },
  "goal": { "x": 860, "y": 460, "w": 40, "h": 60 },
  "platforms": [...],
  "spikes": [...],
  "author": "player",
  "created_at": "ISO datetime"
}
```

### Matches Collection
```json
{
  "id": "uuid",
  "level_id": "level-id",
  "mode": "human_vs_ai | ai_vs_ai",
  "winner": "human | ai | ai1 | ai2",
  "time_ms": 45230,
  "deaths": 5,
  "timestamp": "ISO datetime"
}
```

## 🧠 AI Algorithm Details

### A* Pathfinding
1. **Grid Representation**: World divided into 30x30 grid cells
2. **Heuristic**: Manhattan distance to goal
3. **Movement Actions**: 
   - Horizontal (left/right)
   - Jump (up)
   - Jump with direction (diagonal)
   - Fall (down)
4. **Path Validation**: Checks for platform support and spike avoidance
5. **Dynamic Replanning**: Recalculates path every few seconds or when stuck

### Decision Logic
- Detects immediate danger and jumps to avoid
- Follows waypoints from A* path
- Handles moving platforms by predicting position
- Anti-stuck mechanism with periodic jumps
- Difficulty adjusts thinking interval and reaction time

## 🎯 Future Enhancements

- [ ] Multiplayer online mode
- [ ] More platform types (bouncy, icy, one-way)
- [ ] Power-ups and collectibles
- [ ] Leaderboards and rankings
- [ ] Level rating system
- [ ] AI training with machine learning
- [ ] Level sharing community
- [ ] Mobile touch controls
- [ ] Sound effects and music

## 🐛 Known Issues

None currently! If you find any bugs, please report them.

## 📝 License

MIT License - Feel free to use and modify!

## 👥 Credits

Developed with ❤️ by the Emergent AI Team

---

**Enjoy playing TURBO SPORK! 🎮🚀**
