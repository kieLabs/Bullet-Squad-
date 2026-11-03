import * as THREE from 'three';

export const WEAPON_CATALOG = [
  {
    id: 'assault_rifle',
    name: 'Assault Rifle',
    cost: 0,
    baseDamage: 14,
    fireRate: 6.5,
    pellets: 1,
    spread: 0.03,
    bulletSpeed: 58,
    color: 0x607d8b,
    projectileColor: 0xfcc934,
    sfx: 'gun_fire',
    desc: 'Balanced standard-issue military carbine.'
  },
  {
    id: 'smg',
    name: 'Submachine Gun',
    cost: 350,
    baseDamage: 10,
    fireRate: 11.0,
    pellets: 1,
    spread: 0.06,
    bulletSpeed: 54,
    color: 0x455a64,
    projectileColor: 0xffe082,
    sfx: 'gun_fire',
    desc: 'High cyclic rate for close-to-mid crowd suppression.'
  },
  {
    id: 'heavy_mg',
    name: 'Heavy Machine Gun',
    cost: 750,
    baseDamage: 22,
    fireRate: 8.0,
    pellets: 1,
    spread: 0.04,
    bulletSpeed: 62,
    color: 0x37474f,
    projectileColor: 0xffb300,
    sfx: 'gun_fire',
    desc: 'High-caliber squad automatic weapon.'
  },
  {
    id: 'shotgun',
    name: 'Shotgun',
    cost: 1200,
    baseDamage: 16,
    fireRate: 3.4,
    pellets: 5,
    spread: 0.16,
    bulletSpeed: 50,
    color: 0x5d4037,
    projectileColor: 0xff8a65,
    sfx: 'gun_fire',
    desc: 'Fires a wide 5-pellet buckshot cone.'
  },
  {
    id: 'minigun',
    name: 'Minigun',
    cost: 2000,
    baseDamage: 18,
    fireRate: 16.0,
    pellets: 1,
    spread: 0.07,
    bulletSpeed: 65,
    color: 0x263238,
    projectileColor: 0xffd54f,
    sfx: 'minigun_fire',
    desc: 'Rotary 6-barrel gatling cannon with extreme fire rate.'
  },
  {
    id: 'laser_gun',
    name: 'Laser Gun',
    cost: 3200,
    baseDamage: 34,
    fireRate: 9.5,
    pellets: 1,
    spread: 0.01,
    bulletSpeed: 85,
    color: 0x00acc1,
    projectileColor: 0x00e5ff,
    sfx: 'laser_fire',
    desc: 'Precision directed-energy beam rifle.'
  },
  {
    id: 'plasma_cannon',
    name: 'Plasma Cannon',
    cost: 4800,
    baseDamage: 58,
    fireRate: 5.2,
    pellets: 1,
    spread: 0.02,
    bulletSpeed: 55,
    splashRadius: 2.2,
    color: 0x7b1fa2,
    projectileColor: 0xe040fb,
    sfx: 'laser_fire',
    desc: 'Superheated plasma orbs with thermal splash damage.'
  },
  {
    id: 'rocket_launcher',
    name: 'Rocket Launcher',
    cost: 6800,
    baseDamage: 95,
    fireRate: 2.8,
    pellets: 1,
    spread: 0.02,
    bulletSpeed: 48,
    splashRadius: 3.8,
    color: 0x33691e,
    projectileColor: 0xff5252,
    sfx: 'explosion',
    desc: 'High-explosive anti-armor warheads.'
  },
  {
    id: 'golden_minigun',
    name: 'Golden Minigun',
    cost: 10000,
    baseDamage: 38,
    fireRate: 18.5,
    pellets: 2,
    spread: 0.06,
    bulletSpeed: 72,
    color: 0xfbc02d,
    projectileColor: 0xfff176,
    sfx: 'minigun_fire',
    desc: 'Prestige twin-stream gold rotary cannon.'
  },
  {
    id: 'legendary_energy',
    name: 'Legendary Energy Weapon',
    cost: 16000,
    baseDamage: 75,
    fireRate: 13.0,
    pellets: 3,
    spread: 0.08,
    bulletSpeed: 90,
    splashRadius: 2.5,
    color: 0x00e676,
    projectileColor: 0x69f0ae,
    sfx: 'laser_fire',
    desc: 'Apex tri-beam quantum annihilator.'
  }
];

export const WEAPON_TIER_NAMES = [
  'Level 1: Basic Weapon',
  'Level 2: Faster Fire Rate',
  'Level 3: Increased Damage',
  'Level 4: Double Barrel',
  'Level 5: Heavy Weapon',
  'Level 6: Golden Weapon',
  'Level 7: Energy Weapon'
];

export function getWeaponSpec(weaponId, tierLevel = 1) {
  const base = WEAPON_CATALOG.find(w => w.id === weaponId) || WEAPON_CATALOG[0];
  const tier = Math.max(1, Math.min(7, tierLevel));

  let damageMult = 1 + (tier - 1) * 0.22;
  let rateMult = 1 + (tier >= 2 ? 0.18 : 0) + (tier - 1) * 0.08;
  let extraPellets = tier >= 4 ? 1 : 0;
  let visualColor = base.color;
  let projColor = base.projectileColor;

  if (tier === 6) {
    visualColor = 0xfcc934;
    projColor = 0xfff59d;
  } else if (tier === 7) {
    visualColor = 0x00e5ff;
    projColor = 0x80d8ff;
    damageMult += 0.35;
  }

  return {
    ...base,
    tier,
    tierName: WEAPON_TIER_NAMES[tier - 1],
    effectiveDamage: base.baseDamage * damageMult,
    effectiveFireRate: base.fireRate * rateMult,
    effectivePellets: base.pellets + extraPellets,
    visualColor,
    projColor
  };
}

export function buildWeaponMesh(weaponId, tier = 1) {
  const spec = getWeaponSpec(weaponId, tier);
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: spec.visualColor,
    metalness: tier >= 6 ? 0.85 : 0.45,
    roughness: tier >= 6 ? 0.2 : 0.5,
    emissive: tier === 7 ? 0x004d66 : 0x000000
  });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.55), bodyMat);
  group.add(receiver);

  const barrelCount = spec.tier >= 4 ? 2 : 1;
  for (let b = 0; b < barrelCount; b++) {
    const offset = barrelCount === 2 ? (b === 0 ? -0.05 : 0.05) : 0;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8),
      bodyMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(offset, 0.04, -0.45);
    group.add(barrel);
  }

  if (spec.tier >= 5) {
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, -0.12, -0.05);
    group.add(drum);
  }

  return group;
}