Cursor = function Cursor(name, query, options) {
  options = options || {};
  this._options = options;
  this._name = name;
  this._query = query || {};
  this._interval = options.interval || 5 * 1000;
  // we make this true by default to allow current connection
  // to stay live to that server
  this._propagateCurrUrl = options.propagateCurrUrl || true;
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


// ClusterManager.discoverService = function(name, query) {
//   var selector = {name: name};
//   var options = {
//     sort: {lastPing: -1, rand: -1}
//   };
//   var currUrl = null;

//   if(query) {
//     var allowedTypes = {
//       "string": true,
//       "number": true,
//       "boolean": true
//     };
//     _.each(query, function(value, key) {
//       if(allowedTypes[typeof value]) {
//         if(key === "$currUrl") {
//           currUrl = value;
//         } else {
//           selector[key] = value;
//         }
//       }
//     });
//   }

//   // check for the currUrl
//   if(currUrl) {
//     var currSelector = {name: name, url: currUrl};
//     var currService = this._services.findOne(currSelector);
//     if(currService) {
//       var timeDiff = Date.now() - currService.lastPing.getTime();
//       if(timeDiff <= currService.maxPingDelay) {
//         // this ping can be trusted and service is alive
//         return this._filterFields(currService);
//       }
//     }
//   }

//   var service = this._services.findOne(selector, options);
//   if(service) {
//     return this._filterFields(service);
//   } else {
//     return null;
//   }
// };

// ClusterManager._filterFields = function(serviceData) {
//   var omitFields = ['_id', 'rand'];
//   return _.omit(serviceData, omitFields);
// };