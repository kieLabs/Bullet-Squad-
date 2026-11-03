export class ControlsManager {
  constructor(canvas, settings, callbacks) {
    this.canvas = canvas;
    this.settings = settings;
    this.callbacks = callbacks;

    this.keys = { left: false, right: false };
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.callbacks.onJump();
      if (e.code === 'Space') {
        if (this.callbacks.isPlaying()) e.preventDefault();
        this.callbacks.onSpecial();
      }
      if (e.code === 'Escape') this.callbacks.onPauseToggle();
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.callbacks.isPlaying()) return;
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || !this.callbacks.isPlaying()) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      const sens = this.settings.state.sensitivity || 1.0;
      this.callbacks.onHorizontalDrag((dx / window.innerWidth) * 16.5 * sens);

      if (dy < -32) {
        this.callbacks.onJump();
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });
  }

  getKeyboardSteer() {
    let dir = 0;
    if (this.keys.left) dir -= 1;
    if (this.keys.right) dir += 1;
    return dir * (this.settings.state.sensitivity || 1.0);
  }
}
