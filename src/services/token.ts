import { AiRepository } from "../data/repositories/ai";
import { CoinGeckoRepository } from "../data/repositories/coin-gecko";
import { DexScreenerRepository } from "../data/repositories/dexscreener";
import { QueryLogRepository } from "../data/repositories/prisma/query-log";
import { Token } from "../data/types";
import { logger } from "../utils/logger";
import { validators } from "../utils/validators";
import { getCachedData, setCachedData } from "./cache";

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
    tokenAddress: string | undefined;
    chainId: string | undefined;
    tokenId: string | undefined;
    tokenName: string;
  }): Promise<void> {
    await this.queryLogRepository.logQuery({
      userId,
      command,
      tokenAddress,
      chainId,
      tokenId,
      tokenName,
      response,
    });
  }
}
