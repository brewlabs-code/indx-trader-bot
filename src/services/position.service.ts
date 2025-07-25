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
      
      // Use the insights endpoint which has complete P&L data
      const insightsUrl = `https://indexes-api.brewlabs.info/indexes/users/${walletAddress}/insights`;
      
      console.log('Fetching insights from:', insightsUrl);
      
      const response = await axios.get(insightsUrl);
      console.log('Insights API response status:', response.status);
      console.log('Raw insights data:', JSON.stringify(response.data, null, 2));

      // Check response structure
      const responseData = response.data;
      
      if (!responseData || !responseData.data) {
        console.log('Invalid response structure - missing data property');
        return null;
      }

      // Check if positions array exists
      if (!responseData.data.positions || !Array.isArray(responseData.data.positions)) {
        console.log('No positions array found in insights data');
        return null;
      }

      const positions = responseData.data.positions;
      
      if (positions.length === 0) {
        console.log('Positions array is empty');
        return null;
      }
      
      console.log(`Found ${positions.length} positions`);
      
      // Find position for our index
      const position = positions.find(
        (p: any) => p.indexAddress.toLowerCase() === CONFIG.INDEX_ADDRESS.toLowerCase()
      );

      if (!position) {
        console.log('No position found for index:', CONFIG.INDEX_ADDRESS);
        console.log('Available positions:', positions.map((p: any) => ({
          indexAddress: p.indexAddress,
          indexName: p.indexName
        })));
        return null;
      }

      console.log('Found position for our index:', {
        indexAddress: position.indexAddress,
        indexName: position.indexName,
        profitLoss: position.profitLoss,
        current: position.current,
      });

      // Convert to our Position format
      const formattedPosition: Position = {
        indexAddress: position.indexAddress,
        indexName: position.indexName,
        profitLoss: {
          percentage: position.profitLoss.percentage,
          usd: position.profitLoss.usd,
          eth: position.profitLoss.eth,
        },
        current: {
          ethAmount: position.current.ethAmount,
          usdAmount: position.current.usdAmount,
        },
      };

      console.log('Formatted position:', formattedPosition);
      
      return formattedPosition;
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
