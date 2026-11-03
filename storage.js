const STORAGE_KEY = 'BULLET_SQUAD_GAMERKIE_SAVE_V1';

export class StorageManager {
  constructor() {
    this.data = this.load();
  }

  getDefaultData() {
    return {
      coins: 250,
      currentLevel: 1,
      highestLevel: 1,
      highestSquad: 3,
      totalEnemiesDefeated: 0,
      totalBossesDefeated: 0,
      selectedCharacter: 'elite_commander',
      unlockedCharacters: ['elite_commander'],
      selectedWeapon: 'assault_rifle',
      unlockedWeapons: ['assault_rifle'],
      weaponLevels: {
        assault_rifle: 1,
        smg: 1,
        heavy_mg: 1,
        minigun: 1,
        shotgun: 1,
        laser_gun: 1,
        plasma_cannon: 1,
        rocket_launcher: 1,
        golden_minigun: 1,
        legendary_energy: 1
      },
      upgrades: {
        squadCapacity: 1,
        damageBoost: 1,
        fireRateBoost: 1,
        healthBoost: 1,
        specialAbility: 1,
        startingSquad: 1
      },
      dailyStats: {
        dateKey: this.getLocalDateKey(),
        enemies: 0,
        coins: 0,
        levels: 0,
        maxSquad: 3,
        bosses: 0,
        claimedMissions: {}
      },
      dailyRewards: {
        lastClaimDate: '',
        streak: 0
      },
      achievements: {
        first_blood: false,
        army_builder: false,
        weapon_master: false,
        boss_slayer: false,
        gold_collector: false,
        legendary_commander: false,
        endless_survivor: false
      },
      claimedAchievements: {},
      settings: {
        music: true,
        sound: true,
        masterVolume: 0.8,
        graphics: 'HIGH',
        cameraShake: true,
        vibration: true,
        language: 'EN',
        sensitivity: 1.0,
        showFps: false
      }
    };
  }

  getLocalDateKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultData();
      const parsed = JSON.parse(raw);
      const def = this.getDefaultData();
      const merged = {
        ...def,
        ...parsed,
        weaponLevels: { ...def.weaponLevels, ...(parsed.weaponLevels || {}) },
        upgrades: { ...def.upgrades, ...(parsed.upgrades || {}) },
        dailyStats: { ...def.dailyStats, ...(parsed.dailyStats || {}) },
        dailyRewards: { ...def.dailyRewards, ...(parsed.dailyRewards || {}) },
        achievements: { ...def.achievements, ...(parsed.achievements || {}) },
        claimedAchievements: { ...(parsed.claimedAchievements || {}) },
        settings: { ...def.settings, ...(parsed.settings || {}) }
      };
      if (merged.dailyStats.dateKey !== this.getLocalDateKey()) {
        merged.dailyStats = {
          dateKey: this.getLocalDateKey(),
          enemies: 0,
          coins: 0,
          levels: 0,
          maxSquad: 3,
          bosses: 0,
          claimedMissions: {}
        };
      }
      return merged;
    } catch (e) {
      return this.getDefaultData();
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {}
  }

  addCoins(amount) {
    const valid = Math.max(0, Math.floor(Number(amount) || 0));
    this.data.coins += valid;
    this.data.dailyStats.coins += valid;
    if (this.data.coins >= 5000) {
      this.data.achievements.gold_collector = true;
    }
    this.save();
    return this.data.coins;
  }

  spendCoins(amount) {
    const cost = Math.max(0, Math.floor(Number(amount) || 0));
    if (this.data.coins < cost) return false;
    this.data.coins -= cost;
    this.save();
    return true;
  }

  resetAll() {
    this.data = this.getDefaultData();
    this.save();
  }
}