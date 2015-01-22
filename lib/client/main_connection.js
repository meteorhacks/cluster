ClusterManager.serviceStore = new Mongo.Collection('__cluster-manager');
// InjectData.getData('clusterManager.publicUrl', function(ddpUrl) {
//   console.log(Meteor.settings);
//   Meteor.disconnect();
//   Meteor.reconnect({url: ddpUrl});
// });