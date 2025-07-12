import { EventEmitter } from 'eventemitter3';

/**
 * Thread-safe concurrency utilities for SuperClaude orchestrator
 * Provides atomic operations, mutexes, and thread-safe collections
 */

/**
 * Async mutex for preventing race conditions
 * Ensures only one operation can acquire the lock at a time
 */
export class AsyncMutex {
  private locked = false;
  private waitingQueue: Array<() => void> = [];

  /**
   * Acquire the mutex lock
   * Returns a release function that must be called to release the lock
   */
  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.waitingQueue.push(() => {
          this.locked = true;
          resolve(() => this.release());
        });
      }
    });
  }

  /**
   * Release the mutex lock
   */
  private release(): void {
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }

  /**
   * Check if mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Get number of operations waiting for lock
   */
  getWaitingCount(): number {
    return this.waitingQueue.length;
  }
}

/**
 * Atomic counter with thread-safe increment/decrement operations
 */
export class AtomicCounter {
  private value = 0;
  private mutex = new AsyncMutex();

  /**
   * Get current value
   */
  get(): number {
    return this.value;
  }

  /**
   * Atomically increment the counter
   */
  async increment(): Promise<number> {
    const release = await this.mutex.acquire();
    try {
      return ++this.value;
    } finally {
      release();
    }
  }

  /**
   * Atomically decrement the counter
   */
  async decrement(): Promise<number> {
    const release = await this.mutex.acquire();
    try {
      return --this.value;
    } finally {
      release();
    }
  }

  /**
   * Atomically add a value
   */
  async add(amount: number): Promise<number> {
    const release = await this.mutex.acquire();
    try {
      this.value += amount;
      return this.value;
    } finally {
      release();
    }
  }

  /**
   * Atomically set the value
   */
  async set(newValue: number): Promise<number> {
    const release = await this.mutex.acquire();
    try {
      this.value = newValue;
      return this.value;
    } finally {
      release();
    }
  }

  /**
   * Atomically reset to zero
   */
  async reset(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.value = 0;
    } finally {
      release();
    }
  }
}

/**
 * Thread-safe Map implementation with atomic operations
 */
export class ThreadSafeMap<K, V> {
  private map = new Map<K, V>();
  private mutex = new AsyncMutex();

  /**
   * Atomically set a key-value pair
   */
  async set(key: K, value: V): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.map.set(key, value);
    } finally {
      release();
    }
  }

  /**
   * Atomically get a value by key
   */
  async get(key: K): Promise<V | undefined> {
    const release = await this.mutex.acquire();
    try {
      return this.map.get(key);
    } finally {
      release();
    }
  }

  /**
   * Synchronous get (use when you know no concurrent modifications are happening)
   */
  getSync(key: K): V | undefined {
    return this.map.get(key);
  }

  /**
   * Atomically check if key exists
   */
  async has(key: K): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      return this.map.has(key);
    } finally {
      release();
    }
  }

  /**
   * Atomically delete a key
   */
  async delete(key: K): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      return this.map.delete(key);
    } finally {
      release();
    }
  }

  /**
   * Atomically clear all entries
   */
  async clear(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.map.clear();
    } finally {
      release();
    }
  }

  /**
   * Get current size (may be stale due to concurrent operations)
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * Atomically get all keys
   */
  async keys(): Promise<K[]> {
    const release = await this.mutex.acquire();
    try {
      return Array.from(this.map.keys());
    } finally {
      release();
    }
  }

  /**
   * Atomically get all values
   */
  async values(): Promise<V[]> {
    const release = await this.mutex.acquire();
    try {
      return Array.from(this.map.values());
    } finally {
      release();
    }
  }

  /**
   * Atomically get all entries
   */
  async entries(): Promise<[K, V][]> {
    const release = await this.mutex.acquire();
    try {
      return Array.from(this.map.entries());
    } finally {
      release();
    }
  }

  /**
   * Atomically perform an operation if key exists
   */
  async updateIfExists(key: K, updater: (value: V) => V): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      const value = this.map.get(key);
      if (value !== undefined) {
        this.map.set(key, updater(value));
        return true;
      }
      return false;
    } finally {
      release();
    }
  }

  /**
   * Atomically get or set a default value
   */
  async getOrSet(key: K, defaultValue: V): Promise<V> {
    const release = await this.mutex.acquire();
    try {
      let value = this.map.get(key);
      if (value === undefined) {
        value = defaultValue;
        this.map.set(key, value);
      }
      return value;
    } finally {
      release();
    }
  }
}

/**
 * Thread-safe Set implementation
 */
export class ThreadSafeSet<T> {
  private set = new Set<T>();
  private mutex = new AsyncMutex();

  /**
   * Atomically add a value
   */
  async add(value: T): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.set.add(value);
    } finally {
      release();
    }
  }

  /**
   * Atomically check if value exists
   */
  async has(value: T): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      return this.set.has(value);
    } finally {
      release();
    }
  }

  /**
   * Atomically delete a value
   */
  async delete(value: T): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      return this.set.delete(value);
    } finally {
      release();
    }
  }

  /**
   * Atomically clear all values
   */
  async clear(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.set.clear();
    } finally {
      release();
    }
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.set.size;
  }

  /**
   * Atomically get all values
   */
  async values(): Promise<T[]> {
    const release = await this.mutex.acquire();
    try {
      return Array.from(this.set.values());
    } finally {
      release();
    }
  }
}

/**
 * Atomic boolean flag
 */
export class AtomicBoolean {
  private value: boolean;
  private mutex = new AsyncMutex();

  constructor(initialValue = false) {
    this.value = initialValue;
  }

  /**
   * Get current value
   */
  get(): boolean {
    return this.value;
  }

  /**
   * Atomically set the value
   */
  async set(newValue: boolean): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      const oldValue = this.value;
      this.value = newValue;
      return oldValue;
    } finally {
      release();
    }
  }

  /**
   * Atomically compare and set
   */
  async compareAndSet(expected: boolean, newValue: boolean): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      if (this.value === expected) {
        this.value = newValue;
        return true;
      }
      return false;
    } finally {
      release();
    }
  }

  /**
   * Atomically flip the value
   */
  async flip(): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      this.value = !this.value;
      return this.value;
    } finally {
      release();
    }
  }
}

/**
 * Event-driven atomic state machine
 */
export class AtomicStateMachine<T> extends EventEmitter {
  private state: T;
  private mutex = new AsyncMutex();
  private transitions = new Map<T, Set<T>>();

  constructor(initialState: T) {
    super();
    this.state = initialState;
  }

  /**
   * Get current state
   */
  getState(): T {
    return this.state;
  }

  /**
   * Define allowed transitions
   */
  addTransition(from: T, to: T): void {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Set());
    }
    this.transitions.get(from)!.add(to);
  }

  /**
   * Atomically transition to new state
   */
  async transition(newState: T): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      const allowedTransitions = this.transitions.get(this.state);
      if (!allowedTransitions || !allowedTransitions.has(newState)) {
        return false;
      }

      const oldState = this.state;
      this.state = newState;
      
      // Emit state change event
      this.emit('state-changed', {
        from: oldState,
        to: newState,
        timestamp: new Date()
      });

      return true;
    } finally {
      release();
    }
  }

  /**
   * Force transition (bypass validation)
   */
  async forceTransition(newState: T): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      const oldState = this.state;
      this.state = newState;
      
      this.emit('state-forced', {
        from: oldState,
        to: newState,
        timestamp: new Date()
      });
    } finally {
      release();
    }
  }
}

/**
 * Resource pool with atomic allocation/deallocation
 */
export class AtomicResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private mutex = new AsyncMutex();
  private maxSize: number;

  constructor(resources: T[], maxSize?: number) {
    this.available = [...resources];
    this.maxSize = maxSize || resources.length;
  }

  /**
   * Atomically acquire a resource
   */
  async acquire(): Promise<T | null> {
    const release = await this.mutex.acquire();
    try {
      if (this.available.length === 0) {
        return null;
      }

      const resource = this.available.pop()!;
      this.inUse.add(resource);
      return resource;
    } finally {
      release();
    }
  }

  /**
   * Atomically release a resource
   */
  async release(resource: T): Promise<boolean> {
    const release = await this.mutex.acquire();
    try {
      if (!this.inUse.has(resource)) {
        return false;
      }

      this.inUse.delete(resource);
      this.available.push(resource);
      return true;
    } finally {
      release();
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size
    };
  }
}