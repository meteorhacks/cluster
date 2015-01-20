ProxyConnection = function ProxyConnection(manager, name, options) {
  options = options || {};

  this._manager = manager;
  this._name = name;
  this._query = options.query || {};
  this._ddpOptions = options.ddpOptions;
  this._watchTimeout = options.watchTimeout || 5 * 1000;

  this._currUrl = null;

  this._connection = DDP.connect("http://nowhere.com", this._ddpOptions);
  this._connection.disconnect();
  this._connection.onReconnect = this._reconnectHandler.bind(this);
  this._newConnectionWatcher = this._watchForNewConnections();
};


ProxyConnection.prototype._reconnectHandler = function() {
  if(this.onReconnect) {
    this.onReconnect();
  }
};

ProxyConnection.prototype._watchForNewConnections = function() {
  var self = this;

  function findConnections() {
    if(!self.status().connected) {
      var newService = self._manager.discoverService(self._name, self._query);
      if(newService && newService.url != self._currUrl) {
        self._currUrl = newService.url;
        self._setConnection(self._currUrl);
      }
    }
  }

  findConnections();
  var timeoutHandler = Meteor.setInterval(findConnections, this._watchTimeout);

  var returnContext = {
    stop: _.once(function() {
      Meteor.clearTimeout(timeoutHandler);
    })
  };

  return returnContext;
};

ProxyConnection.prototype._setConnection = function(newUrl) {
  var self = this;
  if(this._connectionWatcher) {
    this._connectionWatcher.stop();
  }

  this._connection.reconnect({url: newUrl});
};

[
  'subscribe', 'call', 'apply', 'reconnect',
  'disconnect', 'registerStore', 'status'
].forEach(function(method) {
  ProxyConnection.prototype[method] = function() {
    if(method == "disconnect") {
      this._newConnectionWatcher.stop()
    } else if(method == "reconnect") {
      this._newConnectionWatcher = this._watchForNewConnections();
    }

    return this._connection[method].apply(this._connection, arguments);
  };
});