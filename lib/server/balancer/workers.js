var workerMapping = {};
var workers = null;

// We need to start the worker pool after the server binded
// This allow use to play nicely with tools like userdown
WebApp.onListening(function() {
  var workersCount = Balancer._getWorkersCount();
  workers = new WorkerPool(workersCount);
});

Balancer._pickWorker = function() {
  return workers && workers.pickWorker();
};

Balancer._processHereWS = function _processHereWS(req, socket, head) {
  if(process.env['CLUSTER_WORKER_ID']) return false;

  var worker = Balancer._pickWorker();
  // No worker, can't proxy. So process here.
  if(!worker) return false;

  var target = {host: "127.0.0.1", port: worker.port};
  Balancer.proxy.ws(req, socket, head, {target: target}, function(error) {
    // not sure we can re-try websockets, simply log it
    console.error("Cluster: WS proxying to the worker:", worker, error.message);
  });
  return true;
};


Balancer._processHereHTTP = function _processHereHTTP(req, res) {
  if(process.env['CLUSTER_WORKER_ID']) return false;

  var longPollingMatcher =  /^\/sockjs\/([0-9]+)\/(\w+)\/xhr/;
  var match = req.url.match(longPollingMatcher);
  if(match) {
    var id = match[1] + match[2];
    if(!workerMapping[id]) {
      var worker = Balancer._pickWorker();
      if(worker) {
        workerMapping[id] = {worker: worker, lastUpdate: Date.now()}
      }
    }

    if(workerMapping[id]) {
      workerMapping[id].lastUpdate = Date.now();
      var target = {host: "127.0.0.1", port: workerMapping[id].worker.port}
      // Make sure we support long polling
      res.setTimeout(2 * 60 * 1000);
      Balancer.proxy.web(req, res, {target: target}, function(err) {
        res.writeHead(500);
        res.end();
        // Since this is long polling, error can happen even if user close the
        // session. That's why we don't print the message.
        //
        // Now we also delete the mapping. Then we don't have a leak on
        // workerMapping.
        // XXX come up with a better plan to clean up workerMapping
        delete workerMapping[id];
      });
      return true;
    } else {
      // Do not proxy, if we can't find out a worker
      return false;
    }
  } else {
    // Do not proxy for other files
    return false;
  }
}