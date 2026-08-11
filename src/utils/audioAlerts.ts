/**
 * Audio synthesis and spoken voice announcements for Penny Ante Poker Club.
 * Uses Web Audio API for harmonic chimes and Web Speech API for voice.
 */

export interface AudioSettings {
  voiceEnabled: boolean;
  chimesEnabled: boolean;
  volume: number; // 0.0 to 1.0
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  voiceEnabled: true,
  chimesEnabled: true,
  volume: 0.85
};

const getAudioContext = (): AudioContext | null => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
};

/**
 * 4-tone rising announcement chime for table rebalancing & consolidations (D5, F#5, A5, D6).
 */
export const playTableBalanceAlertSound = (volumeMultiplier: number = 1) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, duration: 0.15 },
      { freq: 739.99, start: 0.12, duration: 0.18 },
      { freq: 880.00, start: 0.24, duration: 0.22 },
      { freq: 1174.66, start: 0.38, duration: 0.55 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      const targetGain = 0.35 * volumeMultiplier;
      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetGain), now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
    });
  } catch (err) {
    console.warn('Table balance chime error:', err);
  }
};

/**
 * 3-tone chime for Blind Level Up / Next Round (G5, B5, D6).
 */
export const playBlindLevelUpSound = (volumeMultiplier: number = 1) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { freq: 783.99, start: 0, duration: 0.18 },
      { freq: 987.77, start: 0.14, duration: 0.22 },
      { freq: 1174.66, start: 0.28, duration: 0.65 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      const targetGain = 0.4 * volumeMultiplier;
      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetGain), now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
    });
  } catch (err) {
    console.warn('Blind level up sound error:', err);
  }
};

/**
 * 2-tone gentle chime for 1-minute remaining warning (A5, E6).
 */
export const playOneMinuteWarningChime = (volumeMultiplier: number = 1) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { freq: 880.00, start: 0, duration: 0.25 },
      { freq: 1318.51, start: 0.18, duration: 0.55 }
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      const targetGain = 0.3 * volumeMultiplier;
      gain.gain.setValueAtTime(0.001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetGain), now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
    });
  } catch (err) {
    console.warn('1-minute warning chime error:', err);
  }
};

/**
 * Speaks an announcement aloud using the browser's speech synthesis engine.
 */
export const speakAnnouncement = (
  text: string,
  options?: { enabled?: boolean; volume?: number; rate?: number }
) => {
  if (!('speechSynthesis' in window)) return;
  if (options?.enabled === false) return;

  try {
    window.speechSynthesis.cancel(); // Cancel any ongoing speech to avoid backlog

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = options?.volume !== undefined ? options.volume : 0.9;
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Small delay to allow the chime to finish ringing before voice begins
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 450);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
};
