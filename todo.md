# LoadBalancing

* We need to extract injecting layer from FR and make it available as a seperate project
  * That's because inject initial does a lot more than we need
  * We only need to send data
* Autoupdate version needs to be a primary key (when upserting)
* We need to always give the currentServers auto-update version to the client
* But if not available, we could give something else
* We also need to send some backup URLs to the client (in case, first one disconnected)
* We need to store the currently serving server's DDP_URL on the cookie
* We need to create a some of http proxy to proxy static resources, including the HTML
  * That should be based on the DDP_URL value on the cookie
  * Then we can load balance accordingly
* We need to run our own connection timeout logic retry with the new DDP URL
  * then set the cookie and reload

# Client Side Service Discovery

* we need to get data from the main app about services
* we need to implement a client version of cursor based on that
* then all we need to pass that cursor to the proxy
* make proxy available everywhere