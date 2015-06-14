MongoDiscoveryStore = function MongoDiscoveryStore() {
  this._endpointListsByService = {};
  this._endpointMapsByService = {};
  this._allEndpoints = {};
  this._allEndpointsByEndpointHash = {};
  this._allEndpointsByBalancer = {};
};

MongoDiscoveryStore.prototype.set = function set(id, service) {
  service._id = id;
  var serviceName = service.serviceName
  this._ensureStore(serviceName);

  var currDocument = this._allEndpoints[id];
  if(currDocument) {
    // remove the current document in the array
    this.remove(currDocument._id);
  }

  this._allEndpoints[id] = service;
  this._endpointMapsByService[serviceName][id] = service;
  this._allEndpointsByEndpointHash[service.endpointHash] = service;
  if(service.balancer) {
    this._allEndpointsByBalancer[service.balancer] = service;
  }
  this._endpointListsByService[serviceName].push(service);
};

MongoDiscoveryStore.prototype.get = function get(id) {
  return this._allEndpoints[id];
};

MongoDiscoveryStore.prototype.remove = function remove(id) {
  var service = this._allEndpoints[id];
  if(!service) {
    // simply ignore
    return;
  }

  delete this._allEndpoints[id];
  delete this._endpointMapsByService[service.serviceName][id];
  delete this._allEndpointsByEndpointHash[service.endpointHash];
  if(service.balancer) {
    delete this._allEndpointsByBalancer[service.balancer];
  }

  var index = this._endpointListsByService[service.serviceName].indexOf(service);
  this._endpointListsByService[service.serviceName].splice(index, 1);
};

MongoDiscoveryStore.prototype.getAll = function getAll(serviceName) {
  this._ensureStore(serviceName);
  if(serviceName) {
    return this._endpointListsByService[serviceName];
  } else {
    return _.values(this._allEndpoints);
  }
};

MongoDiscoveryStore.prototype.getRandom = function getRandom(serviceName) {
  var all = this.getAll(serviceName);
  var index = Math.floor(all.length * Math.random());
  return all[index];
};

// If the given endpoint selected, then choose it with the given weight
// weight should be 0-1
MongoDiscoveryStore.prototype.getRandomWeighted =
function getRandomWeighted(serviceName, endpointHash, weight) {
  // no need to do this, if we've only one endpoint
  if(this.getAll(serviceName).length === 1) {
    return this.getRandom(serviceName);
  }

  var randomValue = Math.random();
  if(randomValue < weight) {
    // satisfied for the wieght, go with the normal random selection
    return this.getRandom(serviceName);
  } else {
    var removedService = this.byEndpointHash(endpointHash);
    if(!removedService) {
      return this.getRandom(serviceName);
    }

    this.remove(removedService._id);
    var randomService = this.getRandom(serviceName);
    this.set(removedService._id, removedService);

    return randomService;
  }
};

MongoDiscoveryStore.prototype.byEndpointHash = function byEndpointHash(hash) {
  return this._allEndpointsByEndpointHash[hash];
};

MongoDiscoveryStore.prototype.byBalancer = function(balancer) {
  return this._allEndpointsByBalancer[balancer];
};

MongoDiscoveryStore.prototype._ensureStore =
function _ensureStore(serviceName) {
  if(!this._endpointListsByService[serviceName]) {
    this._endpointListsByService[serviceName] = [];
  }

  if(!this._endpointMapsByService[serviceName]) {
    this._endpointMapsByService[serviceName] = {};
  }
};