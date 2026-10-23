/**
 * Audio helpers for DrishtiVaani
 * Handles 16kHz microphone capture for Gemini Live,
 * 24kHz PCM playback for Gemini Live responses,
 * and high-contrast accessibility sound cues.
 */

// Convert Float32Array from Web Audio to 16-bit PCM little-endian Base64
export function floatTo16BitPCMBase64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uint8 = new Uint8Array(int16Array.buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

// Play PCM 24kHz audio chunks in scheduled sequence
export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  // Must be called directly inside a user gesture (tap/click) to unlock browser audio
  public unlock() {
    try {
      this.initCtx();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
    }
  }

  private initCtx() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public playChunk(base64PCM: string) {
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const binaryStr = atob(base64PCM);
      let len = binaryStr.length;
      // 16-bit PCM requires even number of bytes
      if (len % 2 !== 0) {
        len -= 1;
      }
      if (len <= 0) return;

      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Convert 16-bit PCM to Float32 safely using DataView
      const sampleCount = len / 2;
      const float32 = new Float32Array(sampleCount);
      const dataView = new DataView(bytes.buffer, bytes.byteOffset, len);

      for (let i = 0; i < sampleCount; i++) {
        const intVal = dataView.getInt16(i * 2, true); // little-endian
        float32[i] = intVal / 32768.0;
      }

      const audioBuffer = this.audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx.destination);

      const currentTime = this.audioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05; // 50ms buffer
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSources.push(source);
      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(true);
      }

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0 && this.onPlaybackStateChange) {
          this.onPlaybackStateChange(false);
        }
      };
    } catch (err) {
      console.error('Error playing live audio chunk:', err);
    }
  }

  public stopAll() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore already stopped
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
  }

  public isPlaying(): boolean {
    return this.activeSources.length > 0;
  }
}

// Accessibility Sound Chimes
let sharedChimeCtx: AudioContext | null = null;
function getChimeCtx(): AudioContext {
  if (!sharedChimeCtx || sharedChimeCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedChimeCtx = new AudioCtx();
  }
  if (sharedChimeCtx.state === 'suspended') {
    sharedChimeCtx.resume().catch(() => {});
  }
  return sharedChimeCtx;
}

export function unlockAudioContext() {
  try {
    const ctx = getChimeCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (e) {
    // ignore
  }
}

export function playAccessibilityChime(type: 'start' | 'listen' | 'read' | 'detected' | 'modeSwitch' | 'error') {
  try {
    const ctx = getChimeCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);

    if (type === 'start') {
      // Warm welcoming two-tone (C5 -> G5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'listen') {
      // Crisp ping (A5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'read') {
      // Gentle reading sweep (D5 -> F#5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.linearRampToValueAtTime(739.99, now + 0.15);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'detected') {
      // Rapid double chirp for text in frame
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'modeSwitch') {
      // Ascending triple tone for mode switch
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.08);
      osc.frequency.setValueAtTime(659.25, now + 0.16);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'error') {
      // Low dual boop
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.2);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
}
