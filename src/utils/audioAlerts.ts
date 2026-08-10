/**
 * Generates an instant, crisp harmonic chime using the Web Audio API without relying on external audio files.
 */
export const playTableBalanceAlertSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // 4-tone rising announcement chime: D5, F#5, A5, D6 (sustained bell chime)
    const notes = [
      { freq: 587.33, start: 0, duration: 0.15 },
      { freq: 739.99, start: 0.12, duration: 0.18 },
      { freq: 880.00, start: 0.24, duration: 0.22 },
      { freq: 1174.66, start: 0.38, duration: 0.55 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Rich, bell-like timbre
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      // Smooth attack & exponential decay
      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
    });
  } catch (err) {
    console.warn('Audio alert could not be played:', err);
  }
};
