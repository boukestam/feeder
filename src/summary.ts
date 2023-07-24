import { Configuration, OpenAIApi } from "openai";
import { stripHTML } from "./util";
import { extract } from 'article-parser';
import { encoding_for_model } from "@dqbd/tiktoken";
import puppeteer from 'puppeteer';
import { convert } from "html-to-text";
import { getRandomProxy } from "./proxy";

const prompt = "Summize the article below in bullet-point TLDR form, in the same language as the article is written in.\n\n";

const cache = new Map<string, string[]>();
const maxCacheSize = 100;

export async function summarize(url: string): Promise<string[]> {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const proxy = await getRandomProxy();

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--proxy-server=http=" + proxy,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36"'
    ]
  });

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForSelector('body');

  const data = await page.evaluate(() => document.querySelector('*').outerHTML);

  await browser.close();

  const article = await extract(data);
  const text = article ? stripHTML(article.content) : convert(data, { wordwrap: false });

  console.log(text);

  const enc = encoding_for_model("gpt-3.5-turbo");
  const tokens = enc.encode(text);

  if (tokens.length > 16000) return ["Article too long to summarize"];

  const model = tokens.length > 4000 ? "gpt-3.5-turbo-16k" : "gpt-3.5-turbo";

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  const result = await openai.createChatCompletion({
    model: model,
    messages: [{ role: "user", content: prompt + text }],
  });

  const tldr = result.data.choices[0].message.content;
  const summary = tldr.split("- ").map(s => s.trim()).filter(s => s.length > 0);

  if (cache.size > maxCacheSize) {
    cache.delete(cache.keys().next().value);
  }

  cache.set(url, summary);

  return summary;
}