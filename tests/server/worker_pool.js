Tinytest.add("WorkerPool - create n workers", function(test) {
  var newProto = {
    _createWorker: sinon.stub()
  };

  WithNew(WorkerPool.prototype, newProto, function() {
    var worker = new WorkerPool(3);
    test.equal(newProto._createWorker.callCount, 3);
  });
});

Tinytest.add("WorkerPool - watch for signals", function(test) {
  var newProto = {
    _cleanup: sinon.stub()
  };

  var singalMethodMap = {};
  var newProcess = {
    once: function(signal, cb) {
      singalMethodMap[signal] = cb;
    }
  };

  WithNew(process, newProcess, function() {
    WithNew(WorkerPool.prototype, newProto, function() {
      var worker = new WorkerPool(0);
      ['SIGINT', 'SIGHUP', 'SIGTERM'].forEach(function(signal) {
        singalMethodMap[signal](signal);
      });

      test.equal(newProto._cleanup.callCount, 3);
    });
  });
});

Tinytest.add("WorkerPool - ignore if this is a worker", function(test) {
  var newEnv = {
    CLUSTER_WORKER_ID: 1
  };

  WithNew(process.env, newEnv, function() {
    var newProto = {
      _createWorker: sinon.stub()
    };

    WithNew(WorkerPool.prototype, newProto, function() {
      var worker = new WorkerPool(3);
      test.equal(newProto._createWorker.callCount, 0);
    });
  });
});

Tinytest.add("WorkerPool - _cleanup", function(test) {
  var wp = new WorkerPool(0);
  var kill1 = sinon.stub();
  var kill2 = sinon.stub();
  var killProcess = sinon.stub();

  wp._workers.push({
    process: {
      kill: kill1
    }
  });

  wp._workers.push({
    process: {
      kill: kill2
    }
  });

  WithNew(process, {kill: killProcess}, function() {
    wp._cleanup();
    test.isTrue(wp._closed);
    test.isTrue(kill1.called);
    test.isTrue(kill2.called);
    test.isTrue(killProcess.called);
  });
});

Tinytest.add("WorkerPool - hasWorker", function(test) {
  var wp = new WorkerPool(0);
  var workerId = "wid";

  wp._workersMap[workerId] = {id: workerId};
  test.isTrue(wp.hasWorker(workerId));
});

Tinytest.add("WorkerPool - pickWorker", function(test) {
  var wp = new WorkerPool(0);
  var workerId = "wid";

  wp._workers.push({id: workerId})
  var worker = wp.pickWorker();

  test.equal(worker.id, workerId);
});