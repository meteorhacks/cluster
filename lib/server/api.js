ClusterManager.connect = function(connUrl) {
  MongoBackend.connect(connUrl);
  this._registeredServices = {};
  this._serviceUrl = null;
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

  var cursorOptions = {
    interval: 5 * 1000,
    limit: 5
  };

  var cursor = new MongoBackend.Cursor(name, query, options);
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

  var pingInterval = options.pingInterval || 5 * 1000;

  Meteor.startup(function() {
    var selector = {
      service: name,
      url: url,
      autoupdateVersion: __meteor_runtime_config__.autoupdateVersion
    };

    self._registeredServices[name] = self._startPinging(selector, pingInterval);
  });
};

ClusterManager._startPinging = function(selector, interval) {
  var self = this;
  var stop = false;

  pingToMongo();

  function pingToMongo() {
    if(stop) return;

    MongoBackend.sendHeartbeat(
      selector.autoupdateVersion,
      selector.url,
      selector.service,
      interval
    );

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

  var cursor =  new MongoBackend.Cursor(name, query, options);
  return cursor;
};