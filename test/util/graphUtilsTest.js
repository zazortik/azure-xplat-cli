var gUtil = require('./graphUtils');
var util = require('util');

//var profile = require('../../lib/util/profile');
//console.log("subs " + util.inspect(profile.currentSubscription, {depth: null}));


//gUtil.createUser('user1', 'Test1234');
//gUtil.deleteUser('user1@rbactest.onmicrosoft.com');
//https://graph.windows.net/1449d5b7-8a83-47db-ae4c-9b03e888bad0/directoryObjects/9b85f9fa-3aba-4f2c-a962-d3622e93bc2e
 /*graphClient: { pipeline:
   { [Function: runFilteredRequest]
     add: [Function],
     get: [Function],
     post: [Function],
     delete: [Function],
     put: [Function],
     merge: [Function],
     head: [Function] },
  tenantID: '1449d5b7-8a83-47db-ae4c-9b03e888bad0',
  credentials:
   { accessToken:
      { authConfig:
         { authorityUrl: 'https://login.windows.net',
           tenantId: 'common',
           resourceId: 'https://management.core.windows.net/',
           clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46' },
        userId: 'admin@rbactest.onmicrosoft.com' },
     subscriptionId: '3ca49042-782a-4cc9-89b5-ee1b487fe115' },
  baseUri: 'https://graph.windows.net/',
  apiVersion: '1.42-previewInternal',
  longRunningOperationInitialTimeout: -1,
  longRunningOperationRetryTimeout: -1,
  group: { client: [Circular] },
  objects: { client: [Circular] },
  servicePrincipal: { client: [Circular] },
  user: { client: [Circular] } } */


var callback = function (err, result) {
  if (err) {
    console.log('err: ' + util.inspect(err, {depth: null}));
  }
  else {
    console.log('result is: ' + util.inspect(result, {depth: null}));
  }
}

gUtil.createGroup('testgroup1', function (err, result) {
	callback(err, result);
	gUtil.createGroup('testgroup2', function (err, result) {
	  callback(err, result);
	  gUtil.createUser('testuser1@rbactest.onmicrosoft.com', 'Test1234', function (err, result) {
	  	callback(err, result);
	  	gUtil.createUser('testuser2@rbactest.onmicrosoft.com', 'Test1234', function (err, result) {
	      callback(err, result);
	      gUtil.addGroupMember('testgroup1', 'testuser1@rbactest.onmicrosoft.com', 'user', function (err, result) {
	      	callback(err, result);
	      	gUtil.addGroupMember('testgroup1', 'testgroup2', 'group', function (err, result) {
	      	  callback(err, result);
	      	  gUtil.removeMember('testgroup1', 'testuser1@rbactest.onmicrosoft.com', 'user', function (err, result) {
	      	  	callback(err, result);
	      	  	gUtil.removeMember('testgroup1', 'testgroup2', 'group', function (err, result) {
	      	  	  callback(err, result);
	      	  	  gUtil.deleteGroup('testgroup1', function (err, result) {
	      	  	  	callback(err, result);
	      	  	  	gUtil.deleteGroup('testgroup2', function (err, result) {
	      	  	  	  callback(err, result);
	      	  	  	  gUtil.deleteUser('testuser1@rbactest.onmicrosoft.com', function (err, result) {
	      	  	  	  	callback(err, result);
	      	  	  	  	gUtil.deleteUser('testuser2@rbactest.onmicrosoft.com', function (err, result) {
	      	  	  	  	  callback(err, result);
	      	  	  	  	});
	      	  	  	  });
	      	  	  	});
	      	  	  });
	      	  	});
	      	  });
	      	});
	      });
	  	});
	  });
	});
});