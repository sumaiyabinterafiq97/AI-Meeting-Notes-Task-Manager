/**
 * Worker registry — maps queues to worker processors.
 * Implementation pending.
 * @see src/jobs/worker.ts for current meeting-ai worker
 */
export class WorkerRegistry {
  private readonly workers = new Map<string, unknown>();

  register(queueName: string, worker: unknown): void {
    this.workers.set(queueName, worker);
  }

  get(queueName: string): unknown {
    return this.workers.get(queueName);
  }

  list(): string[] {
    return Array.from(this.workers.keys());
  }
}

export const workerRegistry = new WorkerRegistry();
