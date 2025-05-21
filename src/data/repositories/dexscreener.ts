import { logger } from "../../utils/logger";
import { DexScreenerToken } from "../types";

export class DexScreenerRepository {
  async getTokenByAddress(address: string): Promise<DexScreenerToken | null> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
        {
          method: "GET",
        }
      );
      const data: any = await response.json();
      const pair = data.pairs?.[0];
      if (!pair) {
        return null;
      }
      return {
        name: pair.baseToken?.name,
        symbol: pair.baseToken?.symbol,
        chain: pair.chainId,
        price: pair.priceUsd,
        liquidity: pair.liquidity?.usd,
        volume24h: pair.volume?.h24,
        txns24h: pair.txns?.h24?.buys + pair.txns?.h24?.sells,
        address: pair.baseToken?.address,
        fdv: pair.fdv,
      };
    } catch (error) {
      logger.error("Error fetching token from DexScreener", error);
      return null;
    }
  }

  async getTokenBySymbol(symbol: string): Promise<DexScreenerToken | null> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${symbol}`,
        {
          method: "GET",
        }
      );
      const data: any = await response.json();
      const pair = data.pairs?.[0];
      if (!pair) {
        return null;
      }

      return {
        name: pair.baseToken?.name,
        symbol: pair.baseToken?.symbol,
        chain: pair.chainId,
        price: pair.priceUsd,
        liquidity: pair.liquidity?.usd,
        volume24h: pair.volume?.h24,
        address: pair.baseToken?.address,
        txns24h: pair.txns?.h24?.buys + pair.txns?.h24?.sells,
        fdv: pair.fdv,
      };
    } catch (error) {
      logger.error("Error fetching token from DexScreener", error);
      return null;
    }
  }

  async getTopGainers(limit: number): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/gainers`,
        {
          method: "GET",
        }
      );
      const data: any = await response.json();
      return data.pairs.slice(0, limit);
    } catch (error) {
      logger.error("Error fetching top gainers from DexScreener", error);
      return [];
    }
  }

  async getTopVolume(limit: number): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/volume`,
        {
          method: "GET",
        }
      );
      const data: any = await response.json();
      return data.pairs.slice(0, limit);
    } catch (error) {
      logger.error("Error fetching top volume from DexScreener", error);
      return [];
    }
  }
}
