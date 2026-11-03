import * as THREE from 'three';

export const ENEMY_ARCHETYPES = {
  standard: { name: 'Standard Soldier', category: 'normal', scale: 1.0, hp: 28, speed: 5.5, color: 0xd93025, coin: 4 },
  heavy_armor: { name: 'Heavy Armored Soldier', category: 'normal', scale: 1.18, hp: 65, speed: 4.2, color: 0x8c1d18, coin: 8 },
  shield: { name: 'Shield Soldier', category: 'normal', scale: 1.1, hp: 85, speed: 4.0, color: 0x5f6368, coin: 9, hasShield: true },
  fast_attacker: { name: 'Fast Attacking Enemy', category: 'normal', scale: 0.92, hp: 22, speed: 8.8, color: 0xfa903e, coin: 6 },
  rifle: { name: 'Rifle Enemy', category: 'normal', scale: 1.0, hp: 36, speed: 5.0, color: 0xc5221f, coin: 7, ranged: true },
  hmg_enemy: { name: 'Heavy MG Enemy', category: 'normal', scale: 1.15, hp: 58, speed: 4.5, color: 0x9c27b0, coin: 10, ranged: true },

  giant_mutant: { name: 'Giant Mutant', category: 'special', scale: 1.65, hp: 180, speed: 4.6, color: 0x4caf50, coin: 22 },
  armored_brute: { name: 'Armored Brute', category: 'special', scale: 1.55, hp: 230, speed: 3.8, color: 0x37474f, coin: 26 },
  fire_warrior: { name: 'Fire Warrior', category: 'special', scale: 1.28, hp: 125, speed: 6.2, color: 0xff5722, coin: 18 },
  electric_warrior: { name: 'Electric Warrior', category: 'special', scale: 1.28, hp: 130, speed: 6.8, color: 0x00e5ff, coin: 20 },
  explosive_enemy: { name: 'Explosive Enemy', category: 'special', scale: 1.15, hp: 70, speed: 7.8, color: 0xffeb3b, coin: 16, explosive: true },
  elite_commander: { name: 'Elite Enemy Commander', category: 'special', scale: 1.4, hp: 195, speed: 5.4, color: 0xf538a0, coin: 30 }
};

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
  }

  clearAll() {
    for (const e of this.enemies) {
      this.scene.remove(e.mesh);
    }
    this.enemies = [];
  }

  spawnWave(waveSpec, difficultyMult) {
    for (const unit of waveSpec.units) {
      const arch = ENEMY_ARCHETYPES[unit.type] || ENEMY_ARCHETYPES.standard;
      const mesh = this.createEnemyMesh(arch);
      mesh.position.set(unit.x, 0, unit.z);
      this.scene.add(mesh);

      const maxHp = Math.round(arch.hp * difficultyMult.hp);
      this.enemies.push({
        type: unit.type,
        arch,
        mesh,
        x: unit.x,
        y: 0,
        z: unit.z,
        hp: maxHp,
        maxHp,
        speed: arch.speed * difficultyMult.speed,
        phase: Math.random() * Math.PI * 2,
        hitFlash: 0,
        dead: false,
        deathTimer: 0
      });
    }
  }

  createEnemyMesh(arch) {
    const group = new THREE.Group();
    const s = arch.scale;

    const bodyMat = new THREE.MeshStandardMaterial({ color: arch.color, roughness: 0.45 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x2b1d1d, roughness: 0.6 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52 * s, 0.75 * s, 0.36 * s), bodyMat);
    body.position.y = 0.68 * s;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36 * s, 0.36 * s, 0.36 * s), headMat);
    head.position.y = 1.28 * s;
    group.add(head);

    if (arch.hasShield) {
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.68 * s, 0.9 * s, 0.1 * s),
        new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.7, roughness: 0.2 })
      );
      shield.position.set(0, 0.72 * s, 0.26 * s);
      group.add(shield);
    }

    group.userData.bodyMat = bodyMat;
    group.userData.baseColor = arch.color;
    return group;
  }

  update(dt, playerZ, playerX, onSquadCollide, onEnemyDefeated) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.dead) {
        e.deathTimer += dt * 4.0;
        e.mesh.rotation.x = -e.deathTimer * 1.4;
        e.mesh.position.y = Math.max(-0.5, -e.deathTimer * 0.4);
        if (e.deathTimer >= 1.0) {
          this.scene.remove(e.mesh);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        e.mesh.userData.bodyMat.emissive.setHex(e.hitFlash > 0 ? 0x661111 : 0x000000);
      }

      const distZ = playerZ - e.z;
      if (distZ < 95 && distZ > -10) {
        e.phase += dt * 10.0;
        e.z += e.speed * dt;
        const steer = THREE.MathUtils.clamp(playerX - e.x, -1, 1);
        e.x += steer * 1.4 * dt;

        e.mesh.position.set(e.x, Math.abs(Math.sin(e.phase)) * 0.12, e.z);

        if (Math.abs(e.z - playerZ) < 1.35 && Math.abs(e.x - playerX) < 3.4) {
          const penalty = e.arch.category === 'special' ? 4 : 1;
          onSquadCollide(penalty, e);
          e.dead = true;
        }
      } else if (e.z > playerZ + 12) {
        this.scene.remove(e.mesh);
        this.enemies.splice(i, 1);
      }
    }
  }

  damageEnemy(enemy, dmg, onEnemyDefeated) {
    if (enemy.dead) return false;
    enemy.hp -= dmg;
    enemy.hitFlash = 0.08;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      onEnemyDefeated(enemy);
      return true;
    }
    return false;
  }

  getActiveCount() {
    let count = 0;
    for (const e of this.enemies) {
      if (!e.dead) count++;
    }
    return count;
  }
}