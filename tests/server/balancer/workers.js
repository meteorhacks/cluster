var os = Npm.require('os');

Tinytest.add("Balancer - _getWorkersCount - not provided", function(test) {
  var count = Balancer._getWorkersCount();
  test.equal(count, 0);
});

Tinytest.add("Balancer - _getWorkersCount - provided", function(test) {
  WithNew(process.env, {"CLUSTER_WORKERS_COUNT": "2"}, function() {
    var count = Balancer._getWorkersCount();
    test.equal(count, 2);
  });
});

Tinytest.add("Balancer - _getWorkersCount - provided NaN", function(test) {
  WithNew(process.env, {"CLUSTER_WORKERS_COUNT": "dsds"}, function() {
    var count = Balancer._getWorkersCount();
    test.equal(count, 0);
  });
});

Tinytest.add("Balancer - _getWorkersCount - provided auto", function(test) {
  WithNew(process.env, {"CLUSTER_WORKERS_COUNT": "AuTo"}, function() {
    var count = Balancer._getWorkersCount();
    test.equal(count, os.cpus().length);
  });
});

Tinytest.add("Balancer - _getWorkersCount - provided auto, but only one core",
function(test) {
  WithNew(process.env, {"CLUSTER_WORKERS_COUNT": "AuTo"}, function() {
    WithNew(os, {cpus: function() {return 1}}, function() {
      var count = Balancer._getWorkersCount();
      test.equal(count, 0);
    });
  });
});

//
// *** Balancer._processHereWS() ***
//

Tinytest.add("Balancer - _processHereWS - inside a worker",
function(test) {
  WithNew(process.env, {"CLUSTER_WORKER_ID": "1"}, function() {
    var result = Balancer._processHereWS();
    test.equal(result, false);
  });
});

Tinytest.add("Balancer - _processHereWS - no workers",
function(test) {
  var pickWorker = sinon.stub().returns(null);
  WithNew(Balancer, {_pickWorker: pickWorker}, function() {
    var result = Balancer._processHereWS();
    test.equal(result, false);
    test.isTrue(pickWorker.called);
  });
});

Tinytest.add("Balancer - _processHereWS - have a worker",
function(test) {
  var send = sinon.stub();
  var worker = {port: "8930", process: {send: send}};
  var pickWorker = sinon.stub().returns(worker);

  WithNew(Balancer, {_pickWorker: pickWorker}, function() {
    var req = {url: "/"}, socket = {s: 1}, head = new Buffer("abc");
    var options = {target: {host: "127.0.0.1", port: worker.port}};
    var result = Balancer._processHereWS(req, socket, head);

    test.equal(result, true);
    test.isTrue(pickWorker.called);
    var message = {
      type: "proxy-ws",
      req: req,
      head: head.toString("utf8")
    };
    test.isTrue(send.calledWith(message, socket));
  });
});

//
// *** Balancer._processHereHTTP() ***
//

Tinytest.add("Balancer - _processHereHTTP - inside a worker",
function(test) {
  WithNew(process.env, {"CLUSTER_WORKER_ID": "1"}, function() {
    var result = Balancer._processHereHTTP();
    test.equal(result, false);
  });
});

Tinytest.add("Balancer - _processHereHTTP - not a long polling request",
function(test) {
  var req = {url: "/someother.js"};
  var result = Balancer._processHereHTTP(req);
  test.equal(result, false);
});

Tinytest.add("Balancer - _processHereHTTP - long polling, but no workers",
function(test) {
  var req = {url: getSockJSUrl()};
  var pickWorker = sinon.stub().returns(null);

  WithNew(Balancer, {_pickWorker: pickWorker}, function() {
    var result = Balancer._processHereHTTP(req);
    test.equal(result, false);
    test.isTrue(pickWorker.called);
  });
});

Tinytest.add("Balancer - _processHereHTTP - long polling, have workers",
function(test) {
  var req = {url: getSockJSUrl()};
  var res = {setTimeout: sinon.stub()};
  var worker = {port: 8323, id: 8};
  var pickWorker = sinon.stub().returns(worker);
  var web = sinon.stub();

  WithNew(Balancer, {_pickWorker: pickWorker}, function() {
    WithNew(Balancer.proxy, {web: web}, function() {
      var options = {target: {host: "127.0.0.1", port: worker.port}};
      var result = Balancer._processHereHTTP(req, res);

      test.equal(result, true);
      test.isTrue(pickWorker.called);
      test.isTrue(res.setTimeout.calledWith(2 * 60 * 1000));
      test.isTrue(web.calledWith(req, res, options));
    });
  });
});

Tinytest.add("Balancer - _processHereHTTP - long polling, call twice",
function(test) {
  var req = {url: getSockJSUrl()};
  var res = {setTimeout: sinon.stub()};
  var worker = {port: 7787, id: 8};
  var pickWorker = sinon.stub().returns(worker);
  var web = sinon.stub();

  WithNew(Balancer, {_pickWorker: pickWorker}, function() {
    WithNew(Balancer.proxy, {web: web}, function() {
      var options = {target: {host: "127.0.0.1", port: worker.port}};
      var result1 = Balancer._processHereHTTP(req, res);
      var result2 = Balancer._processHereHTTP(req, res);

      test.equal(result1, true);
      test.equal(result2, true);
      test.isTrue(pickWorker.calledOnce);
      test.isTrue(web.calledTwice);
    });
  });
});

Tinytest.add("Balancer - _processHereHTTP - long polling, onError",
function(test) {
  var req = {url: getSockJSUrl()};
  var res = {setTimeout: sinon.stub(), end: sinon.stub()};
  var worker = {port: 7787, id: 8};
  var pickWorker = sinon.stub().returns(worker);
  var web = sinon.stub();

  WithNew(Balancer, {_pickWorker: pickWorker}, function() {
    WithNew(Balancer.proxy, {web: web}, function() {
      var options = {target: {host: "127.0.0.1", port: worker.port}};
      var result = Balancer._processHereHTTP(req, res);

      test.isTrue(pickWorker.callCount, 1);
      test.isTrue(web.calledOnce);
      test.isFalse(res.end.calledOnce);

      var lastArg = web.getCall(0).args.pop();
      lastArg();

      test.isFalse(res.end.calledOnce);

      // let's call again
      Balancer._processHereHTTP(req, res);
      // now again called the pickWorker
      test.isTrue(pickWorker.callCount, 2);
    });
  });
});

function getSockJSUrl() {
  var id = Math.ceil(Math.random() * 999);
  var url = "/sockjs/" + id + "/sdssds/xhr";

  return url;
}