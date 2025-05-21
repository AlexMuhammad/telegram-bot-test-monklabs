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

  async handleGeneralQuestion(ctx: Context, question: string): Promise<void> {
    const cacheKey = `bot_response_question_${question}`;
    const cachedResponse = getCachedData<string>(cacheKey);
    if (cachedResponse) {
      logger.info(`Cache hit for bot response: ${cacheKey}`);
      await ctx.reply(cachedResponse);
      return;
    }
    if (!question) return;
    try {
      await ctx.replyWithChatAction("typing");
      const response = await this.tokenService.getGeneralResponse(question);
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
    - For any other queries especially related to crypto, I'll do my best to assist you.
    `;
    await ctx.reply(response);
  }

  async handleTokenRecommendation(
    ctx: Context,
    category: string
  ): Promise<void> {
    try {
      await ctx.replyWithChatAction("typing");
      const cacheKey = `token_recommendation_${category
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const cachedResponse = getCachedData<string>(cacheKey);

      if (cachedResponse) {
        logger.info(`Cache hit for token recommendation: ${category}`);
        await ctx.reply(cachedResponse);
        return;
      }

      const recommendations = await this.tokenService.getTokenRecommendations();
      const response = `🔍 Token Recommendations: \n\n${recommendations}`;
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
      await ctx.replyWithChatAction("typing");
      const tokenList = await this.tokenService.getTokenList();
      const tokenSymbols = await this.tokenService.extractTokenSymbols(
        query,
        tokenList
      );

      console.log("tokenSymbols", tokenSymbols);

      if (tokenSymbols.length < 2) {
        await ctx.reply(
          "Please specify your token mention (e.g: $popcat) to get valid information"
        );
        return;
      }

      const comparison = await this.tokenService.compareTokens(
        tokenSymbols,
        query
      );

      console.log("comparison", comparison);

      const response = `📊 Token Comparison\n\n${comparison}\n\n`;

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

      const cacheKey = `market_trends_${
        new Date().toISOString().split("T")[0]
      }`;
      const cachedResponse = getCachedData<string>(cacheKey);

      if (cachedResponse) {
        logger.info(`Cache hit for market trends`);
        await ctx.reply(cachedResponse);
        return;
      }

      const trends = await this.tokenService.getMarketTrends();

      const response = `📈 Today's Crypto Market Trends\n\n${trends}\n\n⚠️ *This analysis is based on real-time market data. Not financial advice.*`;
      setCachedData(cacheKey, response, 3600);

      await ctx.reply(response);
    } catch (error) {
      logger.error("Error handling market trends", error);
      await ctx.reply(
        "I couldn't analyze market trends right now. Please try again later."
      );
    }
  }

  async handleTokenQuestion(ctx: Context, question: string): Promise<void> {
    try {
      await ctx.replyWithChatAction("typing");

      const tokenList = await this.tokenService.getTokenList();
      const tokenMentions = await this.tokenService.extractTokenSymbols(
        question,
        tokenList
      );

      console.log("tokenMentions", tokenMentions);

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
              question
            );
            response = `📊 Token Comparison\n\n${response}`;
          } else {
            response = await this.tokenService.answerTokenQuestion(
              question,
              validTokensData
            );
            response = `🔍 Token Analysis\n\n${response}`;
          }
        } else {
          response = await this.tokenService.getGeneralResponse(question);
        }
      } else {
        response = await this.tokenService.getGeneralResponse(question);
      }

      await ctx.reply(response);
    } catch (error) {
      logger.error(`Error handling token question: ${question}`, error);
      await ctx.reply(
        "I couldn't answer your question right now. Please try again later."
      );
    }
  }
}
