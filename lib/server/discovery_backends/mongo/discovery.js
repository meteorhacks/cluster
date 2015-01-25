MongoDiscovery = {};

MongoDiscovery.connect = function connect(mongoUrl) {
  // connect and watch for balancers and endpoints
  this._connUrl = mongoUrl;
  this._conn = new MongoInternals.RemoteCollectionDriver(this._connUrl);

  var collName = 'cluster-endpoints';
  this._endpointsColl = new Mongo.Collection(collName, {_driver: this._conn});

  // maintains a list of most recent endoints in the cluster
  this._currentEndpoints = [];
  // maintains a list of most recent balancers in the cluster
  this._currentBalancers = [];

  this_watchHander = this._startWatching();
};

MongoDiscovery.register = function register(serviceName, options) {
  options = options || {};
  var pingInterval = options.pingInterval || 5 * 1000;

  var balancer =
    options.balancer ||
    process.env.BALANCER_URL;

  var endpoint =
    options.endpoint ||
    options.env.ENDPOINT_URL ||
    balancer;

  if(!endpoint) {
    console.warn("endpoint url not exists. cannot register with the cluster");
    return;
  }

  this._serviceName = serviceName;
  this._balancer = balancer;
  this._endpoint = endpoint;
  this._endpointHash = this._hash(endpoint);

  // pinging logic
  this._ping({sendAllInfo: true});
  this._pingHandler = Meteor.setInterval(this._ping.bind(this), pingInterval);
};

MongoDiscovery.pickEndpoint = function pickEndpoint(serviceName) {
  // check heathly when picking
  var service = this._currentEndpoints.getRandom(serviceName);
  return service.endpoint;
};

MongoDiscovery.pickEndpointHash = function pickEndpointHash(serviceName) {
  var service = this._currentEndpoints.getRandom(serviceName);
  return service.endpointHash;
};

MongoDiscovery.hashToEndpoint = function hashToEndpoint(hash) {
  var service = this._currentEndpoints.byEndpointHash(hash);
  return service.endpoint;
};

// balancer's serviceName is optional
// It doesn't need to be a service
MongoDiscovery.pickBalancer = function pickBalancer(serviceName) {
  var service = this._currentBalancers.getRandom();
  if(service) {
    return service.balancer;
  } else {
    // then the balancer is the ROOT_URL
    // with this, our cluster act as a normal load balancer
    // but with automatic service discovery
    return process.env.ROOT_URL;
  }
};

MongoDiscovery._hash = function _hash(endpoint) {
  return "hashed-" + endpoint;
};

MongoDiscovery._ping = function _ping(options) {
  options = options || {};
  var sendAllInfo = options.sendAllInfo || false;

  var selector = {
    serviceName: this._serviceName,
    endpoint: this._endpoint,
  };

  var payload = {
    timestamp: new Date()
  };

  if(sendAllInfo) {
    payload.endpointHash = this._endpointHash;
    payload.balancer = this._balancer;
  }

  this._endpointsColl.upsert(selector, {$set: payload});
};

MongoDiscovery._startWatching = function _startWatching() {
  var endpointCursor = this._endpointsColl({}, {
    sort: {timestamp: -1},
    limit: 100
  });

  var balancerSelector = {balancer: {$exists: true}};
  var balancerCursor = this._endpointsColl(balancerSelector, {
    sort: {timestamp: -1},
    limit: 100
  });

  var endpointHandler =
    this._observerAndStore(endpointCursor, this._currentEndpoints);
  var balancerHandler =
    this._observerAndStore(balancerSelector, this._currentBalancers);

  var returnPayload = {
    stop: function() {
      endpointHandler.stop();
      balancerHandler.stop();
    }
  };

  return returnPayload;
};

MongoDiscovery._observerAndStore = function _observerAndStore(cursor, store) {
  var indexMap = {};
  var handler = cursor.observeChanges({
    added: function(id, service) {
      store.set(id, service);
    },
    changed: function(id, service) {
      var existingService = store.get(id);
      _.extend(existingService, service);
    },
    removed: function(id) {
      store.remove(id);
    }
  });

  function rebuildIndexMap() {
    indexMap = {};
    store.forEach(function(service, index) {
      indexMap[service._id] = index;
    });
  }

  return handler;
};