# Telegram Token AI Assistant

A Telegram bot that provides cryptocurrency token information, price data, and AI-powered safety analysis.

## Features

- 🔍 **Token Lookup**: Get detailed information about any cryptocurrency token by symbol or contract address
- 💰 **Price Tracking**: Check current prices, market cap, and 24h volume
- 🧠 **AI Analysis**: Get AI-powered safety analysis and risk assessment for tokens
- 🔄 **Natural Language Processing**: Simply chat with the bot in natural language
- 📊 **Data Caching**: Efficient caching system to reduce API calls and improve response times
- 📝 **Query Logging**: All queries are logged for analysis and improvement

## Tech Stack

- **Backend**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google's Gemini 1.5 Flash via LangChain
- **Bot Framework**: grammY
- **APIs**: DexScreener, CoinGecko
- **Caching**: Node-Cache

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Telegram Bot Token (from BotFather)
- Google Gemini API Key

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/AlexMuhammad/telegram-bot-test-monklabs.git
   cd telegram-bot-test-monklabs
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Fill in the required environment variables in `.env`:

   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=postgresql://username:password@localhost:5432/dbname
   PORT=3000
   ```

5. Set up the database:

   ```bash
   npx prisma migrate dev --name init --schema src/data/repositories/prisma/schema.prisma
   ```

6. Build the project:
   ```bash
   npm run build
   ```

## Running the Bot

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## Bot Commands

- `/start` - Start the bot and get a welcome message
- `/help` - Get help and list of available commands

### Natural Language Queries

The bot uses AI to understand natural language queries:

- **Price Queries**: "What's the price of BTC?", "How much is ETH worth?", "PEPE price"
- **Token Analysis**: Send any token contract address (e.g., "0x1234...") to get detailed analysis

## API Endpoints

- `GET /` - Health check
- `GET /analyze` - Get recent token analysis queries
- `GET /price` - Get recent price queries
- `GET /analyze?tokenAddress=0x1234...` - Get recent analysis queries for a specific token address
- `GET /analyze?tokenId=PEPE` - Get recent analysis queries for a specific token symbol
- `GET /price?tokenAddress=0x1234...` - Get recent price queries for a specific token address
- `GET /price?tokenId=PEPE` - Get recent price queries for a specific token symbol

## External APIs Used

### DexScreener API

Used for fetching token information, liquidity data, and on-chain metrics.

- Base URL: `https://api.dexscreener.com/latest/dex/`
- Endpoints:
  - `/tokens/{address}` - Get token by address
  - `/search?q={symbol}` - Search for tokens by symbol

### CoinGecko API

Used for fetching token prices, market cap, and volume data.

- Base URL: `https://api.coingecko.com/api/v3/`
- Endpoints:
  - `/coins/markets?vs_currency=usd&symbols={symbol}` - Get token market data

## LangChain Prompt Structure

The bot uses LangChain with Google's Gemini model for AI-powered features:

### Function Routing Prompt

```typescript
  const prompt = `
  You are a function router for a Telegram bot. Based on the user's message, determine which function should be called:

  - Use "handlePriceQuery" when the user asks for the price of a token, e.g., "$BTC", "What's the price of $ETH?", or even just sends a token symbol or name (e.g., "SOL", "bonk", "dogwifhat"). Always return the token symbol WITHOUT the "$" sign.

  - Use "handleTokenAddress" when the user sends a blockchain token address. This could be:
    - Ethereum address (starts with "0x", 42 characters)
    - Solana address (base58 string, usually 32–44 characters)

  - Use "handleMarketTrends" when the user asks about overall market conditions, trends, or sentiment. Examples: "How is the market today?", "What's the crypto market looking like?", "Market analysis", "Market overview", etc.

  - Use "handleTokenRecommendation" when the user asks for token recommendations or suggestions in a specific category. Examples: "What are good DeFi tokens?", "Suggest some gaming tokens", "Best L1 alternatives", "Recommend NFT tokens", etc. Return the category as the argument (e.g., "DeFi", "Gaming", "L1", "NFT").

  - Use "handleTokenComparison" when the user wants to compare specific tokens or there are elements of comparison in the query. Examples: "Compare BTC and ETH", "Which is better, SOL or AVAX?", "BNB vs ETH", "Is MATIC outperforming ADA?", "How does LINK stack up against other oracle tokens?", etc. Return the full query as the argument.

  - Use "handleGeneralQuestion" for all other questions about specific tokens, crypto markets, or investment strategies. Examples include "Is X a good investment?", "Tell me about X token", "How does liquidity affect token price?", "What's happening with X token?", etc. Return the full question as the argument.

  Respond ONLY with a raw JSON object like this:
  { "function": "handlePriceQuery", "args": ["BTC"] }

  User Message: ${userMessage}
  `.trim(); Message: ${userMessage}
`;
```

### Token Analysis Prompt

```typescript
const prompt = `
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
```

### Safety Score Prompt

```typescript
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
```

### Market Trends Prompt

```typescript
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
```

### Token Recommendation Prompt

```typescript
const prompt = `
As a cryptocurrency expert, suggest 3-5 notable tokens based on the following real-time market data:
${trendingTokens}

For each recommended token, provide:
1. Token name and ticker
2. Current price (in BTC) and market cap rank
3. Its unique value proposition or problem it solves
4. Why it's noteworthy based on the provided data

Prioritize tokens that appear in the trending data. If not enough relevant tokens are trending, suggest well-known tokens.

Keep your response under 2000 characters. Use a concise, informative tone without making investment recommendations.
`;
```

### Token Comparison Prompt

```typescript
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

Focus on the key aspects mentioned in the user's query. Consider factors like price, volume, liquidity, and transaction activity. Provide a balanced view, mentioning both strengths and potential risks.

Keep your response under 2500 characters and maintain an educational tone without making investment recommendations.
`;
```

### General Question Prompt

```typescript
const prompt = `
Answer the following question about the token: "${question}"

If the user is specifically asking for the contract address, provide only that information.

Otherwise, provide a detailed response considering the token's:
1. Current price and performance metrics
2. What problem it solves or its unique value proposition
3. Why it might be interesting to watch based on the on-chain data
4. Any risks or red flags to consider

Keep your response under 2500 characters and maintain an educational tone without making investment recommendations.
`;
```

## Database Schema

### QueryLog Table

Stores all user queries and bot responses.

```prisma
model QueryLog {
  id           String   @id @default(uuid())
  userId       String
  command      String
  tokenAddress String?
  chainId      String?
  tokenId      String?
  tokenName    String?
  response     Json
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

## Caching Strategy

The bot uses a two-level caching strategy:

1. **In-memory cache**: Fast access for frequently requested tokens
2. **Database cache**: Persistent storage for historical queries

Default TTL is 10 minutes (600 seconds) to balance freshness with API efficiency.

## Docker Deployment

This project can be easily deployed using Docker and Docker Compose.

### Prerequisites

- Docker and Docker Compose installed on your system
- Telegram Bot Token (from BotFather)
- Google Gemini API Key

### Deployment Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/telegram-token-ai-assistant.git
   cd telegram-token-ai-assistant
   ```

2. Create a `.env` file with your environment variables:

   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL = postgresql://postgres:postgres@postgres:5432/telegram_bot
   PORT=3000
   ```

3. Build and start the containers:

   ```bash
   docker compose up -d
   ```

4. The application will be available at http://localhost:3000
   - The PostgreSQL database will be available at localhost:5432
   - pgAdmin will be available at http://localhost:5050

### Docker Compose Services

The Docker Compose configuration includes the following services:

1. **app**: The main application container running the Telegram bot
2. **postgres**: PostgreSQL database for storing bot data

### Container Management

- **View logs**:

  ```bash
  docker compose logs -f app
  ```

- **Restart the application**:

  ```bash
  docker compose restart app
  ```

- **Stop all services**:

  ```bash
  docker compose down
  ```

- **Stop and remove volumes (will delete all data)**:
  ```bash
  docker compose down -v
  ```
