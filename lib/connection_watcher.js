ConnectionWatcher = function ConnectionWatcher(discovery, serviceName, options) {
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
  this._newConnectionWatcher = this._watchForNewConnections();
};

ConnectionWatcher.prototype.getConnection = function() {
  return this._connection;
};

ConnectionWatcher.prototype._getDefaultURL = function() {
  if(Meteor.isServer) {
    return "";
  } else {
    return location.origin;
  }
};

ConnectionWatcher.prototype._watchForNewConnections = function() {
  var self = this;
  var connectInitially = false;

  setConnectionIfNeeded();
  // to make sure, we are connecting again
  var timeoutHandler =
    Meteor.setInterval(setConnectionIfNeeded, self._watchTimeout);

  function setConnectionIfNeeded() {
    var status = self._connection.status();
    // do not reconnect again, if disconnected manually
    // but not at the first time since we do it manually
    // until we pick an endpoint
    var isOffline = connectInitially && status.status == "offline";
    if(!status.connected && !isOffline) {
      var url;
      if (! Meteor.isServer) {
        // if we are on the client, call RPC on server to get endpoint
        return Meteor.call('cluster_pickEndpoint', self._serviceName, function (err, url) {
          if (err) {
            return console.log('error getting endpoint for ' + self._serviceName);
          }

          if (url) {
            self._connection.reconnect({url: url});
            connectInitially = true;
          }

        });

      } else {
        url = self._discovery.pickEndpoint(self._serviceName);

        if(url) {
          self._connection.reconnect({url: url});
          connectInitially = true;
        }
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
