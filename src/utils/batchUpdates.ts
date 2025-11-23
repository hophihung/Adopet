/**
 * Batch multiple state updates to reduce re-renders
 * Uses requestAnimationFrame for optimal timing
 */

type UpdateFunction = () => void;

class BatchUpdater {
  private updates: UpdateFunction[] = [];
  private rafId: number | null = null;

  add(update: UpdateFunction) {
    this.updates.push(update);

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  flush() {
    const updates = this.updates;
    this.updates = [];
    this.rafId = null;

    // Execute all updates in a single frame
    updates.forEach((update) => {
      try {
        update();
      } catch (error) {
        console.error('Error in batched update:', error);
      }
    });
  }

  cancel() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.updates = [];
  }
}

export const batchUpdater = new BatchUpdater();

/**
 * Schedule a state update to be batched with others
 * @param update Function to execute
 */
export const batchUpdate = (update: UpdateFunction) => {
  batchUpdater.add(update);
};

/**
 * Flush all pending updates immediately
 */
export const flushBatchedUpdates = () => {
  batchUpdater.flush();
};
