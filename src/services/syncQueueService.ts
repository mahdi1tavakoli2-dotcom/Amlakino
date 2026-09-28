/**
 * Offline Sync Queue Service (Isolated Sync Architecture)
 * 
 * Manages pending mutations made while offline (or during connectivity disruptions)
 * and prepares them for conflict-free replay once the network is restored.
 */

export interface SyncQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'property' | 'client' | 'opportunity' | 'followup' | 'visit' | 'collaboration';
  entityId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

class SyncQueueService {
  private queue: SyncQueueItem[] = [];
  private listeners: Set<(queue: SyncQueueItem[]) => void> = new Set();

  constructor() {
    this.queue = [];
  }

  private notifyListeners() {
    const current = [...this.queue];
    this.listeners.forEach((l) => l(current));
  }

  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter((item) => item.status === 'pending').length;
  }

  public enqueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): string {
    const newItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(newItem);
    this.notifyListeners();
    return newItem.id;
  }

  public remove(id: string) {
    this.queue = this.queue.filter((i) => i.id !== id);
    this.notifyListeners();
  }

  public clear() {
    this.queue = [];
    this.notifyListeners();
  }

  public subscribe(listener: (queue: SyncQueueItem[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Process and synchronize pending items when back online.
   */
  public async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    const pendingItems = this.queue.filter((i) => i.status === 'pending');

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        this.notifyListeners();

        // Simulate atomic server synchronization
        await new Promise((resolve) => setTimeout(resolve, 150));

        this.remove(item.id);
        synced++;
      } catch (err: any) {
        item.status = 'failed';
        item.retryCount += 1;
        item.error = err?.message || 'Sync failed';
        failed++;
        this.notifyListeners();
      }
    }

    return { synced, failed };
  }
}

export const syncQueueService = new SyncQueueService();
