ProxyConnection = function ProxyConnection(cursor, name, options) {
  options = options || {};

  this._cursor = cursor;
  this._name = name;
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

  // handle reconnecting, when this triggered
  var observeHandler = this._cursor.observeChanges({
    added: setUrl,
    changed: setUrl,
    removed: removeUrl
  });

  // to make sure, we are connecting again
  var timeoutHandler = Meteor.setInterval(setConnectionIfNeeded, 5 * 1000);

  function removeUrl(url) {
    delete self._ddpUrls[url];
    setConnectionIfNeeded();
  }

  function setUrl(url, service) {
    self._ddpUrls[url] = service;
    setConnectionIfNeeded();
  }

  function setConnectionIfNeeded() {
    if(!self.status().connected) {
      if(self._currUrl && self._ddpUrls[self._currUrl]) {
        self._connection.reconnect();
      } else {
        var urls = _.keys(self._ddpUrls);

        if(urls.length > 0) {
          var randomIndex = Math.floor(urls.length * Math.random());
          var url = urls[randomIndex];
          self._currUrl = url;
          // we need to change the lookup
          self._setConnection(url);
        }
      }
    }
  }

  var returnContext = {
    stop: function() {
      observeHandler.stop();
      timeoutHandler.stop();
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