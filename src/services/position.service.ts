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
      // Fix URL construction for your API structure
      const baseUrl = CONFIG.SIGNALS_API_URL.replace('/.netlify/functions/signals', '');
      const positionsUrl = `${baseUrl}/api/users/${this.blockchain.account.address}/positions`;
      
      console.log('Fetching position from:', positionsUrl);
      
      const response = await axios.get(positionsUrl);

      // Based on your UserInsightsService, the response structure
      const globalPosition = response.data;
      
      if (!globalPosition.positions || globalPosition.positions.length === 0) {
        return null;
      }
      
      // Find position for our index
      const position = globalPosition.positions.find(
        (p: any) => p.indexAddress.toLowerCase() === CONFIG.INDEX_ADDRESS.toLowerCase()
      );

      return position || null;
    } catch (error) {
      console.error('Error fetching position:', error);
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
