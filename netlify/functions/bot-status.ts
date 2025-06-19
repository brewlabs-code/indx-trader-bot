import { Handler } from '@netlify/functions';
import { PositionService } from '../../src/services/position.service';
import { SignalService } from '../../src/services/signal.service';
import { BlockchainService } from '../../src/services/blockchain.service';
import { CONFIG } from '../../src/config/constants';

export const handler: Handler = async (event, context) => {
  const positionService = new PositionService();
  const signalService = new SignalService();
  const blockchainService = new BlockchainService();

  try {
    const [position, signal, balance] = await Promise.all([
      positionService.getCurrentPosition(),
      signalService.getIndexSignal(),
      blockchainService.getBalance(),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        bot: {
          wallet: blockchainService.account.address,
          balance: balance.toString(),
          indexAddress: CONFIG.INDEX_ADDRESS,
          profitTarget: CONFIG.PROFIT_TARGET,
        },
        position: position || 'No position',
        signal: signal?.analysis || 'No signal',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
