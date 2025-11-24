import express from "express";
import { chromium } from 'playwright-core'
import chromiumBinary from '@sparticuz/chromium'
import { VercelResponse } from '@vercel/node';

const generateRandomUA = () => {
  // Array of random user agents
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
  ];
  // Get a random index based on the length of the user agents array
  const randomUAIndex = Math.floor(Math.random() * userAgents.length);
  // Return a random user agent using the index above
  return userAgents[randomUAIndex];
};

const app = express();

app.get("/price", async (req, res) => {
  response.setHeader('Cache-Control', 'public, s-maxage=1');
  // response.setHeader('Vercel-CDN-Cache-Control', 'max-age=1');
  // response.setHeader('CDN-Cache-Control', 'max-age=1');
  // response.setHeader('Cache-Control', 'max-age=1');
  const url = "https://coinmarketcap.com/currencies/meowcoin/";
  let browser, page;

  try {
    const browser = await chromium.launch({
            args: chromiumBinary.args,
            executablePath: await chromiumBinary.executablePath(),
            headless: true,
        });

    const context = await browser.newContext({
      userAgent: generateRandomUA(),
    });

    const page = await context.newPage();

    // Speed optimization
    await page.route("**", (route) => route.continue());

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Ensure parent section exists
    const parent = await page.waitForSelector("#section-coin-overview", {
      timeout: 30000,
    });

    // Try for 10 seconds to find the span inside the parent
    const price = await parent.evaluateHandle(async (section) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));

      for (let i = 0; i < 20; i++) {
        const el = section.querySelector(
          'span[data-test="text-cdp-price-display"]'
        );
        if (el) return el.textContent.trim();

        await wait(500); // retry
      }
      return null;
    });

    const value = await price.jsonValue();

    if (!value) {
      throw new Error("Price span not found inside #section-coin-overview");
    }

    res.json({ price: value });
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(500).json({ error: "Scraping failed", details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(3000, () => console.log("🚀 Running on http://localhost:3000"));
