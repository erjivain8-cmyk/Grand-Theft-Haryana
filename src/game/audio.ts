import { RadioStationId, VehicleType } from './types';

export class HaryanaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private radioGain: GainNode | null = null;
  private radioStation: RadioStationId = 'off';
  private radioTimer: number | null = null;
  private radioStep = 0;

  private muted = false;
  private unlocked = false;

  public unlock(): void {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.45;
    this.masterGain.connect(this.ctx.destination);

    // Engine rig
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 180;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 48;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 96;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Radio bus
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.value = 0.34;
    this.radioGain.connect(this.masterGain);

    this.unlocked = true;
    if (this.radioStation !== 'off') {
      this.startRadioLoop();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(inVehicle: boolean, vehicleType: VehicleType | null, speedRatio: number, throttle: boolean): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const now = this.ctx.currentTime;
    if (!inVehicle || !vehicleType) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    let baseFreq = 46;
    let maxFreq = 148;
    let filterMax = 520;
    let gainLevel = throttle ? 0.22 : 0.12;

    if (vehicleType === 'bike') {
      baseFreq = 38;
      maxFreq = 165;
      filterMax = 680;
      gainLevel = throttle ? 0.25 : 0.13;
    } else if (vehicleType === 'tractor') {
      baseFreq = 28;
      maxFreq = 82;
      filterMax = 340;
      gainLevel = throttle ? 0.28 : 0.16;
    } else if (vehicleType === 'auto') {
      baseFreq = 62;
      maxFreq = 190;
      filterMax = 740;
      gainLevel = throttle ? 0.19 : 0.1;
    }

    const rpmFreq = baseFreq + (maxFreq - baseFreq) * Math.min(1, Math.abs(speedRatio) * 0.85 + (throttle ? 0.18 : 0));
    this.engineOsc1.frequency.setTargetAtTime(rpmFreq, now, 0.06);
    this.engineOsc2.frequency.setTargetAtTime(rpmFreq * 1.98, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(160 + filterMax * Math.min(1, Math.abs(speedRatio) + 0.15), now, 0.08);
    this.engineGain.gain.setTargetAtTime(gainLevel, now, 0.08);
  }

  public playHorn(vehicleType: VehicleType | null): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted) return;

    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.28, now + 0.02);
    g.gain.setValueAtTime(0.26, now + 0.22);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    g.connect(this.masterGain);

    const f1 = vehicleType === 'tractor' ? 245 : vehicleType === 'bike' ? 420 : vehicleType === 'auto' ? 480 : 330;
    const f2 = vehicleType === 'tractor' ? 305 : vehicleType === 'bike' ? 425 : vehicleType === 'auto' ? 590 : 415;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(f1, now);
    osc2.frequency.setValueAtTime(f2, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 850;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(g);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.38);
    osc2.stop(now + 0.38);
  }

  public playMissionChime(completed = false): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const notes = completed ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.38);
    });
  }

  public setRadioStation(station: RadioStationId): void {
    this.radioStation = station;
    this.stopRadioLoop();
    if (station !== 'off') {
      this.unlock();
      this.startRadioLoop();
    }
  }

  public getRadioStation(): RadioStationId {
    return this.radioStation;
  }

  private stopRadioLoop(): void {
    if (this.radioTimer !== null) {
      window.clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
  }

  private startRadioLoop(): void {
    if (!this.ctx || !this.radioGain) return;
    this.radioStep = 0;
    const tempoMs = this.radioStation === 'desi_bass' ? 140 : this.radioStation === 'ragni' ? 175 : 220;

    this.radioTimer = window.setInterval(() => {
      if (!this.ctx || !this.radioGain || this.muted || this.radioStation === 'off') return;
      const now = this.ctx.currentTime;
      const step = this.radioStep % 16;
      this.radioStep++;

      // Dhol / Kick drum on rhythmic pattern
      const kickPattern =
        this.radioStation === 'desi_bass'
          ? [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0]
          : this.radioStation === 'ragni'
            ? [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1]
            : [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];

      if (kickPattern[step]) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(this.radioStation === 'ragni' ? 135 : 110, now);
        kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        kickGain.gain.setValueAtTime(0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        kickOsc.connect(kickGain);
        kickGain.connect(this.radioGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.2);
      }

      // Snare / Dholak high slap
      if (step % 4 === 2) {
        const slapOsc = this.ctx.createOscillator();
        const slapGain = this.ctx.createGain();
        slapOsc.type = 'triangle';
        slapOsc.frequency.setValueAtTime(this.radioStation === 'ragni' ? 420 : 280, now);
        slapOsc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
        slapGain.gain.setValueAtTime(0.16, now);
        slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        slapOsc.connect(slapGain);
        slapGain.connect(this.radioGain);
        slapOsc.start(now);
        slapOsc.stop(now + 0.1);
      }

      // Melodic lead (Tumbi / Harmonium / Cyber Synth)
      const ragniScale = [293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63];
      const desiBassNotes = [146.83, 146.83, 174.61, 146.83, 196.0, 174.61, 146.83, 130.81];
      const cyberChords = [220.0, 261.63, 329.63, 392.0, 293.66, 349.23, 440.0, 329.63];

      if (step % 2 === 0) {
        const idx = (step / 2) % 8;
        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();

        if (this.radioStation === 'ragni') {
          melOsc.type = 'triangle';
          melOsc.frequency.setValueAtTime(ragniScale[idx], now);
          melGain.gain.setValueAtTime(0.14, now);
          melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        } else if (this.radioStation === 'desi_bass') {
          melOsc.type = 'sawtooth';
          melOsc.frequency.setValueAtTime(desiBassNotes[idx] * 2, now);
          melGain.gain.setValueAtTime(0.1, now);
          melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        } else {
          melOsc.type = 'sine';
          melOsc.frequency.setValueAtTime(cyberChords[idx], now);
          melGain.gain.setValueAtTime(0.12, now);
          melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        }

        melOsc.connect(melGain);
        melGain.connect(this.radioGain);
        melOsc.start(now);
        melOsc.stop(now + 0.36);
      }
    }, tempoMs);
  }

  public dispose(): void {
    this.stopRadioLoop();
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      void this.ctx?.close();
    } catch {
      // ignore cleanup errors
    }
    this.ctx = null;
    this.unlocked = false;
  }
}
