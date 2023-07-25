import puppeteer from 'puppeteer-extra';
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { getRandomProxy } from './proxy';

puppeteer.use(StealthPlugin());

export async function browse(url: string): Promise<string> {
  const proxy = await getRandomProxy();

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--proxy-server=http=" + proxy,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
    ]
  });

  try {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });

    const data = await page.evaluate(() => document.querySelector('*').outerHTML);
    return data;
  } catch (e) {
    throw e;
  } finally {
    await browser.close();
  }
}