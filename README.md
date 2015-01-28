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

~~~
meteor add meteorhacks:cluster
~~~

Then when you are deploying or starting your app, export following environment variables.

~~~shell
# You can use your existing MONGO_URL for this
export CLUSTER_DISCOVERY_URL=mongodb://host:port/db,
# this is the direct URL to your server (it could be a private URL)
export CLUSTER_ENDPOINT_URL=http://ipaddress
# mark your server as a web service (this is a must)
export CLUSTER_SERVICE=web
~~~

Now start as many as servers you like and DDP traffic will be sent to each instances randomly.

### Multiple Balancers

In the above setup, we've an issue. All the DDP connections are routing through a single instance. That could be the server you've pointed to your domain name via DNS.

But that's not ideal. Cluster has a built in solution for that. That's **balancers**. Balancer is an instance of your cluster which act as a load balancer. You can add or remove them as you needed.

Making your instance a balancer is pretty simple. Just export the following environment variable.

~~~
export CLUSTER_BALANCER_URL=https://subdomain.domainname.com
~~~

This URL is open to the public and it should point to this instance. Now make your instances as balancers and your cluster will start to load balance DDP connections through them.

### Practical Setup

Let's see how you could setup Cluster in a practical scenario. [BulletProof Meteor](https://bulletproofmeteor.com/) is already running with Cluster and let me show you the setup. (I've changed some information for the education purpose)

We've 4 Servers and Three of them are balancers. This is how they are structured.

~~~json
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
~~~

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

## MicroServices

Everything has been implemented, just wait for the docs.

Or you can register for the MeteorHacks Show February and learn more :)
