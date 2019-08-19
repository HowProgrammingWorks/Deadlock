'use strict';

// Lock

class Lock {
  constructor(name) {
    this.name = name;
    this.queue = [];
  }
}

const locks = {
  collection: new Map(),

  async request(name, callback) {
    let lock = this.collection.get(name);
    if (lock) {
      return new Promise(resolve => {
        lock.queue.push([callback, resolve]);
      });
    }
    lock = new Lock(name);
    this.collection.set(name, lock);
    await callback(lock);
    let next = lock.queue.pop();
    while (next) {
      const [handler, resolve] = next;
      await handler(lock);
      resolve();
      next = lock.queue.pop();
    }
    this.collection.delete(name);
  }
};

// Usage

(async () => {
  await locks.request('A', async lock => {
    console.log({ A1: lock });
    await locks.request('B', async lock => {
      console.log({ B1: lock });
    });
    await locks.request('B', async lock => {
      console.log({ B2: lock });
    });
  });
})();
