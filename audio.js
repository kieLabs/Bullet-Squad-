export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.noiseBuffer = null;
    this.gritBuffer = null;
    this.musicTimer = null;
    this.currentMusicTrack = null;
    this.stepIndex = 0;

    this.settings.onChange(() => {
      if (!this.settings.state.music) {
        this.stopMusic();
      } else if (this.currentMusicTrack && !this.musicTimer) {
        this.playMusic(this.currentMusicTrack);
      }
    });
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.buildNoiseBuffers();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.settings.state.music && !this.musicTimer) {
      this.playMusic(this.currentMusicTrack || 'menu');
    }
  }

  buildNoiseBuffers() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, sr, sr);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < sr; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.gritBuffer = this.ctx.createBuffer(1, sr, sr);
    const gritData = this.gritBuffer.getChannelData(0);
    const grit = 4;
    for (let i = 0; i < sr; i += grit) {
      const val = Math.random() * 2 - 1;
      for (let j = 0; j < grit && i + j < sr; j++) {
        gritData[i + j] = val;
      }
    }
  }

  getGain(multiplier = 1.0) {
    if (!this.ctx || !this.settings.state.sound) return null;
    const gain = this.ctx.createGain();
    const vol = Math.max(0.0001, this.settings.state.masterVolume * multiplier);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.connect(this.ctx.destination);
    return gain;
  }

  playTone(freq, endFreq, duration, type = 'sine', vol = 0.25) {
    if (!this.ctx || !this.settings.state.sound) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.getGain(vol);
    if (!gain) return;

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  playNoise(duration, filterFreq = 900, filterType = 'lowpass', useGrit = false, vol = 0.3) {
    if (!this.ctx || !this.settings.state.sound || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = useGrit ? this.gritBuffer : this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterFreq * 0.2), now + duration);

    const gain = this.getGain(vol);
    if (!gain) return;
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    src.start(now);
    src.stop(now + duration + 0.01);
  }

  playSfx(name) {
    if (!this.ctx || !this.settings.state.sound) return;
    switch (name) {
      case 'gun_fire':
        this.playNoise(0.07, 1400, 'bandpass', false, 0.18);
        this.playTone(190, 55, 0.06, 'triangle', 0.16);
        break;
      case 'minigun_fire':
        this.playNoise(0.045, 2100, 'bandpass', true, 0.15);
        this.playTone(260, 90, 0.04, 'sawtooth', 0.12);
        break;
      case 'laser_fire':
        this.playTone(1100, 220, 0.11, 'sawtooth', 0.18);
        break;
      case 'bullet_impact':
        this.playNoise(0.035, 900, 'lowpass', false, 0.1);
        break;
      case 'enemy_hit':
        this.playTone(140, 75, 0.05, 'square', 0.12);
        break;
      case 'enemy_defeat':
        this.playTone(240, 65, 0.12, 'sawtooth', 0.18);
        this.playNoise(0.09, 650, 'lowpass', true, 0.15);
        break;
      case 'soldier_run':
        this.playNoise(0.025, 420, 'lowpass', false, 0.06);
        break;
      case 'soldier_join':
        this.playTone(440, 880, 0.14, 'triangle', 0.22);
        break;
      case 'gate_positive':
        this.playTone(523.25, 1046.5, 0.22, 'sine', 0.28);
        break;
      case 'gate_negative':
        this.playTone(300, 110, 0.25, 'sawtooth', 0.28);
        break;
      case 'coin':
        this.playTone(987.77, 1318.5, 0.12, 'sine', 0.22);
        break;
      case 'weapon_upgrade':
        this.playTone(440, 880, 0.12, 'triangle', 0.25);
        setTimeout(() => this.playTone(659.25, 1318.5, 0.18, 'triangle', 0.25), 90);
        break;
      case 'powerup':
        this.playTone(392, 784, 0.15, 'sine', 0.25);
        setTimeout(() => this.playTone(587.33, 1174.66, 0.2, 'sine', 0.25), 100);
        break;
      case 'boss_appear':
        this.playTone(110, 45, 0.65, 'sawtooth', 0.38);
        this.playNoise(0.5, 350, 'lowpass', true, 0.3);
        break;
      case 'boss_attack':
        this.playTone(160, 50, 0.35, 'square', 0.32);
        this.playNoise(0.3, 600, 'lowpass', true, 0.28);
        break;
      case 'explosion':
        this.playNoise(0.48, 480, 'lowpass', true, 0.42);
        this.playTone(120, 30, 0.45, 'triangle', 0.35);
        break;
      case 'click':
        this.playTone(1174.66, 1174.66, 0.025, 'sine', 0.15);
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5].forEach((n, idx) => {
          setTimeout(() => this.playTone(n, n, 0.2, 'triangle', 0.26), idx * 110);
        });
        break;
      case 'gameover':
        [392.0, 349.23, 329.63, 261.63].forEach((n, idx) => {
          setTimeout(() => this.playTone(n, n * 0.92, 0.26, 'sawtooth', 0.24), idx * 140);
        });
        break;
    }
  }

  playMusic(track = 'menu') {
    this.currentMusicTrack = track;
    this.stopMusic();
    if (!this.ctx || !this.settings.state.music) return;

    const patterns = {
      menu: { tempo: 420, notes: [110, 130.81, 146.83, 164.81, 146.83, 130.81] },
      battle: { tempo: 240, notes: [146.83, 146.83, 174.61, 196.0, 146.83, 220.0, 196.0, 174.61] },
      intense: { tempo: 190, notes: [164.81, 196.0, 220.0, 246.94, 220.0, 196.0, 164.81, 146.83] },
      boss: { tempo: 170, notes: [98.0, 103.83, 98.0, 116.54, 98.0, 130.81, 123.47, 103.83] }
    };

    const active = patterns[track] || patterns.menu;
    this.stepIndex = 0;

    this.musicTimer = setInterval(() => {
      if (!this.ctx || !this.settings.state.music || this.ctx.state !== 'running') return;
      const freq = active.notes[this.stepIndex % active.notes.length];
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const vol = Math.max(0.0001, this.settings.state.masterVolume * 0.075);

      osc.type = track === 'boss' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (active.tempo / 1000) * 0.9);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + (active.tempo / 1000));

      this.stepIndex++;
    }, active.tempo);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}