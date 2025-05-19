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
   git clone https://github.com/yourusername/telegram-token-ai-assistant.git
   cd telegram-token-ai-assistant
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

- Use "handlePriceQuery" when the user asks for the price of a token, e.g., "$BTC", "What's the price of $ETH?", or even just sends a token symbol or name (e.g., "SOL", "bonk", "dogwifhat"). Be optimistic — if it sounds like a token or coin name, assume it's a price query. Always return the token symbol WITHOUT the "$" sign.
- Use "handleTokenAddress" when the user sends a blockchain token address. This could be:
  - Ethereum address (starts with "0x", 42 characters)
  - Solana address (base58 string, usually 32–44 characters)

Respond ONLY with a raw JSON object like this:
{ "function": "handlePriceQuery", "args": ["BTC"] }

User Message: ${userMessage}
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

Cache keys are structured as:

- `token_address_{address}` - For token address lookups
- `token_symbol_{symbol}` - For token symbol lookups
- `bot_response_{type}_{query}` - For bot responses (e.g., price, analysis)

Default TTL is 10 minutes (600 seconds) to balance freshness with API efficiency.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

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
