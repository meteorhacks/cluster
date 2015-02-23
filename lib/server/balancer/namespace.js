var HttpProxy = Npm.require('http-proxy');

Balancer = {};
Balancer.proxy = HttpProxy.createProxyServer({
  xfwd: true
});