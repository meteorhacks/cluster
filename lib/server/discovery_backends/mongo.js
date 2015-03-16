MongoClient = Npm.require("mongodb").MongoClient;
MongoDiscovery = {};
Cluster.registerDiscoveryBackend("mongodb", MongoDiscovery);

MongoDiscovery.connect = function connect(mongoUrl, endpoints, balancers, options) {
  if(this._conn) {
    throw new Error("MongoDiscovery is already connected!");
  }

  options = options || {};
  this._dataFetchInterval = options.dataFetchInterval || 5 * 1000;

  var collName = options.collName || "clusterEndpoints";
  // connect and watch for balancers and endpoints
  this._connUrl = mongoUrl;
  this._conn = Meteor.wrapAsync(MongoClient.connect)(mongoUrl, {
    server: {poolSize: 1},
    replSet: {poolSize: 1}
  });
  this._endpointsColl = this._createCollection(collName);

  // maintains a list of most recent endoints in the cluster
  this._currentEndpoints = endpoints;
  // maintains a list of most recent balancers in the cluster
  this._currentBalancers = balancers;

  this._watchHander = this._startWatching();
};

MongoDiscovery.disconnect = function disconnect() {
  var self = this;
  this._watchHander.stop();
  this._watchHander = null;

  this._conn.close();
  this._conn = null;

  [
    '_connUrl', '_conn', '_endpointsColl', '_currentEndpoints',
    '_currentBalancers', '_watchHander',
  ].forEach(function(field) {
    self[field] = null;
  });
};

MongoDiscovery.ping = function _ping(key, payload) {
  this._endpointsColl.update(key, {$set: payload}, {upsert: true});
};

MongoDiscovery._createCollection = function(collName) {
  var coll = this._conn.collection(collName);

  coll.update = Meteor.wrapAsync(coll.update, coll);
  coll.insert = Meteor.wrapAsync(coll.insert, coll);
  coll.findOne = Meteor.wrapAsync(coll.findOne, coll);

  var originalFind = coll.find;
  coll.find = function() {
    var cursor = originalFind.apply(coll, arguments);
    cursor.fetch = function() {
      cursor.rewind();
      return Meteor.wrapAsync(cursor.toArray, cursor)();
    };
    return cursor;
  };

  return coll;
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
  var self = this;
  var existingServices = {};
  var stopped = false;

  fecthAndWatch();

  function fecthAndWatch() {
    if(stopped) {
      return false;
    }

    var newServices = cursor.fetch().filter(MongoDiscovery._isHealthy);

    var existingServiceIds = _.keys(existingServices);
    var newServiceIds = newServices.map(function(service) {
      return service._id;
    });

    var removedServices = _.difference(existingServiceIds, newServiceIds);
    removedServices.forEach(function(id) {
      delete existingServices[id];
      store.remove(id);
    });

    newServices.forEach(function(service) {
      existingServices[service._id] = true;
      store.set(service._id, service);
    });

    // Check whether existing services are updated or not
    store.getAll().forEach(function(service) {
      if(!MongoDiscovery._isHealthy(service)) {
        store.remove(service._id);
      }
    });

    Meteor.setTimeout(fecthAndWatch, self._dataFetchInterval);
  }

  var returnPayload = {
    stop: function() {
      stopped = true;
    }
  };

  return returnPayload;
};

MongoDiscovery._isHealthy = function _isHealthy(service) {
  var diff = Date.now() - service.timestamp.getTime();
  // We need to add this 15 seconds padding because of Meteor polls
  // for every 10 secs.
  // We are adding 15 secs just for make sure everything is fine
  return diff < (service.pingInterval + 15 * 1000);
};