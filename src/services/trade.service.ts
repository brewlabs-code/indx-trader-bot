import { parseEther } from 'viem';
import { CONFIG, ETH_ADDRESS } from '../config/constants';
import { indexAbi } from '../config/abis';
import { dataAbi } from '../config/dataAbi';
import { BlockchainService } from './blockchain.service';

// WETH address on Base
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

// Gas limit for zapIn and zapOut transactions
const ZAP_GAS_LIMIT = 12_000_000n;

interface FormattedOffer {
  amounts: bigint[];
  adapters: `0x${string}`[];
  path: `0x${string}`[];
  gasEstimate: bigint;
}

export class TradeService {
  private blockchain: BlockchainService;

  constructor() {
    this.blockchain = new BlockchainService();
  }

  async enterPosition(ethAmount: bigint): Promise<string | null> {
    try {
      const publicClient = this.blockchain.getPublicClient();
      const walletClient = this.blockchain.getWalletClient();

      console.log('TradeService.enterPosition called with amount:', ethAmount.toString());

      // Validate we have required addresses
      if (!CONFIG.DATA_CONTRACT_ADDRESS || CONFIG.DATA_CONTRACT_ADDRESS === ('your_data_contract_address' as `0x${string}`)) {
        console.error('DATA_CONTRACT_ADDRESS not configured');
        return null;
      }

      if (!CONFIG.AGGREGATOR_ADDRESS || CONFIG.AGGREGATOR_ADDRESS === ('your_aggregator_address' as `0x${string}`)) {
        console.error('AGGREGATOR_ADDRESS not configured');
        return null;
      }

      // Get number of tokens in index
      const numTokens = await publicClient.readContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'NUM_TOKENS',
      });

      console.log('Number of tokens in index:', numTokens.toString());

      // Get token addresses
      const tokenAddresses: `0x${string}`[] = [];
      for (let i = 0; i < Number(numTokens); i++) {
        const tokenAddress = await publicClient.readContract({
          address: CONFIG.INDEX_ADDRESS,
          abi: indexAbi,
          functionName: 'tokens',
          args: [BigInt(i)],
        });
        tokenAddresses.push(tokenAddress as `0x${string}`);
      }

      console.log('Index token addresses:', tokenAddresses);

      // Create equal weight distribution
      const equalPercent = 10000n / numTokens;
      const percents = Array(Number(numTokens)).fill(equalPercent);
      
      console.log('Percents array:', percents.map(p => p.toString()));

      // Get precomputed trades from data contract
      // Use WETH address for data contract calls since it computes paths from WETH
      console.log('Calling precomputeZapIn on data contract with WETH address...');
      const formattedOffers = await publicClient.readContract({
        address: CONFIG.DATA_CONTRACT_ADDRESS,
        abi: dataAbi,
        functionName: 'precomputeZapIn',
        args: [
          CONFIG.AGGREGATOR_ADDRESS,
          WETH_ADDRESS, // Use WETH for path computation
          ethAmount,
          tokenAddresses,
          percents
        ],
      }) as FormattedOffer[];

      console.log('Received formatted offers:', formattedOffers.length);

      // Create trades array with NUM_TOKENS + 1 elements
      const trades = new Array(Number(numTokens) + 1);
      
      // First trade (index 0) is for token-to-ETH conversion
      // Since we're starting with ETH, this is empty
      trades[0] = {
        amountIn: 0n,
        amountOut: 0n,
        path: [] as `0x${string}`[],
        adapters: [] as `0x${string}`[]
      };

      // Transform FormattedOffer array to Trade array (indices 1 to NUM_TOKENS)
      for (let i = 0; i < formattedOffers.length; i++) {
        const offer = formattedOffers[i];
        const targetToken = tokenAddresses[i];
        const amountForToken = (ethAmount * percents[i]) / 10000n;
        
        // Check if target token is WETH (should be index 0 based on contract)
        const isTargetWETH = targetToken.toLowerCase() === WETH_ADDRESS.toLowerCase();
        
        if (isTargetWETH) {
          // For WETH, the contract will handle the deposit internally
          // We provide an empty trade
          console.log(`Token ${i}: WETH - will be deposited directly`);
          trades[i + 1] = {
            amountIn: 0n, // Contract will set this
            amountOut: 0n, // Contract will set this
            path: [] as `0x${string}`[], // Empty path
            adapters: [] as `0x${string}`[]
          };
        } else if (!offer.path || offer.path.length === 0) {
          // Empty offer from data contract
          console.log(`Token ${i}: Empty offer, creating minimal trade`);
          trades[i + 1] = {
            amountIn: 0n,
            amountOut: 0n,
            path: [] as `0x${string}`[],
            adapters: [] as `0x${string}`[]
          };
        } else {
          // Regular swap path
          const amountOut = offer.amounts.length > 1 ? offer.amounts[offer.amounts.length - 1] : offer.amounts[0];
          
          console.log(`Token ${i}: ${amountForToken.toString()} wei -> ${amountOut.toString()} tokens`);
          console.log(`  Path: ${offer.path.join(' -> ')}`);
          console.log(`  Adapters: ${offer.adapters.length > 0 ? offer.adapters.join(', ') : 'none'}`);
          
          trades[i + 1] = {
            amountIn: 0n, // Contract will set this based on percents
            amountOut: amountOut,
            path: offer.path,
            adapters: offer.adapters
          };
        }
      }

      console.log('Transformed trades:', trades.length);
      
      // Log the trades for debugging
      trades.forEach((trade, index) => {
        console.log(`Trade ${index}:`, {
          amountIn: trade.amountIn.toString(),
          amountOut: trade.amountOut.toString(),
          pathLength: trade.path.length,
          path: trade.path.join(' -> ') || 'empty',
          adapters: trade.adapters.join(', ') || 'none'
        });
      });

      // Execute zapIn on the INDEX_ADDRESS with ETH
      console.log('Executing zapIn with ETH...');
      console.log('Gas limit:', ZAP_GAS_LIMIT.toString());
      const hash = await walletClient.writeContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'zapIn',
        args: [
          ETH_ADDRESS as `0x${string}`, // ETH address since we're sending ETH
          ethAmount,
          percents,
          trades as any, // Type assertion to bypass viem's strict typing
          0n, // minTotalValueOut
          CONFIG.MAX_SLIPPAGE,
        ],
        value: ethAmount, // Send ETH with the transaction
        gas: ZAP_GAS_LIMIT, // Set gas limit to 12M
      });

      console.log('Enter position tx:', hash);
      return hash;
    } catch (error: any) {
      console.error('Error entering position:', error);
      console.error('Error details:', {
        message: error.message,
        cause: error.cause?.message,
        details: error.details,
      });
      return null;
    }
  }

  async exitPosition(): Promise<string | null> {
    try {
      const publicClient = this.blockchain.getPublicClient();
      const walletClient = this.blockchain.getWalletClient();
      const userAddress = this.blockchain.account.address;

      console.log('TradeService.exitPosition called');

      // Validate we have required addresses
      if (!CONFIG.DATA_CONTRACT_ADDRESS || CONFIG.DATA_CONTRACT_ADDRESS === ('your_data_contract_address' as `0x${string}`)) {
        console.error('DATA_CONTRACT_ADDRESS not configured');
        return null;
      }

      if (!CONFIG.AGGREGATOR_ADDRESS || CONFIG.AGGREGATOR_ADDRESS === ('your_aggregator_address' as `0x${string}`)) {
        console.error('AGGREGATOR_ADDRESS not configured');
        return null;
      }

      // Get user's balance in the index
      const userBalance = await publicClient.readContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'balanceOf',
        args: [userAddress],
      });

      if (userBalance === 0n) {
        console.log('User has no balance in the index');
        return null;
      }

      console.log('User index balance:', userBalance.toString());

      // Get number of tokens in index
      const numTokens = await publicClient.readContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'NUM_TOKENS',
      });

      // Get token addresses and user's balance of each token
      const tokenAddresses: `0x${string}`[] = [];
      const tokenBalances: bigint[] = [];
      
      for (let i = 0; i < Number(numTokens); i++) {
        const tokenAddress = await publicClient.readContract({
          address: CONFIG.INDEX_ADDRESS,
          abi: indexAbi,
          functionName: 'tokens',
          args: [BigInt(i)],
        });
        
        tokenAddresses.push(tokenAddress as `0x${string}`);
        
        // Get user's balance of this specific token in the index
        try {
          const tokenBalance = await publicClient.readContract({
            address: CONFIG.INDEX_ADDRESS,
            abi: indexAbi,
            functionName: 'getTokenBalance',
            args: [userAddress, BigInt(i)],
          });
          tokenBalances.push(tokenBalance);
        } catch {
          // If getTokenBalance doesn't exist, calculate proportional share
          // This is a fallback - you may need to adjust based on your index implementation
          const proportionalBalance = userBalance / numTokens;
          tokenBalances.push(proportionalBalance);
        }
      }

      console.log('Exit - Token addresses:', tokenAddresses);
      console.log('Exit - Token balances:', tokenBalances.map(b => b.toString()));

      // Get precomputed trades for exit from data contract
      // Use WETH address for data contract calls
      console.log('Calling precomputeZapOut on data contract with WETH address...');
      const formattedOffers = await publicClient.readContract({
        address: CONFIG.DATA_CONTRACT_ADDRESS,
        abi: dataAbi,
        functionName: 'precomputeZapOut',
        args: [
          CONFIG.AGGREGATOR_ADDRESS,
          tokenAddresses,
          tokenBalances,
          WETH_ADDRESS // Use WETH for ETH output
        ],
      }) as FormattedOffer[];

      console.log('Received formatted offers for exit:', formattedOffers.length);

      // Create trades array with NUM_TOKENS + 1 elements
      const trades = new Array(Number(numTokens) + 1);
      
      // Transform FormattedOffer array to Trade array (indices 0 to NUM_TOKENS-1)
      for (let i = 0; i < formattedOffers.length; i++) {
        const offer = formattedOffers[i];
        const sourceToken = tokenAddresses[i];
        
        // Check if source token is WETH
        const isSourceWETH = sourceToken.toLowerCase() === WETH_ADDRESS.toLowerCase();
        
        if (isSourceWETH) {
          // For WETH exit, the contract will handle unwrapping
          console.log(`Token ${i}: WETH - will be unwrapped directly`);
          trades[i] = {
            amountIn: tokenBalances[i],
            amountOut: tokenBalances[i], // 1:1 for unwrapping
            path: [] as `0x${string}`[], // Empty path
            adapters: [] as `0x${string}`[]
          };
        } else if (!offer.path || offer.path.length === 0) {
          // Empty offer
          console.log(`Token ${i}: Empty offer for exit`);
          trades[i] = {
            amountIn: tokenBalances[i],
            amountOut: 0n,
            path: [] as `0x${string}`[],
            adapters: [] as `0x${string}`[]
          };
        } else {
          // Regular swap path
          const amountOut = offer.amounts.length > 1 ? offer.amounts[offer.amounts.length - 1] : offer.amounts[0];
          
          console.log(`Token ${i}: ${tokenBalances[i].toString()} tokens -> ${amountOut.toString()} wei`);
          console.log(`  Path: ${offer.path.join(' -> ')}`);
          console.log(`  Adapters: ${offer.adapters.length > 0 ? offer.adapters.join(', ') : 'none'}`);
          
          trades[i] = {
            amountIn: tokenBalances[i],
            amountOut: amountOut,
            path: offer.path,
            adapters: offer.adapters
          };
        }
      }
      
      // Last trade (index NUM_TOKENS) is for ETH-to-token conversion
      // Since we're outputting ETH, this is empty
      trades[Number(numTokens)] = {
        amountIn: 0n,
        amountOut: 0n,
        path: [] as `0x${string}`[],
        adapters: [] as `0x${string}`[]
      };

      // Execute zapOut on the INDEX_ADDRESS to ETH
      console.log('Executing zapOut to ETH...');
      console.log('Gas limit:', ZAP_GAS_LIMIT.toString());
      const hash = await walletClient.writeContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'zapOut',
        args: [
          ETH_ADDRESS as `0x${string}`, // ETH address since we want ETH back
          trades as any, // Type assertion to bypass viem's strict typing
          0n, // minTotalOut
          CONFIG.MAX_SLIPPAGE,
        ],
        gas: ZAP_GAS_LIMIT, // Set gas limit to 12M
      });

      console.log('Exit position tx:', hash);
      return hash;
    } catch (error: any) {
      console.error('Error exiting position:', error);
      console.error('Error details:', {
        message: error.message,
        cause: error.cause?.message,
        details: error.details,
      });
      return null;
    }
  }
}
