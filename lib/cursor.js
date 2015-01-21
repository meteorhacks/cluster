Cursor = function Cursor(name, query, options) {
  options = options || {};
  this._options = options;
  this._name = name;
  this._query = query || {};
  this._interval = options.interval || 5 * 1000;
  this._propagateCurrUrl = options.propagateCurrUrl || false;
};

Cursor.prototype.observeChanges = function(callbacks) {
  callbacks = this._prepareCallbacks(callbacks);
  var self = this;
  var added = false;
  var stopped = false;

  function setCurrUrl(url) {
    if(self._propagateCurrUrl) {
      self._query['$currUrl'] = url;
    }
  }

  observe();
  function observe() {
    if(stopped) return;

    var services = self.fetch();
    if(services.length > 0) {
      var service = services[0];
      if(added) {
        callbacks.changed(self._name, service);
      } else {
        callbacks.added(self._name, service);
      }

      setCurrUrl(service.url);
      added = true;
    } else if(added) {
      callbacks.removed(self._name);
      setCurrUrl(null);
      added = false;
    }

    Meteor.setTimeout(observe, self._interval);
  };

  var handler = {
    stop: function() {
      stopped = true;
    }
  };

  return handler;
};

Cursor.prototype.fetch = function fetch() {
  var service = ClusterManager.discoverService(this._name, this._query);
  service._id = this._name;
  return [service];
};

Cursor.prototype._getCollectionName = function() {
  return "__cluster-manager:" + name;
};

Cursor.prototype.rewind = function rewind() {};

Cursor.prototype._publishCursor = function(sub) {
  var collection = "__cluster-manager";
  return Mongo.Collection._publishCursor(this, sub, collection);
};

Cursor.prototype._prepareCallbacks = function(callbacks) {
  ['added', 'changed', 'removed'].forEach(function(fnName) {
    var fn = callbacks[fnName] || Function.prototype;

    function onErrorCallback(err) {
      console.error("error on observeChanges: ", err.message);
    }
    callbacks[fnName] = Meteor.bindEnvironment(fn, onErrorCallback);
  });

  return callbacks;
};