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
    console.info("cluster: connecting to '%s' discovery backend", backendName);
    this.discovery.connect(connUrl);

    var warnMessage = "trying to connect, but already connected";
    Cluster.connect = Cluster._blockCallAgain(warnMessage);
  } else {
    throw new Error("cluster: connect url should an url");
  }
};

Cluster.allowPublicAccess = function allowPublicAccess(serviceList) {
  var self = this;
  if(!(serviceList instanceof Array)) {
    serviceList = _.toArray(arguments);
  }

  var message = "cluster: allow public access for '%s' service(s)";
  console.info(message, serviceList.join(", "));

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
  options = options || {};
  options.balancer = options.balancer || process.env.CLUSTER_BALANCER_URL;
  options.endpoint = options.endpoint || process.env.CLUSTER_ENDPOINT_URL;

  console.info("cluster: registering this node as service '%s'", name);
  console.info("cluster:    endpoint url =", options.endpoint);
  console.info("cluster:    balancer url =", options.balancer);
  this.discovery.register(name, options);

  Cluster.register = Cluster._blockCallAgain("already registered as - " + name);
};

Cluster._isPublicService = function _isPublicService(serviceName) {
  return this._publicServices[serviceName];
};

Cluster.registerDiscoveryBackend =
function registerDiscoveryBackend(name, backend) {
  this._discoveryBackends[name] = backend;
};

Cluster._blockCallAgain = function(message) {
  return function() {
    throw new Error("cluster: " + message);
  };
};