import express from "express";
import { chromium } from "playwright-core";
import chromiumBinary from "@sparticuz/chromium";

const app = express();

app.get("/price", async (req, res) => {
  let browser;

  try {
    console.log("Starting Chromium...");

    browser = await chromium.launch({
      args: chromiumBinary.args,
      executablePath: await chromiumBinary.executablePath(),
      headless: true,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://coinmarketcap.com/currencies/meowcoin/", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    // Live price selector
    const selector = 'span[data-test="text-cdp-price-display"]';

    // Wait until element exists
    await page.waitForSelector(selector, { timeout: 15000 });

    // Initial stale price
    let initial = (await page.textContent(selector)).trim();
    initial = initial.replace(/^\$/, "");
    console.log("Initial stale price:", initial);

    // Wait for price to update
    let updated = initial;
    const maxWait = 7000;
    const step = 500;
    let waited = 0;

    while (waited < maxWait) {
      await page.waitForTimeout(step);
      waited += step;

      let current = (await page.textContent(selector)).trim();
      current = current.replace(/^\$/, "");

      if (current !== initial) {
        updated = current;
        break;
      }
    }

    console.log("Updated real price:", updated);

    return res.json({ updated });

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
