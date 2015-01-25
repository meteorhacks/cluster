MongoDiscoveryStore = function MongoDiscoveryStore() {
  this._endpointListsByService = {};
  this._endpointMapsByService = {};
  this._allEndpoints = {};
  this._allEndpointsByEndpointHash = {};
};

MongoDiscoveryStore.prototype.set = function set(id, service) {
  service._id = id;
  var serviceName = service.serviceName
  this._ensureStore(serviceName);

  this._allEndpoints[id] = service;
  this._endpointMapsByService[serviceName][id] = service;
  this._allEndpointsByEndpointHash[service.endpointHash] = service;
  this._endpointListsByService[serviceName].push(service);
};

MongoDiscoveryStore.prototype.get = function get(id) {
  return this._allEndpoints[id];
};

MongoDiscoveryStore.prototype.remove = function remove(id) {
  var service = this._allEndpoints[id];

  delete this._allEndpoints[id];
  delete this._endpointMapsByService[service.serviceName][id];
  delete this._allEndpointsByEndpointHash[service.endpointHash];

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

MongoDiscoveryStore.prototype.byEndpointHash = function byEndpointHash(hash) {
  return this._allEndpointsByEndpointHash[hash];
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