import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONFIG } from '../config/constants';

export class BlockchainService {
  private walletClient;
  private publicClient;
  public account;

  constructor() {
    this.account = privateKeyToAccount(CONFIG.PRIVATE_KEY);
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: base,
      transport: http(CONFIG.RPC_URL),
    });

    this.publicClient = createPublicClient({
      chain: base,
      transport: http(CONFIG.RPC_URL),
    });
  }

  async getBalance(): Promise<bigint> {
    return this.publicClient.getBalance({ address: this.account.address });
  }

  async getAvailableAmount(): Promise<bigint> {
    const balance = await this.getBalance();
    const gasBuffer = parseEther(CONFIG.GAS_BUFFER_ETH.toString());
    
    if (balance <= gasBuffer) {
      return 0n;
    }
    
    return balance - gasBuffer;
  }

  getWalletClient() {
    return this.walletClient;
  }

  getPublicClient() {
    return this.publicClient;
  }
}
