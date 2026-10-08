// Usage: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=$(npm root -g) node scripts/screenshots.mjs [baseUrl]
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
import fs from "fs";

const base = process.argv[2] ?? "http://localhost:3100";
fs.mkdirSync("shots", { recursive: true });
const jobs = [
  ["customer", "thabo@facepay.demo", "/customer"],
  ["merchant", "owner@abcstore.demo", "/merchant"],
  ["admin", "ops@facepay.demo", "/admin"],
  ["super", "super@facepay.demo", "/super"],
];
const browser = await chromium.launch();
for (const [name, email, path] of jobs) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await page.fill("#email", email);
  await page.fill("#password", "facepay-demo");
  await Promise.all([page.waitForURL("**" + path), page.click("button[type=submit]")]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/${name}.png`, fullPage: false });
  console.log("shot", name, page.url());
  await ctx.close();
}
await browser.close();
