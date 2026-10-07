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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(process.env.VOID_URL || "http://localhost:5174");
await page.waitForTimeout(2500);
await page.screenshot({ path: "test-results/menu.png" });
await page.setViewportSize({ width: 1000, height: 700 });
await page.getByRole("button", { name: "NEW UNIVERSE" }).click();
await page.getByRole("button", { name: "BEGIN EXPEDITION" }).click();
await page.keyboard.down("w");
await page.waitForTimeout(1300);
await page.keyboard.up("w");
assert(
  Number(
    (await page.getByTestId("speed").textContent())
      .match(/[\d,]+/)[0]
      .replaceAll(",", ""),
  ) > 0,
  "ship accelerates",
);
await page.keyboard.press("f");
await page.waitForFunction(
  () =>
    JSON.parse(localStorage.getItem("void.expedition.v1") || "{}").discoveries
      ?.length === 1,
  {},
  { timeout: 60000 },
);
await page.screenshot({ path: "test-results/flight.png" });
await page.keyboard.press("Tab");
await page.waitForTimeout(300);
assert(
  await page.getByRole("heading", { name: "Discovery journal." }).isVisible(),
);
await page.getByRole("button", { name: "PLANETS", exact: true }).click();
assert(
  (await page.locator(".discovery-list article").count()) === 1,
  "scan records a discovery",
);
await page.screenshot({ path: "test-results/journal.png" });
const save = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("void.expedition.v1")),
);
assert(save.position[2] < 1900, "position saved after flying");
assert(save.discoveries.length === 1);
await page.reload();
await page.getByRole("button", { name: "CONTINUE EXPEDITION" }).click();
await page.keyboard.press("Tab");
await page.getByRole("button", { name: "PLANETS", exact: true }).click();
assert(
  (await page.locator(".discovery-list article").count()) === 1,
  "discovery persists",
);
await page.getByRole("button", { name: "RETURN TO FLIGHT" }).click();
await page.keyboard.press("Escape");
assert(await page.getByRole("heading", { name: "Take a breath." }).isVisible());
await page.getByRole("button", { name: /^SETTINGS/ }).click();
await page.getByLabel("GRAPHICS QUALITY").selectOption("1");
await page.getByRole("button", { name: "DONE" }).click();
await page.getByRole("button", { name: "RESUME FLIGHT" }).click();
await page.keyboard.press("F3");
assert(await page.locator(".debug").isVisible());
console.log(
  JSON.stringify({
    canvas: await page.locator("canvas").count(),
    savePosition: save.position,
    discoveries: save.discoveries.length,
    debug: await page.locator(".debug").textContent(),
    errors,
  }),
);
await page.setViewportSize({ width: 390, height: 844 });
assert((await page.getByText("The universe", { exact: false }).count()) > 0);
await page.screenshot({ path: "test-results/mobile.png" });
await browser.close();
if (errors.length) process.exit(1);
