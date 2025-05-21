import { Bot } from "grammy";
import { config } from "../config";
import { TelegramHandlers } from "./handlers";
import { AiRepository } from "../data/repositories/ai";

export class TelegramBotClient {
  private bot: Bot;
  private aiRepository: AiRepository;

  constructor(handlers: TelegramHandlers) {
    this.bot = new Bot(config.telegramBotToken);
    this.aiRepository = new AiRepository();

    this.bot.command("start", (ctx) => handlers.handleStart(ctx));
    this.bot.command("help", (ctx) => handlers.handleHelp(ctx));

    this.bot.on("message:text", async (ctx) => {
      const text = ctx.message.text.trim();

      try {
        const result = await this.aiRepository.routeFunction(text);

        if (result.function === "handlePriceQuery") {
          return await handlers.handlePriceQuery(ctx, result.args[0]);
        } else if (result.function === "handleTokenAddress") {
          return await handlers.handleTokenAddress(ctx, result.args[0]);
        } else if (result.function === "handleMarketTrends") {
          return await handlers.handleMarketTrends(ctx);
        } else if (result.function === "handleTokenRecommendation") {
          return await handlers.handleTokenRecommendation(ctx, result.args[0]);
        } else if (result.function === "handleTokenComparison") {
          return await handlers.handleTokenComparison(ctx, result.args[0]);
        } else if (result.function === "handleGeneralQuestion") {
          return await handlers.handleGeneralQuestion(ctx, result.args[0]);
        } else {
          await ctx.reply("Sorry, I couldn't understand your message.");
        }
      } catch (err) {
        console.error("Routing error:", err);
        await ctx.reply("Something went wrong while processing your request.");
      }
    });
  }

  start() {
    this.bot.start();
    console.log("Bot started");
  }
}
