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

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

  await page.evaluate(() => {
    function xcc_contains(selector: string, text: string) {
      const elements = [...document.querySelectorAll(selector)];
      return elements.filter(element => {
        return RegExp(text, "i").test(element.textContent.trim());
      });
    }
    var _xcc;
    _xcc = xcc_contains('button, a', '^(Accept all|Accept|I understand|Agree|Okay|OK)$');
    if (_xcc != null && _xcc.length != 0) {
      console.log("Found");
      (_xcc[0] as HTMLElement).click();
    }
  });

  await page.waitForSelector('body');

  const data = await page.evaluate(() => document.querySelector('*').outerHTML);

  await browser.close();

  return data;
}