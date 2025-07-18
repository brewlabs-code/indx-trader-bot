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

interface PositionApiResponse {
  indexAddress: string;
  indexPid: number;
  indexName: string;
  chainId: number;
  usdAmount: string;
  formattedUsdAmount: string;
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
      console.log('Raw response data:', JSON.stringify(response.data, null, 2));

      // Based on the actual API response structure
      const responseData = response.data;
      
      // Check if response structure is valid
      if (!responseData || !responseData.data) {
        console.log('Invalid response structure - missing data property');
        return null;
      }

      // Check if positions exist - now it's an object, not an array
      if (!responseData.data.positions || typeof responseData.data.positions !== 'object') {
        console.log('No positions object found in response data');
        return null;
      }

      // Convert positions object to array
      const positionsArray = Object.values(responseData.data.positions) as PositionApiResponse[];
      
      if (positionsArray.length === 0) {
        console.log('Positions object is empty');
        return null;
      }
      
      console.log(`Found ${positionsArray.length} positions`);
      
      // Find position for our index
      const apiPosition = positionsArray.find(
        (p: PositionApiResponse) => p.indexAddress.toLowerCase() === CONFIG.INDEX_ADDRESS.toLowerCase()
      );

      if (!apiPosition) {
        console.log('No position found for index:', CONFIG.INDEX_ADDRESS);
        console.log('Available positions:', positionsArray.map((p: PositionApiResponse) => ({
          indexAddress: p.indexAddress,
          indexName: p.indexName
        })));
        return null;
      }

      console.log('Found position for our index:', {
        indexAddress: apiPosition.indexAddress,
        indexName: apiPosition.indexName,
        usdAmount: apiPosition.usdAmount,
      });

      // Get additional position details with P&L calculation
      const enrichedPosition = await this.enrichPositionWithPnL(apiPosition);
      
      return enrichedPosition;
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

  private async enrichPositionWithPnL(apiPosition: PositionApiResponse): Promise<Position> {
    try {
      // Try to get detailed position info with P&L from the detailed endpoint
      const detailUrl = `https://indexes-api.brewlabs.info/indexes/${apiPosition.indexAddress}/positions/${this.blockchain.account.address}`;
      
      console.log('Fetching detailed position from:', detailUrl);
      
      const detailResponse = await axios.get(detailUrl);
      console.log('Detail API response:', JSON.stringify(detailResponse.data, null, 2));
      
      const detailData = detailResponse.data;
      
      // If we have detailed data with P&L, use it
      if (detailData?.data?.profitLoss) {
        return {
          indexAddress: apiPosition.indexAddress,
          indexName: apiPosition.indexName,
          profitLoss: detailData.data.profitLoss,
          current: detailData.data.current || {
            ethAmount: '0',
            usdAmount: apiPosition.usdAmount,
          },
        };
      }
    } catch (error) {
      console.log('Could not fetch detailed P&L data, using basic position data');
    }

    // Fallback: create a basic position without P&L data
    // This means the bot will treat it as a new position
    return {
      indexAddress: apiPosition.indexAddress,
      indexName: apiPosition.indexName,
      profitLoss: {
        percentage: 0, // No profit/loss data available
        usd: '0',
        eth: '0',
      },
      current: {
        ethAmount: '0', // Not available in basic API
        usdAmount: apiPosition.usdAmount,
      },
    };
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
