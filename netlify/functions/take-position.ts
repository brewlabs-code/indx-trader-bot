import { Handler } from '@netlify/functions';
import { TradeService } from '../../src/services/trade.service';
import { BlockchainService } from '../../src/services/blockchain.service';
import { CONFIG } from '../../src/config/constants';

export const handler: Handler = async (event, context) => {
  console.log('=== MANUAL TAKE POSITION START ===');
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

  const tradeService = new TradeService();
  const blockchainService = new BlockchainService();

  try {
    // Get available ETH amount
    console.log('Step 1: Checking available balance...');
    const balance = await blockchainService.getBalance();
    console.log('Total balance:', balance.toString(), 'wei');
    
    const availableEth = await blockchainService.getAvailableAmount();
    console.log('Available after gas buffer:', availableEth.toString(), 'wei');
    
    if (availableEth === 0n) {
      console.log('Insufficient balance to enter position');
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: 'insufficient_balance',
          balance: balance.toString(),
          gasBuffer: CONFIG.GAS_BUFFER_ETH,
        }),
      };
    }

    console.log(`Step 2: Entering position with ${availableEth} wei`);
    
    // Enter position
    const txHash = await tradeService.enterPosition(availableEth);
    
    if (!txHash) {
      console.error('Failed to enter position - no tx hash returned');
      return {
        statusCode: 500,
        body: JSON.stringify({
          status: 'trade_failed',
          error: 'Failed to execute trade',
        }),
      };
    }
    
    console.log('Position entered successfully!');
    console.log('Transaction hash:', txHash);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'position_taken',
        txHash,
        amount: availableEth.toString(),
        indexAddress: CONFIG.INDEX_ADDRESS,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('=== ERROR IN TAKE-POSITION ===');
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
    console.log('=== MANUAL TAKE POSITION END ===');
  }
};
