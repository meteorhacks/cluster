# Cluster  [![Build Status](https://travis-ci.org/meteorhacks/cluster.svg?branch=master)](https://travis-ci.org/meteorhacks/cluster)

**Clustering solution for Meteor with load balancing and service discovery.**

> **TLDR;**
> With `cluster`, we can scale Meteor apps by **simply** installing a Meteor package. No need to use tools like **Nginx** or **HaProxy**. It's built for Meteor and you don't need to worry about configuring IP addresses and so on. Just add more instances and let cluster take care of load balancing.

> Cluster also has first class support for **MicroServices**.

**Table of Contents**

* [Concept](#concept)
* [Getting Started](#getting-started)
* [API](#api)
* [MicroServices](#microservices)
* [Multiple Balancers](#multiple-balancers)
* [Practical Setup](#practical-setup)

## Concept

When we need to scale Meteor, it's about scaling DDP requests since that's where the traffic flows. When we need to do horizontal scaling, we generally put a load balancer like Ngnix or HaProxy in front of Meteor. Then, it'll do the load balancing.

Okay, what happens when we need to add another instance? We'd need to reconfigure the load balancer again. That will reset all the existing DDP connections.

Then what if the load balancer goes down? To fix that, we'd need to add a load balancer working parentally. That makes the setup more complex.

---

Cluster has an interesting way to solve this problem. It turns your Meteor app into a load balancer and you don't need to use a separate tool for that. When you add a new server (or an instance), you wouldn't even need to reconfigure cluster. Cluster will simply detect new instances and route traffic to them.

Any of the instances within the cluster can act as a load balancer. So, even if one server goes down, you don't need to worry much. Also, it's configured specially for Meteor.

Cluster can do these things because it acts as a service discovery solution. Currently, that is implemented using MongoDB, but we can have more implementations later.

> Since cluster is a service discovery solution, it's perfect for MicroServices. Read to the end :)

## Getting Started

Simply add cluster into your app.

```
meteor add meteorhacks:cluster
```

Then when you are deploying or starting your app, export the following environment variables.

```shell
# You can use your existing MONGO_URL for this
export CLUSTER_DISCOVERY_URL=mongodb://host:port/db,
# this is the direct URL to your server (it could be a private URL)
export CLUSTER_ENDPOINT_URL=http://ipaddress
# mark your server as a web service (this is a must)
export CLUSTER_SERVICE=web
```

Now start as many servers as you like and DDP traffic will be sent to each of the instances randomly. You can also remove instances anytime without affecting the cluster or your app.

[Live Demo - How to use cluster to scale your app](http://youtu.be/oudsAQZkvzQ?t=15m27s)

## API

We have a very simple API and there are two version of the API: 

1. JavaScript API
2. Environment Variables based API

For a production app, it's recommended to use the Environment Variables based API.

### JS API

~~~js
// Connect to the cluster with a MongoDB URL. Better if it's a replica set
Cluster.connect("mongodb://mongo-url")

// Register a service to the cluster
var options = {
  endpoint: "a direct url to the instance",
  balancer: "balancer URL, if this is a balancer" // optional
};

Cluster.register("serviceName", options);

// Expose services to the public
Cluster.allowPublicAccess(["service1", "service2"]);

// Discover a DDP connection
// > This is available on both the client and the server
Cluster.discoverConnection("serviceName");
~~~

### Environment Variables based API

~~~shell
# Connect to the cluster with a MongoDB URL. Better if it's a replica set
export CLUSTER_DISCOVERY_URL=mongodb://mongo-url

# Register a service to the cluster
export CLUSTER_ENDPOINT_URL="a direct url to the instance"
export CLUSTER_BALANCER_URL="balancer URL, if this is a balancer" #optional
export CLUSTER_SERVICE="serviceName"

# Expose services to the public
export CLUSTER_PUBLIC_SERVICES="service1, service2"
~~~

## MicroServices

With Microservices, we build apps as a set of tiny services rather than create a monolithic app. These services can be deployed independently. 

Cluster is a tool which has built-in support for Microservices. With cluster, you can manage a set of Microservices very easily. Cluster has many features that are perfect for Microservices:

* Register and Discover Services
* Discover DDP Connections in both client and server
* Load Balancing and Failovers

### A Simple app based on Microservices

For example, if we want to build our own version of Atmosphere to search Meteor packages and we decided to build it with Microservices. In this case, we'd have two such services:

* search - handles searching
* web - has the UI

Each of these services is it's own Meteor app.

> web is a special kind of service which serves UI components related to the cluster. So, we handle it in a different way. Keep in mind that you will have to define your UI related service within the web service.
> 
> Right now, you can only have one service to serve UI related components. But, you can have many instances of that service.

### Service Registration & Discovery

First we need a Mongo URL for the cluster. That's how cluster communicates with each node. It's better if you can create a separate MongoDB ReplicaSet for that. It doesn't need to have oplog support.

Next, we add the following configuration to the **search** service inside  `server/app.js`.

~~~js
Cluster.connect("mongodb://mongo-url");
Cluster.register("search");

// Meteor methods
Meteor.methods({
  "searchPackages": function(searchText) {
    return ["a list of packages"];
  }
});
~~~

Then we add the following configuration to `server/app.js` to the web service.

~~~js
Cluster.connect("mongodb://mongo-url");
Cluster.register("web");
Cluster.allowPublicAccess("search");

var searchConn = Cluster.discoverConnection("search");
var packagesFromMeteorHacks = searchConn.call("searchPackages", "meteorhacks");
console.log("here is list of", packagesFromMeteorHacks);
~~~

In the above example, you can see how we made a connection to the "search" service from the "web" service.

We've also allowed clients to connect directly to the search service from the browser (or from cordova apps). That was done with a single line:

~~~js
Cluster.allowPublicAccess("search");
~~~

This way, you can access the "search" service from the client side of the "web" service as shown below:

~~~js
var searchConn = Cluster.discoverConnection("search");
searchConn.call("searchPackages", "meteorhacks", function(err, packages) {
  if(err) throw err;
  console.log("here is list of", packages);
});
~~~

### Learn More about Microservices

If you'd like to learn more, here are a few resources for you.

* [Live Demo - Building Microservices with Meteor](http://youtu.be/oudsAQZkvzQ?t=36m54s)
* [Microservices with Meteor and DDP on BulletProof Meteor](https://bulletproofmeteor.com/architecture/microservices-with-meteor-and-ddp)
* [Microservices - Beyond Basics on BulletProof Meteor](https://bulletproofmeteor.com/architecture/microservices-beyond-basics)
* [Deploying a Highly Available Meteor Cluster on BulletProof Meteor](https://bulletproofmeteor.com/architecture/deploying-a-highly-available-meteor-cluster)
* [Microservices Talk in the MeteorHacks Show Feb 2015](http://youtu.be/oudsAQZkvzQ?t=29m3s)

## Multiple Balancers

The setup we discussed earlier in the getting-started section still has one issue. All the DDP connections are routing through a single instance which is normally the server you pointed your domain name to via DNS.

But that's not ideal. If it goes down you lose access to the whole cluster. Additionally, you will likely be facing scaling issues as well since all traffic is routing through that single server.

Cluster has a built in solution for that. It's called **Balancers**. A Balancer is an instance of your cluster which acts as a load balancer. You can add or remove them as needed.

Making your instance a Balancer is pretty simple. Just export the following environment variable.

```
export CLUSTER_BALANCER_URL=https://subdomain.domainname.com
```

This URL is open to public and it should point to this instance. Now configure your instances to run as Balancers and your cluster will start to load balance DDP connections through them.

[Demo & Presentation - Learn more about Balancers](http://youtu.be/oudsAQZkvzQ?t=5m30s)

## Practical Setup

Let's see how you could setup Cluster in a practical scenario. [BulletProof Meteor](https://bulletproofmeteor.com/) is already running Cluster so I will show you an excerpt of its setup. (I've changed some information for the educational purposes)

We have four Servers and three of them are Balancers. This is how they are structured.

```json
{
  "ip-1": {
    "endpointUrl": "http://ip-1",
    "balancerUrl": "https://one.bulletproofmeteor.com"
  },
  "ip-2": {
    "endpointUrl": "http://ip-2",
    "balancerUrl": "https://two.bulletproofmeteor.com"
  },
  "ip-3": {
    "endpointUrl": "http://ip-3",
    "balancerUrl": "https://three.bulletproofmeteor.com"
  },
  "ip-4": {
    "endpointUrl": "http://ip-4"
  }
}
```

I'm using [Meteor Up](https://github.com/arunoda/meteor-up) to deploy and here's a [sample configuration](https://gist.github.com/arunoda/13f2e9c22bf526b84556) file. With Meteor Up, you don't need to expose `CLUSTER_ENDPOINT_URL`. It'll automatically do that by itself.

> Make sure you install the latest version of Meteor Up.

#### DNS & SSL

We'll use cloudflare for DNS and SSL setup.
> We turn off WebSockets since cloudflare does not support SSL with WebSockets yet!

* https://bulletproofmeteor.com is pointing to `ip-1` and `ip-2` via A records
* https://one.bulletproofmeteor.com is pointing to `ip-1`
* https://two.bulletproofmeteor.com is pointing to `ip-2`
* https://three.bulletproofmeteor.com is pointing to `ip-3`

As this setup, `ip-1` and `ip-2` will take care of load balancing for static content while `ip-1`, `ip-2` and `ip-3` is take care of load balancing DDP connections.

All 4 servers process DDP and provide Static Content.
