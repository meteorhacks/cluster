var fork = Npm.require('child_process').fork;
var portscanner = Npm.require('portscanner');

WorkerPool = function WorkerPool(size) {
  if(process.env['CLUSTER_WORKER_ID']) return;

  var self = this;
  this._exec = process.argv[1];

  this._workers = [];
  this._workersMap = {};

  this._ids = 0;
  this._closed = false;

  for(var lc=0; lc<size; lc++) {
    this._createWorker();
  }

  _.each(['SIGINT', 'SIGHUP', 'SIGTERM'], function (sig) {
    process.once(sig, self._cleanup.bind(self));
  });
}

WorkerPool.prototype.pickWorker = function() {
  var index = Math.floor(this._workers.length * Math.random());
  var worker = _.pick(this._workers[index], "id", "port");
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

    var _process = fork(self._exec, {
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

    self._workers.push(worker);
    self._workersMap[worker.id] = worker;

    // TODO: learn a bit about exitCode and signalCode
    worker.process.on('exit', function(exitCode, signalCode) {
      var message = "Cluster: Exiting worker %s with exitCode=%s signalCode=%s";
      console.info(message, worker.id, exitCode, signalCode);
      var index = self._workers.indexOf(worker);
      self._workers.splice(index, 1);
      delete self._workersMap[worker.id];

      if(!self._closed) {
        self._createWorker();
      }
    });
  });
};

WorkerPool.prototype._cleanup = function(sig) {
  this._closed = true;
  this._workers.forEach(function(worker) {
    worker.process.kill(sig);
  });
  process.kill(process.pid, sig);
};