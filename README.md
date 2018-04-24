![FIWARE Banner](https://fiware.github.io/tutorials.Accessing-Context/img/fiware.png)

This tutorial teaches FIWARE users how to alter the context programmatically

The tutorial builds on the  entities created in the previous 
[stock management example](https://github.com/Fiware/tutorials.Context-Providers/)
and enables a user understand how to write code in an [NGSI](http://fiware.github.io/specifications/ngsiv2/latest/)
capable [Node.js](https://nodejs.org/) [Express](https://expressjs.com/) application in order to retrieve and alter context 
data. This removes the need to use the command line to invoke cUrl commands.

The tutorial is mainly concerned with discussing code written in Node.js, however some of the
results can be checked by making [cUrl](https://ec.haxx.se/) commands. [Postman documentation](http://fiware.github.io/tutorials.Accessing-Context/) for the same commands is also available.

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/7c9bed4bd2ce5213a80b)

# Contents

- [Accessing the Context Data](#accessing-the-context-data)
  * [Making HTTP requests in the language of your choice](#making-http-requests-in-the-language-of-your-choice)
  * [The teaching goal of this tutorial](#the-teaching-goal-of-this-tutorial)
  * [Entities within a stock management system](#entities-within-a-stock-management-system)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
  * [Docker](#docker)
  * [Cygwin](#cygwin)
- [Start Up](#start-up)
- [Stock Management Frontend](#stock-management-frontend)
  * [NGSI v2 npm library](#ngsi-v2-npm-library)
  * [Analysing the Code](#analysing-the-code)
    + [Initializing the library](#initializing-the-library)
    + [Reading Store Data](#reading-store-data)
    + [Aggregating Products and Inventory Items](#aggregating-products-and-inventory-items)
    + [Updating Context](#updating-context)


# Accessing the Context Data 

For a typical smart solution you will be retrieving context data from diverse sources (such as a CRM system, social
networks, mobile apps or IoT sensors for example) and then analysing the context programmatically to make appropriate
business logic decisions. For example in the stock management demo, the application will need to ensure that the prices
paid for each item always reflect the current price held within the **Product** entity. For a dynamic system, the 
application will also need to be able to amend the current context. (e.g. creating or updating data or accuating a sensor
for example)

In general terms, three basic scenarios are defined below:

* Reading Data -  e.g. Give me all the data for the **Store** entity `urn:ngsi-ld:Store:001`
* Aggregation - e.g. Combine the **InventoryItems**  entities for Store `urn:ngsi-ld:Store:001` with 
  the names and prices of the **Product** entities for sale
* Altering the Context - e.g. Make a sale of a product:
  + Update the daily sales records by the price of the **Product**
  + decrement the `shelfCount` of the **InventoryItem** entity
  + Create a new Transaction Log record showing the sale has occurred
  + Raise an alert in the warehouse if less than 10 objects remain on sale
  + etc.

As you can see the business logic behind each request to access/amend context can range from the simple to complex
depending upon business needs.


## Making HTTP Requests in the language of your choice

The [NGSI](http://fiware.github.io/specifications/ngsiv2/latest/) specification defines a language agnostic REST API based on the standard usage of HTTP verbs. Therefore context data can be accessed by any programming language, simply through making HTTP requests. 

Here for example is the same HTTP request written in [PHP](https://secure.php.net/), [Node.js](https://Node.js.org/) and [Java](https://www.oracle.com/java/)


#### PHP (with `HTTPRequest`)

```php
<?php

$request = new HttpRequest();
$request->setUrl('http://localhost:1026/v2/entities/urn:ngsi-ld:Store:001');
$request->setMethod(HTTP_METH_GET);

$request->setQueryData(array(
  'options' => 'keyValues'
));

try {
  $response = $request->send();

  echo $response->getBody();
} catch (HttpException $ex) {
  echo $ex;
}
```


#### Node.js (with `request` library)

```javascript
const request = require("request");

const options = { method: 'GET',
  url: 'http://localhost:1026/v2/entities/urn:ngsi-ld:Store:001',
  qs: { options: 'keyValues' }};

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});
```


#### Java (with `CloseableHttpClient` library)

```java
CloseableHttpClient httpclient = HttpClients.createDefault();
try {
    HttpGet httpget = new HttpGet("http://localhost:1026/v2/entities/urn:ngsi-ld:Store:001?options=keyValues");

    ResponseHandler<String> responseHandler = new ResponseHandler<String>() {
        @Override
        public String handleResponse(
                final HttpResponse response) throws ClientProtocolException, IOException {
            int status = response.getStatusLine().getStatusCode();
            if (status >= 200 && status < 300) {
                HttpEntity entity = response.getEntity();
                return entity != null ? EntityUtils.toString(entity) : null;
            } else {
                throw new ClientProtocolException("Unexpected response status: " + status);
            }
        }

    };
    String body = httpclient.execute(httpget, responseHandler);
    System.out.println(body);
} finally {
    httpclient.close();
}
```

As you can see each example uses their own programming paradigm to do the following:

* Create a well formed URL.
* Make an HTTP GET request.
* Retrieve the response.
* Check for an error status and throw an exception if necessary.
* Return the body of the request for further processing.

Since such boilerplate code is frequently re-used it is usually hidden within a library. 

## The teaching goal of this tutorial

The aim of this tutorial is to improve developer understanding of programmatic access of context data
through defining and discussing a series of generic code examples covering common data access scenarios. 
For this purpose a simple Node.js Express application will be created.

The intention here is not to teach users how to write an application in Express - indeed any language could
have been chosen. It is merely to show how **any** sample programming language could be used alter the
context to achieve the business logic goals. 

Obviously, your choice of programming language will depend upon your own business needs - when reading the code
below please keep this in mind and substitute Node.js with your own programming language as appropriate.


## Entities within a stock management system

The relationship between our entities is defined as shown:

![](https://fiware.github.io/tutorials.Accessing-Context/img/entities.svg)

The items highlighted in blue are provided by the external context providers. 

The **Store**, **Product** and **InventoryItem** entities will be used to display data on the front-end of our demo application.

# Architecture

This application will make use of only one FIWARE component - the [Orion Context Broker](https://catalogue.fiware.org/enablers/publishsubscribe-context-broker-orion-context-broker). Usage of the Orion Context Broker is sufficient for an application to qualify as *“Powered by FIWARE”*.

Currently, the Orion Context Broker relies on open source [MongoDB](https://www.mongodb.com/) technology to keep
persistence of the context data it holds. To request context data from external sources, a simple Context Provider NGSI 
proxy has also been added. To visualise and interact with the Context we will add a simple Express application 


Therefore, the architecture will consist of four elements:

* The Orion Context Broker server which will receive requests using [NGSI](http://fiware.github.io/specifications/ngsiv2/latest/)
* The underlying MongoDB database associated to the Orion Context Broker server
* The Context Provider NGSI proxy which will will:
  + receive requests using [NGSI](http://fiware.github.io/specifications/ngsiv2/latest/)
  + makes requests to publicly available data sources using their own APIs in a proprietory format 
  + returns context data back to the Orion Context Broker in [NGSI](http://fiware.github.io/specifications/ngsiv2/latest/) format.
* The Stock Management Frontend which will will:
  + Display store information
  + Show which products can be bought at each store
  + Allow users to "buy" products and reduce the stock count.

Since all interactions between the elements are initiated by HTTP requests, the entities can be containerized and run
from exposed ports. 

![](https://fiware.github.io/tutorials.Accessing-Context/img/architecture.svg)

# Prerequisites

## Docker

To keep things simple both components will be run using [Docker](https://www.docker.com). **Docker** is a container technology
which allows to different components isolated into their respective environments. 

* To install Docker on Windows follow the instructions [here](https://docs.docker.com/docker-for-windows/)
* To install Docker on Mac follow the instructions [here](https://docs.docker.com/docker-for-mac/)
* To install Docker on Linux follow the instructions [here](https://docs.docker.com/install/)

**Docker Compose** is a tool for defining and running multi-container Docker applications. A 
[YAML file](https://raw.githubusercontent.com/Fiware/tutorials.Entity-Relationships/master/docker-compose.yml) is used
configure the required services for the application. This means all container sevices can be brought up in a single 
commmand. Docker Compose is installed by default  as part of Docker for Windows and  Docker for Mac, however Linux users 
will need to follow the instructions found  [here](https://docs.docker.com/compose/install/)

## Cygwin 

We will start up our services using a simple bash script. Windows users should download [cygwin](www.cygwin.com) to provide a
command line functionality similar to a Linux distribution on Windows. 

# Start Up

All services can be initialised from the command line by running the bash script provided within the repository:

```console
./services create; ./services start;
```

This command will also import seed data from the previous [Stock Management example](https://github.com/Fiware/tutorials.Context-Providers) on startup.

>:information_source: **Note:** If you want to clean up and start over again you can do so with the following command:
>
>```console
>./services stop
>``` 
>

#  Stock Management Frontend

All the code Node.js Express for the demo can be found within the `proxy` folder within the GitHub repository.[Stock Management example](https://github.com/Fiware/tutorials.Accessing-Context/tree/master/proxy). The application runs on the following URLs:


* `http://localhost:3000/app/store/urn:ngsi-ld:Store:001`
* `http://localhost:3000/app/store/urn:ngsi-ld:Store:002`
* `http://localhost:3000/app/store/urn:ngsi-ld:Store:003`
* `http://localhost:3000/app/store/urn:ngsi-ld:Store:004`


>:information_source: **Tip**  Additionally, you can also watch the status of recent requests yourself by
>following the container logs or viewing information on `localhost:3000/app/monitor` on a web browser.
>
>![FIWARE Monitor](https://fiware.github.io/tutorials.Accessing-Context/img/monitor.png)


## NGSI v2 npm library

An NGSI v2 compatible [npm library](https://github.com/smartsdk/ngsi-sdk-javascript) has been developed by the
(SmartSDK](https://www.smartsdk.eu/) team. This is a callback-based library which will be used to take care of
our low level HTTP requests and will simplify the code to be written. The methods exposed in the library map
directly onto the NGSI v2 [CRUD operations](https://github.com/Fiware/tutorials.CRUD-Operations#what-is-crud)
with the following names:

| HTTP Verb   | `/v2/entities`  | `/v2/entities/<entity>`  |
|-----------  |:--------------: |:-----------------------: |
| **POST**    | [`createEntity()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/EntitiesApi.md#createEntity)  | :x:  |
| **GET**     | [`listEntities()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/EntitiesApi.md#listEntities) | [`retrieveEntity()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/EntitiesApi.md#retrieveEntity)  | 
| **PUT**     | :x:   | :x:   |
| **PATCH**   | :x:   | :x:   |
| **DELETE**  | :x:  | [`removeEntity()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/EntitiesApi.md#removeEntity)  | 



| HTTP Verb   | `.../attrs`  | `.../attrs/<attribute>`  | `.../attrs/<attribute>/value`  |
|-----------  |:-----------: |:-----------------------: |:-----------------------------: |
| **POST**    |  [`updateOrAppendEntityAttributes()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/EntitiesApi.md#updateOrAppendEntityAttributes)   | :x:   | :x:   |
| **GET**     |  [`retrieveEntityAttributes()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/EntitiesApi.md#retrieveEntityAttributes)  | :x:   | [`getAttributeValue()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/AttributeValueApi.md#getAttributeValue)  |
| **PUT**     |  :x:   | :x:   | [`updateAttributeValue()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/AttributeValueApi.md#updateAttributeValue)  |
| **PATCH**   |  [`updateExistingEntityAttributes()`](https://github.com/smartsdk/ngsi-sdk-javascript/blob/master/docs/EntitiesApi.md#updateExistingEntityAttributes) | :x:   | :x:   |
| **DELETE**. |  :x: | `removeASingleAttribute()` | :x:  |


## Analysing the Code

The code under discussion can be found within the `store` controller in the [Git Repository](https://github.com/Fiware/tutorials.Context-Providers/blob/master/proxy/controllers/store.js)

### Initializing the library

We don't want to reinvent the wheel and spend time writing a unnecessary boilerplate code for HTTP access. Therefore
we will use the exising `ngsi_v2`  NPM library. This needs to be included in the header of the file as shown. The
`basePath` must also be set - this defines the location of the Orion Context Broker. 

```javascript
const NgsiV2 = require('ngsi_v2');
const defaultClient = NgsiV2.ApiClient.instance;
defaultClient.basePath = process.env.CONTEXT_BROKER || 'http://localhost:1026/v2';
```


### Reading Store Data

This example reads the context data of a given **Store** entity to display the results on screen.
Reading entity data can be done using the `apiInstance.retrieveEntity()` method. Since the library uses callbacks,
they have been wrapped by a `Promise` function as shown below. The libary function `apiInstance.retrieveEntity()` 
will fill out the URL for the GET request and make the necessary HTTP call:

```javascript
function retrieveEntity(entityId, opts) {
	return new Promise(function(resolve, reject) {
		const apiInstance = new NgsiV2.EntitiesApi();
		apiInstance.retrieveEntity(entityId, opts, (error, data) => {
			return error ? reject(error) : resolve(data);
		});
	});
}
```


This enables us to wrap the requests in `Promises` as shown:

```javascript
function displayStore(req, res) {
	retrieveEntity(
		req.params.storeId, { options: 'keyValues', type: 'Store' })
	.then(store => {
		// If a store has been found display it on screen
		return res.render('store', { title: store.name, store});
	})
	.catch(error => {
		debug(error);
		// If no store has been found, display an error screen
  		return res.render('store-error', {title: 'Error', error});
	});
}
```

Indirectly this is making an HTTP GET request to `http://{{orion}}/v2/entities/<store-id>?type=Store&options=keyValues`.
Note the re-use of the Store URN in the incoming request.

The response will be as shown below:

```json
{
    "id": "urn:ngsi-ld:Store:001",
    "type": "Store",
    "address": {
        "streetAddress": "Bornholmer Straße 65",
        "addressRegion": "Berlin",
        "addressLocality": "Prenzlauer Berg",
        "postalCode": "10439"
    },
    "location": {
        "type": "Point",
        "coordinates": [
            13.3986,
            52.5547
        ]
    },
    "name": "Bösebrücke Einkauf"
}
```

The store data from the HTTP response body is then passed to the PUG rendering engine to display on screen as
shown below:

#### `http://localhost:3000/app/store/urn:ngsi-ld:Store:001`

![Store 1](https://fiware.github.io/tutorials.Accessing-Context/img/store.png)

For efficiency, it is important to request as few attributes as possible, in order to reduce network traffic.
This optimization has not been made in the code yet.

An error handler is necessary in case the context data is not available - for example if a user queries for a
store that does not exist. This will forward to an error page as shown:

#### `http://localhost:3000/app/store/urn:ngsi-ld:Store:005`

![Store 1](https://fiware.github.io/tutorials.Accessing-Context/img/store.png)


### Aggregating Products and Inventory Items

This example reads the context data of the current **InventoryItem** entities for a given store and combines
the information with the prices from the **Product** entities. The result is information to be displayed on
the cash till.

Multiple entities can be requested and aggregated by creating a `Promise` chain or by usign `Promise.all`. 
Here the **Product**  and **InventoryItems** entities have been requested using the `apiInstance.listEntities()` 
library method. The presence of the `q` parameter in the request will filter the list of entities received. 


```javascript
function displayTillInfo(req, res) {
	Promise.all([ 
		listEntities({
		options: 'keyValues',
		type: 'Product',
	}), listEntities({
		q: 'refStore==' + req.params.storeId,
		options: 'keyValues',
		type: 'InventoryItem',
	})])
	.then(values => {
		// If values have been found display it on screen
		return res.render('till', { products : values[0], inventory : values[1] });
	})
	.catch(error => {
		debug(error);
		// An error occurred, return with no results
		return res.render('till', { products : {}, inventory : {}});
	});
}


function listEntities(opts) {
	return new Promise(function(resolve, reject) {
		const apiInstance = new NgsiV2.EntitiesApi();
		apiInstance.listEntities(opts, (error, data) => {
			return error ? reject(error) : resolve(data);
		});
	});
}
```


The code used for aggregating the results (displaying the product names for each item stocked) has been delegated
to a `mixin` on the front-end. The foreign key aggregation (`item.refProduct === product.id`) could have been
added to the Node.js code if we were passing on aggregated data to another component:

```pug
mixin product(item, products)
  each product in products
    if (item.refProduct === product.id)
      span(id=`${product.id}`)
        strong
          | #{product.name}

        | &nbsp; @ #{product.price /100} &euro; each
        | - #{item.shelfCount} in stock
        |

```


Again an error handler has been created to ensure that if any of the HTTP requests to the Orion Context Broker fail, an empty list of products is returned. 

Retrieving the full list of **Product** entities for each request is not efficient. It would be better to load the list of products from cache, and only update the list if prices have changed. This could be achieved using the NGSI Subscription mechanism which is the subject of a subsequent tutorial.

### Updating Context

Buying an item will involve decrementing the number of items left on a shelf. The example consists of two linked requests.
The reading of the **InventoryItem** entity data can be done using the `apiInstance.retrieveEntity()` method as shown 
previously. The data is then ammended  in memory before being sent to the Orion Context Broker using the 
`apiInstance.updateExistingEntityAttributes()` method.  This is effectively just a wrapper around an HTTP PATCH request to
`http://{{orion}}/v2/entities/<inventory-id>?type=InventoryItem`, with a body containing the elements to be updated.
There is no error handling on this function, it has been left to a function on the router.


```javascript
async function buyItem(req, res) {
	const inventory = await retrieveEntity(req.params.inventoryId, {
		options: 'keyValues',
		type: 'InventoryItem',
	});
	const count = inventory.shelfCount - 1;
	await updateExistingEntityAttributes(
		req.params.inventoryId,
		{ shelfCount: { type: 'Integer', value: count } },
		{
			type: 'InventoryItem',
		}
	);
	res.redirect(`/app/store/${inventory.refStore}/till`);
}

function updateExistingEntityAttributes(entityId, body, opts) {
	return new Promise(function(resolve, reject) {
		const apiInstance = new NgsiV2.EntitiesApi();
		apiInstance.updateExistingEntityAttributes(entityId, body, opts, (error, data) => {
			return error ? reject(error) : resolve(data);
		});
	});
}
```


Care should be taken when amending the context to ensure that changes of state are committed atomically. This is not an issue in Node.JS since it is single threaded - each request but will execute each request one by one. However in multithreaded environments (such as Java for example) it could be possible to concurrently service two buy requests concurrently - meaning that the `shelfCount` will only be reduced once if the requests interleave. This issue can be resolved by the use of a monitor mechanism.











