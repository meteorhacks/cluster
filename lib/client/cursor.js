Cursor = function Cursor(name, query, options) {
  options = options || {};
  this._options = options;
  this._name = name;
  // in the client we don't have any use of this for now
  this._query = query || {};
};

Cursor.prototype.observeChanges = function(callbacks) {
  var selector = {service: this._name};
  var localCursor = ClusterManager.serviceStore.find(selector);
  return localCursor.observeChanges(callbacks);
};