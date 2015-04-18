var child_process = Npm.require('child_process');
var portscanner = Npm.require('portscanner');

if(process.env['CLUSTER_WORKER_ID']) {
  // If this is a worker, notify the master that I'm ready to 
  // Accept requests
  WebApp.onListening(function() {
    process.send({
      type: "ready"
    });
  });
}

WorkerPool = function WorkerPool(size) {
  if(process.env['CLUSTER_WORKER_ID']) {
    return;
  }

  var self = this;
  this._exec = process.argv[1];
  this._args = process.argv.slice(2);

  this._workers = [];
  this._workersMap = {};

  this._ids = 0;
  this._closed = false;

  for(var lc=0; lc<size; lc++) {
    this._createWorker();
  }

  this._recentReconnects = 0;
  this._lastReconnectAt = 0;

  _.each(['SIGINT', 'SIGHUP', 'SIGTERM'], function (sig) {
    process.once(sig, self._cleanup.bind(self));
  });
}

WorkerPool.prototype.pickWorker = function() {
  var workerCount = this._workers.length;
  if(!workerCount) return null;

  var index = Math.floor(workerCount * Math.random());
  var worker = _.pick(this._workers[index], "id", "port", "process");
  return worker;
};

WorkerPool.prototype.hasWorker = function(id) {
  return !!this._workersMap[id];
};

WorkerPool.prototype._fork = function _fork(callback) {
  var self = this;
  var id = ++self._ids;

  // We need to give some random range like this
  // Othewise, it'll select some the same port since
  // It takes some time to bind to a port
  var firstPort = Math.ceil(Math.random() * 20000) + 2000;
  var secondPort = firstPort + 1;
  portscanner.findAPortNotInUse(firstPort, secondPort, '127.0.0.1', withPort);

  function withPort(error, port) {
    if(error) throw error;

    var env = _.extend(_.clone(process.env), {
      'PORT': port,
      'CLUSTER_WORKER_ID': id
    });

    var _process = child_process.fork(self._exec, self._args, {
      env: env,
      silent: false
    });

    var worker = {
      process: _process,
      id: id,
      port: port
    };

    callback(worker);
  }
};

WorkerPool.prototype._createWorker = function() {
  var self = this;

  self._fork(function(worker) {
    var message = "Cluster: Initializing worker %s on port %s";
    console.info(message, worker.id, worker.port);

    worker.process.on('message', registerWorker);

    // TODO: learn a bit about exitCode and signalCode
    worker.process.once('exit', function(exitCode, signalCode) {
      var message = "Cluster: Exiting worker %s with exitCode=%s signalCode=%s";
      console.info(message, worker.id, exitCode, signalCode);
      
      // Sometimes, It's possible to exit the worker
      // even before it became ready
      var index = self._workers.indexOf(worker);
      if(index >= 0) {
        self._workers.splice(index, 1);
        delete self._workersMap[worker.id];
      }

      if(!self._closed) {
        var reconnectTimeout = self._getReconnectTimeout();
        if(reconnectTimeout === 0) {
          self._createWorker();
        } else {
          setTimeout(self._createWorker.bind(self), reconnectTimeout);
        }
      }
    });

    function registerWorker(message) {
      if(message && message.type === "ready") {
        self._workers.push(worker);
        self._workersMap[worker.id] = worker;

        // remove this worker
        process.removeListener('message', registerWorker);
      }
    }
  });
};

WorkerPool.prototype._cleanup = function(sig) {
  this._closed = true;
  this._workers.forEach(function(worker) {
    worker.process.kill(sig);
  });
  process.kill(process.pid, sig);
};

WorkerPool.prototype._getReconnectTimeout = function() {
  var timeDiff = Date.now() - this._lastReconnectAt;
  var oneMinTime = 1000 * 60;
  if(timeDiff > oneMinTime) {
    this._recentReconnects = 0;
  }

  var reconnectTime = this._recentReconnects * 500;

  this._recentReconnects++;
  this._lastReconnectAt = Date.now();

  return reconnectTime;
};