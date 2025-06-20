import { Handler } from '@netlify/functions';
import { PositionService } from '../../src/services/position.service';
import { TradeService } from '../../src/services/trade.service';
import { CONFIG } from '../../src/config/constants';

export const handler: Handler = async (event, context) => {
  console.log('=== MANUAL SELL POSITION START ===');
  console.log('Timestamp:', new Date().toISOString());

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Validate API key
  const apiKey = event.headers['x-api-key'] || event.queryStringParameters?.key;
  if (apiKey !== CONFIG.SIGNALS_API_KEY) {
    console.log('Unauthorized access attempt');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const positionService = new PositionService();
  const tradeService = new TradeService();

  try {
    // Get current position
    console.log('Step 1: Fetching current position...');
    const position = await positionService.getCurrentPosition();
    
    if (!position) {
      console.log('No position found to sell');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          status: 'no_position',
          message: 'No position found in the index to sell',
        }),
      };
    }

    console.log('Current position:', {
      indexName: position.indexName,
      profitLoss: position.profitLoss,
      currentValue: position.current,
    });

    // Exit position
    console.log('Step 2: Executing sell order...');
    const txHash = await tradeService.exitPosition();
    
    if (!txHash) {
      console.error('Failed to exit position - no tx hash returned');
      return {
        statusCode: 500,
        body: JSON.stringify({
          status: 'trade_failed',
          error: 'Failed to execute sell order',
        }),
      };
    }
    
    console.log('Position sold successfully!');
    console.log('Transaction hash:', txHash);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'position_sold',
        txHash,
        profitLoss: position.profitLoss,
        soldValue: position.current,
        indexAddress: CONFIG.INDEX_ADDRESS,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('=== ERROR IN SELL-POSITION ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
      }),
    };
  } finally {
    console.log('=== MANUAL SELL POSITION END ===');
  }
};
