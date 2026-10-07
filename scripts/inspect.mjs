import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("ERROR", e.message, e.name, String(e)));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await page.goto("http://localhost:5174");
await page.waitForTimeout(3000);
console.log((await page.locator("body").innerText()).slice(0, 4000));
await page.screenshot({ path: "test-results/inspect.png" });
await browser.close();
