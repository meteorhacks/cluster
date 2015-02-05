# Use the current balancer as the endpoint

* If the picked endpoint is a balancer, use the current selected balancer.
* For that, we need to send balancer when picking up the endpoint hash
* then if the endpoint is equal to current endpoint, simply return false

# Use CPU based balancing

* synchronize CPU usage accross instances
* balance accordingly
