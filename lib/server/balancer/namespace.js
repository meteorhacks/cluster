var HttpProxy = Npm.require('http-proxy');
var http = Npm.require('http');
http.globalAgent.maxSockets = 99999;

Balancer = {};
Balancer.proxy = HttpProxy.createProxyServer({
  xfwd: true
});