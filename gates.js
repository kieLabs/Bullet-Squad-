import * as THREE from 'three';

export class GateAndPowerupManager {
  constructor(scene) {
    this.scene = scene;
    this.gates = [];
    this.powerups = [];
    this.obstacles = [];
  }

  clearAll() {
    for (const g of this.gates) this.scene.remove(g.mesh);
    for (const p of this.powerups) this.scene.remove(p.mesh);
    for (const o of this.obstacles) this.scene.remove(o.mesh);
    this.gates = [];
    this.powerups = [];
    this.obstacles = [];
  }

  createGateTexture(label, isPositive, isSpecial) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (isSpecial) {
      ctx.fillStyle = 'rgba(245, 56, 160, 0.78)';
    } else if (isPositive) {
      ctx.fillStyle = 'rgba(26, 115, 232, 0.78)';
    } else {
      ctx.fillStyle = 'rgba(217, 48, 37, 0.78)';
    }
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = isSpecial ? '#fcc934' : (isPositive ? '#00e5ff' : '#ff8a80');
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 244);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  spawnGatePair(pairSpec) {
    for (const g of pairSpec.gates) {
      const group = new THREE.Group();
      const tex = this.createGateTexture(g.label, g.isPositive, g.isSpecial);

      const panelMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), panelMat);
      panel.position.y = 1.65;
      group.add(panel);

      const postMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.7, roughness: 0.2 });
      const lPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), postMat);
      lPost.position.set(-2.3, 1.7, 0);
      const rPost = lPost.clone();
      rPost.position.x = 2.3;
      group.add(lPost, rPost);

      group.position.set(g.x, 0, pairSpec.z);
      this.scene.add(group);

      this.gates.push({
        ...g,
        z: pairSpec.z,
        pairId: pairSpec.pairId,
        mesh: group,
        panelMat,
        triggered: false
      });
    }
  }

  spawnPowerups(list) {
    for (const p of list) {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: p.color,
        emissive: p.color,
        emissiveIntensity: 0.5,
        metalness: 0.6,
        roughness: 0.2
      });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), mat);
      core.position.y = 1.2;
      group.add(core);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.85, 0.08, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      ring.position.y = 1.2;
      group.add(ring);

      group.position.set(p.x, 0, p.z);
      this.scene.add(group);

      this.powerups.push({
        ...p,
        mesh: group,
        collected: false
      });
    }
  }

  spawnObstacles(list) {
    for (const o of list) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xff5252, metalness: 0.5, roughness: 0.4 });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 12), mat);
      mesh.position.set(o.x, 0.75, o.z);
      this.scene.add(mesh);

      this.obstacles.push({
        ...o,
        mesh,
        triggered: false
      });
    }
  }

  hitGateWithBullet(gate) {
    if (gate.triggered || gate.isSpecial) return;
    if (gate.op === 'add') {
      gate.value += 1;
      if (gate.value >= 0) {
        gate.isPositive = true;
        gate.label = `+${gate.value}`;
      } else {
        gate.isPositive = false;
        gate.label = `${gate.value}`;
      }
      gate.panelMat.map.dispose();
      gate.panelMat.map = this.createGateTexture(gate.label, gate.isPositive, false);
    }
  }

  update(dt, playerX, playerZ, onGateTrigger, onPowerupCollect, onObstacleHit) {
    const t = performance.now() * 0.003;

    for (const g of this.gates) {
      if (g.triggered) continue;
      if (Math.abs(playerZ - g.z) < 1.15 && Math.abs(playerX - g.x) < 2.45) {
        for (const sibling of this.gates) {
          if (sibling.pairId === g.pairId) {
            sibling.triggered = true;
            this.scene.remove(sibling.mesh);
          }
        }
        onGateTrigger(g);
      }
    }

    for (const p of this.powerups) {
      if (p.collected) continue;
      p.mesh.rotation.y = t;
      p.mesh.position.y = Math.sin(t * 1.5) * 0.2;
      if (Math.abs(playerZ - p.z) < 1.4 && Math.abs(playerX - p.x) < 1.8) {
        p.collected = true;
        this.scene.remove(p.mesh);
        onPowerupCollect(p);
      }
    }

    for (const o of this.obstacles) {
      if (o.triggered) continue;
      o.mesh.rotation.y = -t * 2;
      if (Math.abs(playerZ - o.z) < 1.2 && Math.abs(playerX - o.x) < 1.65) {
        o.triggered = true;
        this.scene.remove(o.mesh);
        onObstacleHit(o);
      }
    }
  }
}