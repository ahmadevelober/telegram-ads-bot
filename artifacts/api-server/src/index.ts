import app from "./app";
import { logger } from "./lib/logger";
import { startBot } from "./bot/index";
import https from "https";
import http from "http";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env["TELEGRAM_BOT_TOKEN"]) {
  startBot();
} else {
  logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // ===== Keep-Alive: البوت يضرب نفسه كل 4 دقائق حتى لا ينام =====
  const domains = (process.env["REPLIT_DOMAINS"] ?? "").split(",").map(d => d.trim()).filter(Boolean);
  const pingUrl = domains[0] ? `https://${domains[0]}/api/healthz` : null;

  if (pingUrl) {
    setInterval(() => {
      const client = pingUrl.startsWith("https") ? https : http;
      const req = client.get(pingUrl, (res) => {
        logger.info({ status: res.statusCode }, "Keep-alive ping sent");
      });
      req.on("error", (err) => {
        logger.warn({ err }, "Keep-alive ping failed");
      });
      req.end();
    }, 4 * 60 * 1000); // كل 4 دقائق
    logger.info({ pingUrl }, "Keep-alive started");
  }
});
