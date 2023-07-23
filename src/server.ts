import { Database } from "sqlite-async";
import http from "http";
import { readFile } from "node:fs/promises";
import Handlebars from "handlebars";
import { summarize } from "./summary";

async function render(res: http.ServerResponse, contentName: string, data: any) {
  const content = await readFile(`./handlebars/${contentName}.hbs`, "utf8");
  const template = Handlebars.compile(content);

  Handlebars.registerPartial("content", template);

  const layout = await readFile("./handlebars/layout.hbs", "utf8");
  const layoutTemplate = Handlebars.compile(layout);

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(layoutTemplate(data));
}

async function list(db: Database, req: http.IncomingMessage, res: http.ServerResponse) {
  const rows: any[] = await db.all("SELECT * FROM Items ORDER BY date DESC LIMIT 100");

  for (const row of rows) {
    const date = new Date(row.Date);
    // 17/07/2023
    row.Date = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    // 17:32
    row.Time = `${date.getHours()}:${date.getMinutes()}`;

    // 2 hours ago
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) {
      row.Ago = `${Math.round(diff)} seconds ago`;
    } else if (diff < 60 * 60) {
      row.Ago = `${Math.round(diff / 60)} minutes ago`;
    } else if (diff < 60 * 60 * 24) {
      row.Ago = `${Math.round(diff / (60 * 60))} hours ago`;
    } else {
      row.Ago = `${Math.round(diff / (60 * 60 * 24))} days ago`;
    }

    if (!row.Image) {
      // Check for image in description
      const imageRegex = /src="(.*?)"/;
      const imageMatch = row.Description.match(imageRegex);

      if (imageMatch) {
        row.Image = imageMatch[1];
      } else {
        // Hacker news
        row.Image = "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/hacker-news-icon.png";

        const commentsRegex = /Comments URL: <a href="(.*?)">/;
        const commentsMatch = row.Description.match(commentsRegex);

        if (commentsMatch) {
          row.Comments = commentsMatch[1];
        }
      }
    }
  }

  await render(res, "list", { items: rows });
}

async function handle(db: Database, req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.url === "/") {
    await list(db, req, res);
  } else if (req.url.startsWith("/summary/")) {
    const guid = req.url.split("/summary/")[1];

    const row: any = await db.get("SELECT * FROM Items WHERE GUID = ?", guid);

    if (!row) {
      res.writeHead(404);
      res.end();
      return;
    }

    const summary = await summarize(row.Link);

    await render(res, "summary", { summary });
  } else {
    res.writeHead(404);
    res.end();
  }
}

export function startServer(db: Database) {
  http.createServer(function (req, res) {
    handle(db, req, res).catch(e => {
      res.writeHead(500);
      res.end(e.stack);
    });
  }).listen(80);
}