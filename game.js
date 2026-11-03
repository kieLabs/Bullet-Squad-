import * as THREE from 'three';
import { PlayerCommander } from './player.js';
import { SquadSystem } from './squad.js';
import { EnemyManager } from './enemy.js';
import { BossManager } from './boss.js';
import { GateAndPowerupManager } from './gates.js';
import { ShootingSystem } from './shooting.js';
import { EnvironmentBuilder } from './levels.js';
import { LevelGenerator } from './generator.js';
import { CameraController } from './camera.js';
import { EffectsManager } from './effects.js';
import { ControlsManager } from './controls.js';
import { getWeaponSpec } from './weapons.js';

export class Game {
  constructor({ canvas, storage, settings, audio, upgrades, missions }) {
    this.canvas = canvas;
    this.storage = storage;
    this.settings = settings;
    this.audio = audio;
    this.upgrades = upgrades;
    this.missions = missions;
    this.ui = null;

    this.state = 'menu';
    this.gameMode = 'campaign';
    this.autoFire = true;
    this.manualFireRequested = false;

    this.activeWeaponId = 'assault_rifle';
    this.activeWeaponTier = 1;
    this.fireTimer = 0;
    this.specialCooldown = 0;

    this.powerupTimers = {};
    this.levelData = null;
    this.sessionStats = { enemies: 0, bosses: 0, coins: 0, maxSquad: 3, survivalTime: 0 };

    this.lastFrameTime = performance.now();
    this.fpsFrames = 0;
    this.fpsTimer = 0;
  }

  setUI(ui) {
    this.ui = ui;
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 350);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.settings.state.graphics !== 'LOW',
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.applyGraphicsQuality();

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    this.dirLight.position.set(14, 28, 18);
    this.dirLight.castShadow = true;
    this.scene.add(ambient, this.dirLight);

    this.envBuilder = new EnvironmentBuilder(this.scene);
    this.generator = new LevelGenerator();
    this.player = new PlayerCommander(this.scene);
    this.squad = new SquadSystem(this.scene, this.upgrades);
    this.enemyManager = new EnemyManager(this.scene);
    this.bossManager = new BossManager(this.scene);
    this.gateManager = new GateAndPowerupManager(this.scene);
    this.shooting = new ShootingSystem(this.scene);
    this.cameraCtrl = new CameraController(this.camera, this.settings);
    this.effects = new EffectsManager(this.scene, this.camera);

    this.controls = new ControlsManager(this.canvas, this.settings, {
      isPlaying: () => this.state === 'playing',
      onHorizontalDrag: (deltaX) => {
        this.player.x = THREE.MathUtils.clamp(this.player.x + deltaX, -5.2, 5.2);
      },
      onJump: () => {
        if (this.state === 'playing') this.player.jump();
      },
      onSpecial: () => {
        if (this.state === 'playing') this.triggerSpecialAttack();
      },
      onPauseToggle: () => {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
      }
    });

    window.addEventListener('resize', () => this.onResize());
    this.settings.onChange(() => this.applyGraphicsQuality());

    this.setupMenuDiorama();
    requestAnimationFrame((t) => this.loop(t));
  }

  applyGraphicsQuality() {
    const q = this.settings.state.graphics;
    const pr = q === 'HIGH' ? Math.min(window.devicePixelRatio, 2) : (q === 'MEDIUM' ? 1.25 : 0.85);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = q !== 'LOW';
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupMenuDiorama() {
    this.state = 'menu';
    this.enemyManager.clearAll();
    this.bossManager.clear();
    this.gateManager.clearAll();
    this.shooting.clearAll();

    const charId = this.storage.data.selectedCharacter;
    const wepId = this.storage.data.selectedWeapon;
    const wepTier = this.storage.data.weaponLevels[wepId] || 1;

    this.envBuilder.buildEnvironment(1, 140);
    this.player.x = 0;
    this.player.y = 0;
    this.player.z = 0;
    this.player.buildCommanderModel(charId, wepId, wepTier);
    this.squad.reset(this.upgrades.getStartingSquadCount(), 0, 0);
    this.audio.playMusic('menu');
  }

  startGame(mode = 'campaign', customLevel = null) {
    this.gameMode = mode;
    const lvlNum = customLevel || this.storage.data.currentLevel || 1;

    this.activeWeaponId = this.storage.data.selectedWeapon;
    this.activeWeaponTier = this.storage.data.weaponLevels[this.activeWeaponId] || 1;

    const startSquad = this.upgrades.getStartingSquadCount();
    this.levelData = this.generator.generateLevel(lvlNum, mode, startSquad);

    this.enemyManager.clearAll();
    this.bossManager.clear();
    this.gateManager.clearAll();
    this.shooting.clearAll();
    this.powerupTimers = {};
    this.specialCooldown = 0;

    this.envBuilder.buildEnvironment(this.levelData.envIndex, this.levelData.diff.bridgeLength);
    this.player.x = 0;
    this.player.y = 0;
    this.player.z = 0;
    this.player.buildCommanderModel(this.storage.data.selectedCharacter, this.activeWeaponId, this.activeWeaponTier);
    this.squad.reset(startSquad, 0, 0);

    for (const pair of this.levelData.gatePairs) {
      this.gateManager.spawnGatePair(pair);
    }
    this.gateManager.spawnPowerups(this.levelData.powerups);
    this.gateManager.spawnObstacles(this.levelData.obstacles);
    for (const wave of this.levelData.enemyWaves) {
      this.enemyManager.spawnWave(wave, this.levelData.diff);
    }

    if (mode !== 'army_challenge') {
      const bossZ = mode === 'boss_battle' ? -65 : this.levelData.bossSpec.z;
      this.bossManager.spawnBoss(this.levelData.bossSpec, bossZ, this.levelData.diff);
    }

    this.sessionStats = {
      enemies: 0,
      bosses: 0,
      coins: 0,
      maxSquad: startSquad,
      survivalTime: 0
    };

    this.state = 'playing';
    this.audio.playMusic(mode === 'boss_battle' ? 'boss' : 'battle');
    if (this.ui) this.ui.showGameplayHUD();
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    if (this.ui) this.ui.showPauseScreen();
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    if (this.ui) this.ui.hideModals();
  }

  triggerSpecialAttack() {
    if (this.specialCooldown > 0) return;
    this.specialCooldown = this.upgrades.getSpecialCooldown();
    this.audio.playSfx('explosion');
    this.cameraCtrl.addShake(0.8);
    this.effects.spawnExplosion(this.player.x, 1.0, this.player.z - 12, 0xf538a0);

    for (const e of this.enemyManager.enemies) {
      if (!e.dead && Math.abs(e.z - this.player.z) < 28) {
        this.enemyManager.damageEnemy(e, 240, (killed) => this.handleEnemyKilled(killed));
      }
    }
    if (this.bossManager.activeBoss) {
      this.bossManager.damageBoss(350, (b) => this.handleBossKilled(b));
    }
  }

  handleEnemyKilled(enemy) {
    this.sessionStats.enemies++;
    this.missions.recordEnemyDefeated();
    this.audio.playSfx('enemy_defeat');

    const coinMult = this.storage.data.selectedCharacter === 'golden_commander' ? 1.25 : 1.0;
    const earned = Math.round(enemy.arch.coin * coinMult);
    this.sessionStats.coins += earned;
    this.storage.addCoins(earned);

    this.effects.spawnExplosion(enemy.x, 0.8, enemy.z, enemy.arch.color);
    this.effects.spawnFloatingText(enemy.x, 1.6, enemy.z, `+${earned}`, '#fcc934');
  }

  handleBossKilled(boss) {
    this.sessionStats.bosses++;
    this.missions.recordBossDefeated();
    this.audio.playSfx('explosion');
    this.cameraCtrl.addShake(1.0);
    const reward = 180 + this.levelData.levelNum * 25;
    this.sessionStats.coins += reward;
    this.storage.addCoins(reward);
    this.effects.spawnExplosion(boss.x, 2.0, boss.z, 0xfcc934);

    if (this.gameMode !== 'endless' && this.gameMode !== 'survival') {
      this.completeLevel();
    }
  }

  handleGateTriggered(gate) {
    let nextCount = this.squad.logicalCount;
    if (gate.op === 'add') nextCount += gate.value;
    else if (gate.op === 'mul') nextCount *= gate.value;
    else if (gate.op === 'div') nextCount = Math.max(1, Math.floor(nextCount / gate.value));
    else if (gate.op === 'weapon_up') {
      this.activeWeaponTier = Math.min(7, this.activeWeaponTier + 1);
      this.player.buildCommanderModel(this.storage.data.selectedCharacter, this.activeWeaponId, this.activeWeaponTier);
      this.player.triggerUpgradePulse();
      this.audio.playSfx('weapon_upgrade');
    } else if (gate.op === 'double_dmg') {
      this.powerupTimers.double_damage = 8;
    } else if (gate.op === 'rapid_fire') {
      this.powerupTimers.rapid_fire = 8;
    } else if (gate.op === 'shield') {
      this.powerupTimers.shield = 8;
    }

    if (gate.isPositive) {
      this.audio.playSfx('gate_positive');
      this.audio.playSfx('soldier_join');
    } else {
      this.audio.playSfx('gate_negative');
      this.settings.vibrate(40);
    }

    this.squad.applySquadDelta(nextCount, this.player.x, this.player.z);
    if (this.squad.logicalCount > this.sessionStats.maxSquad) {
      this.sessionStats.maxSquad = this.squad.logicalCount;
    }
    this.missions.recordSquadSize(this.squad.logicalCount);
    this.effects.spawnFloatingText(this.player.x, 2.2, this.player.z, gate.label, gate.isPositive ? '#00e5ff' : '#ff5252');

    if (this.squad.logicalCount <= 0) {
      this.triggerGameOver();
    }
  }

  handlePowerupCollected(p) {
    this.audio.playSfx('powerup');
    if (p.type === 'health_boost') {
      this.squad.applySquadDelta(this.squad.logicalCount + 8, this.player.x, this.player.z);
    } else if (p.type === 'army_multiplier') {
      this.squad.applySquadDelta(this.squad.logicalCount * 2, this.player.x, this.player.z);
    } else if (p.type === 'golden_weapon') {
      this.activeWeaponTier = Math.max(this.activeWeaponTier, 6);
      this.player.buildCommanderModel(this.storage.data.selectedCharacter, this.activeWeaponId, this.activeWeaponTier);
    } else {
      this.powerupTimers[p.type] = p.duration;
    }
    this.effects.spawnFloatingText(p.x, 2.0, p.z, p.name.toUpperCase(), '#81c995');
  }

  completeLevel() {
    if (this.state !== 'playing') return;
    this.state = 'victory';
    this.audio.playSfx('victory');

    const bonus = 100 + this.levelData.levelNum * 20 + this.squad.logicalCount * 2;
    this.sessionStats.coins += bonus;
    this.storage.addCoins(bonus);

    if (this.gameMode === 'campaign') {
      this.missions.recordLevelCompleted(this.levelData.levelNum);
      this.storage.data.currentLevel = this.levelData.levelNum + 1;
      if (this.storage.data.currentLevel > this.storage.data.highestLevel) {
        this.storage.data.highestLevel = this.storage.data.currentLevel;
      }
      this.storage.save();
    }

    if (this.ui) this.ui.showVictoryScreen(this.sessionStats, bonus);
  }

  triggerGameOver() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.audio.playSfx('gameover');
    this.settings.vibrate(100);
    if (this.ui) this.ui.showGameOverScreen(this.sessionStats);
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTimer);
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) {
        fpsEl.textContent = `${fps} FPS`;
        fpsEl.classList.toggle('hidden', !this.settings.state.showFps);
      }
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }

    if (this.state === 'menu') {
      this.player.update(dt, 'idle');
      this.squad.update(dt, 0, 0, 0, false);
      this.cameraCtrl.update(dt, 'menu', 0, 0, 0, this.squad.logicalCount, false);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'victory') {
      this.player.update(dt, 'victory');
    } else if (this.state === 'gameover') {
      this.player.update(dt, 'defeat');
    }

    this.effects.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  updatePlaying(dt) {
    this.sessionStats.survivalTime += dt;
    if (this.sessionStats.survivalTime >= 120 && (this.gameMode === 'endless' || this.gameMode === 'survival')) {
      this.storage.data.achievements.endless_survivor = true;
    }

    for (const k of Object.keys(this.powerupTimers)) {
      this.powerupTimers[k] -= dt;
      if (this.powerupTimers[k] <= 0) delete this.powerupTimers[k];
    }

    if (this.specialCooldown > 0) {
      this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    }

    const bossEngaged = Boolean(this.bossManager.activeBoss && this.bossManager.activeBoss.engaged);
    const forwardSpeed = bossEngaged ? 2.2 : 11.2;
    this.player.z -= forwardSpeed * dt;

    const steer = this.controls.getKeyboardSteer();
    if (steer !== 0) {
      this.player.x = THREE.MathUtils.clamp(this.player.x + steer * 9.5 * dt, -5.2, 5.2);
    }

    this.player.update(dt, 'run');
    this.squad.update(dt, this.player.x, this.player.y, this.player.z, true);

    if ((this.gameMode === 'endless' || this.gameMode === 'survival') && Math.abs(this.player.z) > this.levelData.diff.bridgeLength - 65) {
      this.levelData.diff.bridgeLength += 180;
      this.envBuilder.buildEnvironment(this.levelData.envIndex, this.levelData.diff.bridgeLength);
      const extraWave = this.generator.buildEnemyWave(this.player.z - 55, this.levelData.levelNum + 5, this.squad.logicalCount, Math.random);
      this.enemyManager.spawnWave(extraWave, this.levelData.diff);
    }

    const wepSpec = getWeaponSpec(
      this.powerupTimers.laser_attack ? 'laser_gun' : this.activeWeaponId,
      this.activeWeaponTier
    );
    if (this.powerupTimers.explosive_bullets) {
      wepSpec.splashRadius = 2.8;
    }
    const rateMult = this.upgrades.getFireRateMultiplier() * (this.powerupTimers.rapid_fire || this.powerupTimers.infinite_ammo ? 1.85 : 1.0);
    const dmgMult = this.upgrades.getDamageMultiplier() * (this.powerupTimers.double_damage ? 2.0 : 1.0);

    this.fireTimer -= dt;
    const shouldFire = this.autoFire || this.manualFireRequested;
    if (shouldFire && this.fireTimer <= 0) {
      this.fireTimer = 1 / (wepSpec.effectiveFireRate * rateMult);
      this.manualFireRequested = false;
      this.player.triggerRecoil();
      this.audio.playSfx(wepSpec.sfx);

      const shooters = this.squad.getShooterPositions(this.player.x, this.player.y, this.player.z);
      this.shooting.fireSquadVolley(shooters, wepSpec, dmgMult, this.enemyManager.enemies);
    }

    this.shooting.update(
      dt,
      this.enemyManager,
      this.bossManager,
      this.gateManager,
      this.effects,
      (e) => this.handleEnemyKilled(e),
      (b) => this.handleBossKilled(b)
    );

    const isProtected = Boolean(this.powerupTimers.shield || this.powerupTimers.invincibility);

    this.gateManager.update(
      dt,
      this.player.x,
      this.player.z,
      (g) => this.handleGateTriggered(g),
      (p) => this.handlePowerupCollected(p),
      () => {
        if (!isProtected) {
          this.audio.playSfx('explosion');
          this.cameraCtrl.addShake(0.45);
          this.squad.removeCasualties(3, this.player.x, this.player.z);
          if (this.squad.logicalCount <= 0) this.triggerGameOver();
        }
      }
    );

    this.enemyManager.update(
      dt,
      this.player.z,
      this.player.x,
      (penalty) => {
        if (!isProtected) {
          this.audio.playSfx('enemy_hit');
          this.settings.vibrate(25);
          this.squad.removeCasualties(penalty, this.player.x, this.player.z);
          if (this.squad.logicalCount <= 0) this.triggerGameOver();
        }
      },
      (e) => this.handleEnemyKilled(e)
    );

    this.bossManager.update(
      dt,
      this.player.z,
      this.player.x,
      () => {
        this.audio.playSfx('boss_attack');
        this.cameraCtrl.addShake(0.5);
        if (!isProtected) {
          this.squad.removeCasualties(2, this.player.x, this.player.z);
          if (this.squad.logicalCount <= 0) this.triggerGameOver();
        }
      },
      () => {
        if (!isProtected) {
          this.squad.removeCasualties(8, this.player.x, this.player.z);
          if (this.squad.logicalCount <= 0) this.triggerGameOver();
        }
      }
    );

    if (this.player.z <= -this.levelData.diff.bridgeLength + 12 && !this.bossManager.activeBoss) {
      this.completeLevel();
    }

    this.cameraCtrl.update(
      dt,
      'playing',
      this.player.x,
      this.player.y,
      this.player.z,
      this.squad.logicalCount,
      bossEngaged
    );

    if (this.ui) this.ui.updateHUD();
  }
}