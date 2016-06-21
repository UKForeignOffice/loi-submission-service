# is-submission-service

Processes message queue items placed by is-application-service.  Sends the request to the Iizuka legalisation service.

[![Build Status](http://83.151.221.84:8080/buildStatus/icon?job=is-submission-service)](http://83.151.221.84:8080/job/is-submission-service/)

## Server Prerequisites
* Node.js - You can download and install the LTS version of node using apt-get
<p></p>

    ```
    curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
    ```
    
    ```
    sudo apt-get install --yes nodejs
    ```
    
    Some node packages rely on the g++ compiler

    ```
    sudo apt-get install g++
    ```
<p></p>
* PostgreSQL - This can be installed on Ubuntu with apt-get
<p></p>
       
    *  You can install PostgreSQL 9.3 using the command
    
    ```
    sudo apt-get install postgresql-9.3
    ```
    
    * Set root user credentials
    
    ```
    sudo -u postgres psql
    ```
    
    Then set root user credentials using the command
    
    ```
    ALTER USER postgres PASSWORD 'newpassword';
    ```
    
    You can now exit the PostgreSQL shell using the command quit.
    
    Henceforth you can login to the PostgreSQL shell using the command
    
    ```
    psql -U postgres -h localhost
    ```
    and the password you set in the previous step using the login password.
    
    * Install pgAdmin (optional)
    
    This is a graphical tool that makes it easy to perform a number of administratove tasks.  To install pgAdmin, use the command
    
    ```
    sudo apt-get install pgadmin3
    ```
<p></p>   
    See some tips [here](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-14-04) on getting started with posgres.
    Also you probably want to set up md5 (password) authentication.  Have a look [here](http://stackoverflow.com/questions/18664074/getting-error-peer-authentication-failed-for-user-postgres-when-trying-to-ge) for the basic idea.
<p></p> A script containing a backup test copy of the database can be found within the project in the test/files [here](/test/files/FCO_LOI_Service_Test.sql).  
Do not modify this file as it will affect the outcome of the Mocha tests. It can be restored via command line like so:
    
    ```
    PGPASSWORD=xxxxxx psql -U postgres -1 -f test/files/FCO_LOI_Service_Test.sql
    ```

* RabbitMQ - used for asynchronous processing of requests from the is-application-service
    see installation instructions [here](https://www.rabbitmq.com/install-debian.html)
    * RabbitMQ Management Plugin will help you manage the queues.  More into [here](https://www.rabbitmq.com/management.html)
    * rabbitmqadmin is a useful command line tool - more info [here](http://hg.rabbitmq.com/rabbitmq-management/raw-file/rabbitmq_v2_4_1/priv/www-cli/index.html)

### Tools Prerequisites
#### Server
* NPM - Node.js package manage; should be installed when you install node.js.



## Additional Server Packages
All of the server package dependencies are defined in the [package.json](package.json) file. These can be installed by simply running
```
$ npm install
```
<p>Some examples:</p>
<ul>
<li>Express - web framework for Node.  More information [here] (http://expressjs.com/). </li>
<li>amqplib - provides access to RabbitMQ.  More information [here] (http://www.squaremobius.net/amqp.node/channel_api.html).</li>
<li>Sequalize - a NodeJS ORM for postgreSQL.  More information [here] (http://docs.sequelizejs.com/en/latest/).</li>
</ul>

## Service Configuration
All server configuration is specified in the ./server/config folder, through the ./server/config/env/ files. Here you will need to specify your MongoDb, RabbitMQ and postgreSQL parameters.
See the /server/config/env folder and /server/config/config.js file for the various environments.  The server is run on any port by setting the process.env.PORT variable before starting the service.
See examples in /package.json

### Environmental Settings

There are five environments currently provided: __debug__, __staging__. __development__, __test__, __testi__ (integration testing) and __production__.

To run with a different environment, just specify NODE_ENV as you call node:

    $ NODE_ENV=test node server/bin/www

## Running the service

  Once you have installed the dependencies with npm install, it is probably a good idea to run the unit tests (they are  run on port 6000 by default)

    $ npm test

To run units tests with code coverage information, run

    $ npm run coverage

Then have a look at the html pages generated at

    coverage/lcov-report/index.html

  Then you can start the server using

    $ node server/bin/www

or if you want to run as a daemon you can add a .conf file the /etc/init folder

    $ sudo nano /etc/init/fco-loi-submission.conf
    
Here is an example of what this file might look like:

    description "FCO LOI Submission Service"

    start on (filesystem and net-device-up IFACE=lo)
    stop on runlevel [!2345]

    respawn

    env port=3005
    env NODE_ENV=testi

    chdir /home/fcoloi/services/submission/is-submission-service/server

    exec nodejs bin/www



Then you can start the server by running

    $ sudo service fco-loi-submission start


to stop the service running instances in forever:

	$ sudo service fco-loi-submission stop


