// sound.js — the whole soundscape, synthesised with WebAudio.
//
// No audio files: footsteps are filtered noise ticks, the suspicion
// sting is a rising blip, pickups are sine chimes. Guard footsteps are
// panned and faded by where the guard is relative to the thief, so your
// ears tell you where a patrol is before your eyes do — keep them open.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.lastTickAt = 0;
  }

  // ensure builds the context on the first user gesture that asks for
  // sound; browsers refuse to start audio before one.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return true;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // route plugs a chain into the master bus, through a stereo panner
  // when the browser offers one.
  route(input, gain, pan) {
    input.connect(gain);
    if (pan !== 0 && this.context.createStereoPanner) {
      const panner = this.context.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
  }

  // tone plays a single oscillator note with a quick attack and an
  // exponential fall; slideTo bends its pitch across the note.
  tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.2, slideTo = null, delay = 0, pan = 0 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    this.route(osc, gain, pan);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  // noiseBurst plays a short filtered noise tick — the footstep sound.
  noiseBurst({ dur = 0.05, vol = 0.15, freq = 900, pan = 0 }) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime;
    const count = Math.max(1, Math.floor(this.context.sampleRate * dur));
    const buffer = this.context.createBuffer(1, count, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / count);
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.context.createGain();
    gain.gain.value = vol;
    source.connect(filter);
    this.route(filter, gain, pan);
    source.start(start);
  }

  thiefStep(sneaking) {
    const soft = sneaking ? 0.03 : 0.10;
    const pitch = sneaking ? 600 : 850;
    this.noiseBurst({
      dur: 0.045,
      vol: soft,
      freq: pitch,
    });
  }

  guardStep(volume, pan) {
    if (volume <= 0.01) return;
    this.noiseBurst({
      dur: 0.06,
      vol: volume * 0.22,
      freq: 420,
      pan,
    });
  }

  // suspicionTick is the rising warning while a guard's meter climbs;
  // its pitch follows the highest suspicion in the room, throttled so
  // it never becomes a drone.
  suspicionTick(level) {
    const now = performance.now();
    if (now - this.lastTickAt < 170) return;
    this.lastTickAt = now;
    this.tone({
      freq: 500 + level * 500,
      dur: 0.07,
      type: 'triangle',
      vol: 0.05 + level * 0.06,
    });
  }

  // shout: two saws a fifth apart, the second a beat behind.
  shout() {
    this.tone({
      freq: 220, dur: 0.28, type: 'sawtooth', vol: 0.16, slideTo: 440,
    });
    this.tone({
      freq: 277, dur: 0.28, type: 'square', vol: 0.07, slideTo: 554, delay: 0.02,
    });
  }

  alarmBeep() {
    this.tone({
      freq: 880, dur: 0.11, type: 'square', vol: 0.06,
    });
    this.tone({
      freq: 660, dur: 0.11, type: 'square', vol: 0.06, delay: 0.14,
    });
  }

  pickup() {
    this.tone({
      freq: 880, dur: 0.09, type: 'sine', vol: 0.14,
    });
    this.tone({
      freq: 1318, dur: 0.14, type: 'sine', vol: 0.12, delay: 0.06,
    });
  }

  // A little arpeggio, one note at a time, for the target and the win.
  playArpeggio(notes, dur, gap) {
    let i = 0;
    for (const freq of notes) {
      this.tone({
        freq, dur, type: 'triangle', vol: 0.13, delay: i * gap,
      });
      i++;
    }
  }

  targetPickup() {
    this.playArpeggio([523, 659, 784, 1046], 0.16, 0.07);
  }

  caught() {
    this.tone({
      freq: 196, dur: 0.4, type: 'sawtooth', vol: 0.16, slideTo: 65,
    });
    this.noiseBurst({
      dur: 0.2, vol: 0.14, freq: 300,
    });
  }

  clearJingle() {
    this.playArpeggio([392, 523, 659, 784], 0.22, 0.09);
  }

  click() {
    this.tone({
      freq: 660, dur: 0.05, type: 'triangle', vol: 0.08,
    });
  }
}
