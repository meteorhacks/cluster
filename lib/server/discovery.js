Discovery = {};

Discovery.connect = function connect(connUrl, discoveryBackend, clusterInstance, options) {
  options = options || {};
  this._selfWeight = options.selfWeight;
  this._clusterInstance = clusterInstance;
  this._backend = discoveryBackend;

  // maintains a list of most recent endoints in the cluster
  this._currentEndpoints = new DiscoveryStore();
  // maintains a list of most recent balancers in the cluster
  this._currentBalancers = new DiscoveryStore();

  this._backend.connect(connUrl, this._currentEndpoints, this._currentBalancers, options);
};

Discovery.disconnect = function disconnect() {
  var self = this;

  this._backend.disconnect();

  if(this._pingHandler) {
    Meteor.clearTimeout(this._pingHandler);
  }

  [
    '_backend', '_currentEndpoints',
    '_currentBalancers', '_watchHander', '_serviceName', '_balancer',
    '_endpoint', '_endpointHash', '_pingHandler', '_pingInterval'
  ].forEach(function(field) {
    self[field] = null;
  });
};

Discovery.register = function register(serviceName, options) {
  if(this._pingHandler) {
    throw new Error("this endpoint is already registered!");
  }

  options = options || {};
  this._pingInterval = options.pingInterval || 5 * 1000;

  var balancer = options.balancer;
  var endpoint = options.endpoint || balancer;

  if(!endpoint) {
    console.warn("cluster: no endpoint url. cannot register with the cluster");
    return;
  }

  this._serviceName = serviceName;
  this._balancer = balancer;
  this._endpoint = endpoint;
  this._endpointHash = this._hash(endpoint);

  // pinging logic
  this._ping({sendAllInfo: true});
  this._pingHandler =
    Meteor.setInterval(this._ping.bind(this), this._pingInterval);
};

Discovery.pickEndpoint = function pickEndpoint(serviceName) {
  // check heathly when picking
  var service = this._getEndpoint(serviceName);
  if(service) {
    return service.endpoint;
  }
};

Discovery.pickEndpointHash = function pickEndpointHash(serviceName) {
  var service = this._getEndpoint(serviceName);
  if(service) {
    return service.endpointHash;
  }
};

Discovery._getEndpoint = function(serviceName) {
  if(this._selfWeight >= 0) {
    var endpointHash = this._hash(this._clusterInstance._endpoint);
    var service = this._currentEndpoints.
      getRandomWeighted(serviceName, endpointHash, this._selfWeight);
    return service;
  } else {
    var service = this._currentEndpoints.getRandom(serviceName);
    return service;
  }
};

Discovery.hashToEndpoint = function hashToEndpoint(hash) {
  var service = this._currentEndpoints.byEndpointHash(hash);
  if(service) {
    return service.endpoint;
  }
};

Discovery.endpointToHash = function endpointToHash(endpoint) {
  return this._hash(endpoint);
}

// balancer's serviceName is optional
// It doesn't need to be a service
Discovery.pickBalancer = function pickBalancer(endpointHash) {
  if(endpointHash) {
    var endpointService = this._currentEndpoints.byEndpointHash(endpointHash);
    if(endpointService && endpointService.balancer) {
      return endpointService.balancer;
    }
  }

  var balancerService = this._currentBalancers.getRandom();
  if(balancerService) {
    return balancerService.balancer;
  }

  return null;
};

Discovery.hasBalancer = function(balancer) {
  return !!this._currentBalancers.byBalancer(balancer);
};

Discovery._hash = function _hash(endpoint) {
  var crypto = Npm.require('crypto');
  var algo = crypto.createHash('sha1');
  algo.update(endpoint);
  return algo.digest('hex');
};

Discovery._ping = function _ping(options) {
  options = options || {};
  var sendAllInfo = options.sendAllInfo || false;

  // this is the way how we uniquely identify this instance
  var key = {
    serviceName: this._serviceName,
    endpoint: this._endpoint,
  };

  var payload = {
    timestamp: new Date(),
    pingInterval: this._pingInterval
  };

  if(sendAllInfo) {
    payload.endpointHash = this._endpointHash;
    payload.balancer = this._balancer;
  }

  this._backend.ping(key, payload);
};