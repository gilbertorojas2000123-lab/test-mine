import express from "express";
import { chromium } from 'playwright-core'
import chromiumBinary from '@sparticuz/chromium'

export default async function handler(req, res) {
  pkg.setHeader("Cache-Control", "no-store");
  pkg.setHeader("CDN-Cache-Control", "no-store");
  pkg.setHeader("Vercel-CDN-Cache-Control", "no-store");

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
      waitUntil: "networkidle",
    });

    await page.waitForSelector('span[data-test="text-cdp-price-display"]');

    const price = await page.$eval(
      'span[data-test="text-cdp-price-display"]',
      el => el.textContent.trim()
    );

    return res.json({ price });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}