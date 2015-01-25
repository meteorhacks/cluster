ClusterManager.connect = function(connUrl) {
  MongoDiscovery.connect(connUrl);
  this._registeredServices = {};
};

ClusterManager.discoverConnection = function(name, ddpOptions) {
  var options = {
    ddpOptions: ddpOptions
  };

  var proxy = new ProxyConnection(MongoDiscovery, name, options);
  return proxy;
};

ClusterManager.register = function register(name, options) {
  MongoDiscovery.register(name, options);
};

ClusterManager.findService = function(name, options) {
  //
};