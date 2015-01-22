ClusterManager.connect = function(connUrl) {
  this._connUrl = connUrl;
  this._conn = new MongoInternals.RemoteCollectionDriver(this._connUrl);
  this._services = new Mongo.Collection('services', {_driver: this._conn});
  this._registeredServices = {};
  this._serviceUrl = null;
};

ClusterManager.discoverService = function(name, query) {
  var selector = {name: name};
  var options = {
    sort: {lastPing: -1, rand: -1}
  };
  var currUrl = null;

  if(query) {
    var allowedTypes = {
      "string": true,
      "number": true,
      "boolean": true
    };
    _.each(query, function(value, key) {
      if(allowedTypes[typeof value]) {
        if(key === "$currUrl") {
          currUrl = value;
        } else {
          selector[key] = value;
        }
      }
    });
  }

  // check for the currUrl
  if(currUrl) {
    var currSelector = {name: name, url: currUrl};
    var currService = this._services.findOne(currSelector);
    if(currService) {
      var timeDiff = Date.now() - currService.lastPing.getTime();
      if(timeDiff <= currService.maxPingDelay) {
        // this ping can be trusted and service is alive
        return this._filterFields(currService);
      }
    }
  }

  var service = this._services.findOne(selector, options);
  if(service) {
    return this._filterFields(service);
  } else {
    return null;
  }
};

ClusterManager._filterFields = function(serviceData) {
  var omitFields = ['_id', 'rand'];
  return _.omit(serviceData, omitFields);
};

ClusterManager.discoverConnection = function(name, query, ddpOptions) {
  if(ddpOptions === undefined) {
    ddpOptions = query;
    query = {};
  }

  var options = {
    ddpOptions: ddpOptions,
    query: query
  };

  var cursor = new Cursor(name, query, {interval: 5 * 1000});
  var proxy = new ProxyConnection(cursor, name, options);
  return proxy;
};

ClusterManager.register = function register(name, options) {
  var self = this;
  options = options || {};
  var url = this._serviceUrl =
    options.url ||
    process.env.PUBLIC_URL ||
    process.env.ROOT_URL;

  var pingInterval = options.pingInterval || 15 * 1000;

  Meteor.startup(function() {
    var selector = {
      name: name,
      url: url,
      autoupdateVersion: __meteor_runtime_config__.autoupdateVersion
    };

    var upsertData = {
      name: name,
      url: url
    };

    self._services.upsert(selector, {$set: upsertData});
    self._registeredServices[name] = self._startPinging(selector, pingInterval);
  });
};

ClusterManager._startPinging = function(selector, interval) {
  var self = this;
  var stop = false;

  pingToMongo();

  function pingToMongo() {
    if(stop) return;

    var upsertData = {
      lastPing: new Date(),
      rand: Math.random(),
      maxPingDelay: interval
    };

    self._services.upsert(selector, { $set: upsertData });

    var nextInterval = interval - Math.ceil(interval/3 * Math.random());
    Meteor.setTimeout(pingToMongo, nextInterval);
  }

  var handler = {
    stop: function() {
      stop = true;
    }
  };

  return handler;
};

ClusterManager.findService = function(name, options) {
  options = options || {};
  var query = {};

  if(options.query) {
    query = options.query;
    delete options.query;
  }

  var cursor =  new Cursor(name, query, options);
  return cursor;
};