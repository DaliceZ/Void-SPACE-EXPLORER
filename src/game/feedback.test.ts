import { describe, it, expect, beforeEach } from "vitest";
import { Vector3 } from "three";
import {
  feedback,
  impact,
  resetFeedback,
  createParticlePool,
  stepParticle,
  PARTICLE_LIMIT,
  resourceMaterial,
} from "./feedback";
describe("bounded physical feedback", () => {
  beforeEach(resetFeedback);
  it("bounds event bursts and keeps impact coordinates independent of moving actors", () => {
    const p = new Vector3(4, 5, 6);
    for (let i = 0; i < 200; i++)
      impact("mining", p, new Vector3(0, 1, 0), "stone", 8);
    p.set(0, 0, 0);
    expect(feedback.queue).toHaveLength(64);
    expect(feedback.queue[0].position.toArray()).toEqual([4, 5, 6]);
    expect(feedback.queue[0].force).toBe(3);
  });
  it("bounces short lived fragments above the contact plane and dissipates velocity", () => {
    const p = createParticlePool()[0];
    p.life = 2;
    p.age = 0;
    p.bounce = true;
    p.position.set(0, 0.01, 0);
    p.velocity.set(1, -2, 0);
    stepParticle(p, 0.05, new Vector3());
    expect(p.position.y).toBeGreaterThanOrEqual(0);
    expect(p.velocity.y).toBeGreaterThan(0);
    expect(p.velocity.length()).toBeLessThan(2);
  });
  it("attracts resource fragments and never grows the particle pool", () => {
    const pool = createParticlePool(),
      p = pool[0];
    p.age = 0.3;
    p.life = 1;
    p.collect = true;
    p.position.set(4, 0, 0);
    stepParticle(p, 0.05, new Vector3());
    expect(p.position.x).toBeLessThan(4);
    expect(pool).toHaveLength(PARTICLE_LIMIT);
  });
  it("maps organic harvesting separately from metallic sparks", () => {
    expect(resourceMaterial("mycel")).toBe("organic");
    expect(resourceMaterial("veyrite")).toBe("metal");
    expect(resourceMaterial("rime")).toBe("ice");
  });
});
