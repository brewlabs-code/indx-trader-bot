import axios from 'axios';
import { CONFIG } from '../config/constants';
import { BlockchainService } from './blockchain.service';

interface Position {
  indexAddress: string;
  indexName: string;
  profitLoss: {
    percentage: number;
    usd: string;
    eth: string;
  };
  current: {
    ethAmount: string;
    usdAmount: string;
  };
}

export class PositionService {
  private blockchain: BlockchainService;

  constructor() {
    this.blockchain = new BlockchainService();
  }

  async getCurrentPosition(): Promise<Position | null> {
    console.log('PositionService.getCurrentPosition() called');
    
    try {
      const walletAddress = this.blockchain.account.address;
      console.log('Wallet address:', walletAddress);
      
      // Use the correct indexes positions endpoint
      const positionsUrl = `https://indexes-api.brewlabs.info/indexes/users/${walletAddress}/positions`;
      
      console.log('Fetching position from:', positionsUrl);
      
      const response = await axios.get(positionsUrl);
      console.log('Position API response status:', response.status);

      // Based on the actual API response structure
      const responseData = response.data;
      
      if (!responseData || !responseData.data || !responseData.data.positions || responseData.data.positions.length === 0) {
        console.log('No positions found in response data');
        return null;
      }
      
      console.log(`Found ${responseData.data.positions.length} positions`);
      
      // Find position for our index
      const position = responseData.data.positions.find(
        (p: any) => p.indexAddress.toLowerCase() === CONFIG.INDEX_ADDRESS.toLowerCase()
      );

      if (position) {
        console.log('Found position for our index:', {
          indexAddress: position.indexAddress,
          indexName: position.indexName,
          profitLoss: position.profitLoss,
        });
      } else {
        console.log('No position found for index:', CONFIG.INDEX_ADDRESS);
      }

      return position || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('No positions found (404) - this is normal for new wallets');
        return null;
      }
      
      console.error('Error fetching position:', error.message);
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      }
      
      return null;
    }
  }

  shouldTakeProfit(position: Position): boolean {
    const shouldTake = position.profitLoss.percentage >= CONFIG.PROFIT_TARGET;
    console.log(`Should take profit? ${shouldTake} (Current: ${position.profitLoss.percentage}%, Target: ${CONFIG.PROFIT_TARGET}%)`);
    return shouldTake;
  }

  isInLoss(position: Position): boolean {
    const inLoss = position.profitLoss.percentage < 0;
    console.log(`Position in loss? ${inLoss} (Current P&L: ${position.profitLoss.percentage}%)`);
    return inLoss;
  }
}
