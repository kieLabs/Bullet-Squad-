export const CHARACTER_CATALOG = [
  { id: 'elite_commander', name: 'Elite Commander', cost: 0, vestColor: 0x1a73e8, trouserColor: 0x263238, skinColor: 0xd7a17c, headgear: 'cap', bonusText: 'Balanced Command Aura' },
  { id: 'special_forces', name: 'Special Forces Soldier', cost: 500, vestColor: 0x1c313a, trouserColor: 0x111920, skinColor: 0xc68b59, headgear: 'helmet', bonusText: '+8% Fire Rate' },
  { id: 'heavy_gunner', name: 'Heavy Gunner', cost: 1100, vestColor: 0x33691e, trouserColor: 0x2e3b23, skinColor: 0xe0ac69, headgear: 'helmet', bonusText: '+12% Weapon Damage' },
  { id: 'desert_warrior', name: 'Desert Warrior', cost: 1800, vestColor: 0xc29b61, trouserColor: 0x8d6e63, skinColor: 0xb87a4b, headgear: 'cap', bonusText: '+10% Move Agility' },
  { id: 'arctic_soldier', name: 'Arctic Soldier', cost: 2600, vestColor: 0xe0f7fa, trouserColor: 0x90a4ae, skinColor: 0xf1c27d, headgear: 'helmet', bonusText: '+15% Squad Armor' },
  { id: 'cyber_soldier', name: 'Cyber Soldier', cost: 4200, vestColor: 0x00e5ff, trouserColor: 0x1a237e, skinColor: 0x80deea, headgear: 'visor', bonusText: '+18% Energy Output' },
  { id: 'golden_commander', name: 'Golden Commander', cost: 7500, vestColor: 0xfcc934, trouserColor: 0x5d4037, skinColor: 0xe0ac69, headgear: 'cap', bonusText: '+25% Coin Rewards' },
  { id: 'shadow_soldier', name: 'Legendary Shadow Soldier', cost: 12000, vestColor: 0x4a148c, trouserColor: 0x0a0a0f, skinColor: 0x9575cd, headgear: 'visor', bonusText: '+30% All Combat Stats' }
];

export const UPGRADE_DEFINITIONS = [
  { key: 'startingSquad', name: 'Starting Squad Size', baseCost: 150, desc: 'Increases initial soldiers deployed at level start.' },
  { key: 'squadCapacity', name: 'Max Squad Capacity', baseCost: 200, desc: 'Expands maximum tactical formation limit.' },
  { key: 'damageBoost', name: 'Squad Bullet Damage', baseCost: 180, desc: 'Increases ballistic and energy damage by +12% per level.' },
  { key: 'fireRateBoost', name: 'Rapid Cycling Triggers', baseCost: 210, desc: 'Boosts squad firing frequency by +8% per level.' },
  { key: 'healthBoost', name: 'Kevlar Tactical Armor', baseCost: 170, desc: 'Increases soldier durability against enemy fire.' },
  { key: 'specialAbility', name: 'Tactical Airstrike Power', baseCost: 260, desc: 'Enhances special attack radius and reduces cooldown.' }
];

export class UpgradesManager {
  constructor(storage) {
    this.storage = storage;
  }

  getUpgradeLevel(key) {
    return this.storage.data.upgrades[key] || 1;
  }

  getUpgradeCost(key) {
    const def = UPGRADE_DEFINITIONS.find(u => u.key === key);
    const lvl = this.getUpgradeLevel(key);
    return Math.floor((def ? def.baseCost : 180) * Math.pow(1.42, lvl - 1));
  }

  buyUpgrade(key) {
    const cost = this.getUpgradeCost(key);
    if (!this.storage.spendCoins(cost)) return false;
    this.storage.data.upgrades[key] = this.getUpgradeLevel(key) + 1;
    this.storage.save();
    return true;
  }

  getStartingSquadCount() {
    return 2 + this.getUpgradeLevel('startingSquad');
  }

  getMaxSquadCapacity() {
    return 110 + this.getUpgradeLevel('squadCapacity') * 25;
  }

  getDamageMultiplier() {
    const charId = this.storage.data.selectedCharacter;
    const charBonus = charId === 'shadow_soldier' ? 0.3 : (charId === 'heavy_gunner' ? 0.12 : 0);
    return 1 + (this.getUpgradeLevel('damageBoost') - 1) * 0.12 + charBonus;
  }

  getFireRateMultiplier() {
    const charId = this.storage.data.selectedCharacter;
    const charBonus = charId === 'shadow_soldier' ? 0.3 : (charId === 'special_forces' ? 0.08 : 0);
    return 1 + (this.getUpgradeLevel('fireRateBoost') - 1) * 0.08 + charBonus;
  }

  getSoldierHealth() {
    return 25 + (this.getUpgradeLevel('healthBoost') - 1) * 10;
  }

  getSpecialCooldown() {
    return Math.max(4.5, 11.0 - (this.getUpgradeLevel('specialAbility') - 1) * 0.6);
  }
}