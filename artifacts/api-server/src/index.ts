import app from "./app";
import { logger } from "./lib/logger";
import { startBot } from "./bot/index";
import https from "https";
import http from "http";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ===== طبقة 1: منع أي خطأ غير متوقع من إيقاف السيرفر =====
process.on("uncaughtException", (err) => {
  logger.error({ err }, "⚠️ uncaughtException — تم التعافي، السيرفر مستمر");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "⚠️ unhandledRejection — تم التعافي، السيرفر مستمر");
});

// ===== طبقة 2: تشغيل البوت مع إعادة تشغيل تلقائية =====
async function launchBot() {
  if (!process.env["TELEGRAM_BOT_TOKEN"]) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
    return;
  }
  try {
    await startBot();
  } catch (err) {
    logger.error({ err }, "Bot crashed — إعادة تشغيل خلال 10 ثوانٍ");
    setTimeout(launchBot, 10_000);
  }
}

launchBot();

// ===== تشغيل السيرفر =====
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // ===== طبقة 3: Keep-Alive كل 3 دقائق =====
  const domains = (process.env["REPLIT_DOMAINS"] ?? "").split(",").map(d => d.trim()).filter(Boolean);
  const pingUrl = domains[0] ? `https://${domains[0]}/api/healthz` : null;

  if (pingUrl) {
    const doPing = () => {
      const client = pingUrl.startsWith("https") ? https : http;
      const req = client.get(pingUrl, (res) => {
        if (res.statusCode !== 200) {
          logger.warn({ status: res.statusCode }, "Keep-alive ping: unexpected status");
        }
      });
      req.on("error", (e) => {
        logger.warn({ err: e }, "Keep-alive ping failed — سيحاول مجدداً");
      });
      req.end();
    };

    doPing();
    setInterval(doPing, 3 * 60 * 1000);
    logger.info({ pingUrl }, "Keep-alive started (every 3 min)");
  }
});
