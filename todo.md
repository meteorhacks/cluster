* Autoupdate version needs to be a primary key (when upserting)
* Allow to publish services to the client
* Implement a client side version of proxy based on that (propagate the current URL, by default)
* then all we need to pass that cursor to the proxy

# LoadBalancing

* When we get the HTML page to main server, pick a server and get the data.
* Then we also need to set a null publication and make sure we give priority to the current server's(autoupdate) URL

* But if not available, we could give something else
* We also need to send some backup URLs to the client (in case, first one disconnected)
* We need to store the currently serving server's DDP_URL on the cookie
* We need to create a some of http proxy to proxy static resources, including the HTML
  * That should be based on the DDP_URL value on the cookie
  * Then we can load balance accordingly
* We need to run our own connection timeout logic retry with the new DDP URL
  * then set the cookie and reload


# Misc

* Send Multiple Servers to the client (for backups)
* Add pooling support in the server
