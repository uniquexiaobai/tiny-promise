const TPromise = require('../src');

const resolved = value => TPromise.resolve(value);
const rejected = reason => TPromise.reject(reason);
const deferred = () => {
  let promise, resolve, reject;
  promise = new TPromise(($resolve, $reject) => {
    resolve = $resolve;
    reject = $reject;
  });
  return { promise, resolve, reject };
};

module.exports = { resolved, rejected, deferred };
