var balancerUrl = Cookie.get('cluster-balancer');
if(balancerUrl) {
  Meteor.reconnect({url: balancerUrl});
}

ClusterManager.Balancers = new Mongo.Collection('cluster-balancers');

Meteor.setInterval(function() {
  var status = Meteor.status();
  if(!status.connected) {
    var cursor = {_id: {$ne:
      balancerUrl}};
    var allBalancers = ClusterManager.Balancers.find(cursor).fetch();
    if(allBalancers.length <= 0) return;

    var index = Math.floor(allBalancers.length * Math.random());
    var balancerUrl = allBalancers[index]._id;
    Meteor.reconnect({url: balancerUrl});
  }
}, 5 * 1000);
