interface QueueItem {
  type: string;
  message: string;
  timestamp: number;
}

export class LogQueue {
  private queue: QueueItem[];
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  enqueue(item: QueueItem): void {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift();
    }
    this.queue.push(item);
  }

  getAll(): QueueItem[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
  }

  getSize(): number {
    return this.queue.length;
  }
}
