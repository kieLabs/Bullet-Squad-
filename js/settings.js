export class SettingsManager {
  constructor(storage) {
    this.storage = storage;
    this.listeners = [];
  }

  get state() {
    return this.storage.data.settings;
  }

  set(key, value) {
    if (key in this.storage.data.settings) {
      this.storage.data.settings[key] = value;
      this.storage.save();
      this.notify();
    }
  }

  toggle(key) {
    if (typeof this.storage.data.settings[key] === 'boolean') {
      this.storage.data.settings[key] = !this.storage.data.settings[key];
      this.storage.save();
      this.notify();
    }
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      fn(this.state);
    }
  }

  vibrate(ms = 25) {
    if (this.state.vibration && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  }
}
