let context: AudioContext | undefined,
  engine: OscillatorNode | undefined,
  gain: GainNode | undefined;
export function activateAudio() {
  try {
    if (!context) {
      context = new AudioContext();
      engine = context.createOscillator();
      gain = context.createGain();
      engine.type = "sine";
      engine.frequency.value = 45;
      gain.gain.value = 0;
      engine.connect(gain).connect(context.destination);
      engine.start();
    }
    void context.resume().catch(() => {});
  } catch {
    /* silent fallback */
  }
}
export function updateAudio(speed: number, volume: number, active: boolean) {
  if (!context || !gain || !engine) return;
  gain.gain.setTargetAtTime(
    active ? volume * (0.025 + Math.min(speed / 6000, 0.5) * 0.06) : 0,
    context.currentTime,
    0.2,
  );
  engine.frequency.setTargetAtTime(
    38 + Math.min(speed, 6000) * 0.025,
    context.currentTime,
    0.15,
  );
}
export function chime(volume: number) {
  if (!context) return;
  for (let i = 0; i < 3; i++) {
    const osc = context.createOscillator(),
      g = context.createGain(),
      t = context.currentTime + i * 0.12;
    osc.frequency.value = [440, 554, 660][i];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * 0.12, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.00001, t + 0.6);
    osc.connect(g).connect(context.destination);
    osc.start(t);
    osc.stop(t + 0.7);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }
}
