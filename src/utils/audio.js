/**
 * Utility to generate tactical sounds without external mp3 files.
 * Uses Web Audio API.
 */

let audioCtx = null;

const getAudioCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

// Tactical Beep for notifications
export const playNotificationBeep = () => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
  osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); 

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
};

// Bio-Security Persistent Alarm
export const createAlarm = (freq = 440) => {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth"; // More aggressive for alarms
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  
  osc.connect(gain);
  gain.connect(ctx.destination);

  return {
    start: () => osc.start(),
    stop: () => {
      try { osc.stop(); } catch(e) {}
    }
  };
};
