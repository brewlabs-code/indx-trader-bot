export const CONFIG = {
  // Network
  CHAIN_ID: 8453, // Base
  RPC_URL: process.env.BASE_RPC_URL!,
  
  // Contracts
  INDEX_ADDRESS: process.env.INDEX_ADDRESS! as `0x${string}`,
  DATA_CONTRACT_ADDRESS: process.env.DATA_CONTRACT_ADDRESS! as `0x${string}`,
  AGGREGATOR_ADDRESS: process.env.AGGREGATOR_ADDRESS! as `0x${string}`,
  
  // Trading
  PROFIT_TARGET: parseFloat(process.env.PROFIT_TARGET || "5.0"),
  GAS_BUFFER_ETH: parseFloat(process.env.GAS_BUFFER_ETH || "0.005"),
  MAX_SLIPPAGE: BigInt(process.env.MAX_SLIPPAGE || "200"),
  MIN_SIGNAL_STRENGTH: parseInt(process.env.MIN_SIGNAL_STRENGTH || "6"),
  
  // API
  SIGNALS_API_URL: process.env.SIGNALS_API_URL!,
  SIGNALS_API_KEY: process.env.SIGNALS_API_KEY!,
  
  // Wallet
  PRIVATE_KEY: process.env.PRIVATE_KEY! as `0x${string}`,
} as const;

// ETH address for native token
export const ETH_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
