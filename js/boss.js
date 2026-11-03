import * as THREE from 'three';

export const BOSS_ARCHETYPES = [
  { id: 'giant_war_beast', name: 'Giant War Beast', color: 0xb71c1c, accent: 0xff8a65, baseHp: 950, scale: 2.6 },
  { id: 'heavy_armored_boss', name: 'Heavy Armored Boss', color: 0x37474f, accent: 0xfcc934, baseHp: 1250, scale: 2.7 },
  { id: 'cybernetic_monster', name: 'Cybernetic Monster', color: 0x311b92, accent: 0x00e5ff, baseHp: 1550, scale: 2.85 },
  { id: 'mega_soldier', name: 'Mega Soldier', color: 0x1b5e20, accent: 0x76ff03, baseHp: 1850, scale: 2.95 },
  { id: 'ultimate_war_commander', name: 'Ultimate War Commander', color: 0x212121, accent: 0xf538a0, baseHp: 2300, scale: 3.1 }
];

export class BossManager {
  constructor(scene) {
    this.scene = scene;
    this.activeBoss = null;
  }

  clear() {
    if (this.activeBoss) {
      this.scene.remove(this.activeBoss.mesh);
      this.activeBoss = null;
    }
  }

  spawnBoss(bossSpec, zPos, difficultyMult) {
    this.clear();
    const arch = BOSS_ARCHETYPES.find(b => b.id === bossSpec.id) || BOSS_ARCHETYPES[0];
    const group = new THREE.Group();
    const s = arch.scale;

    const armorMat = new THREE.MeshStandardMaterial({ color: arch.color, metalness: 0.5, roughness: 0.35 });
    const coreMat = new THREE.MeshStandardMaterial({ color: arch.accent, emissive: arch.accent, emissiveIntensity: 0.4 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95 * s, 1.2 * s, 0.65 * s), armorMat);
    torso.position.y = 1.1 * s;
    torso.castShadow = true;
    group.add(torso);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 12, 12), coreMat);
    core.position.set(0, 1.15 * s, 0.34 * s);
    group.add(core);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.55 * s, 0.55 * s), armorMat);
    head.position.y = 2.0 * s;
    group.add(head);

    const lShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.45 * s, 0.85 * s, 0.45 * s), armorMat);
    lShoulder.position.set(-0.78 * s, 1.15 * s, 0);
    const rShoulder = lShoulder.clone();
    rShoulder.position.x = 0.78 * s;
    group.add(lShoulder, rShoulder);

    group.position.set(0, 0, zPos);
    group.userData.armorMat = armorMat;
    this.scene.add(group);

    const maxHp = Math.round(arch.baseHp * difficultyMult.bossHp);
    this.activeBoss = {
      arch,
      mesh: group,
      x: 0,
      y: 0,
      z: zPos,
      hp: maxHp,
      maxHp,
      phase: 1,
      maxPhases: bossSpec.phases || 3,
      attackTimer: 3.2,
      engaged: false,
      dead: false
    };
    return this.activeBoss;
  }

  update(dt, playerZ, playerX, onBossSpecialAttack, onBossCollide) {
    const b = this.activeBoss;
    if (!b || b.dead) return;

    const dist = playerZ - b.z;
    if (dist < 62 && !b.engaged) {
      b.engaged = true;
    }

    if (b.engaged) {
      const hpRatio = b.hp / b.maxHp;
      if (hpRatio < 0.34) b.phase = b.maxPhases;
      else if (hpRatio < 0.67) b.phase = Math.min(b.maxPhases, 2);
      else b.phase = 1;

      const phaseSpeed = 2.4 + b.phase * 0.75;
      b.z += phaseSpeed * dt;
      b.x = Math.sin(performance.now() * 0.002 * b.phase) * 2.8;
      b.mesh.position.set(b.x, 0, b.z);

      b.attackTimer -= dt;
      if (b.attackTimer <= 0) {
        b.attackTimer = Math.max(1.8, 3.8 - b.phase * 0.55);
        onBossSpecialAttack(b);
      }

      if (Math.abs(b.z - playerZ) < 2.3) {
        onBossCollide(b);
      }
    }
  }

  damageBoss(dmg, onBossDefeated) {
    const b = this.activeBoss;
    if (!b || b.dead) return false;
    b.hp = Math.max(0, b.hp - dmg);
    if (b.hp <= 0) {
      b.dead = true;
      this.scene.remove(b.mesh);
      onBossDefeated(b);
      this.activeBoss = null;
      return true;
    }
    return false;
  }
}
