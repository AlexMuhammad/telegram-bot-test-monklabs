import { Context } from "grammy";
import { TokenService } from "../services/token";
import { formatters } from "../utils/formatters";
import { getCachedData, setCachedData } from "../services/cache";
import { logger } from "../utils/logger";

export class TelegramHandlers {
  constructor(private tokenService: TokenService) {}

  async handleTokenAddress(ctx: Context, address: string): Promise<void> {
    const payload = ctx.message;
    const cacheKey = `bot_response_address_${address}`;
    const cachedResponse = getCachedData<string>(cacheKey);
    if (cachedResponse) {
      logger.info(`Cache hit for bot response: ${cacheKey}`);
      await ctx.reply(cachedResponse);
      return;
    }
    if (!address) return;
    try {
      const token = await this.tokenService.getTokenByAddress(address, payload);
      if (!token) {
        await ctx.reply(
          "Token not found or invalid address, Please try again."
        );
        return;
      }

      const response = `
📊 Token: ${token.name} (${token.symbol})
   Chain: ${token.chain}
   Price: ${formatters.currency(token.price)}
   Liquidity: ${formatters.currency(token.liquidity)}
   24h Volume: ${formatters.currency(token.volume24h)} (${token.txns24h} txns)
   
🧠 AI Insight: ${token.insight}
🛡 Safety Score:  ${token.safetyScore}
`;

      setCachedData(cacheKey, response, 300);
      await ctx.reply(response);
    } catch (error) {
      await ctx.reply((error as Error).message || "An error occurred.");
    }
  }

  async handlePriceQuery(ctx: Context, symbol: string): Promise<void> {
    const payload = ctx.message;
    const cacheKey = `bot_response_symbol_${symbol}`;
    const cachedResponse = getCachedData<string>(cacheKey);
    if (cachedResponse) {
      logger.info(`Cache hit for bot response: ${cacheKey}`);
      await ctx.reply(cachedResponse);
      return;
    }
    if (!symbol) {
      await ctx.reply(
        'Please specify the token symbol (e.g., "What\'s the price of $PEPE?")'
      );
      return;
    }

    try {
      const token = await this.tokenService.getTokenBySymbol(symbol, payload);
      if (!token) {
        await ctx.reply("Token not found or invalid symbol, Please try again.");
        return;
      }

      const response = `
  📊 Token: ${token.name} (${token.symbol})
     Price: ${formatters.currency(token.price)}
     24h Volume: ${formatters.currency(token.volume24h)}
     Liquidity: ${formatters.currency(token.liquidity!)}
  `;

      setCachedData(cacheKey, response, 300);
      await ctx.reply(response);
    } catch (error) {
      await ctx.reply((error as Error).message || "An error occurred.");
    }
  }

  async handleStart(ctx: Context): Promise<void> {
    await ctx.reply("Welcome to my space!");
  }
  async handleHelp(ctx: Context): Promise<void> {
    const response = `Helping you with your crypto needs!
    - Send a token contract address (e.g., 0x123...) to get token details, AI insights, and security score.
    - Ask for token price (e.g., "What's the price of $PEPE?") for current price and market data.
    - For any other queries, I'll do my best to assist you.
    `;
    await ctx.reply(response);
  }
}
