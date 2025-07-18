# Index Trading Bot

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/index-trading-bot)

## Overview

Automated cryptocurrency index trading bot that runs on Netlify's serverless infrastructure. The bot monitors trading signals, automatically enters positions on strong buy signals, and takes profit at configurable targets while never selling at a loss.

### Key Features
- **Automated Signal Monitoring**: Checks for buy signals every 5 minutes
- **Position Management**: Monitors positions for profit targets every 15 minutes  
- **Diamond Hands Strategy**: Never sells at a loss, only takes profits
- **Serverless Architecture**: Runs entirely on Netlify functions
- **Manual Override**: API endpoints for manual trading control
- **Multi-Index Support**: Configurable for different index contracts

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Netlify       │    │  Base Network    │    │  Signals API    │
│   Functions     │◄──►│  Smart Contracts │    │                 │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ ┌─────────────┐ │
│ │check-signals│ │    │ │ Index        │ │    │ │   Market    │ │
│ │   (5min)    │ │    │ │ Contract     │ │    │ │  Analysis   │ │
│ └─────────────┘ │    │ └──────────────┘ │    │ └─────────────┘ │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    └─────────────────┘
│ │check-       │ │    │ │ Data         │ │
│ │positions    │ │    │ │ Contract     │ │
│ │   (15min)   │ │    │ └──────────────┘ │
│ └─────────────┘ │    │                  │
└─────────────────┘    └──────────────────┘
```

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Blockchain**: Viem (v2.7.0) for Ethereum interactions
- **Deployment**: Netlify Functions
- **Network**: Base L2 (Chain ID: 8453)
- **Scheduling**: Netlify cron expressions

## Prerequisites

1. **Node.js 18+** with npm
2. **Git** for version control
3. **Netlify account** (free tier sufficient)
4. **GitHub account** for repository hosting
5. **Base network wallet** with ETH for gas and trading
6. **Private key** from wallet (MetaMask, etc.)

## Project Structure

```
index-trading-bot/
├── netlify/
│   └── functions/
│       ├── bot-status.ts          # GET /api/bot-status
│       ├── check-positions.ts     # Cron: */15 * * * *
│       ├── check-signals.ts       # Cron: */5 * * * *
│       ├── sell-position.ts       # POST /api/sell-position
│       └── take-position.ts       # POST /api/take-position
├── src/
│   ├── config/
│   │   ├── abis.ts               # Index contract ABI
│   │   ├── constants.ts          # Environment configuration
│   │   └── dataAbi.ts           # Data contract ABI
│   └── services/
│       ├── blockchain.service.ts # Viem wallet/client setup
│       ├── position.service.ts   # Position tracking & P&L
│       ├── signal.service.ts     # Signal API integration
│       └── trade.service.ts      # ZapIn/ZapOut execution
├── netlify.toml                  # Netlify configuration
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
└── .env.example                  # Environment template
```

## Environment Configuration

Create `.env` file with the following variables:

### Required Variables
```bash
# Wallet Configuration
PRIVATE_KEY=0x1234567890abcdef...  # Your wallet private key

# Network Configuration  
BASE_RPC_URL=https://base.llamarpc.com  # Base network RPC endpoint

# Smart Contract Addresses
INDEX_ADDRESS=0x1feb5976881a3cb7f55c7c87b52bda88c7a00a95  # Index contract
DATA_CONTRACT_ADDRESS=0x...  # Data contract for trade computation
AGGREGATOR_ADDRESS=0x...     # DEX aggregator contract

# API Configuration
SIGNALS_API_URL=https://your-signals-api.netlify.app  # Signal provider
SIGNALS_API_KEY=your_secret_key  # API authentication

# Trading Parameters
PROFIT_TARGET=5.0           # Profit percentage to trigger sell (5.0 = 5%)
GAS_BUFFER_ETH=0.005       # ETH to reserve for gas (0.005 = 5% of 0.1 ETH)
MAX_SLIPPAGE=200           # Maximum slippage (200 = 2%)
MIN_SIGNAL_STRENGTH=6      # Minimum signal strength (1-10 scale)
```

### Environment Variable Details

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `PRIVATE_KEY` | string | Wallet private key (with 0x prefix) | `0x1234...` |
| `BASE_RPC_URL` | string | Base network RPC endpoint | `https://base.llamarpc.com` |
| `INDEX_ADDRESS` | address | Target index contract address | `0x1feb...` |
| `DATA_CONTRACT_ADDRESS` | address | Data contract for trade routing | `0xabcd...` |
| `AGGREGATOR_ADDRESS` | address | DEX aggregator for swaps | `0xefgh...` |
| `SIGNALS_API_URL` | string | Signal provider base URL | `https://api.example.com` |
| `SIGNALS_API_KEY` | string | API key for authentication | `sk_live_...` |
| `PROFIT_TARGET` | number | Profit % to trigger sell (5.0 = 5%) | `5.0` |
| `GAS_BUFFER_ETH` | number | ETH to reserve for gas | `0.005` |
| `MAX_SLIPPAGE` | number | Max slippage in basis points | `200` |
| `MIN_SIGNAL_STRENGTH` | number | Min signal strength (1-10) | `6` |

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/index-trading-bot.git
cd index-trading-bot
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Deploy to Netlify

#### Option A: GitHub Integration
1. Push to GitHub:
```bash
git add .
git commit -m "Initial setup"
git push origin main
```

2. Connect to Netlify:
   - Go to [netlify.com](https://netlify.com)
   - "New site from Git" → Select repository
   - Build settings: `npm run build` / publish directory: `.`

3. Add environment variables in Netlify dashboard

#### Option B: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
netlify env:set PRIVATE_KEY "0x..."
netlify env:set BASE_RPC_URL "https://base.llamarpc.com"
# ... set all environment variables
```

### 4. Verify Deployment
Check function endpoints:
- `GET /api/bot-status` - Bot status and configuration
- Function logs in Netlify dashboard
- Cron functions executing every 5/15 minutes

## API Endpoints

### GET /api/bot-status
Returns current bot status, balance, and position information.

**Response:**
```json
{
  "bot": {
    "wallet": "0x...",
    "balance": "1000000000000000000",
    "indexAddress": "0x...",
    "profitTarget": 5.0
  },
  "position": "No position" | {...},
  "signal": "No signal" | {...},
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

### POST /api/take-position
Manually enter a position with available balance.

**Headers:**
```
x-api-key: YOUR_SIGNALS_API_KEY
```

**Response:**
```json
{
  "status": "position_taken",
  "txHash": "0x...",
  "amount": "950000000000000000",
  "indexAddress": "0x...",
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

### POST /api/sell-position
Manually exit current position.

**Headers:**
```
x-api-key: YOUR_SIGNALS_API_KEY
```

**Response:**
```json
{
  "status": "position_sold",
  "txHash": "0x...",
  "profitLoss": {
    "percentage": 7.5,
    "usd": "125.50",
    "eth": "0.045"
  },
  "soldValue": {...},
  "timestamp": "2025-01-18T10:30:00.000Z"
}
```

## Trading Logic

### Signal Processing (`check-signals`)
1. **Position Check**: Exit early if position exists
2. **Signal Fetch**: Get current signal from API
3. **Buy Decision**: Evaluate signal strength and type
4. **Balance Check**: Ensure sufficient ETH (minus gas buffer)
5. **Trade Execution**: Execute zapIn if all conditions met

### Position Management (`check-positions`)
1. **Position Fetch**: Get current position with P&L
2. **Profit Check**: Sell if profit >= target percentage
3. **Loss Handling**: Hold position if in loss (never sell at loss)
4. **Trade Execution**: Execute zapOut for profit taking

### Trade Execution
- **Entry**: Uses `zapIn` with ETH → index tokens via DEX aggregation
- **Exit**: Uses `zapOut` with index tokens → ETH via DEX aggregation
- **Slippage**: Configurable maximum slippage protection
- **Gas**: 12M gas limit with buffer for complex swaps

## Monitoring & Debugging

### Function Logs
```bash
netlify functions:log
# Or via Netlify dashboard → Functions → View logs
```

### Common Log Patterns
```
=== CHECK SIGNALS FUNCTION START ===
Step 1: Checking for existing position...
Step 2: Fetching signals...
Step 3: Evaluating buy decision...
Step 4: Checking available balance...
Step 5: Entering position with X wei
```

### Error Handling
- All functions include comprehensive error logging
- Failed trades return detailed error messages
- Network issues are retried automatically by Netlify

## Security Considerations

### Private Key Protection
- Never commit `.env` files to version control
- Use Netlify environment variables for production
- Consider using a dedicated trading wallet
- Rotate keys if compromised

### API Security
- Protect `SIGNALS_API_KEY` as environment variable
- Use HTTPS-only endpoints
- Implement rate limiting if needed

### Smart Contract Risks
- Audit contract addresses before deployment
- Start with small amounts for testing
- Monitor for unusual gas consumption
- Have emergency stop procedures

## Troubleshooting

### Common Issues

#### "Insufficient balance"
```bash
# Check wallet balance
curl https://YOUR_SITE.netlify.app/api/bot-status

# Verify GAS_BUFFER_ETH setting
netlify env:get GAS_BUFFER_ETH
```

#### "No signal" / "No buy signal"
```bash
# Test signal API directly
curl "https://YOUR_SIGNALS_API.netlify.app/api/signals?index=0x...&key=..."

# Check MIN_SIGNAL_STRENGTH setting
netlify env:get MIN_SIGNAL_STRENGTH
```

#### "Internal server error"
```bash
# Check function logs
netlify functions:log

# Verify environment variables
netlify env:list
```

#### Functions not executing
- Check `netlify.toml` cron expressions
- Verify successful deployment
- Check Netlify function dashboard

### Development Mode
```bash
# Run locally
netlify dev

# Test individual functions
netlify functions:serve
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Risk Disclaimer

⚠️ **AUTOMATED TRADING INVOLVES SIGNIFICANT RISK**

- **Smart Contract Risk**: Bugs could cause loss of funds
- **Market Risk**: Volatile markets can cause substantial losses
- **Technical Risk**: Network issues, API failures, configuration errors
- **Regulatory Risk**: Trading regulations vary by jurisdiction

**Recommendations:**
- Start with small amounts
- Understand all code before deployment
- Monitor bot performance regularly
- Have emergency procedures ready
- Never risk more than you can afford to lose

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately

---

**Built with ❤️ for the DeFi community**
