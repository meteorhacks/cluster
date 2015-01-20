ClusterManager = function ClusterManager(connUrl) {
  this._connUrl = connUrl;
  this._conn = new MongoInternals.RemoteCollectionDriver(this._connUrl);
  this._services = new Mongo.Collection('services', {_driver: this._conn});
  this._registeredServices = {};
}

ClusterManager.prototype.discoverService = function(name, query) {
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

ClusterManager.prototype._filterFields = function(serviceData) {
  var omitFields = ['_id', 'rand'];
  return _.omit(serviceData, omitFields);
};

ClusterManager.prototype.discoverConnection =
function(name, query, ddpOptions) {
  if(ddpOptions === undefined) {
    ddpOptions = query;
    query = {};
  }

  var options = {
    ddpOptions: ddpOptions,
    query: query
  };

  var proxy = new ProxyConnection(this, name, options);
  return proxy;
};

ClusterManager.prototype.register = function register(name, options) {
  var self = this;
  options = options || {};
  var url = options.url || process.env.ROOT_URL;
  var pingInterval = options.pingInterval || 15 * 1000;

  Meteor.startup(function() {
    var selector = { name: name, url: url };
    var upsertData = {
      name: name,
      url: url
    };

    _.extend(upsertData, self._pickDefaultData());

    self._services.upsert(selector, {$set: upsertData});
    self._registeredServices[name] = self._startPinging(selector, pingInterval);
  });
};

ClusterManager.prototype._pickDefaultData = function() {
  var payload = {
    autoupdateVersion: __meteor_runtime_config__.autoupdateVersion
  };

  return payload;
};

ClusterManager.prototype._startPinging = function(selector, interval) {
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

    _.extend(upsertData, self._pickDefaultData());
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