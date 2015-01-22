MongoBackend.Cursor = function MongoCursor(serviceName, query, options) {
  options = options || {};
  this._options = options;
  this._serviceName = serviceName;
  this._query = query || {};

  this._interval = options.interval || 5 * 1000;
  this._limit = options.limit || 1;
  this._projectFn = LocalCollection._compileProjection(options.fields || {});
  // we make this true by default to allow current connection
  // to stay live to that server
  this._publishedUrlMap = {};
};

MongoBackend.Cursor.prototype._getCollectionName = function() {
  return "__cluster-manager:" + this._serviceName;
};

MongoBackend.Cursor.prototype.setCurrUrl = function(url) {
  if(this._query["$currUrl"] === url) {
    this._query["$currUrl"] = url;
  }
};

MongoBackend.Cursor.prototype.rewind = function rewind() {};

MongoBackend.Cursor.prototype.fetch = function() {
  var autoupdateVersion = this._query['$autoupdateVersion'];
  var selector = {
    service: this._serviceName
  };

  var options = {
    sort: {timestamp: -1},
    limit: this._limit
  };

  if(autoupdateVersion) {
    var newSelector = _.clone(selector);
    newSelector.autoupdateVersion = autoupdateVersion;
    var result = MongoBackend._services.find(newSelector, options).fetch();

    // we need fetch again unless autoupdateVersion does not give
    // us enough servers
    if(result.length < this._limit) {
      var oldResult = MongoBackend._services.find(selector, options).fetch();
      var services = this._mergeAutoUpdate(result, oldResult, this._limit);
    } else {
      var services = result;
    }
  } else {
    var services = MongoBackend._services.find(selector, options).fetch();
  }

  var currUrl = this._query['$currUrl'];
  if(currUrl) {
    var currUrlSelector = _.extend(_.clone(selector), {url: currUrl});
    var currUrlOptions = _.extend(_.clone(options), {limit: 1});

    var service = MongoBackend._services.findOne(currUrlSelector, currUrlOptions);
    if(service) {
      this._addCurrUrlService(services, service, this._limit);
    }
  }

  var services = services.filter(this._checkHealthy);
  services.sort(function(a, b) {
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
  services = services.map(this._filterFields.bind(this));
  return services;
};

MongoBackend.Cursor.prototype.observeChanges = function(callbacks) {
  var self = this;
  callbacks = this._prepareCallbacks(callbacks);

  diffSets();
  var timeoutHandler = Meteor.setInterval(diffSets, this._interval);

  function diffSets() {
    var newSet = self.fetch();
    var publishedUrlMap = {};

    newSet.forEach(function(item) {
      delete item._id;
      if(self._publishedUrlMap[item.url]) {
        callbacks.changed(item.url, item);
      } else {
        callbacks.added(item.url, item);
      }

      publishedUrlMap[item.url] = true;
    });

    var newUrls = _.keys(publishedUrlMap);
    var oldUrls = _.keys(self._publishedUrlMap);
    var removedUrls = _.difference(oldUrls, newUrls);

    removedUrls.forEach(function(url) {
      callbacks.removed(url);
    });

    self._publishedUrlMap = publishedUrlMap;
  }

  function stop() {
    Meteor.clearTimeout(timeoutHandler);
  }

  return {
    stop: stop
  };
};

MongoBackend.Cursor.prototype._applyFiltering = function(services) {
  var self = this;
  var filteredServices = [];
  services.forEach(function(service) {
    var isHealthy = self._checkHealthy(service);
    if(isHealthy) {
      filteredServices.push(self._projectFn(service));
    }
  });

  return filteredServices;
};

MongoBackend.Cursor.prototype._filterFields = function(doc) {
  delete doc._id;
  doc._id = doc.url;
  return this._projectFn(doc);
};

MongoBackend.Cursor.prototype._checkHealthy = function(item) {
  var timeDiff = Date.now() - item.timestamp.getTime();

  // add another 1000 for the network latency
  var isHealthy = timeDiff < (item.maxHeartBeatTimeout + 1000);
  return isHealthy;
};

MongoBackend.Cursor.prototype._addCurrUrlService =
function(allServices, currUrlService, limit) {
  var serviceMap = {};
  allServices.forEach(function(service, index) {
    serviceMap[service.url] = index;
  });

  var currUrlIsHealthy = this._checkHealthy(currUrlService);
  if(!currUrlIsHealthy) {
    return allServices;
  } else if(serviceMap[currUrlService.url] >= 0) {
    var index = serviceMap[currUrlService.url];
    allServices[index] = currUrlService;
    return allServices;
  } else if(allServices.length < limit) {
    allServices.push(currUrlService);
    return allServices;
  } else {
    allServices.pop(currUrlService);
    allServices.push(currUrlService);
    return allServices;
  }
};

MongoBackend.Cursor.prototype._mergeAutoUpdate =
function(withAuto, withoutAuto, limit) {
  var serviceMap = {};
  withAuto.forEach(function(service) {
    serviceMap[service.url] = true;
  });

  var newServices = [];
  withoutAuto.forEach(function(service) {
    if(!serviceMap[service.url]) {
      newServices.push(service);
    }
  });

  var amountToAdd = limit - withAuto.length;
  return withAuto.concat(newServices.slice(0, amountToAdd));
};

MongoBackend.Cursor.prototype._prepareCallbacks = function(callbacks) {
  ['added', 'changed', 'removed'].forEach(function(fnName) {
    var fn = callbacks[fnName] || Function.prototype;

    function onErrorCallback(err) {
      console.error("error on observeChanges: ", err.message);
    }
    callbacks[fnName] = Meteor.bindEnvironment(fn, onErrorCallback);
  });

  return callbacks;
};

MongoBackend.Cursor.prototype._publishCursor = function(sub) {
  var collection = "__cluster-manager";
  return Mongo.Collection._publishCursor(this, sub, collection);
};