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
    try {
      const walletAddress = this.blockchain.account.address;
      
      // Use the v2 positions endpoint
      const positionsUrl = `https://index-performance.netlify.app/v2/users/${walletAddress}/positions`;
      
      console.log('Fetching position from:', positionsUrl);
      
      const response = await axios.get(positionsUrl);

      // Based on your UserInsightsService, the response structure
      const globalPosition = response.data;
      
      if (!globalPosition || !globalPosition.positions || globalPosition.positions.length === 0) {
        console.log('No positions found');
        return null;
      }
      
      // Find position for our index
      const position = globalPosition.positions.find(
        (p: any) => p.indexAddress.toLowerCase() === CONFIG.INDEX_ADDRESS.toLowerCase()
      );

      if (position) {
        console.log('Found position:', position);
      }

      return position || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('No positions found (404)');
        return null;
      }
      console.error('Error fetching position:', error.message);
      return null;
    }
  }

  shouldTakeProfit(position: Position): boolean {
    return position.profitLoss.percentage >= CONFIG.PROFIT_TARGET;
  }

  isInLoss(position: Position): boolean {
    return position.profitLoss.percentage < 0;
  }
}
