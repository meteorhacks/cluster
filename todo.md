- * Autoupdate version needs to be a primary key (when upserting)
- * Allow to publish services to the client
- * Create a client side cursor
- * Implement a client side version of proxy based on that (propagate the current URL, by default)
- * then all we need to pass that cursor to the proxy

# LoadBalancing

- * Get the service url from the PUBLIC_URL
- * Inject the PUBLIC_URL if available by inject-data
* Implement the new cursor with URL as the _id
* Allow the give special meaning to the autoUpdateVersion when quering
* send max of 2 or 3 URLS to the client to avoid loading issues
* When we get the HTML page to the main server, get the current server asigned by the discovery
* If it's not the current app, proxy the default HTML page from that site
  * set special header to avoid looping
  * set a cookie to proxy static requests from this server
  * reset the cookie after sending the HTML page (we don't need to worry about setting the cookie via JS)
  * We only need the cookie to proxy static content and other AJAX requests
* Proxy static content
* When the app is loading, connect to the public-url got from the InjectData
* subscribe to new a discovery URL (after connected)
  * always give best match to find for currentURL & autoupdateVersion
* Observe the discovery URL and connect to it, if we are already disconnected

# Misc

* Send Multiple Servers to the client (for backups)
* Add pooling support in the server
