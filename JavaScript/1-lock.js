'use strict';

// Lock

const PROMISE_TIMEOUT = 1000 * 5;

class Lock {
  constructor(name) {
    this.name = name;
    this.queue = [];
  }
}

const expirable = (executor, timeout = PROMISE_TIMEOUT) =>
  new Promise((resolve, reject) => {
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      reject(new Error('Expired'));
    }, timeout);
    const exit = fn => val => {
      if (expired) return;
      clearTimeout(timer);
      fn(val);
    };
    executor(exit(resolve), exit(reject));
  });

const locks = {
  collection: new Map(),

  async request(name, callback) {
    let lock = this.collection.get(name);
    if (lock) {
      return expirable(resolve => {
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

const pause = msec => new Promise(resolve => {
  setTimeout(resolve, Math.floor(Math.random() * msec));
});

(async () => {
  await locks.request('A', async lock => {
    console.log('1: lock A');
    await pause(PROMISE_TIMEOUT * 2);
    await locks.request('B', async lock => {
      console.log('1: lock B');
      await pause(PROMISE_TIMEOUT * 2);
      console.log('Exit');
    });
  });
})();

(async () => {
  await locks.request('B', async lock => {
    console.log('2: lock B');
    await pause(PROMISE_TIMEOUT * 2);
    await locks.request('A', async lock => {
      console.log('2: lock A');
      await pause(PROMISE_TIMEOUT * 2);
    });
  });
})();
