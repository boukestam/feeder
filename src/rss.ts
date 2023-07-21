import { XMLParser } from "fast-xml-parser";

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  date: Date;
  guid: string;
  image?: string;
}

export async function fetchRSS(url: string): Promise<RSSItem[]> {
  const response = await fetch(url);
  const text = await response.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    alwaysCreateTextNode: true
  });
  const xml = parser.parse(text);

  const items = xml.rss.channel.item || [];

  return items.map((item: any) => {
    return {
      title: item.title["#text"],
      link: item.link["#text"],
      description: item.description["#text"],
      date: new Date(item.pubDate["#text"]),
      guid: item.guid?.["#text"] || item.link["#text"],
      image: item.enclosure?.["@_url"] || item["media:content"]?.["@_url"]
    };
  });
}