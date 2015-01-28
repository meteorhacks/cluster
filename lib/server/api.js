Cluster._publicServices = {};
Cluster._registeredServices = {};

Cluster.connect = function(connUrl) {
  var self = this;
  this.discovery = MongoDiscovery;
  this.discovery.connect(connUrl);
};

Cluster.allowPublicAccess = function allowPublicAccess(serviceList) {
  var self = this;
  if(!(serviceList instanceof Array)) {
    serviceList = _.toArray(arguments);
  }

  serviceList.forEach(function(service) {
    self._publicServices[service] = true;
  });
};

Cluster.discoverConnection = function discoverConnection(name, ddpOptions) {
  var options = {
    ddpOptions: ddpOptions
  };

  var proxy = new ProxyConnection(this.discovery, name, options);
  return proxy;
};

Cluster.register = function register(name, options) {
  this.discovery.register(name, options);
};

Cluster._isPublicService = function _isPublicService(serviceName) {
  return this._publicServices[serviceName];
};