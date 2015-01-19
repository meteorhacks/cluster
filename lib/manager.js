ClusterManager = function ClusterManager(connUrl) {
  this._connUrl = connUrl;
  this._conn = new MongoInternals.RemoteCollectionDriver(this._connUrl);
  this._services = new Mongo.Collection('services', {_driver: this._conn});
  this._registeredServices = {};
}

ClusterManager.prototype.discoverService = function(name) {
  var selector = { name: name };
  var options = {
    sort: { lastPing: -1, rand: -1 }
  };

  var service = this._services.findOne({name: name}, options);
  if(service) {
    var allowedFields = ['url', 'name', 'lastPing'];
    return _.pick(service, allowedFields);
  } else {
    return null;
  }
};

ClusterManager.prototype.discoverConnection = function(name) {
  var proxy = new ProxyConnection(this, name);
  return proxy;
};

ClusterManager.prototype.register = function register(name, options) {
  options = options || {};
  var url = options.url || process.env.ROOT_URL;
  var pingInterval = options.pingInterval || 15 * 1000;

  var selector = { name: name, url: url };
  var upsertData = {
    name: name,
    url: url
  };

  this._services.upsert(selector, {$set: upsertData});
  this._registeredServices[name] = this._startPinging(selector, pingInterval);
};

ClusterManager.prototype._startPinging = function(selector, interval) {
  var self = this;

  function pingToMongo() {
    var upsertData = {
      lastPing: new Date(),
      rand: Math.random()
    };
    self._services.upsert(selector, { $set: upsertData });
  }

  pingToMongo();
  return Meteor.setInterval(pingToMongo, interval);
};