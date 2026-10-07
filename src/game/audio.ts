let context: AudioContext | undefined,
  engine: OscillatorNode | undefined,
  gain: GainNode | undefined;
let voices = 0,
  noise: AudioBuffer | undefined,
  miningTone: OscillatorNode | undefined,
  miningGain: GainNode | undefined;
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

export function feedbackSound(
  source: string,
  pitch: number,
  force: number,
  volume: number,
) {
  if (!context || context.state !== "running" || volume <= 0 || voices >= 8)
    return;
  const tonal = ["scan", "collect", "discovery", "creature", "boost"].includes(
      source,
    ),
    t = context.currentTime;
  const duration =
    source === "step"
      ? 0.09
      : source === "mining"
        ? 0.055
        : source === "creature"
          ? 0.35
          : 0.24;
  const g = context.createGain(),
    filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = tonal ? pitch * 2 : pitch;
  filter.Q.value = 0.7;
  g.gain.setValueAtTime(Math.min(0.16, volume * 0.12 * force), t);
  g.gain.exponentialRampToValueAtTime(0.00001, t + duration);
  g.connect(context.destination);
  filter.connect(g);
  let node: AudioScheduledSourceNode;
  if (tonal) {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(
      pitch * (source === "collect" ? 1.8 : 0.7),
      t + duration,
    );
    node = osc;
  } else {
    if (!noise) {
      noise = context.createBuffer(
        1,
        context.sampleRate * 0.5,
        context.sampleRate,
      );
      const a = noise.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    const s = context.createBufferSource();
    s.buffer = noise;
    node = s;
  }
  node.connect(filter);
  node.start(t);
  node.stop(t + duration);
  voices++;
  node.onended = () => {
    voices--;
    node.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}
export function miningAudio(power: number, pitch: number, volume: number) {
  if (!context) return;
  if (!miningTone) {
    miningTone = context.createOscillator();
    miningGain = context.createGain();
    miningTone.type = "triangle";
    miningGain.gain.value = 0;
    miningTone.connect(miningGain).connect(context.destination);
    miningTone.start();
  }
  miningGain!.gain.setTargetAtTime(
    power * volume * 0.035,
    context.currentTime,
    0.035,
  );
  miningTone.frequency.setTargetAtTime(
    90 + pitch * 0.14 + power * 50,
    context.currentTime,
    0.05,
  );
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
