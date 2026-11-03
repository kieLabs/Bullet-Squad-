import { CHARACTER_CATALOG, UPGRADE_DEFINITIONS } from './upgrades.js';
import { WEAPON_CATALOG, getWeaponSpec } from './weapons.js';
import { DAILY_MISSIONS, ACHIEVEMENTS_LIST, DAILY_REWARD_TIERS } from './missions.js';

export class UIManager {
  constructor({ game, storage, settings, audio, upgrades, missions }) {
    this.game = game;
    this.storage = storage;
    this.settings = settings;
    this.audio = audio;
    this.upgrades = upgrades;
    this.missions = missions;

    this.lastSquadDisplayed = -1;
    this.bindMenuButtons();
  }

  bindMenuButtons() {
    const clickSfx = () => this.audio.playSfx('click');

    document.getElementById('btn-play').addEventListener('click', () => {
      clickSfx();
      this.game.startGame('campaign');
    });
    document.getElementById('btn-campaign').addEventListener('click', () => {
      clickSfx();
      this.game.startGame('campaign');
    });
    document.getElementById('btn-endless').addEventListener('click', () => {
      clickSfx();
      this.game.startGame('endless');
    });
    document.getElementById('btn-boss-battle').addEventListener('click', () => {
      clickSfx();
      this.game.startGame('boss_battle');
    });
    document.getElementById('btn-survival').addEventListener('click', () => {
      clickSfx();
      this.game.startGame('survival');
    });
    document.getElementById('btn-army-challenge').addEventListener('click', () => {
      clickSfx();
      this.game.startGame('army_challenge');
    });

    document.getElementById('btn-characters').addEventListener('click', () => {
      clickSfx();
      this.openModal('CHARACTERS', () => this.renderCharactersModal());
    });
    document.getElementById('btn-weapons').addEventListener('click', () => {
      clickSfx();
      this.openModal('WEAPONS ARMORY', () => this.renderWeaponsModal());
    });
    document.getElementById('btn-upgrades').addEventListener('click', () => {
      clickSfx();
      this.openModal('SQUAD & COMMAND UPGRADES', () => this.renderUpgradesModal());
    });
    document.getElementById('btn-missions').addEventListener('click', () => {
      clickSfx();
      this.openModal('DAILY MISSIONS', () => this.renderMissionsModal());
    });
    document.getElementById('btn-daily-rewards').addEventListener('click', () => {
      clickSfx();
      this.openModal('DAILY REWARDS', () => this.renderDailyRewardsModal());
    });
    document.getElementById('btn-achievements').addEventListener('click', () => {
      clickSfx();
      this.openModal('ACHIEVEMENTS', () => this.renderAchievementsModal());
    });
    document.getElementById('btn-settings').addEventListener('click', () => {
      clickSfx();
      this.openModal('SETTINGS', () => this.renderSettingsModal());
    });
    document.getElementById('btn-how-to-play').addEventListener('click', () => {
      clickSfx();
      this.openModal('HOW TO PLAY', () => this.renderHowToPlayModal());
    });

    document.getElementById('btn-modal-close').addEventListener('click', () => {
      clickSfx();
      document.getElementById('screen-modal').classList.add('hidden');
      this.refreshAll();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      clickSfx();
      this.game.pauseGame();
    });
    document.getElementById('btn-auto-fire').addEventListener('click', (e) => {
      clickSfx();
      this.game.autoFire = !this.game.autoFire;
      e.currentTarget.textContent = `AUTO FIRE: ${this.game.autoFire ? 'ON' : 'OFF'}`;
      e.currentTarget.classList.toggle('active', this.game.autoFire);
    });
    document.getElementById('btn-manual-fire').addEventListener('click', () => {
      this.game.manualFireRequested = true;
    });
    document.getElementById('btn-jump-dodge').addEventListener('click', () => {
      this.game.player.jump();
    });
    document.getElementById('btn-special-attack').addEventListener('click', () => {
      this.game.triggerSpecialAttack();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      clickSfx();
      this.game.resumeGame();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      clickSfx();
      this.hideModals();
      this.game.startGame(this.game.gameMode, this.game.levelData.levelNum);
    });
    document.getElementById('btn-pause-settings').addEventListener('click', () => {
      clickSfx();
      this.openModal('SETTINGS', () => this.renderSettingsModal());
    });
    document.getElementById('btn-pause-home').addEventListener('click', () => {
      clickSfx();
      this.returnHome();
    });

    document.getElementById('btn-next-level').addEventListener('click', () => {
      clickSfx();
      this.hideModals();
      this.game.startGame(this.game.gameMode);
    });
    document.getElementById('btn-replay-level').addEventListener('click', () => {
      clickSfx();
      this.hideModals();
      this.game.startGame(this.game.gameMode, this.game.levelData.levelNum);
    });
    document.getElementById('btn-victory-home').addEventListener('click', () => {
      clickSfx();
      this.returnHome();
    });

    document.getElementById('btn-retry').addEventListener('click', () => {
      clickSfx();
      this.hideModals();
      this.game.startGame(this.game.gameMode, this.game.levelData.levelNum);
    });
    document.getElementById('btn-gameover-home').addEventListener('click', () => {
      clickSfx();
      this.returnHome();
    });

    document.getElementById('btn-confirm-yes').addEventListener('click', () => {
      clickSfx();
      this.storage.resetAll();
      document.getElementById('screen-confirm').classList.add('hidden');
      document.getElementById('screen-modal').classList.add('hidden');
      this.returnHome();
    });
    document.getElementById('btn-confirm-no').addEventListener('click', () => {
      clickSfx();
      document.getElementById('screen-confirm').classList.add('hidden');
    });
  }

  returnHome() {
    this.hideModals();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('screen-main-menu').classList.remove('hidden');
    this.game.setupMenuDiorama();
    this.refreshAll();
  }

  hideModals() {
    document.getElementById('screen-modal').classList.add('hidden');
    document.getElementById('screen-pause').classList.add('hidden');
    document.getElementById('screen-victory').classList.add('hidden');
    document.getElementById('screen-gameover').classList.add('hidden');
  }

  showGameplayHUD() {
    this.hideModals();
    document.getElementById('screen-main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.updateHUD();
  }

  showPauseScreen() {
    document.getElementById('pause-stats-text').textContent =
      `Level ${this.game.levelData.levelNum} • Squad: ${this.game.squad.logicalCount}`;
    document.getElementById('screen-pause').classList.remove('hidden');
  }

  showVictoryScreen(stats, bonus) {
    document.getElementById('victory-level-title').textContent = `LEVEL ${this.game.levelData.levelNum} COMPLETED`;
    document.getElementById('vic-enemies').textContent = stats.enemies;
    document.getElementById('vic-max-squad').textContent = stats.maxSquad;
    document.getElementById('vic-bosses').textContent = stats.bosses;
    document.getElementById('vic-bonus').textContent = `+${bonus}`;
    document.getElementById('vic-coins').textContent = `+${stats.coins}`;

    const stars = stats.maxSquad >= 35 ? '★★★' : (stats.maxSquad >= 15 ? '★★☆' : '★☆☆');
    const rating = stats.maxSquad >= 35 ? 'S-RANK LEGEND' : (stats.maxSquad >= 15 ? 'A-RANK ELITE' : 'B-RANK SOLDIER');
    document.getElementById('victory-stars').textContent = stars;
    document.getElementById('vic-rating').textContent = rating;
    document.getElementById('screen-victory').classList.remove('hidden');
  }

  showGameOverScreen(stats) {
    const score = stats.enemies * 25 + stats.maxSquad * 10;
    document.getElementById('go-score').textContent = score;
    document.getElementById('go-max-squad').textContent = stats.maxSquad;
    document.getElementById('go-enemies').textContent = stats.enemies;
    document.getElementById('go-coins').textContent = `+${stats.coins}`;
    document.getElementById('screen-gameover').classList.remove('hidden');
  }

  updateHUD() {
    const lvl = this.game.levelData ? this.game.levelData.levelNum : 1;
    document.getElementById('hud-level').textContent = `LEVEL ${lvl}`;
    document.getElementById('hud-mode-label').textContent = this.game.gameMode.toUpperCase().replace('_', ' ');

    const progress = this.game.levelData
      ? Math.min(100, Math.max(0, (Math.abs(this.game.player.z) / this.game.levelData.diff.bridgeLength) * 100))
      : 0;
    document.getElementById('hud-progress-fill').style.width = `${progress}%`;

    const sqCount = this.game.squad.logicalCount;
    const sqEl = document.getElementById('hud-squad-count');
    sqEl.textContent = sqCount;
    if (sqCount !== this.lastSquadDisplayed) {
      this.lastSquadDisplayed = sqCount;
      const pill = document.getElementById('hud-squad-pill');
      pill.classList.remove('pulse-scale');
      void pill.offsetWidth;
      pill.classList.add('pulse-scale');
    }

    document.getElementById('hud-enemy-count').textContent = this.game.enemyManager.getActiveCount();
    document.getElementById('hud-coins').textContent = this.storage.data.coins;

    const wepSpec = getWeaponSpec(this.game.activeWeaponId, this.game.activeWeaponTier);
    document.getElementById('hud-weapon-name').textContent = wepSpec.name;
    document.getElementById('hud-weapon-tier').textContent = wepSpec.tierName;

    const cdLabel = document.getElementById('special-cooldown-label');
    cdLabel.textContent = this.game.specialCooldown > 0
      ? `${this.game.specialCooldown.toFixed(1)}s`
      : 'READY';

    const boss = this.game.bossManager.activeBoss;
    const bossBar = document.getElementById('hud-boss-bar');
    if (boss && boss.engaged && !boss.dead) {
      bossBar.classList.remove('hidden');
      document.getElementById('hud-boss-name').textContent = boss.arch.name.toUpperCase();
      document.getElementById('hud-boss-phase').textContent = `PHASE ${boss.phase}/${boss.maxPhases}`;
      document.getElementById('hud-boss-hp-fill').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    } else {
      bossBar.classList.add('hidden');
    }

    const pContainer = document.getElementById('hud-powerups');
    pContainer.innerHTML = '';
    for (const [k, rem] of Object.entries(this.game.powerupTimers)) {
      const chip = document.createElement('div');
      chip.className = 'powerup-chip';
      chip.textContent = `${k.replace('_', ' ').toUpperCase()} (${rem.toFixed(1)}s)`;
      pContainer.appendChild(chip);
    }
  }

  refreshAll() {
    document.getElementById('menu-coins').textContent = this.storage.data.coins;
    document.getElementById('modal-coins').textContent = this.storage.data.coins;
    const charSpec = CHARACTER_CATALOG.find(c => c.id === this.storage.data.selectedCharacter) || CHARACTER_CATALOG[0];
    document.getElementById('menu-commander-info').textContent =
      `CMDR: ${charSpec.name.toUpperCase()} • LVL ${this.storage.data.currentLevel}`;
  }

  openModal(title, renderFn) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-coins').textContent = this.storage.data.coins;
    renderFn();
    document.getElementById('screen-modal').classList.remove('hidden');
  }

  renderCharactersModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    for (const c of CHARACTER_CATALOG) {
      const unlocked = this.storage.data.unlockedCharacters.includes(c.id);
      const selected = this.storage.data.selectedCharacter === c.id;
      const card = document.createElement('div');
      card.className = `item-card ${selected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-swatch" style="background:#${c.vestColor.toString(16).padStart(6, '0')}">${c.headgear.toUpperCase()}</div>
        <div class="item-title">${c.name}</div>
        <div class="item-desc">${c.bonusText}</div>
        <button class="menu-btn ${selected ? 'hero-btn' : 'mode-btn'}">
          ${selected ? 'EQUIPPED' : (unlocked ? 'SELECT' : `UNLOCK (${c.cost} COINS)`)}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        if (unlocked) {
          this.storage.data.selectedCharacter = c.id;
          this.storage.save();
          this.audio.playSfx('click');
          this.game.setupMenuDiorama();
          this.renderCharactersModal();
          this.refreshAll();
        } else if (this.storage.spendCoins(c.cost)) {
          this.storage.data.unlockedCharacters.push(c.id);
          this.storage.data.selectedCharacter = c.id;
          this.storage.save();
          this.audio.playSfx('weapon_upgrade');
          this.game.setupMenuDiorama();
          this.renderCharactersModal();
          this.refreshAll();
        }
      });
      body.appendChild(card);
    }
  }

  renderWeaponsModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    for (const w of WEAPON_CATALOG) {
      const unlocked = this.storage.data.unlockedWeapons.includes(w.id);
      const selected = this.storage.data.selectedWeapon === w.id;
      const tier = this.storage.data.weaponLevels[w.id] || 1;
      const spec = getWeaponSpec(w.id, tier);
      const upgCost = Math.floor(220 * Math.pow(1.55, tier - 1));

      const card = document.createElement('div');
      card.className = `item-card ${selected ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-swatch" style="background:#${spec.visualColor.toString(16).padStart(6, '0')}">${spec.tierName}</div>
        <div class="item-title">${w.name}</div>
        <div class="item-desc">${w.desc} (DMG: ${Math.round(spec.effectiveDamage)} • RATE: ${spec.effectiveFireRate.toFixed(1)}/s)</div>
        <div class="vertical-btns">
          <button class="menu-btn btn-equip ${selected ? 'hero-btn' : 'mode-btn'}">
            ${selected ? 'EQUIPPED' : (unlocked ? 'EQUIP' : `BUY (${w.cost} COINS)`)}
          </button>
          ${unlocked && tier < 7 ? `<button class="menu-btn sub-btn btn-tier-up">UPGRADE LVL ${tier + 1} (${upgCost})</button>` : ''}
        </div>
      `;

      card.querySelector('.btn-equip').addEventListener('click', () => {
        if (unlocked) {
          this.storage.data.selectedWeapon = w.id;
          this.storage.save();
          this.audio.playSfx('click');
          this.game.setupMenuDiorama();
          this.renderWeaponsModal();
        } else if (this.storage.spendCoins(w.cost)) {
          this.storage.data.unlockedWeapons.push(w.id);
          this.storage.data.selectedWeapon = w.id;
          this.storage.save();
          this.audio.playSfx('weapon_upgrade');
          this.game.setupMenuDiorama();
          this.renderWeaponsModal();
          this.refreshAll();
        }
      });

      const upBtn = card.querySelector('.btn-tier-up');
      if (upBtn) {
        upBtn.addEventListener('click', () => {
          if (this.storage.spendCoins(upgCost)) {
            this.storage.data.weaponLevels[w.id] = tier + 1;
            if (tier + 1 >= 7) {
              this.storage.data.achievements.weapon_master = true;
            }
            this.storage.save();
            this.audio.playSfx('weapon_upgrade');
            this.game.setupMenuDiorama();
            this.renderWeaponsModal();
            this.refreshAll();
          }
        });
      }

      body.appendChild(card);
    }
  }

  renderUpgradesModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    for (const u of UPGRADE_DEFINITIONS) {
      const lvl = this.upgrades.getUpgradeLevel(u.key);
      const cost = this.upgrades.getUpgradeCost(u.key);
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div class="item-title">${u.name} (LVL ${lvl})</div>
        <div class="item-desc">${u.desc}</div>
        <button class="menu-btn mode-btn">UPGRADE (${cost} COINS)</button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        if (this.upgrades.buyUpgrade(u.key)) {
          this.audio.playSfx('weapon_upgrade');
          this.game.setupMenuDiorama();
          this.renderUpgradesModal();
          this.refreshAll();
        }
      });
      body.appendChild(card);
    }
  }

  renderMissionsModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    const stats = this.storage.data.dailyStats;
    for (const m of DAILY_MISSIONS) {
      const cur = Math.min(m.target, stats[m.statKey] || 0);
      const claimed = Boolean(stats.claimedMissions[m.id]);
      const ready = cur >= m.target && !claimed;

      const card = document.createElement('div');
      card.className = `item-card ${claimed ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-title">${m.title}</div>
        <div class="item-desc">Progress: ${cur} / ${m.target} • Reward: +${m.reward} Coins</div>
        <button class="menu-btn ${ready ? 'hero-btn' : 'sub-btn'}">
          ${claimed ? 'CLAIMED' : (ready ? 'CLAIM REWARD' : 'IN PROGRESS')}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        if (this.missions.claimDailyMission(m.id)) {
          this.audio.playSfx('coin');
          this.renderMissionsModal();
          this.refreshAll();
        }
      });
      body.appendChild(card);
    }
  }

  renderDailyRewardsModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    const dr = this.storage.data.dailyRewards;
    const canClaim = this.missions.canClaimDailyLogin();

    DAILY_REWARD_TIERS.forEach((amount, idx) => {
      const isCurrent = idx === (dr.streak % DAILY_REWARD_TIERS.length);
      const card = document.createElement('div');
      card.className = `item-card ${isCurrent ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-title">DAY ${idx + 1}</div>
        <div class="item-desc">Reward: +${amount} Coins</div>
        <button class="menu-btn ${isCurrent && canClaim ? 'hero-btn' : 'sub-btn'}">
          ${isCurrent ? (canClaim ? 'CLAIM TODAY' : 'CLAIMED TODAY') : 'STREAK TIER'}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        if (isCurrent && canClaim) {
          this.missions.claimDailyLogin();
          this.audio.playSfx('coin');
          this.renderDailyRewardsModal();
          this.refreshAll();
        }
      });
      body.appendChild(card);
    });
  }

  renderAchievementsModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    for (const a of ACHIEVEMENTS_LIST) {
      const unlocked = Boolean(this.storage.data.achievements[a.id]);
      const claimed = Boolean(this.storage.data.claimedAchievements[a.id]);

      const card = document.createElement('div');
      card.className = `item-card ${claimed ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="item-title">${a.title}</div>
        <div class="item-desc">${a.desc} (Reward: +${a.reward} Coins)</div>
        <button class="menu-btn ${unlocked && !claimed ? 'hero-btn' : 'sub-btn'}">
          ${claimed ? 'CLAIMED' : (unlocked ? 'CLAIM REWARD' : 'LOCKED')}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        if (this.missions.claimAchievement(a.id)) {
          this.audio.playSfx('coin');
          this.renderAchievementsModal();
          this.refreshAll();
        }
      });
      body.appendChild(card);
    }
  }

  renderSettingsModal() {
    const body = document.getElementById('modal-body');
    const s = this.settings.state;
    body.innerHTML = `
      <div class="settings-row">
        <span>Music</span>
        <button id="set-music" class="menu-btn ${s.music ? 'hero-btn' : 'sub-btn'}">${s.music ? 'ON' : 'OFF'}</button>
      </div>
      <div class="settings-row">
        <span>Sound Effects</span>
        <button id="set-sound" class="menu-btn ${s.sound ? 'hero-btn' : 'sub-btn'}">${s.sound ? 'ON' : 'OFF'}</button>
      </div>
      <div class="settings-row">
        <span>Master Volume (${Math.round(s.masterVolume * 100)}%)</span>
        <input id="set-vol" type="range" min="0" max="1" step="0.05" value="${s.masterVolume}" />
      </div>
      <div class="settings-row">
        <span>Graphics Quality</span>
        <button id="set-gfx" class="menu-btn mode-btn">${s.graphics}</button>
      </div>
      <div class="settings-row">
        <span>Camera Shake</span>
        <button id="set-shake" class="menu-btn ${s.cameraShake ? 'hero-btn' : 'sub-btn'}">${s.cameraShake ? 'ON' : 'OFF'}</button>
      </div>
      <div class="settings-row">
        <span>Vibration</span>
        <button id="set-vib" class="menu-btn ${s.vibration ? 'hero-btn' : 'sub-btn'}">${s.vibration ? 'ON' : 'OFF'}</button>
      </div>
      <div class="settings-row">
        <span>Control Sensitivity (${s.sensitivity.toFixed(1)}x)</span>
        <input id="set-sens" type="range" min="0.5" max="2.0" step="0.1" value="${s.sensitivity}" />
      </div>
      <div class="settings-row">
        <span>Language</span>
        <button id="set-lang" class="menu-btn sub-btn">${s.language}</button>
      </div>
      <div class="settings-row">
        <span>FPS Display</span>
        <button id="set-fps" class="menu-btn ${s.showFps ? 'hero-btn' : 'sub-btn'}">${s.showFps ? 'ON' : 'OFF'}</button>
      </div>
      <div class="settings-row">
        <span>Account Progress</span>
        <button id="set-reset" class="menu-btn danger-btn">RESET PROGRESS</button>
      </div>
    `;

    body.querySelector('#set-music').addEventListener('click', () => {
      this.settings.toggle('music');
      this.renderSettingsModal();
    });
    body.querySelector('#set-sound').addEventListener('click', () => {
      this.settings.toggle('sound');
      this.renderSettingsModal();
    });
    body.querySelector('#set-vol').addEventListener('input', (e) => {
      this.settings.set('masterVolume', parseFloat(e.target.value));
      this.renderSettingsModal();
    });
    body.querySelector('#set-gfx').addEventListener('click', () => {
      const order = ['LOW', 'MEDIUM', 'HIGH'];
      const next = order[(order.indexOf(s.graphics) + 1) % order.length];
      this.settings.set('graphics', next);
      this.renderSettingsModal();
    });
    body.querySelector('#set-shake').addEventListener('click', () => {
      this.settings.toggle('cameraShake');
      this.renderSettingsModal();
    });
    body.querySelector('#set-vib').addEventListener('click', () => {
      this.settings.toggle('vibration');
      this.renderSettingsModal();
    });
    body.querySelector('#set-sens').addEventListener('input', (e) => {
      this.settings.set('sensitivity', parseFloat(e.target.value));
      this.renderSettingsModal();
    });
    body.querySelector('#set-lang').addEventListener('click', () => {
      const langs = ['EN', 'ES', 'FR', 'DE', 'HI'];
      const next = langs[(langs.indexOf(s.language) + 1) % langs.length];
      this.settings.set('language', next);
      this.renderSettingsModal();
    });
    body.querySelector('#set-fps').addEventListener('click', () => {
      this.settings.toggle('showFps');
      this.renderSettingsModal();
    });
    body.querySelector('#set-reset').addEventListener('click', () => {
      document.getElementById('screen-confirm').classList.remove('hidden');
    });
  }

  renderHowToPlayModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="item-card" style="grid-column: 1 / -1;">
        <div class="item-title">1. BUILD THE SQUAD & CHOOSE GATES</div>
        <div class="item-desc">Steer the Commander left or right across the 3D battlefield bridge. Pass through green/blue positive and multiplier gates (+5, +10, ×2, ×5) to expand the army up to 100+ soldiers. Shoot additive gates to increase their value dynamically!</div>
      </div>
      <div class="item-card" style="grid-column: 1 / -1;">
        <div class="item-title">2. CONTROLS (MOBILE & DESKTOP)</div>
        <div class="item-desc">Mobile: Swipe Left/Right to steer, Swipe Up or tap JUMP to leap over hazards, and tap AIRSTRIKE for orbital support. Desktop: Use A/D or Left/Right Arrows to steer, W/Up Arrow to jump, Spacebar for Airstrike, and ESC to pause.</div>
      </div>
      <div class="item-card" style="grid-column: 1 / -1;">
        <div class="item-title">3. WEAPONS, UPGRADES & BOSSES</div>
        <div class="item-desc">Earn coins from enemies, bosses, daily missions, and achievements to unlock 8 unique Commanders, 10 Weapons (each upgradable across 7 visual and performance tiers), and permanent Squad Upgrades.</div>
      </div>
    `;
  }
}
