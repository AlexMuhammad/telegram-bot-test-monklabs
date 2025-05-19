import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config";
import { TelegramBotClient } from "./bot/client";
import { TelegramHandlers } from "./bot/handlers";
import { TokenService } from "./services/token";
import { AiRepository } from "./data/repositories/ai";
import { DexScreenerRepository } from "./data/repositories/dexscreener";
import { CoinGeckoRepository } from "./data/repositories/coin-gecko";
import { QueryLogRepository } from "./data/repositories/prisma/query-log";

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
});

// Initialize repositories
const repositories = {
  ai: new AiRepository(),
  dexScreener: new DexScreenerRepository(),
  coinGecko: new CoinGeckoRepository(),
  queryLog: new QueryLogRepository(),
};

// Initialize services
const tokenService = new TokenService(
  repositories.dexScreener,
  repositories.coinGecko,
  repositories.ai,
  repositories.queryLog
);

// Initialize Telegram bot
const telegramHandlers = new TelegramHandlers(tokenService);
const telegramBot = new TelegramBotClient(telegramHandlers);

// Register routes
fastify.register(async (instance) => {
  instance.get("/", async () => ({ status: "OK" }));

  instance.get("/analyze", async (request) => {
    const { tokenAddress, tokenId } = request.query as {
      tokenAddress?: string;
      tokenId?: string;
    };
    return repositories.queryLog.getRecentQueries(
      "analyze",
      tokenAddress,
      tokenId
    );
  });

  instance.get("/price", async (request) => {
    const { tokenAddress, tokenId } = request.query as {
      tokenAddress?: string;
      tokenId?: string;
    };
    return repositories.queryLog.getRecentQueries(
      "price",
      tokenAddress,
      tokenId
    );
  });
});

// Error handling
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: "Internal Server Error" });
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });
    fastify.log.info(`Server listening on ${config.port}`);
    telegramBot.start();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
