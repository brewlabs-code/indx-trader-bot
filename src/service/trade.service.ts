import { parseEther } from 'viem';
import { CONFIG, ETH_ADDRESS } from '../config/constants';
import { indexAbi } from '../config/abis';
import { BlockchainService } from './blockchain.service';

export class TradeService {
  private blockchain: BlockchainService;

  constructor() {
    this.blockchain = new BlockchainService();
  }

  async enterPosition(ethAmount: bigint): Promise<string | null> {
    try {
      const publicClient = this.blockchain.getPublicClient();
      const walletClient = this.blockchain.getWalletClient();

      // Get number of tokens in index
      const numTokens = await publicClient.readContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'NUM_TOKENS',
      });

      // Create equal weight distribution
      const equalPercent = 10000n / numTokens;
      const percents = Array(Number(numTokens)).fill(equalPercent);

      // Get pre-computed trades using the data contract
      const zapInfo = await publicClient.readContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'computeZapInfo',
        args: [ETH_ADDRESS, ethAmount, percents],
      });

      const [trades, expectedOutputs, slippages, totalValue] = zapInfo;

      console.log('Zap Info:', {
        tradesCount: trades.length,
        expectedOutputs,
        slippages,
        totalValue,
      });

      // Execute zapIn
      const hash = await walletClient.writeContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'zapIn',
        args: [
          ETH_ADDRESS,
          ethAmount,
          percents,
          trades,
          0n, // minTotalValueOut
          CONFIG.MAX_SLIPPAGE,
        ],
        value: ethAmount,
      });

      console.log('Enter position tx:', hash);
      return hash;
    } catch (error) {
      console.error('Error entering position:', error);
      return null;
    }
  }

  async exitPosition(): Promise<string | null> {
    try {
      const publicClient = this.blockchain.getPublicClient();
      const walletClient = this.blockchain.getWalletClient();

      // Get pre-computed trades for exit
      const zapOutInfo = await publicClient.readContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'computeZapOutInfo',
        args: [ETH_ADDRESS],
      });

      const [trades, expectedOutputs, slippages, totalOutput] = zapOutInfo;

      console.log('Zap Out Info:', {
        tradesCount: trades.length,
        expectedOutputs,
        slippages,
        totalOutput,
      });

      // Execute zapOut
      const hash = await walletClient.writeContract({
        address: CONFIG.INDEX_ADDRESS,
        abi: indexAbi,
        functionName: 'zapOut',
        args: [ETH_ADDRESS, trades, 0n, CONFIG.MAX_SLIPPAGE],
      });

      console.log('Exit position tx:', hash);
      return hash;
    } catch (error) {
      console.error('Error exiting position:', error);
      return null;
    }
  }
}
