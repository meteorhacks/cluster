var Future = Npm.require('fibers/future');

ProxyConnection = function ProxyConnection(discovery, name) {
  this._discovery = discovery;
  this._name = name;
  this._currUrl = null;

  this._connection = null;
  this._futures = [];
  this._connectionWatcher = null;
  this._newConnectionWatcher = this._watchForNewConnections();
};

ProxyConnection.prototype._watchForNewConnections = function() {
  var self = this;

  function findConnections() {
    if(!self.status().connected) {
      var newService = self._discovery.discoverService(self._name);
      if(newService && newService.url != self._currUrl) {
        self._currUrl = newService.url;
        var newConn = DDP.connect(newService.url);
        self._setConnection(newConn);
      }
    }
  }

  findConnections();
  var timeoutHandler = Meteor.setInterval(findConnections, 1000 * 5);

  var returnContext = {
    stop: _.once(function() {
      Meteor.clearTimeout(timeoutHandler);
    })
  };

  return returnContext;
};

ProxyConnection.prototype._setConnection = function(connection) {
  var self = this;
  if(this._connectionWatcher) {
    this._connectionWatcher.stop();
  }

  if(this._connection) {
    // make sure it's disconnected anyway
    this._connection.disconnect();
  }

  this._connection = connection;
  if(this.onReconnect) {
    this.onReconnect(this._connection);
    this._connection.onReconnect = this.onReconnect;
  }

  releaseFutures();

  this._connectionWatcher = Tracker.autorun(function() {
    if(self.status().connected) {
      releaseFutures();
    }
  });

  function releaseFutures() {
    self._futures.forEach(function(f) {
      f.return();
    });
    self._futures = [];
  }
};

ProxyConnection.prototype.status = function() {
  if(this._connection) {
    return this._connection.status();
  } else {
    return { connected: false, status: "connecting" };
  }
};

[
  'subscribe', 'call', 'apply', 'reconnect',
  'disconnect'
].forEach(function(method) {
  ProxyConnection.prototype[method] = function() {
    if(!this.status().connected) {
      var f = new Future();
      this._futures.push(f);
      f.wait();
    }

    if(method == "disconnect") {
      this._newConnectionWatcher.stop()
    } else if(method == "reconnect") {
      this._newConnectionWatcher = this._watchForNewConnections();
    }

    return this._connection[method].apply(this._connection, arguments);
  };
});