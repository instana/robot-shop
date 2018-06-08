#!/bin/bash

dcos marathon app remove robotshop/cart     
dcos marathon app remove robotshop/catalogue
dcos marathon app remove robotshop/dispatch 
dcos marathon app remove robotshop/mongodb  
dcos marathon app remove robotshop/mysql    
dcos marathon app remove robotshop/payment  
dcos marathon app remove robotshop/rabbitmq 
dcos marathon app remove robotshop/redis    
dcos marathon app remove robotshop/shipping 
dcos marathon app remove robotshop/user     
dcos marathon app remove robotshop/web      
