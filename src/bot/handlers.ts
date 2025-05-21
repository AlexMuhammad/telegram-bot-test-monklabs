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
      await ctx.replyWithChatAction("typing");
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
      await ctx.replyWithChatAction("typing");
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
    const response = `Welcome to your Crypto AI Assistant! Here's how I can help:
    - Send a token contract address (e.g., 0x123...) for detailed token analysis, AI insights, and security score.
    - Ask about token prices (e.g., "What's the price of $PEPE?") for current market data.
    - Request token recommendations (e.g., "Suggest some DeFi tokens").
    - Compare tokens (e.g., "Compare BTC and ETH").
    - Get market trends (e.g., "How is the crypto market today?").
    - Ask any crypto-related questions, and I'll provide informed answers.
    `;
    await ctx.reply(response);
  }

  async handleTokenRecommendation(
    ctx: Context,
    category: string
  ): Promise<void> {
    try {
      await ctx.replyWithChatAction("typing");
      const cacheKey = `bot_response_recommendation_${category
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const cachedResponse = getCachedData<string>(cacheKey);

      if (cachedResponse) {
        logger.info(`Cache hit for token recommendation: ${category}`);
        await ctx.reply(cachedResponse);
        return;
      }

      const recommendations = await this.tokenService.getTokenRecommendations(
        ctx.message
      );
      const response = `${recommendations}`;
      setCachedData(cacheKey, response, 7200);

      await ctx.reply(response);
    } catch (error) {
      logger.error(
        `Error handling token recommendation for ${category}`,
        error
      );
      await ctx.reply(
        "I couldn't generate token recommendations right now. Please try again later."
      );
    }
  }

  async handleTokenComparison(ctx: Context, query: string): Promise<void> {
    try {
      const cacheKey = `bot_response_comparison_${query
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const cachedResponse = getCachedData<string>(cacheKey);

      if (cachedResponse) {
        logger.info(`Cache hit for token comparison: ${query}`);
        await ctx.reply(cachedResponse);
        return;
      }

      await ctx.replyWithChatAction("typing");
      const tokenList = await this.tokenService.getTokenList();
      const tokenSymbols = await this.tokenService.extractTokenSymbols(
        query,
        tokenList
      );

      if (tokenSymbols.length < 2) {
        await ctx.reply(
          "Please specify your token mention (e.g: $popcat) to get valid information"
        );
        return;
      }

      const comparison = await this.tokenService.compareTokens(
        tokenSymbols,
        query,
        ctx.message
      );

      const response = `${comparison}`;

      setCachedData(cacheKey, response, 3600);

      await ctx.reply(response);
    } catch (error) {
      logger.error(`Error handling token comparison: ${query}`, error);
      await ctx.reply(
        "I couldn't compare these tokens right now. Please try again later."
      );
    }
  }

  async handleMarketTrends(ctx: Context): Promise<void> {
    try {
      await ctx.replyWithChatAction("typing");

      const cacheKey = `bot_response_market_trends_${
        new Date().toISOString().split("T")[0]
      }`;
      const cachedResponse = getCachedData<string>(cacheKey);

      if (cachedResponse) {
        logger.info(`Cache hit for market trends`);
        await ctx.reply(cachedResponse);
        return;
      }

      const trends = await this.tokenService.getMarketTrends(ctx.message);

      const response = `${trends}`;
      setCachedData(cacheKey, response, 3600);

      await ctx.reply(response);
    } catch (error) {
      logger.error("Error handling market trends", error);
      await ctx.reply(
        "I couldn't analyze market trends right now. Please try again later."
      );
    }
  }

  async handleGeneralQuestion(ctx: Context, question: string): Promise<void> {
    try {
      await ctx.replyWithChatAction("typing");

      const cacheKey = `bot_response_general_${question
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const cachedResponse = getCachedData<string>(cacheKey);

      if (cachedResponse) {
        logger.info(`Cache hit for general question: ${cacheKey}`);
        await ctx.reply(cachedResponse);
        return;
      }
      const tokenList = await this.tokenService.getTokenList();
      const tokenMentions = await this.tokenService.extractTokenSymbols(
        question,
        tokenList
      );

      let response: string;

      if (tokenMentions.length > 0) {
        const tokensData = await Promise.all(
          tokenMentions.map(async (symbol) => {
            const dexScreenerData = await this.tokenService.getDexScreenerData(
              symbol
            );
            const coinGeckoData = await this.tokenService.getCoinGeckoData(
              symbol
            );
            return {
              symbol,
              dexScreener: dexScreenerData,
              coinGecko: coinGeckoData,
            };
          })
        );

        const validTokensData = tokensData.filter(
          (data) => data.dexScreener !== null || data.coinGecko !== null
        );

        if (validTokensData.length > 0) {
          if (
            validTokensData.length > 1 &&
            question.toLowerCase().includes("compare")
          ) {
            response = await this.tokenService.compareTokens(
              validTokensData.map((data) => data.symbol),
              question,
              ctx.message
            );
            response = `${response}`;
          } else {
            response = await this.tokenService.answerTokenQuestion(
              question,
              validTokensData,
              ctx.message
            );
            response = `${response}`;
          }
        } else {
          response = await this.tokenService.getGeneralResponse(
            question,
            ctx.message
          );
        }
      } else {
        response = await this.tokenService.getGeneralResponse(
          question,
          ctx.message
        );
      }

      setCachedData(cacheKey, response, 3600);

      await ctx.reply(response);
    } catch (error) {
      logger.error(`Error handling token question: ${question}`, error);
      await ctx.reply(
        "I couldn't answer your question right now. Please try again later."
      );
    }
  }
}
