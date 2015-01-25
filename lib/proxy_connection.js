ProxyConnection = function ProxyConnection(discovery, serviceName, options) {
  options = options || {};

  this._discovery = discovery;
  this._serviceName = serviceName;
  this._query = options.query || {};
  this._ddpOptions = options.ddpOptions;
  this._watchTimeout = options.watchTimeout || 5 * 1000;

  this._currUrl = null;
  this._ddpUrls = {};

  this._connection = DDP.connect(this._getDefaultURL(), this._ddpOptions);
  this._connection.disconnect();
  this._connection.onReconnect = this._reconnectHandler.bind(this);
  this._newConnectionWatcher = this._watchForNewConnections();
};

ProxyConnection.prototype._getDefaultURL = function() {
  if(Meteor.isServer) {
    return "";
  } else {
    return location.origin;
  }
};

ProxyConnection.prototype._reconnectHandler = function() {
  if(this.onReconnect) {
    this.onReconnect();
  }
};

ProxyConnection.prototype._watchForNewConnections = function() {
  var self = this;

  // to make sure, we are connecting again
  var timeoutHandler =
    Meteor.setInterval(setConnectionIfNeeded, self._watchTimeout);

  function setConnectionIfNeeded() {
    if(!self.status().connected) {
      var url = self._discovery.pickEndpoint(self._serviceName);
      if(url) {
        self._setConnection(url);
      }
    }
  }

  var returnContext = {
    stop: function() {
      Meteor.clearTimeout(timeoutHandler);
    }
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