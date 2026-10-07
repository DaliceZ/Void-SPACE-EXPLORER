import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(process.env.VOID_URL || "http://localhost:5174");
await page.getByRole("button", { name: "NEW UNIVERSE" }).click();
await page.getByRole("button", { name: "BEGIN EXPEDITION" }).click();
await page.waitForTimeout(700);
await page.keyboard.press("l");
await page
  .getByRole("button", { name: "E · EXIT SHIP" })
  .waitFor({ timeout: 60000 });
await page.screenshot({ path: "test-results/v2-landed.png" });
await page.keyboard.press("e");
await page.waitForFunction(() =>
  document.querySelector(".flight-top")?.textContent.includes("ON FOOT"),
);
const first = await page.evaluate(async () => {
  const { flight } = await import("/src/game/runtime.ts");
  return flight.position.toArray();
});
await page.keyboard.down("w");
await page.waitForTimeout(5000);
await page.keyboard.up("w");
await page.keyboard.press("Space");
await page.waitForTimeout(1500);
await page.screenshot({ path: "test-results/v2-foot.png" });
await page.keyboard.press("Escape");
const save = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("void.expedition.v1")),
);
assert.equal(save.version, 2);
assert.equal(save.expansion.mode, "foot");
assert(Math.hypot(...save.position.map((v, i) => v - first[i])) > 0.1);
await page.reload();
await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).click();
await page.waitForTimeout(1200);
assert((await page.locator(".flight-top").textContent()).includes("ON FOOT"));
await page.keyboard.press("e");
await page
  .getByRole("button", { name: "L · LAUNCH" })
  .waitFor({ timeout: 6000 });
await page.keyboard.press("l");
await page.waitForTimeout(700);
assert(
  (await page.locator(".landing-prompt").textContent()).includes(
    "SURFACE NAVIGATION",
  ),
);
console.log(
  JSON.stringify({
    walked: first.map((v, i) => save.position[i] - v),
    saveVersion: save.version,
    errors,
  }),
);
await browser.close();
assert.deepEqual(errors, []);

