/**
 * Audio Engine with "Francés Limón - Enjambre" in continuous loop
 * and Web Audio API analyser for visual sound responsiveness.
 * Includes procedural music box as an automatic fallback.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.masterGain = null;
    this.reverbNode = null;
    this.analyser = null;
    this.dataArray = null;
    this.melodyTimer = null;
    this.usingCustomAudio = true;
    this.mediaSourceConnected = false;

    // Load "Francés Limón" audio track in loop
    this.customAudio = new Audio('assets/frances-limon.mp3');
    this.customAudio.loop = true;
    this.customAudio.preload = 'auto';

    this.customAudio.addEventListener('canplaythrough', () => {
      this.usingCustomAudio = true;
    });

    this.customAudio.addEventListener('error', (e) => {
      console.warn('Could not load custom audio, falling back to procedural music:', e);
      this.usingCustomAudio = false;
    });
  }

  initContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

      // Analyser for visual reactions (flowers/particles beat detection)
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Reverb simulation (for procedural fallback)
      this.reverbNode = this.createImpulseReverb(2.5, 2.0);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Route HTML audio through Web Audio graph for frequency analysis
      if (this.customAudio && !this.mediaSourceConnected) {
        try {
          const source = this.ctx.createMediaElementSource(this.customAudio);
          source.connect(this.masterGain);
          this.mediaSourceConnected = true;
        } catch (err) {
          console.warn('createMediaElementSource notice (playing directly):', err);
        }
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createImpulseReverb(duration, decay) {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const factor = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;
    convolver.connect(this.masterGain);
    return convolver;
  }

  // Play a delicate, bell-like music box note (Procedural Fallback)
  playBellNote(freq, timeOffset = 0, duration = 2.2, velocity = 0.28) {
    if (!this.ctx || this.isMuted) return;

    const startTime = this.ctx.currentTime + timeOffset;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, startTime);

    const osc3 = this.ctx.createOscillator();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(freq * 0.5, startTime);

    const noteGain = this.ctx.createGain();
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(velocity, startTime + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(velocity * 0.4, startTime + 0.25);
    noteGain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, startTime);
    filter.frequency.exponentialRampToValueAtTime(900, startTime + duration);

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    osc3.connect(noteGain);
    noteGain.connect(filter);

    filter.connect(this.masterGain);
    filter.connect(this.reverbNode);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + duration + 0.1);
    osc2.stop(startTime + duration + 0.1);
    osc3.stop(startTime + duration + 0.1);
  }

  startProceduralMusic() {
    const NOTES = {
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
      C6: 1046.50
    };

    const phrases = [
      { bass: NOTES.F4 * 0.5, arps: [NOTES.C4, NOTES.F4, NOTES.A4, NOTES.C5], melody: [NOTES.A5, NOTES.G5, NOTES.F5] },
      { bass: NOTES.G4 * 0.5, arps: [NOTES.D4, NOTES.G4, NOTES.B4, NOTES.D5], melody: [NOTES.B5, NOTES.C6, NOTES.B5] },
      { bass: NOTES.E4 * 0.5, arps: [NOTES.B4, NOTES.E4, NOTES.G4, NOTES.B4], melody: [NOTES.G5, NOTES.E5, NOTES.G5] },
      { bass: NOTES.A4 * 0.5, arps: [NOTES.C4, NOTES.E4, NOTES.A4, NOTES.C5], melody: [NOTES.E5, NOTES.D5, NOTES.C5] },
      { bass: NOTES.D4 * 0.5, arps: [NOTES.F4, NOTES.A4, NOTES.D5, NOTES.F5], melody: [NOTES.F5, NOTES.G5, NOTES.A5] },
      { bass: NOTES.G4 * 0.5, arps: [NOTES.F4, NOTES.G4, NOTES.B4, NOTES.D5], melody: [NOTES.B5, NOTES.A5, NOTES.G5] },
      { bass: NOTES.C4 * 0.5, arps: [NOTES.E4, NOTES.G4, NOTES.C5, NOTES.E5], melody: [NOTES.C6, null, NOTES.G5] },
      { bass: NOTES.C4 * 0.5, arps: [NOTES.G4, NOTES.C5, NOTES.E5, NOTES.G5], melody: [NOTES.E5, NOTES.D5, NOTES.C5] }
    ];

    let currentMeasure = 0;
    const stepTime = 380;

    const playLoop = () => {
      if (!this.isPlaying) return;

      const measure = phrases[currentMeasure % phrases.length];
      this.playBellNote(measure.bass, 0, 3.2, 0.35);

      measure.arps.forEach((n, idx) => {
        if (n) this.playBellNote(n, (idx * stepTime) / 1000, 2.0, 0.16);
      });

      measure.melody.forEach((m, idx) => {
        if (m) this.playBellNote(m, (idx * stepTime * 1.33) / 1000 + 0.1, 2.4, 0.28);
      });

      currentMeasure++;
      this.melodyTimer = setTimeout(playLoop, stepTime * 4);
    };

    playLoop();
  }

  play() {
    this.initContext();
    this.isPlaying = true;

    if (this.usingCustomAudio && this.customAudio) {
      this.customAudio.currentTime = 0;
      this.customAudio.play().catch((err) => {
        console.warn('Playback error, using fallback:', err);
        this.usingCustomAudio = false;
        this.startProceduralMusic();
      });
    } else {
      this.startProceduralMusic();
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.melodyTimer) {
      clearTimeout(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.customAudio) {
      this.customAudio.pause();
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  getAudioIntensity() {
    if (!this.analyser || !this.isPlaying || this.isMuted) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += this.dataArray[i];
    }
    return sum / (8 * 255); // normalized 0..1
  }
}
