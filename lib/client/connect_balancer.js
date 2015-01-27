Meteor.disconnect();
InjectData.getData('cluster-balancer-url', function(balancerUrl) {
  Meteor.reconnect({url: balancerUrl});
});

ClusterManager.Balancers = new Mongo.Collection('cluster-balancers');
ClusterManager._checkMeteorConnectionStatus = function() {
  var status = Meteor.status();
  if(!status.connected && status.status != "offline") {
    var cursor = {_id: {$ne:balancerUrl}};
    var allBalancers = ClusterManager.Balancers.find(cursor).fetch();
    if(allBalancers.length <= 0) return;

    var index = Math.floor(allBalancers.length * Math.random());
    var balancerUrl = allBalancers[index]._id;
    Meteor.reconnect({url: balancerUrl});
  }
};

Meteor.setInterval(ClusterManager._checkMeteorConnectionStatus, 5 * 1000);
