ClusterManager.serviceStore = new Mongo.Collection('cluster-manager-services');
// InjectData.getData('clusterManager.publicUrl', function(ddpUrl) {
//   console.log(Meteor.settings);
//   Meteor.disconnect();
//   Meteor.reconnect({url: ddpUrl});
// });