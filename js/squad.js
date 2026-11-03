import * as THREE from 'three';

const MAX_RENDERED_INSTANCES = 160;

export class SquadSystem {
  constructor(scene, upgrades) {
    this.scene = scene;
    this.upgrades = upgrades;
    this.logicalCount = 3;
    this.soldiers = [];
    this.formationType = 'double_line';

    this.dummy = new THREE.Object3D();
    this.initInstancedMeshes();
  }

  initInstancedMeshes() {
    const vestMat = new THREE.MeshStandardMaterial({ color: 0x1a73e8, roughness: 0.45 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd7a17c, roughness: 0.6 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x174ea6, roughness: 0.35 });
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.6, roughness: 0.3 });

    this.torsoInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.46, 0.62, 0.3), vestMat, MAX_RENDERED_INSTANCES);
    this.headInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), headMat, MAX_RENDERED_INSTANCES);
    this.helmetInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 8), helmetMat, MAX_RENDERED_INSTANCES);
    this.gunInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.14, 0.52), gunMat, MAX_RENDERED_INSTANCES);

    this.torsoInst.castShadow = true;
    this.scene.add(this.torsoInst, this.headInst, this.helmetInst, this.gunInst);
  }

  reset(initialCount, startX = 0, startZ = 0) {
    this.logicalCount = Math.max(1, initialCount);
    this.soldiers = [];
    const visibleTarget = Math.min(MAX_RENDERED_INSTANCES, Math.max(0, this.logicalCount - 1));
    for (let i = 0; i < visibleTarget; i++) {
      this.soldiers.push({
        x: startX,
        z: startZ + 1.2,
        offsetX: 0,
        offsetZ: 1.2,
        phase: Math.random() * Math.PI * 2,
        hp: this.upgrades.getSoldierHealth()
      });
    }
    this.selectOptimalFormation();
    this.recomputeFormationOffsets();
  }

  selectOptimalFormation() {
    if (this.logicalCount <= 4) this.formationType = 'single_line';
    else if (this.logicalCount <= 10) this.formationType = 'double_line';
    else if (this.logicalCount <= 22) this.formationType = 'v_formation';
    else if (this.logicalCount <= 45) this.formationType = 'triple_line';
    else this.formationType = 'wide_battle';
  }

  recomputeFormationOffsets() {
    this.selectOptimalFormation();
    const n = this.soldiers.length;

    for (let i = 0; i < n; i++) {
      const s = this.soldiers[i];
      if (this.formationType === 'single_line') {
        const side = (i % 2 === 0 ? 1 : -1) * Math.ceil((i + 1) / 2);
        s.offsetX = side * 0.72;
        s.offsetZ = 0.6;
      } else if (this.formationType === 'double_line') {
        const row = Math.floor(i / 5);
        const col = (i % 5) - 2;
        s.offsetX = col * 0.72;
        s.offsetZ = 0.85 + row * 0.82;
      } else if (this.formationType === 'v_formation') {
        const wing = i % 2 === 0 ? 1 : -1;
        const rank = Math.floor(i / 2) + 1;
        s.offsetX = wing * (rank * 0.42);
        s.offsetZ = 0.6 + rank * 0.52;
      } else if (this.formationType === 'triple_line') {
        const cols = 7;
        const row = Math.floor(i / cols);
        const col = (i % cols) - Math.floor(cols / 2);
        s.offsetX = col * 0.68;
        s.offsetZ = 0.8 + row * 0.76;
      } else {
        const cols = 10;
        const row = Math.floor(i / cols);
        const col = (i % cols) - (cols - 1) / 2;
        s.offsetX = col * 0.58;
        s.offsetZ = 0.85 + row * 0.68;
      }
    }
  }

  applySquadDelta(newCount, commanderX, commanderZ) {
    const cap = this.upgrades.getMaxSquadCapacity();
    this.logicalCount = Math.max(0, Math.min(cap, Math.floor(newCount)));

    const visibleTarget = Math.min(MAX_RENDERED_INSTANCES, Math.max(0, this.logicalCount - 1));
    while (this.soldiers.length < visibleTarget) {
      this.soldiers.push({
        x: commanderX + (Math.random() - 0.5) * 1.5,
        z: commanderZ + 1.0 + Math.random() * 1.5,
        offsetX: 0,
        offsetZ: 1.0,
        phase: Math.random() * Math.PI * 2,
        hp: this.upgrades.getSoldierHealth()
      });
    }
    if (this.soldiers.length > visibleTarget) {
      this.soldiers.length = visibleTarget;
    }
    this.recomputeFormationOffsets();
  }

  removeCasualties(count, commanderX, commanderZ) {
    this.applySquadDelta(this.logicalCount - count, commanderX, commanderZ);
  }

  update(dt, commanderX, commanderY, commanderZ, isRunning = true) {
    const activeInstances = this.soldiers.length;
    this.torsoInst.count = activeInstances;
    this.headInst.count = activeInstances;
    this.helmetInst.count = activeInstances;
    this.gunInst.count = activeInstances;

    const lerpFactor = Math.min(1, dt * 10.5);

    for (let i = 0; i < activeInstances; i++) {
      const s = this.soldiers[i];
      s.phase += dt * (isRunning ? 12.0 : 3.0);

      const targetX = THREE.MathUtils.clamp(commanderX + s.offsetX, -5.4, 5.4);
      const targetZ = commanderZ + s.offsetZ;

      s.x += (targetX - s.x) * lerpFactor;
      s.z += (targetZ - s.z) * lerpFactor;

      const bob = isRunning ? Math.abs(Math.sin(s.phase)) * 0.14 : 0;
      const baseY = commanderY + bob;

      this.dummy.position.set(s.x, baseY + 0.72, s.z);
      this.dummy.rotation.set(0, 0, isRunning ? Math.sin(s.phase) * 0.06 : 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.torsoInst.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(s.x, baseY + 1.22, s.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.headInst.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(s.x, baseY + 1.41, s.z);
      this.dummy.updateMatrix();
      this.helmetInst.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(s.x + 0.22, baseY + 0.78, s.z - 0.28);
      this.dummy.updateMatrix();
      this.gunInst.setMatrixAt(i, this.dummy.matrix);
    }

    this.torsoInst.instanceMatrix.needsUpdate = true;
    this.headInst.instanceMatrix.needsUpdate = true;
    this.helmetInst.instanceMatrix.needsUpdate = true;
    this.gunInst.instanceMatrix.needsUpdate = true;
  }

  getShooterPositions(commanderX, commanderY, commanderZ, maxShooters = 28) {
    const out = [{ x: commanderX, y: commanderY + 1.0, z: commanderZ - 0.5, isCommander: true }];
    const step = Math.max(1, Math.floor(this.soldiers.length / maxShooters));
    for (let i = 0; i < this.soldiers.length && out.length < maxShooters; i += step) {
      const s = this.soldiers[i];
      out.push({ x: s.x, y: commanderY + 0.85, z: s.z - 0.3, isCommander: false });
    }
    return out;
  }
}
