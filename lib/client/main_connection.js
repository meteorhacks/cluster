ClusterManager.serviceStore = new Mongo.Collection('cluster-manager-services');
// disconnect immediately, since we may need to connect to
// some other DDP endpoint.
// if we don't, we'll reconnect in a jiffy.
Meteor.disconnect();
InjectData.getData('clusterManager.loadBalanceInfo', function(info) {
  if(!info) {
    return Meteor.reconnect();
  };

  Meteor.reconnect({url: info.ddpUrl});
  Meteor.setInterval(tryReconnecting, 5 * 1000);

  function tryReconnecting() {
    if(Meteor.status().connected) return;

    var url = pickUrl();
    if(url) {
      Meteor.reconnect({url: url});
    }
  }

  function pickUrl() {
    var selector = {service: info.service};
    var urls = ClusterManager.serviceStore.find(selector).fetch();
    urls = _.pluck(urls, '_id');
    urls = _.filter(urls, function(url) {
      return url != info.ddpUrl;
    });

    var index = Math.floor(urls.length * Math.random());
    return urls[index];
  }
});