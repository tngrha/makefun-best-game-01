// Every sound in Emberfall is synthesised with WebAudio: short oscillator and
// filtered-noise blips for shots, hits, pickups and waves, and a slow generative
// ambient loop (a low drone under a pentatonic pluck pattern) while playing.
// No audio file is loaded, and nothing here runs until the first user gesture.
export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let step = 0;

  /** Pentatonic ladder the ambient plucks walk, in Hz. */
  const PLUCK_NOTES = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, duration, type, volume, slideTo) {
    if (!context || !master || muted) return;
    try {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, context.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + duration);
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(context.currentTime + duration + 0.02);
    } catch {
      // A sound that fails to play must never stop the game.
    }
  }

  function noise(duration, volume, cutoff) {
    if (!context || !master || muted) return;
    try {
      const length = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // As above: silence is better than a crash.
    }
  }

  function pluck() {
    if (!context || !master || muted) return;
    const note = PLUCK_NOTES[step % PLUCK_NOTES.length];
    step += 1;
    tone(note, 1.4, 'sine', 0.05);
    tone(note * 2, 0.7, 'triangle', 0.02);
    if (step % 5 === 0) tone(note / 2, 2.2, 'sine', 0.04);
  }

  return {
    /** Call from any user gesture: unlocks audio and starts the ambient loop. */
    unlock() {
      if (!ensure()) return;
      if (musicTimer !== null) return;
      try {
        const drone = context.createOscillator();
        const droneGain = context.createGain();
        drone.type = 'sine';
        drone.frequency.value = 55;
        droneGain.gain.value = 0.035;
        drone.connect(droneGain);
        droneGain.connect(master);
        drone.start();
        const fifth = context.createOscillator();
        const fifthGain = context.createGain();
        fifth.type = 'sine';
        fifth.frequency.value = 82.5;
        fifthGain.gain.value = 0.02;
        fifth.connect(fifthGain);
        fifthGain.connect(master);
        fifth.start();
      } catch {
        // The drone is decoration; the game plays on without it.
      }
      musicTimer = window.setInterval(pluck, 620);
    },
    shoot() {
      ensure();
      tone(720, 0.09, 'square', 0.06, 240);
    },
    hit() {
      noise(0.08, 0.12, 1800);
      tone(180, 0.08, 'triangle', 0.08, 90);
    },
    kill() {
      noise(0.16, 0.16, 1200);
      tone(320, 0.18, 'sawtooth', 0.07, 70);
    },
    pickup() {
      tone(880, 0.1, 'sine', 0.09, 1320);
    },
    hurt() {
      tone(140, 0.3, 'sawtooth', 0.14, 60);
      noise(0.2, 0.14, 700);
    },
    wave() {
      tone(392, 0.25, 'triangle', 0.1);
      window.setTimeout(() => tone(523.25, 0.35, 'triangle', 0.1), 140);
    },
    upgrade() {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.3, 'sine', 0.09), i * 90);
      });
    },
    gameOver() {
      [392, 329.63, 261.63, 196].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.5, 'triangle', 0.09), i * 220);
      });
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
