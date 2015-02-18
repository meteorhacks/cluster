var Cookies = Npm.require('cookies');

var workers = process.env['CLUSTER_WORKERS_COUNT'] || 0;
workers = new WorkerPool(workers);

Balancer.handleHttp = function handleHttp(req, res) {
  if(!Cluster.discovery) return processHereHTTP();

  // if this is from a balance, we don't need to proxy it
  if(req.headers['from-balancer']) {
    return processHereHTTP();
  }

  var cookies = new Cookies(req, res);

  if(/\/sockjs\/info/.test(req.url)) {
    Balancer._sendSockJsInfo(req, res, cookies);
    return true;
  }

  // try to get endpointHash from the our cluster-ddp url
  // this is for sockjs long polling requets
  var endpointInfo = Balancer._rewriteDdpUrl(req);
  if(endpointInfo) {
    var endpoint =
      Balancer._pickJustEndpoint(endpointInfo.hash, endpointInfo.service);

    if(!endpoint) {
      // seems like sockjs connection is not there yet!
      // let's end it here.
      var message = "Cluster: there is no endpoint but we've a hash: ";
      console.error(message + endpointInfo.hash);
      res.writeHead(500);
      res.end();
      return true;
    }
  }

  if(!endpointInfo) {
    // seems like this is just static resources
    // we can get the endpointHash from the cookie
    var endpointHash = cookies.get('cluster-endpoint');
    var endpoint = Balancer._pickEndpoint(endpointHash, cookies);
    if(!endpoint) return processHereHTTP();
  }

  if(endpoint === Cluster._endpoint) {
    return processHereHTTP();
  }

  Balancer._setFromBalanceUrlHeader(req);
  Balancer._proxyWeb(req, res, endpoint, cookies);
  return true;
};

Balancer.handleWs = function handleWs(req, socket, head) {
  if(!Cluster.discovery) return processHereWS(req, socket, head);

  if(req.headers['from-balancer']) {
    // if this is from a balance, we don't need to proxy it
    return processHereWS(req, socket, head)
  }

  // try to get endpointHash from the our cluster-ddp url
  var endpointInfo = Balancer._rewriteDdpUrl(req);
  if(endpointInfo) {
    var endpoint =
      Balancer._pickJustEndpoint(endpointInfo.hash, endpointInfo.service);
  }

  // try to get the endpointHash from the cookie
  // this is when there is no balancer url
  if(!endpointInfo) {
    var cookies = new Cookies(req);
    var endpointHash = cookies.get('cluster-endpoint');
    if(endpointHash) {
      var endpoint = Balancer._pickJustEndpoint(endpointHash);
    } else {
      // seems like a direct connection
      // just process here. We don't need to route it to a random web service
      // because, it is possible that this endpoint is for some other service
      // than web.
      return processHereWS(req, socket, head);
    }
  }

  if(!endpoint) {
    return processHereWS(req, socket, head);
  }

  if(endpoint === Cluster._endpoint) {
    return processHereWS(req, socket, head);
  }

  Balancer._setFromBalanceUrlHeader(req);
  Balancer._proxyWs(req, socket, head, endpoint);
  return true;
};

OverShadowServerEvent('request', Balancer.handleHttp);
OverShadowServerEvent('upgrade', Balancer.handleWs);

// Process locally. If there are any workers running, proxy DDP traffic to them

function processHereHTTP() {
  return false;
}

function processHereWS(req, socket, head) {
  if(process.env['CLUSTER_WORKER_ID']) return;

  var worker = workers.pickWorker();
  // No worker, can't proxy. So process here.
  if(!worker) return false;

  var target = {host: "127.0.0.1", port: worker.port};
  Balancer.proxy.ws(req, socket, head, {target: target}, function(error) {
    // not sure we can re-try websockets, simply log it
    console.error("Cluster: WS proxying to the worker:", worker, error.message);
  });
  return true;
}