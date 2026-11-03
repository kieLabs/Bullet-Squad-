import { StorageManager } from './storage.js';
import { SettingsManager } from './settings.js';
import { AudioManager } from './audio.js';
import { UpgradesManager } from './upgrades.js';
import { MissionsManager } from './missions.js';
import { UIManager } from './ui.js';
import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const storage = new StorageManager();
  const settings = new SettingsManager(storage);
  const audio = new AudioManager(settings);
  const upgrades = new UpgradesManager(storage);
  const missions = new MissionsManager(storage);

  const canvas = document.getElementById('game-canvas');
  const game = new Game({
    canvas,
    storage,
    settings,
    audio,
    upgrades,
    missions
  });

  const ui = new UIManager({
    game,
    storage,
    settings,
    audio,
    upgrades,
    missions
  });

  game.setUI(ui);
  game.init();
  ui.refreshAll();

  const unlockAudio = () => {
    audio.unlock();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
});