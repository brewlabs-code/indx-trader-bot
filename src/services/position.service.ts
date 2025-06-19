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
      const response = await axios.get(
        `${CONFIG.SIGNALS_API_URL}/api/users/${this.blockchain.account.address}/positions`
      );

      const positions = response.data.positions;
      
      // Find position for our index
      const position = positions.find(
        (p: Position) => p.indexAddress.toLowerCase() === CONFIG.INDEX_ADDRESS.toLowerCase()
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
