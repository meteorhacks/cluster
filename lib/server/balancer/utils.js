var urlParse = Npm.require('url').parse;
var urlResolve = Npm.require('url').resolve;

Balancer._buildCookie = function _buildCookie(name, service) {
  return name + "::" + service;
};

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
  var service = Cluster._uiService;
  var endpointHash = Cluster.discovery.pickEndpointHash(service);
  if(endpointHash) {
    var cookieOptions = {
      httpOnly: true
    };
    var cookieName = Balancer._buildCookie('cluster-endpoint', service);
    cookies.set(cookieName, endpointHash, cookieOptions);
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
  if(!service) throw new Error("service name is required");

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
  var serviceName = urlParsed && urlParsed[1];

  if(!serviceName) {
    serviceName = Cluster._uiService;
  }

  if(serviceName === Cluster._uiService) {
    var cookieName = Balancer._buildCookie('cluster-endpoint', serviceName);
    var endpointHash = cookies.get(cookieName);
    var endpoint = Balancer._pickJustEndpoint(endpointHash, serviceName);
  } else if(Cluster._isPublicService(serviceName)) {
    var endpoint = Balancer._pickJustEndpoint(null, serviceName);
  }

  if(!endpoint) {
    // we can't process this here.
    // TODO: better error handling
    console.error("Cluster: no such endpoint for service:" + serviceName);
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
      service: parsedUrl[2] || Cluster._uiService
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
      console.error("Cluster: web proxy error: ", error.message);
      res.writeHead(500);
      res.end("Internal Error: Please reload.");
    }
  });
};

Balancer._proxyWs = function proxyWs(req, socket, head, endpoint) {
  var target = Balancer._urlToTarget(endpoint);
  Balancer.proxy.ws(req, socket, head, {target: target}, function(error) {
    // not sure we can re-try websockets, simply log it
    console.error("WS proxying failed! to: ", endpoint, "err:", error.message);
  });
};