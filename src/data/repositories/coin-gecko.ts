import { CoinGeckoToken } from "../types";

export class CoinGeckoRepository {
  async getTokenPrice(symbol: string): Promise<CoinGeckoToken | null> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&symbols=${symbol.toLowerCase()}`,
        {
          method: "GET",
        }
      );
      const data: any = await response.json();
      const result = data[0];

      if (!result) {
        return null;
      }
      return {
        name: result.name,
        symbol: result.symbol.toUpperCase(),
        price: result.current_price,
        volume24h: result.total_volume,
        marketCap: result.market_cap,
      };
    } catch (error) {
      console.error("Error fetching token price from CoinGecko", error);
      return null;
    }
  }

  async getTrendingTokens(): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search/trending`,
        {
          method: "GET",
        }
      );
      const data: any = await response.json();
      return data.coins;
    } catch (error) {
      console.error("Error fetching trending tokens from CoinGecko", error);
      return [];
    }
  }

  async getTokenList(): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/list`,
        {
          method: "GET",
        }
      );
      const data: any = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching token list from CoinGecko", error);
      return [];
    }
  }
}
