import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { config } from "../../config";
import { CoinGeckoToken, DexScreenerToken, Token } from "../types";
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

  async generalQuestionAboutCrypto(question: string) {
    const prompt = `
      You are a cryptocurrency expert AI designed for a Telegram bot. Answer questions about cryptocurrencies, blockchain, DeFi, NFTs, wallets, exchanges, and related topics with accuracy and clarity. Follow these guidelines:

1. **On-Chain Data**: Always provide information based on on-chain data when discussing tokens or blockchain activities. Use real-time data from reliable sources.
2. **Expertise**: Utilize comprehensive knowledge of Bitcoin, Ethereum, altcoins, blockchain technology, smart contracts, and consensus mechanisms.
3. **Concise**: Keep answers brief (150-300 words) unless more detail is requested. Use simple language for beginners and technical terms for advanced users.
4. **Data Presentation**: Present on-chain data clearly, using bullet points, emojis (e.g., 📊, 🔗), or bold text for emphasis.
5. **User-Tailored**: Adapt your response based on the user's apparent level of expertise.
6. **Practical Insights**: Offer insights based on on-chain metrics like transaction volume, active addresses, or smart contract interactions.
7. **Engaging Tone**: Maintain a professional yet friendly tone, using emojis where appropriate.
8. **Clarification**: If the question is vague, ask for specifics to provide more accurate on-chain data.

Respond as a trusted advisor, focusing on providing factual, data-driven insights from on-chain sources. End with an invitation for more specific questions about on-chain metrics or token performance.
    `;

    try {
      const response = await this.model.invoke([
        new SystemMessage(prompt),
        new HumanMessage(question),
      ]);
      return cleanMarkdownFormatting(response.content as string);
    } catch (error) {
      logger.error("Error answering question", error);
      return "Failed to answer question";
    }
  }

  async routeFunction(userMessage: string): Promise<{
    function:
      | "handlePriceQuery"
      | "handleTokenAddress"
      | "handleTokenQuestion"
      | "handleMarketTrends"
      | "handleTokenRecommendation"
      | "handleTokenComparison";
    args: [string];
  }> {
    const prompt = `
  You are a function router for a Telegram bot. Based on the user's message, determine which function should be called:
  
  - Use "handlePriceQuery" when the user asks for the price of a token, e.g., "$BTC", "What's the price of $ETH?", or even just sends a token symbol or name (e.g., "SOL", "bonk", "dogwifhat"). Always return the token symbol WITHOUT the "$" sign.
  
  - Use "handleTokenAddress" when the user sends a blockchain token address. This could be:
    - Ethereum address (starts with "0x", 42 characters)
    - Solana address (base58 string, usually 32–44 characters)
  
  - Use "handleMarketTrends" when the user asks about overall market conditions, trends, or sentiment. Examples: "How is the market today?", "What's the crypto market looking like?", "Market analysis", "Market overview", etc.
  
  - Use "handleTokenRecommendation" when the user asks for token recommendations or suggestions in a specific category. Examples: "What are good DeFi tokens?", "Suggest some gaming tokens", "Best L1 alternatives", "Recommend NFT tokens", etc. Return the category as the argument (e.g., "DeFi", "Gaming", "L1", "NFT").
  
  - Use "handleTokenComparison" when the user wants to compare specific tokens or there are elements of comparison in the query. Examples: "Compare BTC and ETH", "Which is better, SOL or AVAX?", "BNB vs ETH", "Is MATIC outperforming ADA?", "How does LINK stack up against other oracle tokens?", etc. Return the full query as the argument.
  
  - Use "handleTokenQuestion" for all other questions about specific tokens, crypto markets, or investment strategies. Examples include "Is X a good investment?", "Tell me about X token", "How does liquidity affect token price?", "What's happening with X token?", etc. Return the full question as the argument.
  
  Respond ONLY with a raw JSON object like this:
  { "function": "handlePriceQuery", "args": ["BTC"] }
  
  User Message: ${userMessage}
  `.trim();

    try {
      const response = await this.model.invoke([
        new SystemMessage(
          "You are a Telegram bot message router with expertise in cryptocurrency terminology."
        ),
        new HumanMessage(prompt),
      ]);

      const raw = response.content?.toString() ?? "{}";
      const cleanedJson = cleanJsonBlock(raw);
      const json = JSON.parse(cleanedJson) as {
        function:
          | "handlePriceQuery"
          | "handleTokenAddress"
          | "handleTokenQuestion"
          | "handleMarketTrends"
          | "handleTokenRecommendation"
          | "handleTokenComparison";
        args: [string];
      };
      return json;
    } catch (error) {
      console.error("Failed to route function via Gemini:", error);
      return { function: "handleTokenQuestion", args: [userMessage] };
    }
  }

  async suggestTokens(marketData: { trendingTokens: any[] }): Promise<string> {
    const trendingTokens = marketData.trendingTokens.map((token: any) => {
      return `- ${token.item.name} (${token.item.symbol}): Price ${token.item.price_btc} BTC, Market Cap Rank ${token.item.market_cap_rank}`;
    });

    const prompt = `
      As a cryptocurrency expert, suggest 3-5 notable tokens based on the following real-time market data:
      
      TRENDING TOKENS:
      ${trendingTokens.join("\n")}
      
      For each recommended token, provide:
      1. Token name and ticker
      2. Current price (in BTC) and market cap rank
      3. Its unique value proposition or problem it solves
      4. Why it's noteworthy based on the provided data
      
      Prioritize tokens that appear in the trending data. If not enough relevant tokens are trending, suggest well-known tokens.
      
      Keep your response under 2000 characters. Use a concise, informative tone without making investment recommendations.
    `;

    try {
      const response = await this.model.invoke([
        new SystemMessage(
          "You are a cryptocurrency expert. Base your suggestions strictly on the provided market data and your knowledge of the crypto ecosystem."
        ),
        new HumanMessage({ content: prompt }),
      ]);

      return cleanMarkdownFormatting(response.content as string);
    } catch (error) {
      logger.error(`Error suggesting tokens`, error);
      return "I apologize, but I'm unable to provide token suggestions at the moment due to a technical issue.";
    }
  }

  async compareTokens(
    query: string,
    tokensData: {
      symbol: string;
      dexScreener: DexScreenerToken | null;
      coinGecko: CoinGeckoToken | null;
    }[]
  ): Promise<string> {
    const prompt = `
      Compare the following tokens based on the user's query: "${query}"
      
      TOKEN DATA:
      ${tokensData
        .map(
          (token) =>
            `- ${token.symbol}:
              Price: ${token.coinGecko?.price ?? "N/A"}
              24h Volume: ${token.coinGecko?.volume24h ?? "N/A"}
              Liquidity: ${token.dexScreener?.liquidity ?? "N/A"}
              24h Txns: ${token.dexScreener?.txns24h ?? "N/A"}`
        )
        .join("\n")}
      
      Provide a comparison analysis focusing on the key aspects mentioned in the user's query. Consider factors like price, volume, liquidity, and transaction activity. Provide a balanced view, mentioning both strengths and potential risks.
      
      Keep your response under 2500 characters and maintain an educational tone without making investment recommendations.
    `;

    try {
      const response = await this.model.invoke([
        new SystemMessage(
          "You are a cryptocurrency expert with deep knowledge of various blockchain projects and tokens across the ecosystem. You base your recommendations strictly on the provided on-chain data."
        ),
        new HumanMessage({ content: prompt }),
      ]);

      return cleanMarkdownFormatting(response.content as string);
    } catch (error) {
      logger.error(`Error comparing tokens: ${query}`, error);
      return "I'm sorry, I couldn't compare these tokens at the moment.";
    }
  }

  async analyzeMarketTrends(data: any): Promise<string> {
    const trendingTokens = data.map((token: any) => {
      return `- ${JSON.stringify(token.item)}`;
    });

    const prompt = `
      Analyze the current market trends and conditions based on the following trending tokens data:
      ${trendingTokens}
      
      Provide an overview of the overall market sentiment, including:
      1. Key metrics (e.g., total market cap, total 24h volume)
      2. Major trends (bullish, bearish, sideways)
      3. Notable events or news affecting the market
      4. Any emerging trends or technologies
      
      Keep your response under 2500 characters and maintain an educational tone without making investment recommendations.
    `;

    try {
      const response = await this.model.invoke([
        new SystemMessage(
          "You are a cryptocurrency expert with deep knowledge of various blockchain projects and tokens across the ecosystem. You base your recommendations strictly on the provided on-chain data."
        ),
        new HumanMessage({ content: prompt }),
      ]);

      return cleanMarkdownFormatting(response.content as string);
    } catch (error) {
      logger.error("Error analyzing market trends", error);
      return "I'm sorry, I couldn't analyze market trends at the moment.";
    }
  }

  async extractTokenSymbols(text: string, tokenList: any[]): Promise<string[]> {
    const tokenSymbols = tokenList.map((token: any) => token.symbol);

    try {
      const prompt = `
Extract cryptocurrency token symbols from the following text: "${text}"

Your task:
1. Identify all potential cryptocurrency tokens mentioned in the text — especially in contexts such as comparisons, questions, or preferences (e.g., "X or Y", "Which is better", etc.).
2. Detect tokens regardless of how they are written:
   - With or without a "$" prefix (e.g., "$btc", "btc", "BTC" are all valid)
   - In lowercase, uppercase, or mixed case (e.g., "moodeng", "MoodEng", "MOODENG")
3. Normalize all detected token symbols by:
   - Removing any "$" prefix
   - Converting to **UPPERCASE**
4. Do NOT include generic words or random terms — only likely cryptocurrency token names.
5. If no token symbols are found, return an empty array.
6. For tokens that are not easily recognizable without the "$" prefix, consider the context and compare against the provided list of token symbols.

✅ Return format: A JSON array of uppercase symbols (no "$"), e.g., ["BTC", "ETH", "MOODENG"]
❌ If no tokens are found, return: []

List of valid token symbols for reference:
${tokenSymbols.join(", ")}
`;

      const response = await this.model.invoke([
        new SystemMessage("You extract token symbols from text."),
        new HumanMessage(prompt),
      ]);

      const content = response.content?.toString() || "[]";
      const cleanedJson = cleanJsonBlock(content);

      try {
        const symbols = JSON.parse(cleanedJson) as string[];
        return symbols.filter((symbol) => symbol.length > 0);
      } catch (e) {
        logger.error("Error parsing token symbols JSON", e);
        return [];
      }
    } catch (error) {
      logger.error("Error extracting token symbols", error);
      return [];
    }
  }

  async answerTokenQuestion(
    question: string,
    tokenData: any[]
  ): Promise<string> {
    const tokenInfo = tokenData
      .map(
        (token) =>
          `- ${token.dexScreener?.symbol}:
              ${JSON.stringify(token.dexScreener)}
              ${JSON.stringify(token.coinGecko)}
              `
      )
      .join("\n");

    const prompt = `
      Answer the following question about the token: "${question}"
      
      If the user is specifically asking for the contract address, provide only that information.
      
      Otherwise, provide a detailed response considering the token's:
      1. Current price and performance metrics
      2. What problem it solves or its unique value proposition
      3. Why it might be interesting to watch based on the on-chain data
      4. Any risks or red flags to consider
      
      Base your response on this data: ${tokenInfo}
      
      Keep your response under 2500 characters and maintain an educational tone without making investment recommendations.
    `;

    try {
      const response = await this.model.invoke([
        new SystemMessage(
          "You are a cryptocurrency expert with deep knowledge of various blockchain projects and tokens across the ecosystem. You base your recommendations strictly on the provided on-chain data."
        ),
        new HumanMessage({ content: prompt }),
      ]);

      return cleanMarkdownFormatting(response.content as string);
    } catch (error) {
      logger.error(`Error answering token question: ${question}`, error);
      return "I'm sorry, I couldn't answer your question at the moment.";
    }
  }
}
