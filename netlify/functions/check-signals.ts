import { Handler } from '@netlify/functions';
import { SignalService } from '../../src/services/signal.service';
import { PositionService } from '../../src/services/position.service';
import { TradeService } from '../../src/services/trade.service';
import { BlockchainService } from '../../src/services/blockchain.service';

export const handler: Handler = async (event, context) => {
  console.log('=== CHECK SIGNALS FUNCTION START ===');
  console.log('Timestamp:', new Date().toISOString());

  const signalService = new SignalService();
  const positionService = new PositionService();
  const tradeService = new TradeService();
  const blockchainService = new BlockchainService();

  try {
    // Check if we already have a position
    console.log('Step 1: Checking for existing position...');
    const currentPosition = await positionService.getCurrentPosition();
    
    if (currentPosition) {
      console.log('Already have position:', currentPosition);
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'holding',
          position: currentPosition,
        }),
      };
    }
    
    console.log('No existing position found, proceeding to check signals');

    // Get current signal
    console.log('Step 2: Fetching signals...');
    const signal = await signalService.getIndexSignal();
    
    if (!signal) {
      console.log('No signal received from API');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'no_signal' }),
      };
    }

    console.log('Signal received:', {
      address: signal.address,
      name: signal.name,
      signal: signal.analysis.signal,
      strength: signal.analysis.strength,
      reasoning: signal.analysis.reasoning,
    });

    // Check if we should buy
    console.log('Step 3: Evaluating buy decision...');
    if (!signalService.shouldBuy(signal)) {
      console.log('Not a buy signal or doesn\'t meet criteria');
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'no_buy_signal',
          signal: signal.analysis,
        }),
      };
    }

    console.log('Buy signal confirmed! Checking balance...');

    // Get available ETH amount
    console.log('Step 4: Checking available balance...');
    const balance = await blockchainService.getBalance();
    console.log('Total balance:', balance.toString(), 'wei');
    
    const availableEth = await blockchainService.getAvailableAmount();
    console.log('Available after gas buffer:', availableEth.toString(), 'wei');
    
    if (availableEth === 0n) {
      console.log('Insufficient balance to enter position');
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'insufficient_balance',
          signal: signal.analysis,
          balance: balance.toString(),
        }),
      };
    }

    console.log(`Step 5: Entering position with ${availableEth} wei`);
    
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
        status: 'entered_position',
        txHash,
        amount: availableEth.toString(),
        signal: signal.analysis,
      }),
    };
  } catch (error: any) {
    console.error('=== ERROR IN CHECK-SIGNALS ===');
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
    console.log('=== CHECK SIGNALS FUNCTION END ===');
  }
};
