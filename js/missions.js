export const DAILY_MISSIONS = [
  { id: 'defeat_100', title: 'Defeat 100 Enemies', statKey: 'enemies', target: 100, reward: 200 },
  { id: 'collect_500', title: 'Collect 500 Coins', statKey: 'coins', target: 500, reward: 250 },
  { id: 'complete_3', title: 'Complete 3 Levels', statKey: 'levels', target: 3, reward: 300 },
  { id: 'reach_50', title: 'Reach 50 Soldiers', statKey: 'maxSquad', target: 50, reward: 350 },
  { id: 'defeat_boss', title: 'Defeat One Boss', statKey: 'bosses', target: 1, reward: 400 }
];

export const ACHIEVEMENTS_LIST = [
  { id: 'first_blood', title: 'First Blood', desc: 'Defeat the first enemy soldier.', reward: 100 },
  { id: 'army_builder', title: 'Army Builder', desc: 'Command a squad of 50+ soldiers simultaneously.', reward: 350 },
  { id: 'weapon_master', title: 'Weapon Master', desc: 'Upgrade any weapon to Level 7 Energy Tier.', reward: 600 },
  { id: 'boss_slayer', title: 'Boss Slayer', desc: 'Defeat 5 powerful enemy bosses.', reward: 500 },
  { id: 'gold_collector', title: 'Gold Collector', desc: 'Accumulate 5,000+ coins in the treasury.', reward: 750 },
  { id: 'legendary_commander', title: 'Legendary Commander', desc: 'Reach Campaign Level 25.', reward: 1000 },
  { id: 'endless_survivor', title: 'Endless Survivor', desc: 'Survive 120 seconds in Endless War or Survival Mode.', reward: 800 }
];

export const DAILY_REWARD_TIERS = [150, 250, 400, 600, 850, 1200, 2000];

export class MissionsManager {
  constructor(storage) {
    this.storage = storage;
  }

  recordEnemyDefeated() {
    const d = this.storage.data;
    d.totalEnemiesDefeated++;
    d.dailyStats.enemies++;
    d.achievements.first_blood = true;
    this.storage.save();
  }

  recordBossDefeated() {
    const d = this.storage.data;
    d.totalBossesDefeated++;
    d.dailyStats.bosses++;
    if (d.totalBossesDefeated >= 5) {
      d.achievements.boss_slayer = true;
    }
    this.storage.save();
  }

  recordSquadSize(count) {
    const d = this.storage.data;
    if (count > d.highestSquad) d.highestSquad = count;
    if (count > d.dailyStats.maxSquad) d.dailyStats.maxSquad = count;
    if (count >= 50) d.achievements.army_builder = true;
    this.storage.save();
  }

  recordLevelCompleted(levelNum) {
    const d = this.storage.data;
    d.dailyStats.levels++;
    if (levelNum >= 25) {
      d.achievements.legendary_commander = true;
    }
    this.storage.save();
  }

  claimDailyMission(missionId) {
    const m = DAILY_MISSIONS.find(x => x.id === missionId);
    if (!m) return false;
    const stats = this.storage.data.dailyStats;
    if (stats.claimedMissions[missionId]) return false;
    if ((stats[m.statKey] || 0) < m.target) return false;

    stats.claimedMissions[missionId] = true;
    this.storage.addCoins(m.reward);
    this.storage.save();
    return true;
  }

  claimAchievement(achId) {
    const ach = ACHIEVEMENTS_LIST.find(x => x.id === achId);
    if (!ach) return false;
    if (!this.storage.data.achievements[achId]) return false;
    if (this.storage.data.claimedAchievements[achId]) return false;

    this.storage.data.claimedAchievements[achId] = true;
    this.storage.addCoins(ach.reward);
    this.storage.save();
    return true;
  }

  canClaimDailyLogin() {
    const today = this.storage.getLocalDateKey();
    return this.storage.data.dailyRewards.lastClaimDate !== today;
  }

  claimDailyLogin() {
    if (!this.canClaimDailyLogin()) return 0;
    const dr = this.storage.data.dailyRewards;
    const reward = DAILY_REWARD_TIERS[dr.streak % DAILY_REWARD_TIERS.length];
    dr.lastClaimDate = this.storage.getLocalDateKey();
    dr.streak = (dr.streak + 1) % DAILY_REWARD_TIERS.length;
    this.storage.addCoins(reward);
    this.storage.save();
    return reward;
  }
}
