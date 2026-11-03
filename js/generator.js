import { BOSS_ARCHETYPES } from './boss.js';

export class LevelGenerator {
  createSeededRandom(seed) {
    let a = seed >>> 0;
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  getDifficultyParameters(level) {
    const L = Math.max(1, level);
    const hpMult = 1 + 0.18 * (L - 1) + 0.015 * Math.pow(L - 1, 1.35);
    const dmgMult = 1 + 0.08 * Math.pow(L - 1, 0.95);
    const speedMult = Math.min(2.1, 1 + 0.12 * Math.log(L + 1));
    const bridgeLength = Math.min(680, Math.round(220 + 28 * Math.log(L + 1) + 2.5 * Math.min(L, 120)));

    let posBias = 0.5;
    if (L <= 10) posBias = 0.78;
    else if (L <= 25) posBias = 0.70;
    else if (L <= 50) posBias = 0.64;
    else if (L <= 100) posBias = 0.58;
    else if (L <= 250) posBias = 0.54;
    else if (L <= 500) posBias = 0.52;

    return {
      hp: hpMult,
      dmg: dmgMult,
      speed: speedMult,
      bossHp: hpMult * 1.15,
      bridgeLength,
      posBias
    };
  }

  generateLevel(levelNum, mode = 'campaign', startingSquad = 3) {
    const rng = this.createSeededRandom(levelNum * 9973 + mode.length * 313);
    const diff = this.getDifficultyParameters(levelNum);
    const envIndex = ((levelNum - 1) % 10) + 1;

    const gatePairs = [];
    const enemyWaves = [];
    const powerups = [];
    const obstacles = [];

    let virtualSquad = startingSquad;
    const segmentStep = 34;
    let pairCounter = 1;

    for (let z = -32; z > -diff.bridgeLength + 45; z -= segmentStep) {
      const g1Pos = rng() < diff.posBias;
      let g2Pos = rng() < diff.posBias;
      if (!g1Pos && !g2Pos && virtualSquad < 14) {
        g2Pos = true;
      }

      const leftGate = this.buildSingleGate(-2.45, g1Pos, rng, levelNum);
      const rightGate = this.buildSingleGate(2.45, g2Pos, rng, levelNum);

      virtualSquad = Math.max(4, this.simulateGateChoice(virtualSquad, leftGate, rightGate));

      gatePairs.push({
        pairId: pairCounter++,
        z,
        gates: [leftGate, rightGate]
      });

      const midZ = z - 14;
      if (rng() < 0.48) {
        powerups.push(this.buildPowerup((rng() - 0.5) * 7.5, midZ, rng));
      }
      if (levelNum >= 4 && rng() < 0.35 && mode !== 'army_challenge') {
        obstacles.push({
          x: (rng() - 0.5) * 7.0,
          z: midZ - 3
        });
      }

      if (mode !== 'boss_battle') {
        const waveZ = z - 22;
        enemyWaves.push(this.buildEnemyWave(waveZ, levelNum, virtualSquad, rng));
      }
    }

    const bossIndex = (levelNum - 1) % BOSS_ARCHETYPES.length;
    const bossPhases = levelNum <= 10 ? 2 : (levelNum <= 250 ? 3 : 4);
    const bossSpec = {
      id: BOSS_ARCHETYPES[bossIndex].id,
      phases: bossPhases,
      z: -diff.bridgeLength + 18
    };

    return {
      levelNum,
      mode,
      envIndex,
      diff,
      gatePairs,
      enemyWaves,
      powerups,
      obstacles,
      bossSpec
    };
  }

  buildSingleGate(x, isPositive, rng, levelNum) {
    if (isPositive && rng() < 0.16) {
      const specials = [
        { op: 'add', value: 50, label: '+50 SOLDIERS', isPositive: true, isSpecial: true },
        { op: 'weapon_up', value: 1, label: 'WEAPON UP', isPositive: true, isSpecial: true },
        { op: 'double_dmg', value: 8, label: '2X DAMAGE', isPositive: true, isSpecial: true },
        { op: 'rapid_fire', value: 8, label: 'RAPID FIRE', isPositive: true, isSpecial: true },
        { op: 'shield', value: 8, label: 'SHIELD', isPositive: true, isSpecial: true }
      ];
      const pick = specials[Math.floor(rng() * specials.length)];
      return { x, ...pick };
    }

    if (isPositive) {
      if (rng() < 0.28) {
        const mults = [2, 2, 3, 5];
        const m = mults[Math.floor(rng() * (levelNum > 15 ? 4 : 3))];
        return { x, op: 'mul', value: m, label: `×${m}`, isPositive: true, isSpecial: false };
      }
      const adds = [2, 3, 5, 10, 20];
      const a = adds[Math.floor(rng() * adds.length)];
      return { x, op: 'add', value: a, label: `+${a}`, isPositive: true, isSpecial: false };
    } else {
      if (rng() < 0.25) {
        return { x, op: 'div', value: 2, label: '÷2', isPositive: false, isSpecial: false };
      }
      const subs = [-2, -3, -5, -10];
      const s = subs[Math.floor(rng() * subs.length)];
      return { x, op: 'add', value: s, label: `${s}`, isPositive: false, isSpecial: false };
    }
  }

  simulateGateChoice(current, g1, g2) {
    const evalGate = (c, g) => {
      if (g.op === 'add') return c + g.value;
      if (g.op === 'mul') return c * g.value;
      if (g.op === 'div') return Math.floor(c / g.value);
      return c;
    };
    return Math.max(evalGate(current, g1), evalGate(current, g2));
  }

  buildPowerup(x, z, rng) {
    const list = [
      { type: 'double_damage', name: 'Double Damage', color: 0xff5252, duration: 8 },
      { type: 'rapid_fire', name: 'Rapid Fire', color: 0xfcc934, duration: 8 },
      { type: 'infinite_ammo', name: 'Infinite Overdrive', color: 0x00e5ff, duration: 8 },
      { type: 'shield', name: 'Shield Protection', color: 0x4285f4, duration: 8 },
      { type: 'health_boost', name: 'Health Boost', color: 0x2ecc71, duration: 1 },
      { type: 'army_multiplier', name: 'Army Multiplier', color: 0xab47bc, duration: 1 },
      { type: 'golden_weapon', name: 'Golden Weapon', color: 0xffd700, duration: 10 },
      { type: 'explosive_bullets', name: 'Explosive Bullets', color: 0xff6d00, duration: 8 },
      { type: 'laser_attack', name: 'Laser Attack', color: 0x18ffff, duration: 8 },
      { type: 'invincibility', name: 'Invincibility', color: 0xf538a0, duration: 7 }
    ];
    const pick = list[Math.floor(rng() * list.length)];
    return { x, z, ...pick };
  }

  buildEnemyWave(z, levelNum, virtualSquad, rng) {
    const normalPool = ['standard', 'heavy_armor', 'shield', 'fast_attacker', 'rifle', 'hmg_enemy'];
    const specialPool = ['giant_mutant', 'armored_brute', 'fire_warrior', 'electric_warrior', 'explosive_enemy', 'elite_commander'];

    const maxCount = Math.min(24, Math.max(3, Math.floor(virtualSquad * 0.45) + Math.min(10, Math.floor(levelNum / 4))));
    const units = [];

    for (let i = 0; i < maxCount; i++) {
      const isSpec = levelNum >= 6 && i === 0 && rng() < 0.35;
      const pool = isSpec ? specialPool : normalPool;
      const type = pool[Math.floor(rng() * Math.min(pool.length, 2 + Math.floor(levelNum / 3)))];

      const row = Math.floor(i / 5);
      const col = (i % 5) - 2;
      units.push({
        type,
        x: col * 1.45 + (rng() - 0.5) * 0.35,
        z: z - row * 1.6
      });
    }

    return { z, units };
  }
}
