import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';

interface EngineEvent {
  type: 'ORDER_UPDATE' | 'TRADE' | 'ERROR';
  [key: string]: unknown;
}

class MatchingEngineService extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer: string = '';

  start() {
    // Engine binary is mounted into container at /app/engine
    const enginePath = path.join(__dirname, '../../engine/matching-engine-cpp/build/engine');

    this.process = spawn(enginePath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Read JSON events line by line from engine stdout
    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');

      // Keep incomplete last line in buffer
      this.buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event: EngineEvent = JSON.parse(line);
          this.emit(event.type, event);
        } catch {
          console.error('Failed to parse engine output:', line);
        }
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('Engine stderr:', data.toString());
    });

    this.process.on('exit', (code) => {
      console.error(`Engine exited with code ${code}`);
      this.process = null;
    });

    console.log('Matching engine started');
  }

  submitOrder(params: {
    orderId: string;
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    orderType: 'LIMIT' | 'MARKET';
    price?: number;
    quantity: number;
  }) {
    const cmd = JSON.stringify({ action: 'NEW_ORDER', ...params });
    this.process?.stdin?.write(cmd + '\n');
  }

  cancelOrder(symbol: string, orderId: string) {
    const cmd = JSON.stringify({ action: 'CANCEL_ORDER', symbol, orderId });
    this.process?.stdin?.write(cmd + '\n');
  }

  isRunning() {
    return this.process !== null;
  }
}

// Singleton — one engine process for the whole app
export const engineService = new MatchingEngineService();