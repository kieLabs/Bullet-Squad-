import * as THREE from 'three';

const MAX_PARTICLES = 180;

export class EffectsManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.floatingLayer = document.getElementById('floating-layer');
    this.dummy = new THREE.Object3D();
    this.particles = [];

    const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.instMesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.scene.add(this.instMesh);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 1,
        life: 0,
        color: new THREE.Color(0xffffff)
      });
    }
  }

  spawnParticle(x, y, z, vx, vy, vz, colorHex, scale = 1, life = 0.45) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
        p.scale = scale;
        p.life = life;
        p.color.setHex(colorHex);
        this.instMesh.setColorAt(i, p.color);
        if (this.instMesh.instanceColor) {
          this.instMesh.instanceColor.needsUpdate = true;
        }
        return;
      }
    }
  }

  spawnHitSpark(x, y, z, colorHex = 0xffeb3b) {
    for (let i = 0; i < 4; i++) {
      this.spawnParticle(
        x, y, z,
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8,
        colorHex,
        0.8,
        0.28
      );
    }
  }

  spawnExplosion(x, y, z, colorHex = 0xff5722) {
    for (let i = 0; i < 16; i++) {
      this.spawnParticle(
        x, y + 0.5, z,
        (Math.random() - 0.5) * 16,
        Math.random() * 12 + 3,
        (Math.random() - 0.5) * 16,
        i % 2 === 0 ? colorHex : 0xfcc934,
        1.6,
        0.55
      );
    }
  }

  spawnFloatingText(worldX, worldY, worldZ, text, color = '#fcc934') {
    if (!this.floatingLayer) return;
    const vec = new THREE.Vector3(worldX, worldY, worldZ);
    vec.project(this.camera);

    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(vec.y * 0.5) + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    el.textContent = text;
    this.floatingLayer.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 750);
  }

  update(dt) {
    this.instMesh.count = MAX_PARTICLES;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this.dummy.position.set(0, -200, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.instMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 18.0 * dt;
      p.life -= dt;

      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      const s = p.scale * Math.max(0.1, p.life * 2);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.instMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.instMesh.instanceMatrix.needsUpdate = true;
  }
}