import * as THREE from 'three';

export class CameraController {
  constructor(camera, settings) {
    this.camera = camera;
    this.settings = settings;
    this.shakeIntensity = 0;
    this.currentPos = new THREE.Vector3(0, 8.5, 11.5);
    this.lookTarget = new THREE.Vector3(0, 1.2, -10);
  }

  addShake(amount = 0.35) {
    if (!this.settings.state.cameraShake) return;
    this.shakeIntensity = Math.min(1.1, this.shakeIntensity + amount);
  }

  update(dt, mode, playerX, playerY, playerZ, squadCount, bossEngaged) {
    if (mode === 'menu') {
      const t = performance.now() * 0.0005;
      this.camera.position.set(Math.sin(t) * 2.4, 3.2, 6.2);
      this.camera.lookAt(0, 1.35, 0);
      return;
    }

    const crowdZoom = Math.min(6.5, Math.sqrt(Math.max(1, squadCount)) * 0.48);
    const bossZoom = bossEngaged ? -1.4 : 0;

    const targetX = playerX * 0.45;
    const targetY = 7.4 + crowdZoom * 0.65 + bossZoom * 0.3;
    const targetZ = playerZ + 10.2 + crowdZoom + bossZoom;

    const smooth = Math.min(1, dt * 6.5);
    this.currentPos.x += (targetX - this.currentPos.x) * smooth;
    this.currentPos.y += (targetY - this.currentPos.y) * smooth;
    this.currentPos.z += (targetZ - this.currentPos.z) * smooth;

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.8);
    }

    this.camera.position.set(
      this.currentPos.x + shakeX,
      this.currentPos.y + shakeY,
      this.currentPos.z
    );

    this.lookTarget.set(playerX * 0.3, 1.2, playerZ - 14);
    this.camera.lookAt(this.lookTarget);
  }
}
