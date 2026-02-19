/**
 * AI Controller with A* Pathfinding
 * Navigates platforms, avoids spikes, and reaches the goal
 */

class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    this.sort();
  }

  dequeue() {
    return this.values.shift();
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

export class AIController {
  constructor(options = {}) {
    this.difficulty = options.difficulty || 'normal'; // easy, normal, hard
    this.thinkInterval = this.difficulty === 'hard' ? 1 : this.difficulty === 'normal' ? 3 : 5;
    this.frameCount = 0;
    this.currentPath = [];
    this.currentTarget = null;
    this.stuckCounter = 0;
    this.lastPosition = { x: 0, y: 0 };
    this.reactionDelay = this.difficulty === 'hard' ? 0 : this.difficulty === 'normal' ? 2 : 5;
    this.delayCounter = 0;
  }

  /**
   * Main AI decision-making function
   * Called every frame by GameEngine
   */
  getActions(aiPlayer, level) {
    this.frameCount++;

    // Default: no action
    const keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      w: false,
      a: false,
      d: false,
      ' ': false,
    };

    if (!level || !level.goal) return keys;

    // Check if stuck
    if (this.frameCount % 30 === 0) {
      const dx = Math.abs(aiPlayer.x - this.lastPosition.x);
      const dy = Math.abs(aiPlayer.y - this.lastPosition.y);
      if (dx < 5 && dy < 5) {
        this.stuckCounter++;
      } else {
        this.stuckCounter = 0;
      }
      this.lastPosition = { x: aiPlayer.x, y: aiPlayer.y };
    }

    // If stuck, try jumping
    if (this.stuckCounter > 3) {
      keys.ArrowUp = true;
      keys.w = true;
      keys[' '] = true;
      this.stuckCounter = 0;
    }

    // Recalculate path periodically or when no path exists
    if (this.frameCount % (this.thinkInterval * 60) === 0 || !this.currentPath || this.currentPath.length === 0) {
      this.currentPath = this.calculatePath(aiPlayer, level);
    }

    // Follow the path
    if (this.currentPath && this.currentPath.length > 0) {
      const nextTarget = this.currentPath[0];
      
      // Check if reached current waypoint
      const distToTarget = Math.sqrt(
        Math.pow(aiPlayer.x - nextTarget.x, 2) + 
        Math.pow(aiPlayer.y - nextTarget.y, 2)
      );

      if (distToTarget < 30) {
        this.currentPath.shift(); // Move to next waypoint
        if (this.currentPath.length === 0) {
          this.currentPath = this.calculatePath(aiPlayer, level);
        }
      }

      // Move towards target
      if (this.currentPath.length > 0) {
        const target = this.currentPath[0];
        const dx = target.x - aiPlayer.x;
        const dy = target.y - aiPlayer.y;

        // Horizontal movement
        if (Math.abs(dx) > 10) {
          if (dx > 0) {
            keys.ArrowRight = true;
            keys.d = true;
          } else {
            keys.ArrowLeft = true;
            keys.a = true;
          }
        }

        // Jump logic
        const needsJump = this.shouldJump(aiPlayer, target, level);
        if (needsJump && aiPlayer.onGround) {
          keys.ArrowUp = true;
          keys.w = true;
          keys[' '] = true;
        }

        // Avoid immediate spikes
        const dangerAhead = this.checkDangerAhead(aiPlayer, level, dx > 0 ? 'right' : 'left');
        if (dangerAhead && aiPlayer.onGround) {
          keys.ArrowUp = true;
          keys.w = true;
          keys[' '] = true;
        }
      }
    }

    return keys;
  }

  /**
   * A* Pathfinding Algorithm
   */
  calculatePath(aiPlayer, level) {
    const goal = level.goal;
    const start = {
      x: Math.floor(aiPlayer.x / 30) * 30 + 15,
      y: Math.floor(aiPlayer.y / 30) * 30 + 15,
    };
    const end = {
      x: Math.floor((goal.x + goal.w / 2) / 30) * 30 + 15,
      y: Math.floor((goal.y + goal.h / 2) / 30) * 30 + 15,
    };

    // Build a simplified grid of walkable areas
    const gridWidth = Math.ceil(level.width / 30);
    const gridHeight = Math.ceil(level.height / 30);
    
    const startNode = this.posToNode(start);
    const endNode = this.posToNode(end);

    // A* algorithm
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = `${startNode.x},${startNode.y}`;
    const endKey = `${endNode.x},${endNode.y}`;

    gScore.set(startKey, 0);
    fScore.set(startKey, this.heuristic(startNode, endNode));
    openSet.enqueue(startNode, fScore.get(startKey));

    let iterations = 0;
    const maxIterations = 500;

    while (!openSet.isEmpty() && iterations < maxIterations) {
      iterations++;
      const current = openSet.dequeue().val;
      const currentKey = `${current.x},${current.y}`;

      if (currentKey === endKey) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, current);
      }

      closedSet.add(currentKey);

      // Get neighbors (can move left, right, and jump)
      const neighbors = this.getNeighbors(current, level, gridWidth, gridHeight);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = gScore.get(currentKey) + this.distance(current, neighbor);

        if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + this.heuristic(neighbor, endNode));
          
          if (!this.inOpenSet(openSet, neighbor)) {
            openSet.enqueue(neighbor, fScore.get(neighborKey));
          }
        }
      }
    }

    // No path found, return direct path to goal
    return [end];
  }

  posToNode(pos) {
    return {
      x: Math.floor(pos.x / 30) * 30 + 15,
      y: Math.floor(pos.y / 30) * 30 + 15,
    };
  }

  heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  getNeighbors(node, level, gridWidth, gridHeight) {
    const neighbors = [];
    const directions = [
      { x: 30, y: 0 },   // right
      { x: -30, y: 0 },  // left
      { x: 0, y: -60 },  // jump up
      { x: 30, y: -60 }, // jump right
      { x: -30, y: -60 }, // jump left
      { x: 0, y: 30 },   // fall down
    ];

    for (const dir of directions) {
      const newX = node.x + dir.x;
      const newY = node.y + dir.y;

      // Check bounds
      if (newX < 0 || newX >= level.width || newY < 0 || newY >= level.height) {
        continue;
      }

      // Check if position is safe (not in spike, has platform support if moving down)
      if (!this.isSafe({ x: newX, y: newY }, level)) {
        continue;
      }

      // For downward/horizontal movement, check if there's platform support
      if (dir.y >= 0) {
        const hasSupport = this.hasPlatformSupport({ x: newX, y: newY }, level);
        if (!hasSupport) continue;
      }

      neighbors.push({ x: newX, y: newY });
    }

    return neighbors;
  }

  isSafe(pos, level) {
    // Check if position intersects with any visible spike
    for (const spike of level.spikes) {
      if (!spike.active || !spike.visible) continue;
      const spikeBox = {
        x: spike.x,
        y: spike.y,
        w: spike.w || 20,
        h: spike.h || 20,
      };
      if (this.pointInBox(pos, spikeBox)) {
        return false;
      }
    }
    return true;
  }

  hasPlatformSupport(pos, level) {
    // Check if there's a platform within 40 pixels below
    for (const plat of level.platforms) {
      if (!plat.active) continue;
      const platBox = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
      // Check if position is above platform and close enough
      if (pos.x >= platBox.x - 20 && pos.x <= platBox.x + platBox.w + 20) {
        if (pos.y <= platBox.y && pos.y >= platBox.y - 60) {
          return true;
        }
      }
    }
    return false;
  }

  pointInBox(point, box) {
    return (
      point.x >= box.x &&
      point.x <= box.x + box.w &&
      point.y >= box.y &&
      point.y <= box.y + box.h
    );
  }

  inOpenSet(openSet, node) {
    return openSet.values.some(item => item.val.x === node.x && item.val.y === node.y);
  }

  reconstructPath(cameFrom, current) {
    const path = [current];
    let currentKey = `${current.x},${current.y}`;
    
    while (cameFrom.has(currentKey)) {
      current = cameFrom.get(currentKey);
      path.unshift(current);
      currentKey = `${current.x},${current.y}`;
    }
    
    return path;
  }

  shouldJump(aiPlayer, target, level) {
    const dy = target.y - aiPlayer.y;
    const dx = Math.abs(target.x - aiPlayer.x);

    // Jump if target is above
    if (dy < -30 && dx < 100) {
      return true;
    }

    // Jump over gaps
    const checkDist = 60;
    const direction = target.x > aiPlayer.x ? 1 : -1;
    const ahead = {
      x: aiPlayer.x + direction * checkDist,
      y: aiPlayer.y + 30,
    };

    const hasGroundAhead = this.hasPlatformSupport(ahead, level);
    if (!hasGroundAhead) {
      return true;
    }

    return false;
  }

  checkDangerAhead(aiPlayer, level, direction) {
    const checkDist = 40;
    const dx = direction === 'right' ? checkDist : -checkDist;
    const checkArea = {
      x: aiPlayer.x + dx,
      y: aiPlayer.y,
      w: 20,
      h: 20,
    };

    for (const spike of level.spikes) {
      if (!spike.active || !spike.visible) continue;
      const spikeBox = {
        x: spike.x,
        y: spike.y,
        w: spike.w || 20,
        h: spike.h || 20,
      };
      if (this.boxesOverlap(checkArea, spikeBox)) {
        return true;
      }
    }
    return false;
  }

  boxesOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  reset() {
    this.currentPath = [];
    this.currentTarget = null;
    this.stuckCounter = 0;
    this.frameCount = 0;
  }
}
