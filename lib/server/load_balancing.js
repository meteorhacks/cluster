var Cookies = Npm.require('cookies');
var HttpProxy = Npm.require('http-proxy');
var urlResolve = Npm.require('url').resolve;
var proxy = HttpProxy.createProxyServer({
  ws: false,
  xfwd: true
});

ClusterManager.loadBalance = function loadBalance(serviceName) {
  var query = {};
  var options = {limit: 10, interval: 15 * 1000};
  var cursor = new MongoBackend.Cursor(serviceName, query, options);
  var maxKeepUrls = 5;
  var urls = [];

  ClusterManager._pushPublicUrl(serviceName);
  ClusterManager._sendDDPHosts(serviceName, query, options);

  cursor.observeChanges({
    added: addUrl,
    removed: removeUrl
  });

  function addUrl(url) {
    urls.push(url);
  }

  function removeUrl(url) {
    var index = urls.indexOf(url);
    urls.splice(index, 1);
  }

  function pickUrl() {
    if(urls.length == 0) return ClusterManager._serviceUrl;

    var index = Math.floor(urls.length * Math.random());
    return urls[index];
  }

  function proxyRequest(ddpUrl, req, res, next, retryCount) {
    retryCount = retryCount || 0;
    if(retryCount === 3) {
      // cannot find a another host, try using this one
      return next();
    }

    // we don't need to proxy for the same host
    if(ddpUrl === ClusterManager._serviceUrl) {
      return next();
    }

    // set this header to avoid redirects
    req.headers['from-cluster-balancer'] = ClusterManager._serviceUrl;
    var target = urlResolve(ddpUrl, req.url);

    proxy.web(req, res, {target: target}, function(error) {
      console.log("proxying error: ", error.message);
      // retry proxying again
      var url = pickUrl();
      proxyRequest(url, req, res, next, ++retryCount);
    });
  }

  // Implement the Balancer
  Picker.middleware(function(req, res, next) {
    var cookies = new Cookies(req, res);

    // if the request is coming from a balancer, we don't need to proxy it.
    var fromCluster = !!req.headers['from-cluster-balancer'];
    if(fromCluster) return processHere();

    var ddpUrlFromCookie = cookies.get("current-ddp-url");
    if(ddpUrlFromCookie) {
      // if we've a cookie with the host, then we need to proxy there.
      proxyRequest(ddpUrlFromCookie, req, res, processHere);
    } else {
      // if this is a new request, just proxy to a new URL
      var url = pickUrl();
      proxyRequest(url, req, res, processHere);
    }

    function processHere() {
      cookies.set("current-ddp-url", ClusterManager._serviceUrl);
      return next();
    }
  });
};

ClusterManager._pushPublicUrl = function(serviceName) {
  Picker.middleware(function(req, res, next) {
    res.pushData("clusterManager.loadBalanceInfo", {
      ddpUrl: ClusterManager._serviceUrl,
      service: serviceName
    });
    next();
  });
};

ClusterManager._sendDDPHosts = function(serviceName, query, options) {
  Meteor.publish(null, function() {
    return new MongoBackend.Cursor(serviceName, query, options);
  });
};