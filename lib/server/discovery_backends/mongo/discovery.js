MongoDiscovery = {};

MongoDiscovery.connect = function connect(mongoUrl, options) {
  if(this._conn) {
    throw new Error("MongoDiscovery is already connected!");
  }

  options = options || {};
  var collName = options.collName || "cluster-endpoints";
  // connect and watch for balancers and endpoints
  this._connUrl = mongoUrl;
  this._conn = new MongoInternals.RemoteCollectionDriver(this._connUrl);
  this._endpointsColl = new Mongo.Collection(collName, {_driver: this._conn});

  // maintains a list of most recent endoints in the cluster
  this._currentEndpoints = new MongoDiscoveryStore();
  // maintains a list of most recent balancers in the cluster
  this._currentBalancers = new MongoDiscoveryStore();

  this._watchHander = this._startWatching();
};

MongoDiscovery.disconnect = function disconnect() {
  var self = this;
  this._watchHander.stop();
  this._watchHander = null;

  this._conn.mongo.close();
  this._conn = null;

  if(this._pingHandler) {
    Meteor.clearTimeout(this._pingHandler);
  }

  [
    '_connUrl', '_conn', '_endpointsColl', '_currentEndpoints',
    '_currentBalancers', '_watchHander', '_serviceName', '_balancer',
    '_endpoint', '_endpointHash', '_pingHandler', '_pingInterval'
  ].forEach(function(field) {
    self[field] = null;
  });
};

MongoDiscovery.register = function register(serviceName, options) {
  if(this._pingHandler) {
    throw new Error("this endpoint is already registered!");
  }

  options = options || {};
  this._pingInterval = options.pingInterval || 5 * 1000;

  var balancer =
    options.balancer ||
    process.env.BALANCER_URL;

  var endpoint =
    options.endpoint ||
    process.env.ENDPOINT_URL ||
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
  this._pingHandler =
    Meteor.setInterval(this._ping.bind(this), this._pingInterval);
};

MongoDiscovery.pickEndpoint = function pickEndpoint(serviceName) {
  // check heathly when picking
  var service = this._currentEndpoints.getRandom(serviceName);
  if(service) {
    return service.endpoint;
  }
};

MongoDiscovery.pickEndpointHash = function pickEndpointHash(serviceName) {
  var service = this._currentEndpoints.getRandom(serviceName);
  if(service) {
    return service.endpointHash;
  }
};

MongoDiscovery.hashToEndpoint = function hashToEndpoint(hash) {
  var service = this._currentEndpoints.byEndpointHash(hash);
  if(service) {
    return service.endpoint;
  }
};

MongoDiscovery.endpointToHash = function endpointToHash(endpoint) {
  return this._hash(endpoint);
}

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
    // return process.env.ROOT_URL;
  }
};

MongoDiscovery.hasBalancer = function(balancer) {
  return !!this._currentBalancers.byBalancer(balancer);
};

MongoDiscovery._hash = function _hash(endpoint) {
  var crypto = Npm.require('crypto');
  var algo = crypto.createHash('sha1');
  algo.update(endpoint);
  return algo.digest('hex');
};

MongoDiscovery._ping = function _ping(options) {
  options = options || {};
  var sendAllInfo = options.sendAllInfo || false;

  var selector = {
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

  this._endpointsColl.upsert(selector, {$set: payload});
};

MongoDiscovery._startWatching = function _startWatching() {
  var endpointCursor = this._endpointsColl.find({}, {
    sort: {timestamp: -1},
    limit: 100
  });

  var balancerSelector = {balancer: {$ne: null}};
  var balancerCursor = this._endpointsColl.find(balancerSelector, {
    sort: {timestamp: -1},
    limit: 100
  });

  var endpointHandler =
    this._observerAndStore(endpointCursor, this._currentEndpoints);
  var balancerHandler =
    this._observerAndStore(balancerCursor, this._currentBalancers);

  var returnPayload = {
    stop: function() {
      endpointHandler.stop();
      balancerHandler.stop();
    }
  };

  return returnPayload;
};

MongoDiscovery._observerAndStore =
function _observerAndStore(cursor, store, options) {
  options = options || {};
  var healthCheckInterval = options.healthCheckInterval || 5 * 1000;

  var handler = cursor.observe({
    added: function(service) {
      store.set(service._id, service);
    },
    changed: function(service) {
      store.set(service._id, service);
    },
    removed: function(service) {
      store.remove(service._id);
    }
  });

  removeUnhealthyServices();
  var healthCheckHandler =
    Meteor.setInterval(removeUnhealthyServices, healthCheckInterval);

  function removeUnhealthyServices() {
    store.getAll().forEach(function(service) {
      if(!MongoDiscovery._isHealthy(service)) {
        store.remove(service._id);
      }
    });
  }

  function rebuildIndexMap() {
    indexMap = {};
    store.forEach(function(service, index) {
      indexMap[service._id] = index;
    });
  }

  var returnPayload = {
    stop: function() {
      handler.stop();
      Meteor.clearTimeout(healthCheckHandler);
    }
  };

  return returnPayload;
};

MongoDiscovery._isHealthy = function _isHealthy(service) {
  var diff = Date.now() - service.timestamp.getTime();
  return diff - 1000 < service.pingInterval;
};