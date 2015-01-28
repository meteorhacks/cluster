Cluster._publicServices = {};
Cluster._registeredServices = {};
Cluster._discoveryBackends = {};

Cluster.connect = function(connUrl) {
  var matched = connUrl.match(/(\w+):\/\//);
  if(matched) {
    var backendName = matched[1];
    var backend = this._discoveryBackends[backendName];
    if(!backend) {
      throw new Error("cluster: no discovery backend named " + backendName);
    }

    this.discovery = backend;
    this.discovery.connect(connUrl);
  } else {
    throw new Error("cluster: connect url should an url");
  }
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

Cluster.registerDiscoveryBackend =
function registerDiscoveryBackend(name, backend) {
  this._discoveryBackends[name] = backend;
};