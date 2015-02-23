var Cookies = Npm.require('cookies');

Balancer.handleHttp = function handleHttp(req, res) {
  if(!Cluster.discovery) return Balancer._processHereHTTP(req, res);

  // if this is from a balance, we don't need to proxy it
  if(req.headers['from-balancer']) {
    return Balancer._processHereHTTP(req, res);
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
    if(!endpoint) return Balancer._processHereHTTP(req, res);
  }

  if(endpoint === Cluster._endpoint) {
    return Balancer._processHereHTTP(req, res);
  }

  Balancer._setFromBalanceUrlHeader(req);
  Balancer._proxyWeb(req, res, endpoint, cookies);
  return true;
};

Balancer.handleWs = function handleWs(req, socket, head) {
  if(!Cluster.discovery) return Balancer._processHereWS(req, socket, head);

  if(req.headers['from-balancer']) {
    // if this is from a balance, we don't need to proxy it
    return Balancer._processHereWS(req, socket, head)
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
      return Balancer._processHereWS(req, socket, head);
    }
  }

  if(!endpoint) {
    return Balancer._processHereWS(req, socket, head);
  }

  if(endpoint === Cluster._endpoint) {
    return Balancer._processHereWS(req, socket, head);
  }

  Balancer._setFromBalanceUrlHeader(req);
  Balancer._proxyWs(req, socket, head, endpoint);
  return true;
};

OverShadowServerEvent('request', Balancer.handleHttp);
OverShadowServerEvent('upgrade', Balancer.handleWs);