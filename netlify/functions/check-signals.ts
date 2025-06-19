import { Handler } from '@netlify/functions';
import { SignalService } from '../../src/services/signal.service';
import { PositionService } from '../../src/services/position.service';
import { TradeService } from '../../src/services/trade.service';
import { BlockchainService } from '../../src/services/blockchain.service';

export const handler: Handler = async (event, context) => {
  console.log('Checking signals...');

  const signalService = new SignalService();
  const positionService = new PositionService();
  const tradeService = new TradeService();
  const blockchainService = new BlockchainService();

  try {
    // Check if we already have a position
    const currentPosition = await positionService.getCurrentPosition();
    
    if (currentPosition) {
      console.log('Already have position, skipping signal check');
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'holding',
          position: currentPosition,
        }),
      };
    }

    // Get current signal
    const signal = await signalService.getIndexSignal();
    
    if (!signal) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'no_signal' }),
      };
    }

    // Check if we should buy
    if (!signalService.shouldBuy(signal)) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'no_buy_signal',
          signal: signal.analysis,
        }),
      };
    }

    // Get available ETH amount
    const availableEth = await blockchainService.getAvailableAmount();
    
    if (availableEth === 0n) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'insufficient_balance',
          signal: signal.analysis,
        }),
      };
    }

    console.log(`Entering position with ${availableEth} ETH`);
    
    // Enter position
    const txHash = await tradeService.enterPosition(availableEth);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'entered_position',
        txHash,
        amount: availableEth.toString(),
        signal: signal.analysis,
      }),
    };
  } catch (error) {
    console.error('Error in check-signals:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
