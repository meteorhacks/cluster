var Cookies = Npm.require('cookies');
var HttpProxy = Npm.require('http-proxy');
var urlParse = Npm.require('url').parse;
var proxy = HttpProxy.createProxyServer({
  xfwd: true
});

Balancer = {};

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
    cookies.set('cluster-endpoint', endpointHash);
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

Balancer._pickAndSetBalancer = function _pickAndSetBalancer(cookies) {
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
};

Balancer._pickJustEndpoint = function _pickJustEndpoint(cookies) {
  var endpointHash = cookies.get('cluster-endpoint');
  if(!endpointHash) {
    // no endpoint point, simply process the request here
    return false
  }

  var endpoint = ClusterManager.discovery.hashToEndpoint(endpointHash);
  if(!endpoint) {
    // oops, no such endpoint. we can't set a cookie here either.
    // so, we just pick and endpoint and forward.
    endpoint = ClusterManager.discovery.pickEndpoint("web");
    if(!endpoint) {
      // can't help. Simply process here.
      return false
    }
  }

  return endpoint;
};

Balancer._proxyWeb = function _proxyWeb(req, res, endpoint, cookies, retries) {
  retries = retries || 0;
  var target = Balancer._urlToTarget(endpoint);

  proxy.web(req, res, {target: target}, function(error) {
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
  proxy.ws(req, socket, head, {target: target}, function(error) {
    // not sure we can re-try websockets, simply log it
    console.error("WS proxying failed! to: " + endpoint);
  });
};

Balancer.handleHttp = function handleHttp(req, res) {
  if(!ClusterManager.discovery) return false;

  if(req.headers['from-balancer']) {
    // if this is from a balance, we don't need to proxy it
    return false;
  }

  var cookies = new Cookies(req, res);
  var balacerUrl = Balancer._pickAndSetBalancer(cookies);

  var endpointHash = cookies.get('cluster-endpoint');
  var endpoint = Balancer._pickEndpoint(endpointHash, cookies);
  if(!endpoint) {
    return false;
  }

  req.headers['from-balancer'] = balacerUrl || process.env.ROOT_URL;
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
  var balacerUrl = cookies.get("cluster-balancer");

  var endpoint = Balancer._pickJustEndpoint(cookies);
  console.log("WS Endpoint: ", endpoint);
  if(!endpoint) {
    return false;
  }

  req.headers['from-balancer'] = balacerUrl || process.env.ROOT_URL;
  Balancer._proxyWs(req, socket, head, endpoint);
  return true;
};

OverShadowServerEvent('request', Balancer.handleHttp);
OverShadowServerEvent('upgrade', Balancer.handleWs);