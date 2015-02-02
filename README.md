# meteorhacks:cluster

**Clustering solution for Meteor with load balancing and service discovery.**

With `cluster`, we can scale meteor apps by **just** installing a Meteor package. No need to use tools like **nginx** or **haproxy**. Cluster does more than that, let's discover.

## Concept

When we need to scale Meteor, it's about scaling DDP requests since Meteor does heavy lifting in DDP. This is how we normally do it. We put a load balancer like ngnix or haproxy in front of Meteor. Then, it'll do the load balancing.

Okay, let's say now we need to add another instance? Then we need to reconfigure the load balancer again. That will reset all the existing DDP connections.

Then what if the load balancer goes down? We need to maintain two or more load balancers.

---

Cluster is an interesting way to solve this problem. It makes your Meteor app into a load balancer and you don't need to use a separate tool for that. When you add a new server(or an instance), now you don't need to configure cluster for that. Cluster will simply detect new instances and route traffic to them.

Any of the instance in the cluster can be act as a load balancer. So, even if one server goes down, you don't need to worry much.

Cluster can do these things because, it acts as a service discovery solutions. Currently it has been implemented with MongoDB, but later we can have more implementations.

> Since cluster is a service discovery solution, it's perfect for MicroServices. Read to the end :)

## Getting Started

Simply add cluster into your app.

```
meteor add meteorhacks:cluster
```

Then when you are deploying or starting your app, export following environment variables.

```shell
# You can use your existing MONGO_URL for this
export CLUSTER_DISCOVERY_URL=mongodb://host:port/db,
# this is the direct URL to your server (it could be a private URL)
export CLUSTER_ENDPOINT_URL=http://ipaddress
# mark your server as a web service (this is a must)
export CLUSTER_SERVICE=web
```

Now start as many as servers you like and DDP traffic will be sent to each instances randomly.

### Multiple Balancers

In the above setup, we've an issue. All the DDP connections are routing through a single instance. That could be the server you've pointed to your domain name via DNS.

But that's not ideal. Cluster has a built in solution for that. That's **balancers**. Balancer is an instance of your cluster which act as a load balancer. You can add or remove them as you needed.

Making your instance a balancer is pretty simple. Just export the following environment variable.

```
export CLUSTER_BALANCER_URL=https://subdomain.domainname.com
```

This URL is open to the public and it should point to this instance. Now make your instances as balancers and your cluster will start to load balance DDP connections through them.

### Practical Setup

Let's see how you could setup Cluster in a practical scenario. [BulletProof Meteor](https://bulletproofmeteor.com/) is already running with Cluster and let me show you the setup. (I've changed some information for the education purpose)

We've 4 Servers and Three of them are balancers. This is how they are structured.

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

I'm using [Meteor Up](https://github.com/arunoda/meteor-up) to deploy and here's the [sample configuration](https://gist.github.com/arunoda/13f2e9c22bf526b84556) file. With Meteor Up, you don't need to expose `CLUSTER_ENDPOINT_URL`. It'll do it itself.

> Make sure to install the latest version of Meteor Up

#### DNS & SSL

We use cloudflare for DNS and SSL setup.
> We turn off WebSockets since cloudflare does not support SSL with WebSockets yet!

* https://bulletproofmeteor.com is pointing to `ip-1` and `ip-2` via A records
* https://one.bulletproofmeteor.com is pointing to `ip-1`
* https://two.bulletproofmeteor.com is pointing to `ip-2`
* https://three.bulletproofmeteor.com is pointing to `ip-3`

As this setup, `ip-1` and `ip-2` will take care of load balancing for static content while `ip-1`, `ip-2` and `ip-3` is take care of load balancing DDP connections.

All 4 servers process DDP and provide Static Content.

## API

We've a very simple API and there are two version of the API. 

1. Using JavaScript
2. Using Environment Variables

For a production app, it's recommend to use the Environment Variables.

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

// Expose a service to the public
Cluster.allowPublicAccess(["service1", "service2"]);

// Discover a DDP connection
// > This is available on the both client and the server
Cluster.discoverConnection("serviceName");
~~~

### Environment Variable API

~~~bash
// Connect to the cluster with a MongoDB URL. Better if it's a replica set
export CLUSTER_DISCOVERY_URL=mongodb://mongo-url

// Register a service to the cluster
export CLUSTER_ENDPOINT_URL="a direct url to the instance"
export CLUSTER_BALANCER_URL="balancer URL, if this is a balancer" #optional
export CLUSTER_SERVICE="serviceName"

// Expose a service to the public
export CLUTSER_PUBLIC_SERVICES="service1, service2"
~~~

## MicroServices

With Microservices, we build a set of tiny servers rather creating a monolithic app. These services can be deployed independantly. 

Cluster is a tool which built for microservices. With cluster you can manage a set of Microservices very easily. Cluster helps for Microservices in many ways:

* Register and Discover Services
* Discover DDP Connections in both client and server
* Load Balancing, and Failovers

### A Simple Microservice

Let's say we need to build a our own version of Atmosphere to search packages. So, we decided to build it with Microservices. So, we've two such services:

* search - handles searching
* web - has the UI

> web is an special kind of service which serves UI component related to the cluster. So, we handle it in a different way. So, keep in mind to define your UI related service as web.
> 
> Right now, you can only have one service to serve UI related components. But, you can have many instances of that service.

### Registration

First we need a Mongo URL for the cluster. That's how cluster communicate with each nodes. It's better if you can create a separate MongoDB ReplicaSet for that.

Then we can add following configuration to the search app(service) inside the server.

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

Then you can add following configuration to the web app(service).

~~~js
Cluster.connect("mongodb://mongo-url");
Cluster.register("web");
Cluster.allowPublicAccess("search");

var searchConn = Cluster.discoverConnection("search");
var packagesFromMeteorHacks = searchConn.call("searchPackages", "meteorhacks");
console.log("here is list of", packagesFromMeteorHacks);
~~~

You can also connect to the search service from the client side of the web app as well.

~~~js
var searchConn = Cluster.discoverConnection("search");
searchConn.call("searchPackages", "meteorhacks", function(err, packages) {
  if(err) throw err;
  console.log("here is list of", packages);
});
~~~

### Learn More

If you like to learn more, there are a few lessons for Microservices in the BulletProof Meteor.

* [Microservices with Meteor and DDP](https://bulletproofmeteor.com/architecture/microservices-with-meteor-and-ddp)
* [Microservices - Beyond Basics](https://bulletproofmeteor.com/architecture/microservices-beyond-basics)
* [Deploying a Highly Available Meteor Cluster](https://bulletproofmeteor.com/architecture/deploying-a-highly-available-meteor-cluster)

You can also watch our talk at the [MeteorHacks Show Feb 2015](http://www.crowdcast.io/e/meteorhacks-show-few-2015)