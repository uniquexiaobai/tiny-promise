// https://mp.weixin.qq.com/s?__biz=MzA4Njc2MTE3Ng==&mid=2456151398&idx=1&sn=c3351d6c9eb166035f2fa97a1b0b3a0a&chksm=88528ed1bf2507c797c05a4423bbc53e6e450c05d3da6bc6ad1825487712c156903891890c7c&mpshare=1&scene=1&srcid=&sharer_sharetime=1573399835804&sharer_shareid=648688b3a8dd229aa5dc551cda24aba5#rd
function transition(promise, state, result) {
  if (state === 'pending') return;

  // console.log('transition', state, result, promise.callbacks);

  promise.state = state;
  promise.result = result;

  setTimeout(() => {
    promise.callbacks.forEach(callback => {
      handleCallback(callback, state, result);
    });
  });
}

function isFunction(obj) {
  return typeof obj === 'function';
}

function handleCallback(callback, state, result) {
  const { onResolved, onRejected, resolve, reject } = callback;

  // console.log('handleCallback', state, result, callback);

  try {
    if (state === 'resolved') {
      isFunction(onResolved) ? resolve(onResolved(result)) : resolve(result);
    } else if (state === 'rejected') {
      isFunction(onRejected) ? reject(onRejected(result)) : reject(result);
    }
  } catch (err) {
    reject(err);
  }
}

function TPromise(executor) {
  this.state = 'pending';
  this.result = null;
  this.callbacks = [];

  const onResolved = value => transition(this, 'resolved', value);
  const onRejected = reason => transition(this, 'rejected', reason);

  let ignore = false;
  const resolve = value => {
    if (ignore) return;
    ignore = true;

    // if (value === this) return;
    // if (value instanceof TPromise) {
    //   value.then(onResolved, onRejected);
    //   return;
    // }
    // if (value && value.then) {
    //   try {
    //     TPromise.resolve(value.then).then(onResolved, onRejected);
    //   } catch (err) {
    //     reject(err);
    //   }
    //   return;
    // }

    onResolved(value);
  };
  const reject = reason => {
    if (ignore) return;
    ignore = true;

    onRejected(reason);
  };

  try {
    executor(resolve, reject);
  } catch (err) {
    reject(err);
  }
}

TPromise.prototype.then = function (onResolved, onRejected) {
  return new TPromise((resolve, reject) => {
    const callback = { onResolved, onRejected, resolve, reject };

    if (this.state === 'pending') {
      this.callbacks.push(callback);
    } else {
      setTimeout(() => handleCallback(callback, this.state, this.result));
    }
  });
};

TPromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};

TPromise.prototype.finally = function (callback) {
  return this.then(
    value => {
      callback();
      return TPromise.resolve(value);
    },
    reason => {
      callback();
      return TPromise.reject(reason);
    }
  );
};

TPromise.resolve = function (value) {
  return new TPromise(resolve => resolve(value));
};

TPromise.reject = function (reason) {
  return new TPromise((_, reject) => reject(reason));
};

TPromise.race = function (promises) {
  return new TPromise((resolve, reject) => {
    for (let i = 0, len = promises.length; i < len; i++) {
      promises[i].then(resolve, reject);
    }
  });
};

// 返回第一个 resolved 的值，race 是返回第一个 resolve 或 reject 的值
// ES2021 时加入
TPromise.any = function (promises) {
  return new TPromise((resolve, reject) => {
    let count = 0;
    for (let i = 0, len = promises.length; i < len; i++) {
      promises[i]
        .then(data => {
          resolve(data);
        })
        .catch(() => {
          count += 1;
          if (count === len) {
            // should throw AggregateError
            let error = new Error('Every promise rejected');
            reject(error);
          }
        });
    }
  });
};

TPromise.all = function (promises) {
  return new TPromise((resolve, reject) => {
    let count = 0,
      result = [];
    for (let i = 0, len = promises.length; i < len; i++) {
      // Promise.resolve(Promise.resolve()) error
      // TPromise.resolve(promises[i])
      promises[i]
        .then(data => {
          result[i] = data;
          count += 1;
          if (count === len) {
            resolve(result);
          }
        })
        .catch(err => {
          reject(err);
        });
    }
  });
};

TPromise.allSettled = function (promises) {
  return new TPromise((resolve, reject) => {
    let i = 0,
      result = [];
    for (let i = 0, len = promises.length; i < len; i++) {
      promises[i]
        .then(data => {
          result[i] = { status: 'fulfilled', value: data };
        })
        .catch(err => {
          result[i] = { status: 'rejected', reason: err };
        })
        .finally(() => {
          i += 1;
          if (i === len) {
            resolve(result);
          }
        });
    }
  });
};

module.exports = TPromise;

const p = new TPromise((resolve, reject) => {
  setTimeout(() => {
    resolve(5);
  }, 1000);
});

// p.then(data => {
//   console.log('then', data);
// }).finally(() => {
//   console.log('finally');
// });

// p.then(() => {}).then(data => {
//   console.log('then', data);
// });

// p.then(value => {
//   return value * 2;
// }).then(value => {
//   console.log('then', value);
// });

// p.then(value => {
//   throw new Error('err');
// }).catch(err => {
//   console.log('test throw err', err);
// });

// p.then(value => {
//   return new TPromise(resolve => {
//     setTimeout(() => resolve(value * 2), 1000);
//   });
// }).then(data => {
//   console.log('test return promise', data);
// });

// TPromise.resolve(3).then(value => {
//   console.log('test resolve', value);
// });

// TPromise.reject(3)
//   .then(value => {})
//   .catch(err => {
//     console.log('test catch', err);
//   });

// TPromise.all([Promise.resolve(1), Promise.resolve(2)])
//   .then(data => {
//     console.log('then', data);
//   })
//   .catch(err => {
//     console.log('catch', err);
//   });

// TPromise.all([Promise.resolve(1), Promise.reject('this is error')])
//   .then(data => {
//     console.log('then', data);
//   })
//   .catch(err => {
//     console.log('catch', err);
//   });

// TPromise.race([Promise.resolve(1), Promise.resolve(2)])
//   .then(data => {
//     console.log('then', data);
//   })
//   .catch(err => {
//     console.log('catch', err);
//   });

// TPromise.race([Promise.reject('this is error'), Promise.resolve(1)])
//   .then(data => {
//     console.log('then', data);
//   })
//   .catch(err => {
//     console.log('catch', err);
//   });

// TPromise.any([Promise.resolve(1), Promise.resolve(2)])
//   .then(data => {
//     console.log('then', data);
//   })
//   .catch(err => {
//     console.log('catch', err);
//   });

// TPromise.any([Promise.reject('this is error'), Promise.resolve(1)])
//   .then(data => {
//     console.log('then', data);
//   })
//   .catch(err => {
//     console.log('catch', err);
//   });

// TPromise.allSettled([Promise.resolve(1), Promise.reject('this is error')])
//   .then(data => {
//     console.log('then', data);
//   })
//   .catch(err => {
//     console.log('catch', err);
//   });
