var ids = 0;
BalancerCursor = function BalancerCursor(store) {
  this._store = store;
  this._cursorId = ++ids;
};

BalancerCursor.prototype._getCollectionName = function() {
  return "balancers-" + this._cursorId;
};

BalancerCursor.prototype.fetch = function() {
  var services = this._store.getAll();
  var docs = [];
  services.forEach(function(service) {
    docs.push({_id: service.balancer});
  });

  return docs;
};

BalancerCursor.prototype.rewind = function() {

};

BalancerCursor.prototype._publishCursor = function(sub) {
  var self = this;
  var previousDocIds = {};

  function sendChanges() {
    var newDocIds = {};
    self.fetch().forEach(function(doc) {
      if(!previousDocIds[doc._id]) {
        sub.added("cluster-balancers", doc._id, {});
      }
      newDocIds[doc._id] = true;
    });

    var diff = _.difference(_.keys(previousDocIds), _.keys(newDocIds));
    diff.forEach(function(id) {
      sub.removed('cluster-balancers', id);
    });
    previousDocIds = newDocIds;
  }

  sendChanges();
  var intervalHandler = Meteor.setInterval(sendChanges, 5 * 1000);

  sub.onStop(function() {
    Meteor.clearTimeout(intervalHandler);
  });
};