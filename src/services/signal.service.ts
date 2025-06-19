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
    console.log('SignalService.getIndexSignal() called');
    console.log('Using signals API URL:', CONFIG.SIGNALS_API_URL);
    console.log('Index address:', CONFIG.INDEX_ADDRESS);
    
    try {
      const url = `${CONFIG.SIGNALS_API_URL}/api/signals`;
      const params = {
        index: CONFIG.INDEX_ADDRESS,
        key: CONFIG.SIGNALS_API_KEY,
      };
      
      console.log('Fetching signals from:', url);
      console.log('With params:', { index: params.index, key: 'REDACTED' });
      
      const response = await axios.get(url, { params });
      
      console.log('Signal API response status:', response.status);
      console.log('Signal API response data:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.index) {
        console.log('Found index signal:', response.data.index);
        return response.data.index;
      }

      console.log('No index data in response');
      return null;
    } catch (error: any) {
      console.error('Error fetching signals:', error.message);
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error details:', error);
      }
      
      return null;
    }
  }

  shouldBuy(signal: IndexSignal): boolean {
    const { analysis } = signal;
    
    console.log('Checking if should buy:');
    console.log('- Signal:', analysis.signal);
    console.log('- Strength:', analysis.strength);
    console.log('- Min required strength:', CONFIG.MIN_SIGNAL_STRENGTH);
    
    // Check if it's a buy signal
    const isBuySignal = ['BUY', 'STRONG_BUY'].includes(analysis.signal);
    console.log('- Is buy signal?', isBuySignal);
    
    // Check minimum strength
    const meetsStrength = analysis.strength >= CONFIG.MIN_SIGNAL_STRENGTH;
    console.log('- Meets strength requirement?', meetsStrength);
    
    const shouldBuy = isBuySignal && meetsStrength;
    console.log('- Final decision:', shouldBuy ? 'BUY' : 'NO BUY');
    
    return shouldBuy;
  }
}
