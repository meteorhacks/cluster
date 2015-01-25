var Cookies = Npm.require('cookies');
var HttpProxy = Npm.require('http-proxy');
var urlParse = Npm.require('url').parse;
var proxy = HttpProxy.createProxyServer({
  xfwd: true
});

function pickAndSetEndpointHash(cookies, retryCount) {
  var endpointHash = ClusterManager.discovery.pickEndpointHash("web");
  if(endpointHash) {
    cookies.set('cluster-endpoint', endpointHash);
    return endpointHash;
  } else {
    // no endpoint point, simply process the request here
    return false;
  }
}

function pickEndpoint(endpointHash, cookies) {
  if(!endpointHash) {
    endpointHash = pickAndSetEndpointHash(cookies);
    if(!endpointHash) {
      // no endpoint, simply process the request here
      return processHere();
    }
  }

  var endpoint = ClusterManager.discovery.hashToEndpoint(endpointHash);
  if(!endpoint) {
    // oops, no such endpoint. Let's get a new one.
    endpointHash = pickAndSetEndpointHash(cookies);
    if(!endpointHash) {
      // we don't have no more endpoints. process here.
      return processHere();
    } else {
      endpoint = ClusterManager.discovery.hashToEndpoint(endpointHash);
      if(!endpoint) {
        // weird! process here.
        return processHere();
      }
    }
  }

  return endpoint;
}

function proxyWeb(req, res, endpoint, cookies, retries) {
  retries = retries || 0;
  var target = urlToTarget(endpoint);

  proxy.web(req, res, {target: target}, function(error) {
    if(retries++ > 2) {
      console.error("Web proxy error: ", error.message);
      res.end("Internal Error: Please reload.");
    } else {
      // try to get a new endpoint
      var endpoint = pickEndpoint(null, cookies);
      proxyWeb(req, res, endpoint, cookies, ++retries);
    }
  });
}

function pickAndSetBalancer(cookies) {
  var balacerUrl = cookies.get("cluster-balancer");
  if(!balacerUrl) {
    balacerUrl = ClusterManager.discovery.pickBalancer();
    // a balancer comes in, then we can set it
    // this is the time, when a new balancer comes in after using no balancer
    if(balacerUrl) {
      cookies.set('cluster-balancer', balacerUrl);
    }
  }

  return balacerUrl;
}

function pickJustEndpoint(cookies) {
  var endpointHash = cookies.get('cluster-endpoint');
  if(!endpointHash) {
    // no endpoint point, simply process the request here
    return processHere()
  }

  var endpoint = ClusterManager.discovery.hashToEndpoint(endpointHash);
  if(!endpoint) {
    // oops, no such endpoint. we can't set a cookie here either.
    // so, we just pick and endpoint and forward.
    endpoint = ClusterManager.discovery.pickEndpoint("web");
    if(!endpoint) {
      // can't help. Simply process here.
      return processHere()
    }
  }

  return endpoint;
}

function proxyWs(req, socket, head, endpoint) {
  var target = urlToTarget(endpoint);
  proxy.ws(req, socket, head, {target: target}, function(error) {
    // not sure we can re-try websockets, simply log it
    console.error("WS proxying failed! to: " + endpoint);
  });
}

overShadowServerEvent('request', function(req, res) {
  if(!ClusterManager.discovery) return processHere();

  if(req.headers['from-balancer']) {
    // if this is from a balance, we don't need to proxy it
    return processHere();
  }

  var cookies = new Cookies(req, res);
  var balacerUrl = pickAndSetBalancer(cookies);

  var endpointHash = cookies.get('cluster-endpoint');
  var endpoint = pickEndpoint(endpointHash, cookies);
  if(!endpoint) {
    return processHere();
  }

  req.headers['from-balancer'] = balacerUrl || process.env.ROOT_URL;
  proxyWeb(req, res, endpoint, cookies);
  return true;
});

overShadowServerEvent('upgrade', function(req, socket, head) {
  if(!ClusterManager.discovery) return processHere();

  if(req.headers['from-balancer']) {
    // if this is from a balance, we don't need to proxy it
    return processHere()
  }

  var cookies = new Cookies(req);
  var balacerUrl = cookies.get("cluster-balancer");

  var endpoint = pickJustEndpoint(cookies);
  console.log("WS Endpoint: ", endpoint);
  if(!endpoint) {
    return processHere();
  }

  req.headers['from-balancer'] = balacerUrl || process.env.ROOT_URL;
  proxyWs(req, socket, head, endpoint);
  return true;
});

function processHere() {
  return false;
}

function overShadowServerEvent(event, handler) {
  var httpServer = Package.webapp.WebApp.httpServer;
  var oldHttpServerListeners = httpServer.listeners(event).slice(0);
  httpServer.removeAllListeners(event);

  var newListener = function(request /*, moreArguments */) {
    // Store arguments for use within the closure below
    var args = arguments;
    if(handler.apply(httpServer, args) !== true) {
      _.each(oldHttpServerListeners, function(oldListener) {
        oldListener.apply(httpServer, args);
      });
    };
  };
  httpServer.addListener(event, newListener);
}

function urlToTarget(url) {
  var parsedUrl = urlParse(url);
  var target = {
    host: parsedUrl.hostname,
    port: parsedUrl.port
  };

  return target;
}