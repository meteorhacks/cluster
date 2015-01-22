ClusterManager.discoverConnection = function(name, ddpOptions) {
  var options = {
    ddpOptions: ddpOptions,
    query: {}
  };

  var cursor = new Cursor(name);
  var proxy = new ProxyConnection(cursor, name, options);
  return proxy;
};