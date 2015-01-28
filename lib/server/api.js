Cluster.connect = function(connUrl) {
  var self = this;
  this.discovery = MongoDiscovery;
  this.discovery.connect(connUrl);
  this._registeredServices = {};
};

Cluster.discoverConnection = function(name, ddpOptions) {
  var options = {
    ddpOptions: ddpOptions
  };

  var proxy = new ProxyConnection(this.discovery, name, options);
  return proxy;
};

Cluster.register = function register(name, options) {
  this.discovery.register(name, options);
};