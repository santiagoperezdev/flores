import { AudioManager } from './audio.js';
import { WorldScene } from './scene.js';

class App {
  constructor() {
    this.audio = new AudioManager();
    this.container = document.getElementById('canvas-container');
    this.scene = new WorldScene(this.container, this.audio);

    this.checkPersonalName();
    this.initUI();
  }

  checkPersonalName() {
    // Optional name personalization via URL (e.g. ?para=Camila or ?to=Camila)
    const params = new URLSearchParams(window.location.search);
    const name = params.get('para') || params.get('to') || params.get('nombre');
    if (name) {
      const line1 = document.querySelector('.poetry-line.line-1');
      if (line1) {
        line1.textContent = `te amo, ${name}`;
      }
    }
  }

  initUI() {
    const introOverlay = document.getElementById('intro-overlay');
    const audioBtn = document.getElementById('audio-toggle');
    const line1 = document.querySelector('.poetry-line.line-1');
    const line2 = document.querySelector('.poetry-line.line-2');
    const line3 = document.querySelector('.poetry-line.line-3');

    // Start Experience on touching screen anywhere
    const startJourney = () => {
      introOverlay.classList.add('hidden');
      this.audio.play();
      if (audioBtn) audioBtn.classList.add('playing', 'active');
      this.scene.startExperience();

      // Poetic cadence animation matching Francés Limón melody intro
      setTimeout(() => { if (line1) line1.classList.add('show'); }, 2200);
      setTimeout(() => { if (line2) line2.classList.add('show'); }, 4400);
      setTimeout(() => { if (line3) line3.classList.add('show'); }, 6600);
    };

    if (introOverlay) {
      introOverlay.addEventListener('click', startJourney, { once: true });
    }

    // Audio Toggle (Francés Limón)
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isPlaying = this.audio.toggle();
        if (isPlaying) {
          audioBtn.classList.add('playing', 'active');
        } else {
          audioBtn.classList.remove('playing', 'active');
        }
      });
    }
  }
}

// Bootstrap once DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
