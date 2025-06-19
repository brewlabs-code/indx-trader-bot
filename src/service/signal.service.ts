import axios from 'axios';
import { CONFIG } from '../config/constants';

interface Signal {
  signal: string;
  strength: number;
  reasoning: string;
}

interface IndexSignal {
  address: string;
  name: string;
  analysis: Signal;
  performance: {
    daily: number;
    weekly: number;
  };
}

export class SignalService {
  async getIndexSignal(): Promise<IndexSignal | null> {
    try {
      const response = await axios.get(
        `${CONFIG.SIGNALS_API_URL}/api/signals`,
        {
          params: {
            index: CONFIG.INDEX_ADDRESS,
            key: CONFIG.SIGNALS_API_KEY,
          },
        }
      );

      if (response.data && response.data.index) {
        return response.data.index;
      }

      return null;
    } catch (error) {
      console.error('Error fetching signals:', error);
      return null;
    }
  }

  shouldBuy(signal: IndexSignal): boolean {
    const { analysis } = signal;
    
    // Check if it's a buy signal
    const isBuySignal = ['BUY', 'STRONG_BUY'].includes(analysis.signal);
    
    // Check minimum strength
    const meetsStrength = analysis.strength >= CONFIG.MIN_SIGNAL_STRENGTH;
    
    return isBuySignal && meetsStrength;
  }
}
