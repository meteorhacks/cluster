var Cookies = Npm.require('cookies');
var HttpProxy = Npm.require('http-proxy');
var urlParse = Npm.require('url').parse;

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
  var endpointHash = ClusterManager.discovery.pickEndpointHash("web");
  if(endpointHash) {
    cookies.set('cluster-endpoint', endpointHash, {httpOnly: false});
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

  var endpoint = ClusterManager.discovery.hashToEndpoint(endpointHash);
  if(!endpoint) {
    // oops, no such endpoint. Let's get a new one.
    return Balancer._pickEndpoint(null, cookies, ++retries);
  }

  return endpoint;
};

Balancer._pickJustEndpoint = function _pickJustEndpoint(endpointHash) {
  if(!endpointHash) {
    // no hash, pick a new endpoint
    return ClusterManager.discovery.pickEndpoint("web");
  }

  var endpoint = ClusterManager.discovery.hashToEndpoint(endpointHash);
  if(!endpoint) {
    // oops, no such endpoint for this hash
    // pick a new endpoint
    return ClusterManager.discovery.pickEndpoint("web");
  }

  return endpoint;
};

Balancer._setBalanceUrlHeader = function _setBalanceUrlHeader(req) {
  // we need to indicate this request is from a balancer
  // that's why we need to add some value to it
  var balancerUrl = ClusterManager.discovery.pickBalancer();
  req.headers['from-balancer'] = balancerUrl || "1";
};

Balancer._pushBalancerUrl = function _pushBalancerUrl(req, res) {
  // push the balancer URL to the client via initial HTML
  var balancerUrl = req.headers['from-balancer'];
  if(balancerUrl && balancerUrl.trim() !== "1") {
    res.pushData("cluster-balancer-url", balancerUrl);
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
      console.error("Web proxy error: ", error.message);
      res.end("Internal Error: Please reload.");
    } else {
      // try to get a new endpoint
      var endpoint = Balancer._pickEndpoint(null, cookies);
      Balancer._proxyWeb(req, res, endpoint, cookies, ++retries);
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
  if(!ClusterManager.discovery) return false;

  // if this is from a balance, we don't need to proxy it
  if(req.headers['from-balancer']) {
    Balancer._pushBalancerUrl(req, res);
    return false;
  }

  var cookies = new Cookies(req, res);
  var endpointHash = cookies.get('cluster-endpoint');
  var endpoint = Balancer._pickEndpoint(endpointHash, cookies);
  if(!endpoint) {
    return false;
  }

  Balancer._setBalanceUrlHeader(req);
  Balancer._proxyWeb(req, res, endpoint, cookies);
  return true;
};

Balancer.handleWs = function handleWs(req, socket, head) {
  if(!ClusterManager.discovery) return false;

  if(req.headers['from-balancer']) {
    // if this is from a balance, we don't need to proxy it
    return false
  }

  var cookies = new Cookies(req);
  var endpointHash = cookies.get('cluster-endpoint');

  // this is very important. Otherwise raw WS traffic(even for non-web)
  // will be routed to a random web endpoint. That's bad
  if(!endpointHash) {
    return false;
  }

  var endpoint = Balancer._pickJustEndpoint(endpointHash);
  if(!endpoint) {
    return false;
  }

  Balancer._setBalanceUrlHeader(req);
  Balancer._proxyWs(req, socket, head, endpoint);
  return true;
};

OverShadowServerEvent('request', Balancer.handleHttp);
OverShadowServerEvent('upgrade', Balancer.handleWs);