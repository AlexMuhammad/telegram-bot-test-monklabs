import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AiRepository } from "../data/repositories/ai";
import { CoinGeckoRepository } from "../data/repositories/coin-gecko";
import { DexScreenerRepository } from "../data/repositories/dexscreener";
import { QueryLogRepository } from "../data/repositories/prisma/query-log";
import { CoinGeckoToken, DexScreenerToken, Token } from "../data/types";
import { logger } from "../utils/logger";
import { validators } from "../utils/validators";
import { getCachedData, setCachedData } from "./cache";
import { Context } from "grammy";

export class TokenService {
  constructor(
    private dexscreenerRepository: DexScreenerRepository,
    private coinGeckoRepository: CoinGeckoRepository,
    private aiRepository: AiRepository,
    private queryLogRepository: QueryLogRepository
  ) {}

  async getTokenByAddress(
    address: string,
    payload: any
  ): Promise<Token | null> {
    const { error } = validators.tokenAddress.validate(address);
    if (error) throw new Error(error.message);

    const dexScreenerTokenData =
      await this.dexscreenerRepository.getTokenByAddress(address);
    if (!dexScreenerTokenData) return null;

    const coinGeckoTokenData = await this.coinGeckoRepository.getTokenPrice(
      dexScreenerTokenData.symbol || ""
    );
    if (!coinGeckoTokenData) return null;

    const cacheKey = `token_address_${address}`;
    const cachedToken = getCachedData<Token>(cacheKey);
    if (cachedToken) {
      logger.info(`Cache hit for token address: ${address}`);
      await this.logQuery({
        userId: payload.from.id.toString(),
        response: {
          insight: cachedToken.insight,
          safetyScore: cachedToken.safetyScore,
        },
        command: "analyze",
        tokenAddress: address,
        chainId: cachedToken.chain,
        tokenId: cachedToken.symbol,
        tokenName: cachedToken.name,
      });
      return cachedToken;
    }

    const { insight, safetyScore } = await this.aiRepository.analyzeToken(
      dexScreenerTokenData,
      coinGeckoTokenData
    );
    const token: Token = { ...dexScreenerTokenData, insight, safetyScore };

    setCachedData(cacheKey, token, 600);
    await this.logQuery({
      userId: payload.from.id.toString(),
      response: { insight, safetyScore },
      command: "analyze",
      tokenAddress: address,
      chainId: dexScreenerTokenData.chain,
      tokenId: coinGeckoTokenData.symbol,
      tokenName: dexScreenerTokenData.name,
    });

    return token;
  }

  async getTokenBySymbol(symbol: string, payload: any): Promise<Token | null> {
    const { error } = validators.tokenSymbol.validate(symbol);
    if (error) throw new Error(error.message);

    const coinGeckoTokenData = await this.coinGeckoRepository.getTokenPrice(
      symbol
    );
    if (!coinGeckoTokenData) return null;

    const dexScreenerTokenData =
      await this.dexscreenerRepository.getTokenBySymbol(symbol);

    const cacheKey = `token_symbol_${symbol}`;
    const cachedToken = getCachedData<Token>(cacheKey);
    if (cachedToken) {
      logger.info(`Cache hit for token symbol: ${symbol}`);
      await this.logQuery({
        userId: payload.from.id.toString(),
        response: {
          price: cachedToken.price,
          volume24h: cachedToken.volume24h,
          marketCap: cachedToken.marketCap,
          liquidity: cachedToken.liquidity,
        },
        command: "price",
        tokenAddress: cachedToken.address,
        chainId: cachedToken.chain,
        tokenId: symbol,
        tokenName: cachedToken.name,
      });
      return cachedToken;
    }

    const token: Token = {
      name: coinGeckoTokenData.name,
      symbol: coinGeckoTokenData.symbol,
      price: coinGeckoTokenData.price,
      volume24h: coinGeckoTokenData.volume24h,
      marketCap: coinGeckoTokenData.marketCap,
      chain: dexScreenerTokenData?.chain!,
      liquidity: dexScreenerTokenData?.liquidity ?? 0,
      address: dexScreenerTokenData?.address ?? "",
    };
    setCachedData(
      cacheKey,
      { ...dexScreenerTokenData, ...coinGeckoTokenData },
      600
    );

    if (payload) {
      await this.logQuery({
        userId: payload.from.id.toString(),
        response: {
          price: token.price,
          volume24h: token.volume24h,
          marketCap: token.marketCap,
          liquidity: token.liquidity,
        },
        command: "price",
        tokenAddress: token.address,
        chainId: token.chain,
        tokenId: symbol,
        tokenName: token.name,
      });
    }

    return token;
  }

  async getGeneralResponse(question: string, payload: any): Promise<any> {
    const response = await this.aiRepository.generalQuestionAboutCrypto(
      question
    );

    const cacheKey = `general_response_${question
      .toLowerCase()
      .replace(/\s+/g, "_")}`;
    const cachedToken = getCachedData<string>(cacheKey);
    if (cachedToken) {
      logger.info(`Cache hit for general response: ${cacheKey}`);
      await this.logQuery({
        userId: payload.from.id.toString(),
        response: cachedToken,
        command: "general",
        tokenAddress: undefined,
        chainId: undefined,
        tokenId: undefined,
        tokenName: undefined,
      });
      return cachedToken;
    }

    await this.logQuery({
      userId: payload.from.id.toString(),
      response,
      command: "general",
      tokenAddress: undefined,
      chainId: undefined,
      tokenId: undefined,
      tokenName: undefined,
    });

    setCachedData(cacheKey, response, 300);

    return response;
  }

  async getTokenRecommendations(payload: any): Promise<string> {
    try {
      const trendingTokens = await this.coinGeckoRepository.getTrendingTokens();
      const recommendations = await this.aiRepository.suggestTokens({
        trendingTokens,
      });

      const cacheKey = `token_recommendations_${recommendations
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const cachedToken = getCachedData<string>(cacheKey);
      if (cachedToken) {
        logger.info(`Cache hit for token recommendations: ${cacheKey}`);
        await this.logQuery({
          userId: payload.from.id.toString(),
          response: cachedToken,
          command: "general",
          tokenAddress: undefined,
          chainId: undefined,
          tokenId: undefined,
          tokenName: undefined,
        });
        return cachedToken;
      }

      await this.logQuery({
        userId: payload.from.id.toString(),
        response: recommendations,
        command: "general",
        tokenAddress: undefined,
        chainId: undefined,
        tokenId: undefined,
        tokenName: undefined,
      });

      setCachedData(cacheKey, recommendations, 300);

      return recommendations;
    } catch (error) {
      logger.error(`Error getting token recommendations`, error);
      throw new Error("Failed to generate token recommendations");
    }
  }

  async compareTokens(
    symbols: string[],
    query: string,
    payload: any
  ): Promise<string> {
    try {
      const cacheKey = `token_comparison_${query
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      const cachedToken = getCachedData<string>(cacheKey);
      if (cachedToken) {
        logger.info(`Cache hit for token comparison: ${cacheKey}`);
        await this.logQuery({
          userId: payload.from.id.toString(),
          response: cachedToken,
          command: "general",
          tokenAddress: undefined,
          chainId: undefined,
          tokenId: undefined,
          tokenName: undefined,
        });
        return cachedToken;
      }

      const tokensData = await Promise.all(
        symbols.map(async (symbol) => {
          const dexScreener = await this.dexscreenerRepository.getTokenBySymbol(
            symbol
          );
          const coinGecko = await this.coinGeckoRepository.getTokenPrice(
            symbol
          );
          return { symbol, dexScreener, coinGecko };
        })
      );

      const validTokensData = tokensData.filter(
        (data) => data.dexScreener !== null || data.coinGecko !== null
      );

      if (validTokensData.length < 2) {
        return "I couldn't find enough data to compare these tokens. Please try with different tokens.";
      }

      const comparison = await this.aiRepository.compareTokens(
        query,
        validTokensData
      );

      await this.logQuery({
        userId: payload.from.id.toString(),
        response: comparison,
        command: "general",
        tokenAddress: undefined,
        chainId: undefined,
        tokenId: undefined,
        tokenName: undefined,
      });

      setCachedData(cacheKey, comparison, 300);

      return comparison;
    } catch (error) {
      logger.error(`Error comparing tokens: ${symbols.join(", ")}`, error);
      throw new Error("Failed to compare tokens");
    }
  }

  async getMarketTrends(payload: any): Promise<string> {
    try {
      const cacheKey = `market_trends_${
        new Date().toISOString().split("T")[0]
      }`;
      const cachedToken = getCachedData<string>(cacheKey);
      if (cachedToken) {
        logger.info(`Cache hit for market trends: ${cacheKey}`);
        await this.logQuery({
          userId: payload.from.id.toString(),
          response: cachedToken,
          command: "general",
          tokenAddress: undefined,
          chainId: undefined,
          tokenId: undefined,
          tokenName: undefined,
        });
        return cachedToken;
      }

      const data = await this.coinGeckoRepository.getTrendingTokens();
      const trends = await this.aiRepository.analyzeMarketTrends(data);

      await this.logQuery({
        userId: payload.from.id.toString(),
        response: trends,
        command: "general",
        tokenAddress: undefined,
        chainId: undefined,
        tokenId: undefined,
        tokenName: undefined,
      });

      setCachedData(cacheKey, trends, 300);

      return trends;
    } catch (error) {
      logger.error("Error getting market trends", error);
      throw new Error("Failed to analyze market trends");
    }
  }

  async extractTokenSymbols(text: string, tokenList: any[]): Promise<string[]> {
    return this.aiRepository.extractTokenSymbols(text, tokenList);
  }

  async getDexScreenerData(symbol: string): Promise<DexScreenerToken | null> {
    return this.dexscreenerRepository.getTokenBySymbol(symbol);
  }

  async getCoinGeckoData(symbol: string): Promise<CoinGeckoToken | null> {
    return this.coinGeckoRepository.getTokenPrice(symbol);
  }

  async getTokenList(): Promise<any[]> {
    return this.coinGeckoRepository.getTokenList();
  }

  async answerTokenQuestion(
    question: string,
    tokenData: any[],
    payload: any
  ): Promise<string> {
    const cacheKey = `token_question_${question
      .toLowerCase()
      .replace(/\s+/g, "_")}`;
    const cachedToken = getCachedData<string>(cacheKey);
    if (cachedToken) {
      logger.info(`Cache hit for token question: ${cacheKey}`);
      return cachedToken;
    }

    const response = await this.aiRepository.answerTokenQuestion(
      question,
      tokenData
    );

    setCachedData(cacheKey, response, 300);

    await this.logQuery({
      userId: payload.from.id.toString(),
      response: response,
      command: "general",
      tokenAddress: undefined,
      chainId: undefined,
      tokenId: undefined,
      tokenName: undefined,
    });
    return this.aiRepository.answerTokenQuestion(question, tokenData);
  }

  private async logQuery({
    userId,
    response,
    command,
    tokenAddress,
    chainId,
    tokenId,
    tokenName,
  }: {
    userId: string;
    response: any;
    command: string;
    tokenAddress?: string | undefined;
    chainId?: string | undefined;
    tokenId?: string | undefined;
    tokenName?: string | undefined;
  }): Promise<void> {
    await this.queryLogRepository.logQuery({
      userId,
      command,
      tokenAddress,
      chainId,
      tokenId,
      tokenName: tokenName ?? "",
      response,
    });
  }
}
