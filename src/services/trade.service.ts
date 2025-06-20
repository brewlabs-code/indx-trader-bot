import { parseEther, encodeFunctionData } from 'viem';
import { CONFIG, ETH_ADDRESS } from '../config/constants';
import { indexAbi } from '../config/abis';
import { dataAbi } from '../config/dataAbi';
import { BlockchainService } from './blockchain.service';

interface FormattedOffer {
  amounts: bigint[];
  adapters: `0x${string}`[];
  path: `0x${string}`[];
  gasEstimate: bigint;
}

// Define the Trade type to match the ABI exactly
type TradeStruct = {
  amountIn: bigint;
  amountOut: bigint;
  path: `0x${string}`[];
  adapters: `0x${string}`[];
};

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
      console.log('Calling precomputeZapIn on data contract...');
      const formattedOffers = await publicClient.readContract({
        address: CONFIG.DATA_CONTRACT_ADDRESS,
        abi: dataAbi,
        functionName: 'precomputeZapIn',
        args: [
          CONFIG.AGGREGATOR_ADDRESS,
          ETH_ADDRESS,
          ethAmount,
          tokenAddresses,
          percents
        ],
      }) as FormattedOffer[];

      console.log('Received formatted offers:', formattedOffers.length);

      // Transform FormattedOffer array to TradeStruct array
      const trades: TradeStruct[] = formattedOffers.map((offer, index) => {
        // Calculate the amount for this token
        const amountForToken = (ethAmount * percents[index]) / 10000n;
        
        // If the offer has no path (empty offer), create a minimal trade
        if (!offer.path || offer.path.length === 0) {
          console.log(`Token ${index}: Empty offer, creating minimal trade`);
          return {
            amountIn: amountForToken,
            amountOut: 0n,
            path: [],
            adapters: []
          } as TradeStruct;
        }

        // Get the output amount (last amount in the amounts array)
        const amountOut = offer.amounts.length > 1 ? offer.amounts[offer.amounts.length - 1] : offer.amounts[0];
        
        console.log(`Token ${index}: ${amountForToken.toString()} wei -> ${amountOut.toString()} tokens`);
        
        return {
          amountIn: amountForToken,
          amountOut: amountOut,
          path: offer.path,
          adapters: offer.adapters
        } as TradeStruct;
      });

      console.log('Transformed trades:', trades.length);

      // Execute zapIn on the INDEX_ADDRESS using raw transaction
      console.log('Executing zapIn...');
      
      // Encode the function data
      const data = encodeFunctionData({
        abi: indexAbi,
        functionName: 'zapIn',
        args: [
          ETH_ADDRESS as `0x${string}`,
          ethAmount,
          percents,
          trades,
          0n,
          CONFIG.MAX_SLIPPAGE,
        ],
      });

      // Send the transaction
      const hash = await walletClient.sendTransaction({
        to: CONFIG.INDEX_ADDRESS,
        data,
        value: ethAmount,
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
      console.log('Calling precomputeZapOut on data contract...');
      const formattedOffers = await publicClient.readContract({
        address: CONFIG.DATA_CONTRACT_ADDRESS,
        abi: dataAbi,
        functionName: 'precomputeZapOut',
        args: [
          CONFIG.AGGREGATOR_ADDRESS,
          tokenAddresses,
          tokenBalances,
          ETH_ADDRESS as `0x${string}`
        ],
      }) as FormattedOffer[];

      console.log('Received formatted offers for exit:', formattedOffers.length);

      // Transform FormattedOffer array to TradeStruct array
      const trades: TradeStruct[] = formattedOffers.map((offer, index) => {
        // If the offer has no path (empty offer), create a minimal trade
        if (!offer.path || offer.path.length === 0) {
          console.log(`Token ${index}: Empty offer for exit`);
          return {
            amountIn: tokenBalances[index],
            amountOut: 0n,
            path: [],
            adapters: []
          } as TradeStruct;
        }

        // Get the output amount (last amount in the amounts array)
        const amountOut = offer.amounts.length > 1 ? offer.amounts[offer.amounts.length - 1] : offer.amounts[0];
        
        console.log(`Token ${index}: ${tokenBalances[index].toString()} tokens -> ${amountOut.toString()} wei`);
        
        return {
          amountIn: tokenBalances[index],
          amountOut: amountOut,
          path: offer.path,
          adapters: offer.adapters
        } as TradeStruct;
      });

      // Execute zapOut on the INDEX_ADDRESS using raw transaction
      console.log('Executing zapOut...');
      
      // Encode the function data
      const data = encodeFunctionData({
        abi: indexAbi,
        functionName: 'zapOut',
        args: [
          ETH_ADDRESS as `0x${string}`,
          trades,
          0n,
          CONFIG.MAX_SLIPPAGE,
        ],
      });

      // Send the transaction
      const hash = await walletClient.sendTransaction({
        to: CONFIG.INDEX_ADDRESS,
        data,
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
