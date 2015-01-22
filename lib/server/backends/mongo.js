MongoBackend = {};

MongoBackend.connect = function connect(connUrl) {
  this._connUrl = connUrl;
  this._conn = new MongoInternals.RemoteCollectionDriver(this._connUrl);

  var collName = 'cluster-manager-services';
  this._services = new Mongo.Collection(collName, {_driver: this._conn});
};

MongoBackend.sendHeartbeat =
function sendHeartbeat(av, url, service, maxHeartBeatTimeout, payload) {
  var selector = {
    autoupdateVersion: av,
    url: url,
    service: service
  };

  payload = payload || {};
  payload.timestamp = new Date(),
  payload.maxHeartBeatTimeout = maxHeartBeatTimeout

  this._services.upsert(selector, {$set: payload});
};

MongoBackend.disconnect = function() {
  this._conn.mongo.close();
};