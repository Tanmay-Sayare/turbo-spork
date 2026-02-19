const COLORS = {
  void: '#050505',
  voidLight: '#0F0F11',
  surface: '#1A1A1E',
  surfaceBorder: '#333336',
  player: '#00F0FF',
  playerGlow: 'rgba(0, 240, 255, 0.4)',
  playerTrail: 'rgba(0, 240, 255, 0.12)',
  aiPlayer: '#FAFF00',
  aiPlayerGlow: 'rgba(250, 255, 0, 0.4)',
  danger: '#FF003C',
  dangerGlow: 'rgba(255, 0, 60, 0.4)',
  goal: '#39FF14',
  goalGlow: 'rgba(57, 255, 20, 0.4)',
  goalPulse: 'rgba(57, 255, 20, 0.15)',
  warning: '#FAFF00',
  text: '#EDEDED',
  textDim: '#888899',
  movingPlatform: '#2A2A3E',
  collapsingPlatform: '#2E1A1A',
  grid: 'rgba(255,255,255,0.02)',
};

const PHYSICS = {
  gravity: 0.55,
  moveSpeed: 4.0,
  jumpForce: -10.2,
  friction: 0.78,
  maxFallSpeed: 13,
  coyoteFrames: 7,
  jumpBufferFrames: 5,
};

export class GameEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = options.width || 960;
    this.H = options.height || 540;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.W * dpr;
    canvas.height = this.H * dpr;
    canvas.style.width = this.W + 'px';
    canvas.style.height = this.H + 'px';
    this.ctx.scale(dpr, dpr);

    this.state = 'idle';
    this.level = null;
    this.levelData = null;
    this.time = 0;
    this.deaths = 0;
    this.frame = 0;

    this.player = this._createPlayer();
    this.aiEnabled = options.aiEnabled || false;
    this.aiController = options.aiController || null;
    this.aiPlayer = this.aiEnabled ? this._createPlayer() : null;

    this.particles = [];
    this.shake = { x: 0, y: 0, intensity: 0 };
    this.flash = { alpha: 0, color: COLORS.danger };
    this.trail = [];
    this.aiTrail = [];

    this.keys = {};
    this._keyDown = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key)) e.preventDefault();
      this.keys[e.key] = true;
    };
    this._keyUp = (e) => { this.keys[e.key] = false; };
    window.addEventListener('keydown', this._keyDown);
    window.addEventListener('keyup', this._keyUp);

    this.onDeath = options.onDeath || null;
    this.onWin = options.onWin || null;
    this.onTimeUpdate = options.onTimeUpdate || null;
    this.onStateChange = options.onStateChange || null;

    this.animFrame = null;
    this.running = false;
    this.lastTimestamp = 0;
    this._deathTimeout = null;
  }

  _createPlayer() {
    return { x: 0, y: 0, vx: 0, vy: 0, w: 22, h: 22, onGround: false, coyoteFrames: 0, jumpBuffer: 0, alive: true, won: false, facing: 1 };
  }

  loadLevel(levelData) {
    this.levelData = JSON.parse(JSON.stringify(levelData));
    this.level = this._parseLevel(this.levelData);
    this._resetPlayer(this.player);
    if (this.aiPlayer) this._resetPlayer(this.aiPlayer);
    this.time = 0;
    this.deaths = 0;
    this.particles = [];
    this.trail = [];
    this.aiTrail = [];
    this.state = 'ready';
    if (this.onStateChange) this.onStateChange('ready');
    this._render();
  }

  _parseLevel(data) {
    const platforms = (data.platforms || []).map(p => ({
      ...p, type: p.type || 'static', active: true, triggered: false,
      collapseTimer: p.delay || 40, originalY: p.y, originalX: p.x,
      shakeOffset: 0, fallSpeed: 0, moveOffset: 0, moveDir: 1,
    }));
    const spikes = (data.spikes || []).map(s => ({
      ...s, dir: s.dir || 'up', active: true, visible: !s.hidden,
      hidden: s.hidden || false, triggerDist: s.triggerDist || 80,
      moveOffset: 0, moveDir: 1, originalX: s.x, originalY: s.y,
    }));
    return {
      name: data.name || 'Custom Level', width: data.width || this.W,
      height: data.height || this.H, spawn: data.spawn || { x: 50, y: 480 },
      goal: data.goal || { x: 860, y: 460, w: 40, h: 60 },
      platforms, spikes,
    };
  }

  _resetPlayer(p) {
    const spawn = this.level.spawn;
    Object.assign(p, { x: spawn.x, y: spawn.y, vx: 0, vy: 0, onGround: false, coyoteFrames: 0, jumpBuffer: 0, alive: true, won: false, facing: 1 });
  }

  start() {
    this.state = 'playing';
    this.running = true;
    this.lastTimestamp = performance.now();
    if (this.onStateChange) this.onStateChange('playing');
    this._loop(this.lastTimestamp);
  }

  stop() {
    this.running = false;
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
    if (this._deathTimeout) { clearTimeout(this._deathTimeout); this._deathTimeout = null; }
  }

  restart() {
    this.stop();
    this.level = this._parseLevel(this.levelData);
    this._resetPlayer(this.player);
    if (this.aiPlayer) this._resetPlayer(this.aiPlayer);
    this.particles = [];
    this.trail = [];
    this.aiTrail = [];
    this.shake = { x: 0, y: 0, intensity: 0 };
    this.flash = { alpha: 0, color: COLORS.danger };
    this.time = 0;
    this.start();
  }

  fullRestart() {
    this.deaths = 0;
    this.restart();
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.running = false;
      if (this.animFrame) cancelAnimationFrame(this.animFrame);
      if (this.onStateChange) this.onStateChange('paused');
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.running = true;
      this.lastTimestamp = performance.now();
      if (this.onStateChange) this.onStateChange('playing');
      this._loop(this.lastTimestamp);
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('keydown', this._keyDown);
    window.removeEventListener('keyup', this._keyUp);
  }

  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTimestamp) / 16.667, 3);
    this.lastTimestamp = timestamp;
    if (this.state === 'playing') {
      this.time += dt * 16.667;
      this.frame++;
      this._update(dt);
      if (this.onTimeUpdate) this.onTimeUpdate(this.time);
    }
    this._render();
    this.animFrame = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    if (this.player.alive && !this.player.won) {
      this._updatePlayerInput(this.player, this.keys, dt);
      this._applyPhysics(this.player, dt);
      this._resolveCollisions(this.player);
      this._checkSpikeCollisions(this.player, false);
      this._checkGoal(this.player, false);
      this._checkBounds(this.player, false);
      this._updateTrail(this.player, this.trail);
    }
    if (this.aiPlayer && this.aiPlayer.alive && !this.aiPlayer.won && this.aiController) {
      const aiKeys = this.aiController.getActions(this.aiPlayer, this.level);
      this._updatePlayerInput(this.aiPlayer, aiKeys, dt);
      this._applyPhysics(this.aiPlayer, dt);
      this._resolveCollisions(this.aiPlayer);
      this._checkSpikeCollisions(this.aiPlayer, true);
      this._checkGoal(this.aiPlayer, true);
      this._checkBounds(this.aiPlayer, true);
      this._updateTrail(this.aiPlayer, this.aiTrail);
    }
    this._updateTraps(dt);
    this._updateHiddenSpikes();
    this._updateEffects(dt);
    this._updateParticles(dt);
  }

  _updatePlayerInput(p, keys, dt) {
    const left = keys['ArrowLeft'] || keys['a'];
    const right = keys['ArrowRight'] || keys['d'];
    const jump = keys['ArrowUp'] || keys['w'] || keys[' '];
    if (left) { p.vx = -PHYSICS.moveSpeed; p.facing = -1; }
    else if (right) { p.vx = PHYSICS.moveSpeed; p.facing = 1; }
    else { p.vx *= PHYSICS.friction; if (Math.abs(p.vx) < 0.1) p.vx = 0; }
    if (jump) p.jumpBuffer = PHYSICS.jumpBufferFrames;
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);
    if (p.onGround) p.coyoteFrames = PHYSICS.coyoteFrames;
    else p.coyoteFrames = Math.max(0, p.coyoteFrames - 1);
    if (p.jumpBuffer > 0 && p.coyoteFrames > 0) {
      p.vy = PHYSICS.jumpForce;
      p.onGround = false;
      p.coyoteFrames = 0;
      p.jumpBuffer = 0;
      this._spawnParticles(p.x + p.w / 2, p.y + p.h, COLORS.player, 4);
    }
  }

  _applyPhysics(p, dt) {
    p.vy += PHYSICS.gravity * dt;
    if (p.vy > PHYSICS.maxFallSpeed) p.vy = PHYSICS.maxFallSpeed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  _resolveCollisions(p) {
    p.onGround = false;
    for (const plat of this.level.platforms) {
      if (!plat.active) continue;
      const px = plat.x + (plat.shakeOffset || 0);
      const py = plat.y;
      if (!this._aabb(p, { x: px, y: py, w: plat.w, h: plat.h })) continue;
      const oT = (p.y + p.h) - py;
      const oB = (py + plat.h) - p.y;
      const oL = (p.x + p.w) - px;
      const oR = (px + plat.w) - p.x;
      const min = Math.min(oT, oB, oL, oR);
      if (min === oT && p.vy >= 0) {
        p.y = py - p.h; p.vy = 0; p.onGround = true;
        if (plat.type === 'moving') p.x += (plat.lastDx || 0);
        if (plat.type === 'collapsing' && !plat.triggered) plat.triggered = true;
      } else if (min === oB && p.vy <= 0) {
        p.y = py + plat.h; p.vy = 1;
      } else if (min === oL) {
        p.x = px - p.w; p.vx = 0;
      } else if (min === oR) {
        p.x = px + plat.w; p.vx = 0;
      }
    }
  }

  _checkSpikeCollisions(p, isAI) {
    for (const s of this.level.spikes) {
      if (!s.active || !s.visible) continue;
      const hitbox = { x: s.x + 3, y: s.y + 3, w: (s.w || 20) - 6, h: (s.h || 20) - 6 };
      if (this._aabb(p, hitbox)) {
        if (isAI) { this._resetPlayer(this.aiPlayer); }
        else { this._die(); }
        return;
      }
    }
  }

  _checkGoal(p, isAI) {
    const g = this.level.goal;
    if (this._aabb(p, g)) {
      if (isAI) { this.aiPlayer.won = true; }
      else { this._win(); }
    }
  }

  _checkBounds(p, isAI) {
    if (p.y > this.H + 100) {
      if (isAI) { this._resetPlayer(this.aiPlayer); }
      else { this._die(); }
    }
    if (p.x < 0) p.x = 0;
    if (p.x + p.w > this.level.width) p.x = this.level.width - p.w;
  }

  _updateTraps(dt) {
    for (const p of this.level.platforms) {
      if (p.type === 'collapsing' && p.triggered && p.active) {
        p.collapseTimer -= dt;
        if (p.collapseTimer > 0) {
          p.shakeOffset = (Math.random() - 0.5) * 4;
        } else {
          p.fallSpeed += 0.5 * dt;
          p.y += p.fallSpeed * dt;
          p.shakeOffset = 0;
          if (p.y > this.H + 50) p.active = false;
        }
      }
      if (p.type === 'moving' && p.active) {
        const speed = (p.speed || 1) * dt;
        const prevX = p.x;
        const prevY = p.y;
        p.moveOffset += speed * p.moveDir;
        if (Math.abs(p.moveOffset) >= (p.range || 100)) p.moveDir *= -1;
        if (p.axis === 'x') p.x = p.originalX + p.moveOffset;
        else p.y = p.originalY + p.moveOffset;
        p.lastDx = p.x - prevX;
      }
    }
    for (const s of this.level.spikes) {
      if (s.speed && s.active) {
        s.moveOffset += (s.speed || 1) * dt * s.moveDir;
        if (Math.abs(s.moveOffset) >= (s.range || 60)) s.moveDir *= -1;
        if (s.axis === 'x') s.x = s.originalX + s.moveOffset;
        else if (s.axis === 'y') s.y = s.originalY + s.moveOffset;
      }
    }
  }

  _updateHiddenSpikes() {
    for (const s of this.level.spikes) {
      if (s.hidden && !s.visible) {
        const dx = (this.player.x + this.player.w / 2) - (s.x + (s.w || 20) / 2);
        const dy = (this.player.y + this.player.h / 2) - (s.y + (s.h || 20) / 2);
        if (Math.sqrt(dx * dx + dy * dy) < s.triggerDist) {
          s.visible = true;
          this._spawnParticles(s.x + 10, s.y + 10, COLORS.danger, 3);
        }
      }
    }
  }

  _updateTrail(p, trail) {
    if (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5) {
      trail.push({ x: p.x, y: p.y, alpha: 0.3, life: 12 });
    }
    for (let i = trail.length - 1; i >= 0; i--) {
      trail[i].alpha -= 0.025; trail[i].life--;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
  }

  _die() {
    if (!this.player.alive) return;
    this.player.alive = false;
    this.deaths++;
    this.shake.intensity = 8;
    this.flash = { alpha: 0.4, color: COLORS.danger };
    this._spawnParticles(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, COLORS.player, 15);
    if (this.onDeath) this.onDeath(this.deaths);
    this._deathTimeout = setTimeout(() => {
      if (this.running) {
        this.level = this._parseLevel(this.levelData);
        this._resetPlayer(this.player);
        if (this.aiPlayer) this._resetPlayer(this.aiPlayer);
        this.trail = [];
        this.aiTrail = [];
      }
    }, 500);
  }

  _win() {
    if (this.player.won) return;
    this.player.won = true;
    this.state = 'won';
    this._spawnParticles(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, COLORS.goal, 25);
    if (this.onWin) this.onWin({ time: this.time, deaths: this.deaths });
    if (this.onStateChange) this.onStateChange('won');
  }

  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
        size: 2 + Math.random() * 3, color, alpha: 1, life: 25 + Math.random() * 20
      });
    }
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.1 * dt;
      p.alpha -= 0.025 * dt; p.life -= dt;
      if (p.life <= 0 || p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  _updateEffects(dt) {
    if (this.shake.intensity > 0) {
      this.shake.x = (Math.random() - 0.5) * this.shake.intensity;
      this.shake.y = (Math.random() - 0.5) * this.shake.intensity;
      this.shake.intensity *= 0.9;
      if (this.shake.intensity < 0.5) { this.shake.intensity = 0; this.shake.x = 0; this.shake.y = 0; }
    }
    if (this.flash.alpha > 0) {
      this.flash.alpha -= 0.03 * dt;
      if (this.flash.alpha < 0) this.flash.alpha = 0;
    }
  }

  _aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ========== RENDERING ==========
  _render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(-10, -10, this.W + 20, this.H + 20);

    // Subtle grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x < this.W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.H); ctx.stroke();
    }
    for (let y = 0; y < this.H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke();
    }

    if (!this.level) { ctx.restore(); return; }

    this._drawPlatforms(ctx);
    this._drawSpikes(ctx);
    this._drawGoal(ctx);

    // Trails
    this._drawTrailArr(ctx, this.trail, COLORS.playerTrail, this.player.w, this.player.h);
    if (this.aiPlayer) this._drawTrailArr(ctx, this.aiTrail, 'rgba(250, 255, 0, 0.12)', this.aiPlayer.w, this.aiPlayer.h);

    if (this.aiPlayer && this.aiPlayer.alive) this._drawChar(ctx, this.aiPlayer, COLORS.aiPlayer, COLORS.aiPlayerGlow);
    if (this.player.alive) this._drawChar(ctx, this.player, COLORS.player, COLORS.playerGlow);

    this._drawParticles(ctx);

    if (this.flash.alpha > 0) {
      ctx.fillStyle = this.flash.color;
      ctx.globalAlpha = this.flash.alpha;
      ctx.fillRect(-10, -10, this.W + 20, this.H + 20);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  _drawPlatforms(ctx) {
    for (const p of this.level.platforms) {
      if (!p.active) continue;
      const px = p.x + (p.shakeOffset || 0);
      if (p.type === 'collapsing') ctx.fillStyle = p.triggered ? '#3A1515' : COLORS.surface;
      else if (p.type === 'moving') ctx.fillStyle = COLORS.movingPlatform;
      else ctx.fillStyle = COLORS.surface;
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.strokeStyle = p.type === 'moving' ? 'rgba(0,240,255,0.3)' : p.type === 'collapsing' && p.triggered ? 'rgba(255,0,60,0.5)' : COLORS.surfaceBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(px, p.y, p.w, p.h);
      ctx.fillStyle = p.type === 'moving' ? 'rgba(0,240,255,0.3)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(px, p.y, p.w, 2);
    }
  }

  _drawSpikes(ctx) {
    for (const s of this.level.spikes) {
      if (!s.active || !s.visible) continue;
      const sw = s.w || 20, sh = s.h || 20;
      ctx.save();
      ctx.shadowColor = COLORS.dangerGlow;
      ctx.shadowBlur = 6;
      ctx.fillStyle = COLORS.danger;
      ctx.beginPath();
      if (s.dir === 'up') { ctx.moveTo(s.x, s.y + sh); ctx.lineTo(s.x + sw/2, s.y); ctx.lineTo(s.x + sw, s.y + sh); }
      else if (s.dir === 'down') { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + sw/2, s.y + sh); ctx.lineTo(s.x + sw, s.y); }
      else if (s.dir === 'left') { ctx.moveTo(s.x + sw, s.y); ctx.lineTo(s.x, s.y + sh/2); ctx.lineTo(s.x + sw, s.y + sh); }
      else { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + sw, s.y + sh/2); ctx.lineTo(s.x, s.y + sh); }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawGoal(ctx) {
    const g = this.level.goal;
    const pulse = Math.sin(this.frame * 0.05) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowColor = COLORS.goalGlow;
    ctx.shadowBlur = 15 * pulse;
    ctx.fillStyle = COLORS.goal;
    ctx.globalAlpha = pulse;
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.fillStyle = COLORS.void;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(g.x + 4, g.y + 4, g.w - 8, g.h - 8);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLORS.goal;
    ctx.lineWidth = 2;
    ctx.strokeRect(g.x, g.y, g.w, g.h);
    ctx.strokeStyle = COLORS.goalPulse;
    ctx.lineWidth = 1;
    const e = 5 * pulse;
    ctx.strokeRect(g.x - e, g.y - e, g.w + e*2, g.h + e*2);
    ctx.restore();
  }

  _drawTrailArr(ctx, trail, color, w, h) {
    for (const t of trail) {
      ctx.fillStyle = color;
      ctx.globalAlpha = t.alpha;
      ctx.fillRect(t.x, t.y, w, h);
    }
    ctx.globalAlpha = 1;
  }

  _drawChar(ctx, p, color, glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, 4);
    ctx.fillStyle = COLORS.void;
    const ey = p.y + 8;
    if (p.facing > 0) { ctx.fillRect(p.x + 12, ey, 3, 3); ctx.fillRect(p.x + 17, ey, 3, 3); }
    else { ctx.fillRect(p.x + 2, ey, 3, 3); ctx.fillRect(p.x + 7, ey, 3, 3); }
    ctx.restore();
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
