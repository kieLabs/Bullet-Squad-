import * as THREE from 'three';

export const ENVIRONMENTS = [
  { id: 1, name: 'Sky Bridge Battlefield', skyColor: 0x162b4d, fogColor: 0x1e3c6e, roadColor: 0x2c3540, railColor: 0x78909c, propColor: 0x0d1b33 },
  { id: 2, name: 'Military Base', skyColor: 0x263238, fogColor: 0x37474f, roadColor: 0x3e464c, railColor: 0x8bc34a, propColor: 0x1b262c },
  { id: 3, name: 'Desert Warzone', skyColor: 0x5d4037, fogColor: 0x8d6e63, roadColor: 0x795548, railColor: 0xffb300, propColor: 0x4e342e },
  { id: 4, name: 'Frozen Battlefield', skyColor: 0x0d47a1, fogColor: 0x42a5f5, roadColor: 0x90caf9, railColor: 0xe3f2fd, propColor: 0x1565c0 },
  { id: 5, name: 'Jungle Military Zone', skyColor: 0x1b5e20, fogColor: 0x2e7d32, roadColor: 0x334d36, railColor: 0xaed581, propColor: 0x0d3311 },
  { id: 6, name: 'Industrial Warzone', skyColor: 0x212121, fogColor: 0x424242, roadColor: 0x303030, railColor: 0xff9800, propColor: 0x181818 },
  { id: 7, name: 'Futuristic Cyber City', skyColor: 0x090424, fogColor: 0x1a0b4e, roadColor: 0x120a2e, railColor: 0x00e5ff, propColor: 0x240b59 },
  { id: 8, name: 'Volcanic Battlefield', skyColor: 0x3e0a0a, fogColor: 0x6e1414, roadColor: 0x2b1212, railColor: 0xff3d00, propColor: 0x1f0505 },
  { id: 9, name: 'Underground Military Facility', skyColor: 0x0a1414, fogColor: 0x122626, roadColor: 0x1f2e2e, railColor: 0x00bfa5, propColor: 0x071212 },
  { id: 10, name: 'Ultimate War Arena', skyColor: 0x1a002c, fogColor: 0x38005c, roadColor: 0x240838, railColor: 0xf538a0, propColor: 0x140024 }
];

export class EnvironmentBuilder {
  constructor(scene) {
    this.scene = scene;
    this.envGroup = new THREE.Group();
    this.scene.add(this.envGroup);
  }

  buildEnvironment(envIndex, bridgeLength) {
    while (this.envGroup.children.length > 0) {
      this.envGroup.remove(this.envGroup.children[0]);
    }

    const env = ENVIRONMENTS[(envIndex - 1) % ENVIRONMENTS.length];
    this.scene.background = new THREE.Color(env.skyColor);
    this.scene.fog = new THREE.FogExp2(env.fogColor, 0.0085);

    const totalLen = bridgeLength + 120;

    const roadMat = new THREE.MeshStandardMaterial({ color: env.roadColor, roughness: 0.75 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(13.2, 1.2, totalLen), roadMat);
    road.position.set(0, -0.6, -totalLen / 2 + 25);
    road.receiveShadow = true;
    this.envGroup.add(road);

    const railMat = new THREE.MeshStandardMaterial({ color: env.railColor, metalness: 0.65, roughness: 0.3 });
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, totalLen), railMat);
    leftRail.position.set(-6.4, 0.55, -totalLen / 2 + 25);
    const rightRail = leftRail.clone();
    rightRail.position.x = 6.4;
    this.envGroup.add(leftRail, rightRail);

    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = 10; z > -bridgeLength - 40; z -= 10) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 4.2), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      this.envGroup.add(dash);
    }

    const propMat = new THREE.MeshStandardMaterial({ color: env.propColor, roughness: 0.8 });
    for (let z = 0; z > -bridgeLength - 60; z -= 28) {
      for (const side of [-1, 1]) {
        const h = 18 + Math.abs(Math.sin(z * 0.13)) * 32;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), propMat);
        tower.position.set(side * 22, h / 2 - 14, z);
        this.envGroup.add(tower);
      }
    }

    return env;
  }
}