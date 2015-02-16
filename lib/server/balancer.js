var Cookies = Npm.require('cookies');
var HttpProxy = Npm.require('http-proxy');
var urlParse = Npm.require('url').parse;
var urlResolve = Npm.require('url').resolve;

Balancer = {};
Balancer.proxy = HttpProxy.createProxyServer({
  xfwd: true
});

Balancer._urlToTarget = function _urlToTarget(url) {
  var parsedUrl = urlParse(url);
  var target = {
    host: parsedUrl.hostname,
    port: parsedUrl.port
  };

  return target;
};

Balancer._pickAndSetEndpointHash =
function _pickAndSetEndpointHash(cookies) {
  var endpointHash = Cluster.discovery.pickEndpointHash("web");
  if(endpointHash) {
    var cookieOptions = {
      httpOnly: true,
      // expire the cookie in one hour
      // then we can expect that long lasting sessions
      // does not affect to the load distribution much
      maxAge: 1000 * 60 * 60
    };
    cookies.set('cluster-endpoint', endpointHash, cookieOptions);
    return endpointHash;
  } else {
    // no endpoint point, simply process the request here
    return false;
  }
};

Balancer._pickEndpoint =
function _pickEndpoint(endpointHash, cookies, retries) {
  retries = retries || 0;
  if(retries > 1) return false;

  if(!endpointHash) {
    endpointHash = Balancer._pickAndSetEndpointHash(cookies);
    if(!endpointHash) {
      // no endpoint, simply process the request here
      return false;
    }
  }

  var endpoint = Cluster.discovery.hashToEndpoint(endpointHash);
  if(!endpoint) {
    // oops, no such endpoint. Let's get a new one.
    return Balancer._pickEndpoint(null, cookies, ++retries);
  }

  return endpoint;
};

Balancer._pickJustEndpoint = function _pickJustEndpoint(endpointHash, service) {
  service = service || "web";
  if(!endpointHash) {
    // no hash, pick a new endpoint
    return Cluster.discovery.pickEndpoint(service);
  }

  var endpoint = Cluster.discovery.hashToEndpoint(endpointHash);
  if(!endpoint) {
    // oops, no such endpoint for this hash
    // pick a new endpoint
    return Cluster.discovery.pickEndpoint(service);
  }

  return endpoint;
};

Balancer._setFromBalanceUrlHeader =
function _setFromBalanceUrlHeader(req, balancerUrl) {
  req.headers['from-balancer'] = "YES";
};

Balancer._sendSockJsInfo =
function _sendSockJsInfo(req, res, cookies) {
  var urlParsed = req.url.match(/(\w+)\/sockjs\/info/);
  var serviceName = (urlParsed)? urlParsed[1] : "web";

  if(serviceName == "web") {
    var endpointHash = cookies.get('cluster-endpoint');
    var endpoint = Balancer._pickJustEndpoint(endpointHash, serviceName);
  } else if(Cluster._isPublicService(serviceName)) {
    var endpoint = Balancer._pickJustEndpoint(null, serviceName);
  }

  if(!endpoint) {
    // we can't process this here.
    // TODO: better error handling
    console.error("cluster: no such endpoint for service:" + serviceName);
    res.writeHead(404);
    return res.end("no such endpoint for service: " + serviceName);
  }

  var endpointHash = Cluster.discovery.endpointToHash(endpoint);
  var balancer = Cluster.discovery.pickBalancer(endpointHash) || "";
  var base_url =
    urlResolve(balancer, "/cluster-ddp/" + endpointHash + "/" + serviceName);

  var info = {
    websocket: !process.env['DISABLE_WEBSOCKETS'],
    origins: ["*:*"],
    cookie_needed: false,
    entropy: Math.ceil(Math.random() * 9999999999),
    base_url: base_url
  };

  res.writeHead(200, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*'
  });
  res.end(JSON.stringify(info));
}

Balancer._rewriteDdpUrl = function _rewriteDdpUrl(req) {
  var regExp = /cluster-ddp\/(\w+)\/(\w+)/;
  var parsedUrl = req.url.match(regExp);
  if(parsedUrl) {
    req.url = req.url.replace(regExp, "sockjs/").replace(/[\/]+/g, "/");
    var endpointHash = {
      hash: parsedUrl[1],
      service: parsedUrl[2]
    };
    return endpointHash;
  }
};

Balancer._proxyWeb = function _proxyWeb(req, res, endpoint, cookies, retries) {
  // give support for sockjs long polling
  // otherwise meteor kill the connection after 5 secs by default
  if(/sockjs/.test(req.url)) {
    res.setTimeout(2 * 60 * 1000);
  }

  retries = retries || 0;
  var target = Balancer._urlToTarget(endpoint);

  Balancer.proxy.web(req, res, {target: target}, function(error) {
    if(retries++ > 2) {
      printError();
    } else {
      // try to get a new endpoint
      var endpoint = Balancer._pickEndpoint(null, cookies);
      if(endpoint) {
        Balancer._proxyWeb(req, res, endpoint, cookies, ++retries);
      } else {
        printError();
      }
    }

    function printError() {
      console.error("cluster: web proxy error: ", error.message);
      res.writeHead(500);
      res.end("Internal Error: Please reload.");
    }
  });
};

Balancer._proxyWs = function proxyWs(req, socket, head, endpoint) {
  var target = Balancer._urlToTarget(endpoint);
  Balancer.proxy.ws(req, socket, head, {target: target}, function(error) {
    // not sure we can re-try websockets, simply log it
    console.error("WS proxying failed! to: " + endpoint);
  });
};

Balancer.handleHttp = function handleHttp(req, res) {
  if(!Cluster.discovery) return false;

  // if this is from a balance, we don't need to proxy it
  if(req.headers['from-balancer']) {
    return false;
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
      var message = "cluster: there is no endpoint but we've a hash: ";
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
    if(!endpoint) return false;
  }

  if(endpoint === Cluster._endpoint) {
    return false;
  }

  Balancer._setFromBalanceUrlHeader(req);
  Balancer._proxyWeb(req, res, endpoint, cookies);
  return true;
};

Balancer.handleWs = function handleWs(req, socket, head) {
  if(!Cluster.discovery) return false;

  if(req.headers['from-balancer']) {
    // if this is from a balance, we don't need to proxy it
    return false
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
      return false;
    }
  }

  if(!endpoint) {
    return false;
  }

  if(endpoint === Cluster._endpoint) {
    return false;
  }

  Balancer._setFromBalanceUrlHeader(req);
  Balancer._proxyWs(req, socket, head, endpoint);
  return true;
};

OverShadowServerEvent('request', Balancer.handleHttp);
OverShadowServerEvent('upgrade', Balancer.handleWs);