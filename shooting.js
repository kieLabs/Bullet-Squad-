import * as THREE from 'three';

const MAX_BULLETS = 220;

export class ShootingSystem {
  constructor(scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();
    this.bullets = [];

    const geo = new THREE.SphereGeometry(0.14, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.instMesh = new THREE.InstancedMesh(geo, mat, MAX_BULLETS);
    this.scene.add(this.instMesh);

    for (let i = 0; i < MAX_BULLETS; i++) {
      this.bullets.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vz: 0,
        damage: 10,
        splash: 0,
        life: 0,
        color: new THREE.Color(0xfcc934)
      });
    }
  }

  clearAll() {
    for (const b of this.bullets) {
      b.active = false;
    }
    this.instMesh.count = 0;
  }

  spawnBullet(x, y, z, vx, vz, damage, colorHex, splash = 0) {
    for (let i = 0; i < MAX_BULLETS; i++) {
      const b = this.bullets[i];
      if (!b.active) {
        b.active = true;
        b.x = x;
        b.y = y;
        b.z = z;
        b.vx = vx;
        b.vz = vz;
        b.damage = damage;
        b.splash = splash;
        b.life = 1.35;
        b.color.setHex(colorHex);
        this.instMesh.setColorAt(i, b.color);
        if (this.instMesh.instanceColor) {
          this.instMesh.instanceColor.needsUpdate = true;
        }
        return;
      }
    }
  }

  fireSquadVolley(shooters, weaponSpec, damageMult, enemies) {
    for (const shooter of shooters) {
      let aimAngle = 0;
      let bestDist = 65;
      for (const e of enemies) {
        if (e.dead || e.z > shooter.z) continue;
        const dz = shooter.z - e.z;
        if (dz < bestDist) {
          bestDist = dz;
          aimAngle = Math.atan2(e.x - shooter.x, -dz) * 0.45;
        }
      }

      const pellets = shooter.isCommander ? weaponSpec.effectivePellets : 1;
      const dmg = weaponSpec.effectiveDamage * damageMult * (shooter.isCommander ? 1.25 : 0.45);

      for (let p = 0; p < pellets; p++) {
        const spreadOffset = (Math.random() - 0.5) * weaponSpec.spread;
        const angle = aimAngle + spreadOffset;
        const vx = Math.sin(angle) * weaponSpec.bulletSpeed;
        const vz = -Math.cos(angle) * weaponSpec.bulletSpeed;
        this.spawnBullet(
          shooter.x,
          shooter.y,
          shooter.z,
          vx,
          vz,
          dmg,
          weaponSpec.projColor,
          weaponSpec.splashRadius || 0
        );
      }
    }
  }

  update(dt, enemyManager, bossManager, gateManager, effects, onEnemyKill, onBossKill) {
    this.instMesh.count = MAX_BULLETS;

    for (let i = 0; i < MAX_BULLETS; i++) {
      const b = this.bullets[i];
      if (!b.active) {
        this.dummy.position.set(0, -200, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.instMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.life -= dt;

      if (b.life <= 0) {
        b.active = false;
        continue;
      }

      for (const g of gateManager.gates) {
        if (!g.triggered && Math.abs(b.z - g.z) < 0.7 && Math.abs(b.x - g.x) < 2.2) {
          gateManager.hitGateWithBullet(g);
          b.active = false;
          effects.spawnHitSpark(b.x, b.y, b.z, 0x00e5ff);
          break;
        }
      }
      if (!b.active) continue;

      for (const e of enemyManager.enemies) {
        if (e.dead) continue;
        if (Math.abs(b.z - e.z) < 0.85 && Math.abs(b.x - e.x) < 0.75 * e.arch.scale) {
          b.active = false;
          effects.spawnHitSpark(b.x, b.y, b.z, 0xffeb3b);
          enemyManager.damageEnemy(e, b.damage, onEnemyKill);

          if (b.splash > 0) {
            effects.spawnExplosion(b.x, b.y, b.z, 0xff5722);
            for (const other of enemyManager.enemies) {
              if (!other.dead && other !== e) {
                const d = Math.hypot(other.x - b.x, other.z - b.z);
                if (d <= b.splash) {
                  enemyManager.damageEnemy(other, b.damage * 0.65, onEnemyKill);
                }
              }
            }
          }
          break;
        }
      }
      if (!b.active) continue;

      const boss = bossManager.activeBoss;
      if (boss && !boss.dead) {
        if (Math.abs(b.z - boss.z) < 1.8 && Math.abs(b.x - boss.x) < 1.8) {
          b.active = false;
          effects.spawnHitSpark(b.x, b.y, b.z, 0xff5252);
          bossManager.damageBoss(b.damage, onBossKill);
        }
      }

      this.dummy.position.set(b.x, b.y, b.z);
      this.dummy.scale.set(1, 1, 2.2);
      this.dummy.updateMatrix();
      this.instMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instMesh.instanceMatrix.needsUpdate = true;
  }
}