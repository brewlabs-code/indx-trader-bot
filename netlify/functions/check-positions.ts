import { Handler } from '@netlify/functions';
import { PositionService } from '../../src/services/position.service';
import { TradeService } from '../../src/services/trade.service';
import { CONFIG } from '../../src/config/constants'; // <-- ADDED THIS IMPORT

export const handler: Handler = async (event, context) => {
  console.log('Checking positions...');

  const positionService = new PositionService();
  const tradeService = new TradeService();

  try {
    // Get current position
    const position = await positionService.getCurrentPosition();
    
    if (!position) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'no_position' }),
      };
    }

    console.log(`Current P&L: ${position.profitLoss.percentage}%`);

    // Check if we should take profit
    if (positionService.shouldTakeProfit(position)) {
      console.log('Taking profit!');
      
      const txHash = await tradeService.exitPosition();
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'took_profit',
          txHash,
          profitPercentage: position.profitLoss.percentage,
          profitUsd: position.profitLoss.usd,
        }),
      };
    }

    // Never sell at a loss
    if (positionService.isInLoss(position)) {
      console.log('Position in loss, holding...');
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: 'holding_loss',
          position,
        }),
      };
    }

    // Still waiting for target
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'holding_profit',
        position,
        target: CONFIG.PROFIT_TARGET,
      }),
    };
  } catch (error) {
    console.error('Error in check-positions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
