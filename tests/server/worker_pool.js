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

Tinytest.addAsync("WorkerPool - _fork", function(test, done) {
  var wp = new WorkerPool(0);
  var child_process = Npm.require('child_process');
  var portscanner = Npm.require('portscanner');

  var port = 8000;
  var p = {};
  var fork = sinon.stub().returns(p);
  var findAPortNotInUse = sinon.stub().callsArgWith(3, null, port);

  WithNew(child_process, {fork: fork}, function() {
    WithNew(portscanner, {findAPortNotInUse: findAPortNotInUse}, function() {
      wp._fork(function(worker) {
        test.equal(worker.id, wp._ids);
        test.equal(worker.port, port);

        test.isTrue(fork.called);
        test.isTrue(findAPortNotInUse.called);
        test.equal(worker.process, p);
        done();
      });
    });
  })
});

Tinytest.add("WorkerPool - _createWorker, check registration", function(test) {
  var wp = new WorkerPool(0);
  var worker = {
    process: {
      once: sinon.stub()
    },
    id: 100
  };
  wp._fork = sinon.stub().callsArgWith(0, worker);

  wp._createWorker();

  test.equal(wp._workersMap[worker.id], worker);
  test.isTrue(wp._workers.indexOf(worker) >= 0);
  test.isTrue(worker.process.once.called);
  test.isTrue(wp._fork.called);
});

Tinytest.add("WorkerPool - _createWorker, on exit and closed!", function(test) {
  var wp = new WorkerPool(0);
  var worker = {
    process: new (Npm.require('events').EventEmitter),
    id: 100
  };

  wp._fork = sinon.stub().callsArgWith(0, worker);
  wp._createWorker();
  test.isTrue(wp._fork.called);

  wp._closed = true;
  worker.process.emit('exit');
  test.equal(wp._workers.length, 0);
  test.equal(wp._workersMap, {});
});

Tinytest.add(
"WorkerPool - _createWorker, on exit and not closed!", function(test) {
  var wp = new WorkerPool(0);
  var worker = {
    process: new (Npm.require('events').EventEmitter),
    id: 100
  };

  wp._fork = sinon.stub().callsArgWith(0, worker);
  wp._createWorker();
  test.isTrue(wp._fork.called);

  wp._closed = false;
  wp._createWorker = sinon.stub();

  worker.process.emit('exit');
  test.isTrue(wp._createWorker.called)
});