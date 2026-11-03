import * as THREE from 'three';
import { CHARACTER_CATALOG } from './upgrades.js';
import { buildWeaponMesh } from './weapons.js';

export class PlayerCommander {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vy = 0;
    this.isJumping = false;
    this.animState = 'idle';
    this.animTime = 0;
    this.recoilOffset = 0;
    this.upgradePulse = 0;

    this.leftArm = null;
    this.rightArm = null;
    this.leftLeg = null;
    this.rightLeg = null;
    this.headGroup = null;
    this.weaponSocket = null;

    this.buildCommanderModel('elite_commander', 'assault_rifle', 1);
  }

  buildCommanderModel(characterId, weaponId, weaponTier) {
    while (this.root.children.length > 0) {
      this.root.remove(this.root.children[0]);
    }

    const spec = CHARACTER_CATALOG.find(c => c.id === characterId) || CHARACTER_CATALOG[0];

    const skinMat = new THREE.MeshStandardMaterial({ color: spec.skinColor, roughness: 0.6 });
    const vestMat = new THREE.MeshStandardMaterial({ color: spec.vestColor, roughness: 0.4, metalness: 0.25 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: spec.trouserColor, roughness: 0.7 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 0.42), vestMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.root.add(torso);

    const ammoBelt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.46), beltMat);
    ammoBelt.position.set(0, 1.18, 0);
    ammoBelt.rotation.z = 0.55;
    this.root.add(ammoBelt);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.82, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), skinMat);
    this.headGroup.add(headMesh);

    const eyeMat = new THREE.MeshBasicMaterial({ color: spec.headgear === 'visor' ? 0x00e5ff : 0x111111 });
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.06), eyeMat);
    brow.position.set(0, 0.05, -0.21);
    this.headGroup.add(brow);

    const capMat = new THREE.MeshStandardMaterial({ color: spec.vestColor, roughness: 0.35 });
    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 12), capMat);
    helmet.position.y = 0.22;
    this.headGroup.add(helmet);

    if (spec.headgear === 'cap') {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.22), capMat);
      visor.position.set(0, 0.15, -0.24);
      this.headGroup.add(visor);
    }
    this.root.add(this.headGroup);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 1.42, 0);
    const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.22), skinMat);
    lUpper.position.y = -0.22;
    const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), bootMat);
    lGlove.position.y = -0.52;
    this.leftArm.add(lUpper, lGlove);
    this.root.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 1.42, 0);
    const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.22), skinMat);
    rUpper.position.y = -0.22;
    const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), bootMat);
    rGlove.position.y = -0.52;
    this.rightArm.add(rUpper, rGlove);

    this.weaponSocket = new THREE.Group();
    this.weaponSocket.position.set(0, -0.45, -0.35);
    const weaponMesh = buildWeaponMesh(weaponId, weaponTier);
    this.weaponSocket.add(weaponMesh);
    this.rightArm.add(this.weaponSocket);
    this.root.add(this.rightArm);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.19, 0.72, 0);
    const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.26), pantsMat);
    lThigh.position.y = -0.24;
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.34), bootMat);
    lBoot.position.set(0, -0.58, -0.04);
    this.leftLeg.add(lThigh, lBoot);
    this.root.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.19, 0.72, 0);
    const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.26), pantsMat);
    rThigh.position.y = -0.24;
    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.34), bootMat);
    rBoot.position.set(0, -0.58, -0.04);
    this.rightLeg.add(rThigh, rBoot);
    this.root.add(this.rightLeg);
  }

  triggerRecoil() {
    this.recoilOffset = 0.16;
  }

  triggerUpgradePulse() {
    this.upgradePulse = 1.0;
  }

  jump() {
    if (!this.isJumping) {
      this.isJumping = true;
      this.vy = 9.5;
    }
  }

  update(dt, state = 'run') {
    this.animState = state;
    this.animTime += dt * (state === 'run' ? 11.5 : 3.5);

    if (this.isJumping) {
      this.y += this.vy * dt;
      this.vy -= 26.0 * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.isJumping = false;
      }
    }

    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dt * 1.4);
    }

    if (this.upgradePulse > 0) {
      this.upgradePulse = Math.max(0, this.upgradePulse - dt * 2.2);
      const s = 1 + Math.sin(this.upgradePulse * Math.PI) * 0.25;
      this.root.scale.set(s, s, s);
    } else {
      this.root.scale.set(1, 1, 1);
    }

    if (state === 'run') {
      const swing = Math.sin(this.animTime) * 0.62;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = 0.45 - swing * 0.25;
      this.rightArm.rotation.x = 0.65 + this.recoilOffset;
      this.headGroup.position.y = 1.82 + Math.abs(Math.cos(this.animTime)) * 0.04;
    } else if (state === 'victory') {
      this.leftArm.rotation.x = Math.PI * 0.85 + Math.sin(this.animTime * 2) * 0.2;
      this.rightArm.rotation.x = Math.PI * 0.85 - Math.sin(this.animTime * 2) * 0.2;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    } else if (state === 'defeat') {
      this.root.rotation.x = -Math.PI / 2.2;
    } else {
      this.root.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0.35 + Math.sin(this.animTime) * 0.05;
      this.rightArm.rotation.x = 0.55 + Math.cos(this.animTime) * 0.05;
    }

    if (this.weaponSocket) {
      this.weaponSocket.position.z = -0.35 + this.recoilOffset * 0.7;
    }

    this.root.position.set(this.x, this.y, this.z);
  }
}
