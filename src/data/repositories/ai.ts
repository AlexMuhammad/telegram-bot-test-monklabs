import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "../../config";
import { CoinGeckoToken, DexScreenerToken } from "../types";
import { logger } from "../../utils/logger";
import {
  cleanJsonBlock,
  cleanMarkdownFormatting,
} from "../../utils/textFormatter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class AiRepository {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      apiKey: config.geminiApiKey,
      model: "gemini-1.5-flash",
      temperature: 0.2,
    });
  }

  async analyzeToken(
    dexScreenerTokenData: DexScreenerToken,
    coinGeckoTokenData: CoinGeckoToken
  ): Promise<{ insight: string; safetyScore: string }> {
    const insightPrompt = `
        Analyze this token to help users understand its safety and status:
        Name: ${dexScreenerTokenData.name}
        Symbol: ${dexScreenerTokenData.symbol}
        Chain: ${dexScreenerTokenData.chain}
        Price: ${coinGeckoTokenData.price}
        Liquidity: ${dexScreenerTokenData.liquidity}
        Volume 24h: ${coinGeckoTokenData.volume24h}
        Txns 24h: ${dexScreenerTokenData.txns24h}
        FDV: ${dexScreenerTokenData.fdv}

      Provide a concise analysis of the token's safety and current status. Consider:
      1. Liquidity levels and their adequacy
      2. Trading volume and market activity
      3. On-chain transaction frequency
      4. The ratio of FDV (Fully Diluted Valuation) to liquidity as a potential risk indicator
      5. Any unusual patterns or red flags in the provided metrics

      Offer a balanced view of the token's strengths and potential risks to help users make informed decisions.
    `;

    const safetyScorePrompt = `
      Based on the token metrics provided earlier, assign a safety percentage from 0-100% considering liquidity, volume, and on-chain activity. Consider high FDV relative to liquidity as a risk factor.

      Token Metrics:
      Name: ${dexScreenerTokenData.name}
      Symbol: ${dexScreenerTokenData.symbol}
      Chain: ${dexScreenerTokenData.chain}
      Price: ${coinGeckoTokenData.price}
      Liquidity: ${dexScreenerTokenData.liquidity}
      Volume 24h: ${coinGeckoTokenData.volume24h}
      Txns 24h: ${dexScreenerTokenData.txns24h}
      FDV: ${dexScreenerTokenData.fdv}

      Provide the safety percentage (e.g., 68%) followed by a brief reason for the score.
      Format: [Percentage]%: [Reason]
    `;

    try {
      const insightResponse = await this.model.invoke([
        new HumanMessage({ content: insightPrompt }),
      ]);
      const insight = cleanMarkdownFormatting(
        insightResponse.content as string
      );

      const safetyScoreResponse = await this.model.invoke([
        new HumanMessage({ content: safetyScorePrompt }),
      ]);
      const safetyScore = cleanMarkdownFormatting(
        safetyScoreResponse.content as string
      );

      return { insight, safetyScore };
    } catch (error) {
      logger.error("Error analyzing token", error);
      return { insight: "Failed to analyze token", safetyScore: "0%" };
    }
  }

  async routeFunction(userMessage: string): Promise<{
    function: "handlePriceQuery" | "handleTokenAddress";
    args: [string];
  }> {
    const prompt = `
  You are a function router for a Telegram bot. Based on the user's message, determine which function should be called:
  
  - Use "handlePriceQuery" when the user asks for the price of a token, e.g., "$BTC", "What's the price of $ETH?", or even just sends a token symbol or name (e.g., "SOL", "bonk", "dogwifhat"). Be optimistic — if it sounds like a token or coin name, assume it's a price query. Always return the token symbol WITHOUT the "$" sign.
  - Use "handleTokenAddress" when the user sends a blockchain token address. This could be:
    - Ethereum address (starts with "0x", 42 characters)
    - Solana address (base58 string, usually 32–44 characters)
  
  Respond ONLY with a raw JSON object like this:
  { "function": "handlePriceQuery", "args": ["BTC"] }
  
  User Message: ${userMessage}
  `.trim();

    try {
      const response = await this.model.invoke([
        new SystemMessage("You are a Telegram bot message router."),
        new HumanMessage(prompt),
      ]);

      const raw = response.content?.toString() ?? "{}";
      const cleanedJson = cleanJsonBlock(raw);
      const json = JSON.parse(cleanedJson) as {
        function: "handlePriceQuery" | "handleTokenAddress";
        args: [string];
      };
      return json;
    } catch (error) {
      console.error("Failed to route function via Gemini:", error);
      return { function: "handlePriceQuery", args: ["BTC"] };
    }
  }
}
