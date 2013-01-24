/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var fs = require('fs');
var path = require('path');
var url = require('url');
var pfx2pem = require('../util/certificates/pkcs').pfx2pem;
var Channel = require('../channel');
var utils = require('../utils');
var uuid = require('node-uuid');

exports.init = function (cli) {

  var log = cli.output;

  function promptString(prompt, callback) {
    cli.prompt(prompt, function (text) {
      if (text.length > 0) {
        callback(text);
      }
      else {
        throw(new Error(prompt.split(':')[0] + ' must be specified'));
      }
    });
  }

  function getSqlChannel(options) {
    options.subscription = options.subscription || cli.category('account').lookupSubscriptionId(options.subscription);
    var account = cli.category('account');
    var managementEndpoint = url.parse(utils.getSqlManagementEndpointUrl());
    var pem = account.managementCertificate();
    var host = managementEndpoint.hostname;
    var port = managementEndpoint.port;

    var channel = new Channel({
      host: host,
      port: port,
      key: pem.key,
      cert: pem.cert
    }).header('x-ms-version', '1.0')
      .path(options.subscription)

    return channel;
  }    


  function getBaseChannel(options) {
    options.subscription = options.subscription || cli.category('account').lookupSubscriptionId(options.subscription);
    var account = cli.category('account');
    var managementEndpoint = url.parse(utils.getManagementEndpointUrl(account.managementEndpointUrl()));
    var pem = account.managementCertificate();
    var host = managementEndpoint.hostname;
    var port = managementEndpoint.port;

    var channel = new Channel({
      host: host,
      port: port,
      key: pem.key,
      cert: pem.cert
    }).header('x-ms-version', '2012-03-01')
      .path(options.subscription)

    return channel;
  }    

  function getMobileChannel(options) {
    var channel = getBaseChannel(options)
      .header('Accept', 'application/json')
      .path('services')
      .path('mobileservices');

    return channel;
  }

  function getAppManagerChannel(options) {
    var channel = getBaseChannel(options)
      .header('Accept', 'application/xml')
      .path('applications');

    return channel;
  }  

  var mobile = cli.category('mobile')
        .description('Commands to manage your Azure mobile services');

  mobile.getRegions = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('regions');

    channel.GET(callback);
  };

  mobile.listServices = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices');

    channel.GET(callback);
  };

  mobile.getService = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename);

    channel.GET(callback);
  };

  mobile.getWebspace = function (options, webspace, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('webspaces')
      .path(webspace);

    channel.GET(function (error, webspace) {
      if (webspace) {
        webspace.numberOfInstances = typeof webspace.numberOfInstances === 'undefined' ? 1 : webspace.numberOfInstances;
        webspace.computeMode = webspace.computeMode || 'Shared';
        webspace.workerSize = webspace.workerSize || 'Small';
      }

      callback(error, webspace);
    });
  };

  mobile.setWebspace = function (options, webspace, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('webspaces')
      .path(webspace)
      .header('Content-Type', 'application/json');

    channel.send('POST', settings, callback);
  };  

  mobile.getServiceSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('settings');

    channel.GET(callback);
  };

  mobile.setServiceSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('settings')
      .header('Content-Type', 'application/json');

    channel.send('PATCH', settings, callback);
  };

  mobile.getLiveSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('livesettings');

    channel.GET(callback);
  };

  mobile.setLiveSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('livesettings')
      .header('Content-Type', 'application/json');


    channel.PUT(settings, callback);
  };

  mobile.getAuthSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('authsettings');

    channel.GET(callback);
  };

  mobile.setAuthSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('authsettings')
      .header('Content-Type', 'application/json');

    log.silly('NEW AUTH SETTINGS:');
    log.silly(settings);

    channel.PUT(settings, callback);
  };

  mobile.getApnsSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('settings');

    channel.GET(callback);
  };

  mobile.setApnsSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('certificates')
      .header('Content-Type', 'application/json');

    channel.POST(settings, callback);
  };

  mobile.regenerateKey = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('regenerateKey')
      .query('type', options.type);

    channel.POST(null, callback);
  };

  mobile.restartService = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('redeploy');

    var progress = cli.progress('Restarting mobile service');
    try {
      channel.POST(null, function (error, result) {
        progress.end();
        callback(error, result);
      });
    }
    catch (e) {
      progress.end();
      throw e;
    }
  };

  mobile.getLogs = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('logs');

    if (options.query) {
      options.query.split('&').forEach(function (keyvalue) {
        var kv = keyvalue.split('=');
        if (kv.length === 2) {
          channel.query(kv[0], kv[1]);
        }
        else {
          return callback(new Error('Invalid format of query parameter'));
        }
      })
    }
    else {
      if (options.continuationToken) {
        channel.query('continuationToken', options.continuationToken)
      }

      channel.query('$top', options.top || 10);

      if (options.type) {
        channel.query('$filter', "Type eq '" + options.type + "'");
      }
    }

    channel.GET(callback);
  };        

  mobile.listTables = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables');

    channel.GET(callback);
  };

  mobile.getApnsScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('scripts')
      .path('feedback');

    channel.GET(callback);
  };

  mobile.setApnsScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('scripts')
      .path('feedback')
      .header('Content-Type', 'text/plain');

    channel.PUT(script, callback);
  };

  mobile.deleteApnsScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('scripts')
      .path('feedback');

    channel.DELETE(callback);
  };

  mobile.getSharedScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    mobile.getApnsScript(options, function (error, script) {
      if (error) {
        return callback(error);
      }

      callback(null, [{ name: 'apnsFeedback', sizeBytes: Buffer.byteLength(script, 'utf8') }]);
    });
  };

  mobile.getSharedScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    if (options.script.shared.name !== 'apnsFeedback') {
      return callback(new Error('Unsupported shared script name: ' + options.script.shared.name));
    }

    mobile.getApnsScript(options, callback);
  };

  mobile.setSharedScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    if (options.script.shared.name !== 'apnsFeedback') {
      return callback(new Error('Unsupported shared script name: ' + options.script.shared.name));
    }

    mobile.setApnsScript(options, script, callback);
  };

  mobile.deleteSharedScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    if (options.script.shared.name !== 'apnsFeedback') {
      return callback(new Error('Unsupported shared script name: ' + options.script.shared.name));
    }

    mobile.deleteApnsScript(options, callback);
  };

  mobile.getSchedulerScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs');

    channel.GET(callback);
  };

  mobile.getJob = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.jobname);

    channel.GET(callback);
  };

  mobile.getSchedulerScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.script.scheduler.name)
      .path('script');

    channel.GET(callback);
  };

  mobile.setSchedulerScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.script.scheduler.name)
      .path('script')
      .header('Content-Type', 'text/plain');

    channel.PUT(script, callback);
  };

  mobile.deleteSchedulerScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.jobname || options.script.scheduler.name);

    channel.DELETE(callback);
  };

  mobile.createJob = function (options, job, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .header('Content-Type', 'application/json');

    channel.send('POST', job, callback);
  };    

  mobile.setJob = function (options, job, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.jobname)
      .header('Content-Type', 'application/json');

    channel.send('PUT', job, callback);
  };    

  mobile.getTableScripts = function (options, table, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(table)
      .path('scripts');

    channel.GET(callback);
  };

  mobile.getTableScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.script.table.name)
      .path('scripts')
      .path(options.script.table.operation)
      .path('code');

    channel.GET(callback);
  };

  mobile.setTableScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.script.table.name)
      .path('scripts')
      .path(options.script.table.operation)
      .path('code')
      .header('Content-Type', 'text/plain');

    channel.PUT(script, callback);
  };

  mobile.deleteTableScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.script.table.name)
      .path('scripts')
      .path(options.script.table.operation);

    channel.DELETE(callback);
  };

  mobile.getAllTableScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var results = [];
    mobile.listTables(options, function (error, tables) {
      if (error || tables.length == 0) {
        return callback(error, tables);
      }

      var resultCount = 0;
      var finalError;
      tables.forEach(function (table) {
        mobile.getTableScripts(options, table.name, function (error, scripts) {
          finalError = finalError || error;
          if (Array.isArray(scripts)) {
            scripts.forEach(function (script) {
              script.table = table.name;
              results.push(script);
            });
          }

          if (++resultCount == tables.length) {
            callback(finalError, results);
          }
        });
      });
    });
  };

  mobile.getTable = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename);

    channel.GET(callback);
  };

  mobile.createTable = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .header('Content-Type', 'application/json');

    channel.POST(settings, callback);
  }; 

  mobile.deleteTable = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename);

    channel.DELETE(callback);
  };

  mobile.truncateTable = function (options, payload, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('truncate')
      .header('Content-Type', 'application/json');

    channel.POST(payload, callback);
  };

  mobile.getPermissions = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('permissions');

    channel.GET(callback);
  };

  mobile.updatePermissions = function (options, newPermissions, callback) {
    log.verbose('Subscription', options.subscription);
    mobile.getPermissions(options, function (error, currentPermissions) {
      if (error) {
        return callback(error);
      }

      for (var i in currentPermissions) {
        if (!newPermissions[i]) {
          newPermissions[i] = currentPermissions[i];
        }
      }

      var channel = getMobileChannel(options)
        .path('mobileservices')
        .path(options.servicename)
        .path('tables')
        .path(options.tablename)
        .path('permissions')
        .header('Content-Type', 'application/json');

      channel.PUT(JSON.stringify(newPermissions), callback);
    });
  };

  mobile.getScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('scripts');

    channel.GET(callback);
  };

   mobile.getColumns = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('columns');

    channel.GET(callback);
  };

  mobile.deleteColumn = function (options, column, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('columns')
      .path(column);

    channel.DELETE(callback);
  };  

  mobile.createIndex = function (options, column, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('indexes')
      .path(column);

    channel.PUT(null, callback);
  };    

  mobile.deleteIndex = function (options, column, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('indexes')
      .path(column);

    channel.DELETE(callback);
  };  

  mobile.getMobileServiceApplication = function (options, callback) {
    var channel = getAppManagerChannel(options)
      .path(options.servicename + 'mobileservice')
      .header('Content-Type', 'application/xml');

    channel.GET(callback);
  };

  mobile.deleteMobileServiceApplication = function (options, callback) {
    var channel = getAppManagerChannel(options)
      .path(options.servicename + 'mobileservice')
      .header('Content-Type', 'application/xml');

    channel.DELETE(function (error, body, res) {
      if (error) {
        log.silly('Delete mobile service application error: ' + JSON.stringify(error, null, 2));
        return callback(error);
      }

      mobile.trackAsyncOperation(options, res.headers['x-ms-request-id'], function (error) {
        log.silly('Delete mobile service application result: ' + error ? JSON.stringify(error, null, 2) : 'ok');
        callback(error);
      });
    });
  };

  mobile.getData = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('data');

    if (options.query) {
      options.query.split('&').forEach(function (keyvalue) {
        var kv = keyvalue.split('=');
        if (kv.length === 2) {
          channel.query(kv[0], kv[1]);
        }
        else {
          return callback(new Error('Invalid format of query parameter'));
        }
      })
    }
    else {
      channel.query('$top', options.top || 10);

      if (options.skip) {
        channel.query('$skip', options.skip)
      }
    }

    channel.GET(callback);    
  }

  mobile.trackAsyncOperation = function (options, requestId, callback) {
    function waitOne() {
      var asyncChannel = getBaseChannel(options)
        .path('operations')
        .path(requestId)
        .header('Accept', 'application/json');

      asyncChannel.GET(function (error, body) {
        if (error) {
          return callback(new Error('Unable to determine the status of the async operation. ' +
            'Please check the status on the management portal.'));
        }

        log.silly('Operation status: ' + body.Status);

        if (body.Status === 'Succeeded') {
          callback();
        }
        else if (body.Status === 'Failed') {
          callback(new Error('Operation failed. ' +
            'Please confirm the status on the management portal.'))
        }
        else if (body.Status !== 'InProgress') {
          callback(new Error('Unexpected response from Windows Azure. ' +
            'Please confirm the status of the mobile service n the management portal.'))
        }
        else {
          setTimeout(waitOne(), 5000);
        }
      });  
    }

    waitOne();
  };

  var resourceTypeView = {
    'Microsoft.WindowsAzure.MobileServices.MobileService': 'Mobile service',
    'Microsoft.WindowsAzure.SQLAzure.DataBase': 'SQL database',
    'Microsoft.WindowsAzure.SQLAzure.Server': 'SQL server'
  };

  mobile.getFlatApplicationDescription = function (description) {
    var result = {
      State: description.State,
      Name: description.Name,
      Label: description.Label,
      Resources: []
    };

    function flatten(resource) {
      var list;
      if (Array.isArray(resource))
        list = resource;
      else if (typeof resource == 'object')
        list = [ resource ];

      if (list) {
        list.forEach(function (item) {
          result.Resources.push(item);
          item.TypeView = resourceTypeView[item.Type];
          item.NameView = item.Label || item.Name;
          if (typeof item.FailureCode === 'string') {
            var match = item.FailureCode.match(/\<Message\>([^\<]*)\<\/Message\>/);
            item.Error = match ? match[1] : item.FailureCode;            
          }
        });
      }
    }

    flatten(description.InternalResources.InternalResource);
    flatten(description.ExternalResources.ExternalResource);

    return result;
  };

  mobile.deleteService = function (options, callback) {
    var channel = getMobileChannel(options)
      .path('mobileservices')
      .path(options.servicename)

    if (options.deleteData) {
      channel.query('deletedata', 'true');
    }

    channel.DELETE(function (error, body, ret) {
      log.silly('Delete mobile service:');
      log.silly(JSON.stringify(error, null, 2));
      log.silly(JSON.stringify(body, null, 2));
      callback(error);
    });
  };

  mobile.deleteSqlServer = function (options, resource, callback) {
    var channel = getSqlChannel(options)
      .path('servers')
      .path(resource.Name);

    channel.DELETE(function (error, body, ret) {
      log.silly('Delete SQL server:');
      log.silly(JSON.stringify(error, null, 2));
      log.silly(JSON.stringify(body, null, 2));
      callback(error);
    });
  };

  var createMobileServiceApplicationTemplate = (function () {/*
<?xml version="1.0" encoding="utf-8"?>
<Application xmlns="http://schemas.microsoft.com/windowsazure">
  <Name>##name##</Name> 
  <Label>##label##</Label>
  <Description>##description##</Description>
  <Configuration>##spec##</Configuration>
</Application>
  ~*/}).toString().match(/[^\n]\n([^\~]*)/)[1];

  mobile.createService = function (options, callback) {
    var channel = getAppManagerChannel(options)
      .header('Content-Type', 'application/xml');

    var serverRefName = "ZumoSqlServer_" + uuid.v4().replace(/-/g,'');
    var serverSpec;

    if (options.sqlServer) {
      // use existing SQL server

      serverSpec = {
        "Name": serverRefName,
        "Type": "Microsoft.WindowsAzure.SQLAzure.Server",
        "URI": 'https://management.core.windows.net:8443/' 
          + options.subscription + '/services/sqlservers/servers/' + options.sqlServer
      };      
    }
    else {
      // create new SQL server

      serverSpec = {
        "ProvisioningParameters": {
          "AdministratorLogin": options.username,
          "AdministratorLoginPassword": options.password,
          "Location": options.sqlLocation
        },
        "ProvisioningConfigParameters": {
          "FirewallRules": [
            {
              "Name": "AllowAllWindowsAzureIps",
              "StartIPAddress": "0.0.0.0",
              "EndIPAddress": "0.0.0.0"
            }
          ]
        },
        "Version": "1.0",
        "Name": serverRefName,
        "Type": "Microsoft.WindowsAzure.SQLAzure.Server"
      };
    }

    var dbRefName = "ZumoSqlDatabase_" + uuid.v4().replace(/-/g,'');
    var dbSpec;

    if (options.sqlDb) {
      // use existing SQL database

      dbSpec = {
        "Name": dbRefName,
        "Type": "Microsoft.WindowsAzure.SQLAzure.DataBase",
        "URI": 'https://management.core.windows.net:8443/' 
          + options.subscription + '/services/sqlservers/servers/' + options.sqlServer 
          + '/databases/' + options.sqlDb
      };            
    }
    else {
      // create a new SQL database

      dbSpec = {
        "ProvisioningParameters": {
          "Name": options.servicename + "_db",
          "Edition": "WEB",
          "MaxSizeInGB": "1",
          "DBServer": {
            "ResourceReference": serverRefName + ".Name"
          },
          "CollationName": "SQL_Latin1_General_CP1_CI_AS"
        },
        "Version": "1.0",
        "Name": dbRefName,
        "Type": "Microsoft.WindowsAzure.SQLAzure.DataBase"
      };
    }

    var spec = {
      "SchemaVersion": "2012-05.1.0",
      "Location": "West US",
      "ExternalResources": {},
      "InternalResources": {
        "ZumoMobileService": {
          "ProvisioningParameters": {
            "Name": options.servicename,
            "Location": options.location
          },
          "ProvisioningConfigParameters": {
            "Server": {
              "StringConcat": [
                {
                  "ResourceReference": serverRefName + ".Name" 
                },
                ".database.windows.net"
              ]
            },
            "Database": {
              "ResourceReference": dbRefName + ".Name" 
            },
            "AdministratorLogin": options.username,
            "AdministratorLoginPassword": options.password
          },
          "Version": "2012-05-21.1.0",
          "Name": "ZumoMobileService",
          "Type": "Microsoft.WindowsAzure.MobileServices.MobileService"
        }
      }
    };

    if (options.sqlServer) {
      // use existing SQL server as an external resource
      spec.ExternalResources[serverRefName] = serverSpec;
    }
    else {
      // create a new SQL server as in internal resource
      spec.InternalResources[serverRefName] = serverSpec;      
    }

    if (options.sqlDb) {
      spec.ExternalResources[dbRefName] = dbSpec;
    }
    else {
      // create a new SQL database as an internal resource
      spec.InternalResources[dbRefName] = dbSpec;
    }

    log.silly('New mobile service application specification:');
    log.silly(JSON.stringify(spec, null, 2));

    var encodedSpec = new Buffer(JSON.stringify(spec)).toString('base64');
    var payload = createMobileServiceApplicationTemplate
      .replace('##name##', options.servicename + 'mobileservice')
      .replace('##label##', options.servicename)
      .replace('##description##', options.servicename)
      .replace('##spec##', encodedSpec);

    log.silly('New mobile service request body:');
    log.silly(payload);

    var progress = cli.progress('Creating mobile service');
    try {
      channel.POST(payload, function (error, body, res) {
        if (error) {
          progress.end();
          return callback(error);
        }

        log.silly('Create mobile app HTTP response: ' + res.statusCode);
        log.silly(JSON.stringify(res.headers, null, 2));

        // async operation, wait for completion
        mobile.trackAsyncOperation(options, res.headers['x-ms-request-id'], function (error) {
          if (error) {
            progress.end();
            return callback(error);
          }

          // get the application specification and confirm the status of individual components
          var channel = getAppManagerChannel(options)
            .path(options.servicename + 'mobileservice');

          channel.GET(function (error, body, res) {
            progress.end();
            if (error) {
              return callback(error);
            }

            if (log.format().json) {
              log.json(body);
            }
            else {
              log.silly(JSON.stringify(body, null, 2));
              var flat = mobile.getFlatApplicationDescription(body);
              var logger = flat.State == 'Healthy' ? log.info : log.error;
              log.silly(JSON.stringify(flat, null, 2));
              logger('Overall application state: ' + flat.State);
              flat.Resources.forEach(function (resource) {
                logger(resource.TypeView + (resource.NameView ? ' (' + resource.NameView + ')' : '') 
                  + ' state: ' + resource.State);
                if (resource.Error) {
                  logger(resource.Error);
                }
              });
            }

            callback(body.State === 'Healthy' ? null : new Error('Creation of a mobile service failed.'));
          });
        });
      });
    }
    catch (e) {
      progress.end();
      throw e;
    }
  };

  mobile.command('locations')
        .usage('[options]')
        .description('List available mobile service locations')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (options, callback) {     
          mobile.getRegions(options, function (error, result) {
            if (error) {
              return callback(error);
            }

            if (log.format().json) {
              log.json(result);
            }
            else {
              result.forEach(function (region, index) {
                log.info(region.region + (index === 0 ? ' (default)' : ''));
              });
            }
          });
        });


  mobile.command('create [servicename] [username] [password]')
        .usage('[options] [servicename] [sqlAdminUsername] [sqlAdminPassword]')
        .description('Create a new mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-r, --sqlServer <sqlServer>', 'use existing SQL server')
        .option('-d, --sqlDb <sqlDb>', 'use existing SQL database')
        .option('-l, --location <location>', 'create the service in a particular location; run azure mobile locations to get available locations')
        .option('--sqlLocation <location>', 'create the SQL server in a particular location; defaults to mobile service location')
        .execute(function (servicename, username, password, options, callback) {     
          if (options.sqlDb && !options.sqlServer) {
            return callback('To use an existnig SQL database, you must specify the name of an existing SQL server using the --sqlServer parameter.');
          }

          options.location ? ensuredLocation(options.location) : getDefaultLocation();

          function getDefaultLocation() {
            mobile.getRegions(options, function (error, result) {
              if (error) {
                return callback(error);
              }

              if (!Array.isArray(result) || result.length == 0 || !result[0].region) {
                return callback(new Error('Unable to determine the default mobile service location.'));
              }

              ensuredLocation(result[0].region);
            });
          }

          function ensuredLocation(location) {
            options.location = location;
            options.sqlLocation = options.sqlLocation || options.location;

            servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
            function ensuredServiceName(servicename) {
              options.servicename = servicename;
              username ? ensuredUsername(username) : promptUsername();

              function promptUsername() {
                cli.prompt('SQL administrator user name: ', function (username) {
                  if (username.length > 0) {
                    ensuredUsername(username);
                  }
                  else {
                    log.warn('SQL administrator user name cannot be empty');
                    promptUsername();
                  }
                });
              }

              function ensuredUsername(username) {
                options.username = username;
                if (!isUsernameValid(username)) {
                  return callback('Invalid username');
                }

                password ? ensuredPassword(password) : promptPassword();

                function promptPassword() {
                  cli.password('SQL administrator password: ', '*', function (password) {
                    if (isPasswordValid(options.username, password)) {
                      ensuredPassword(password);
                    }
                    else {
                      promptPassword();
                    }
                  });
                }

                function ensuredPassword(password) {
                  options.password = password;
                  if (!isPasswordValid(options.username, password)) {
                    return callback('Invalid password');
                  }

                  mobile.createService(options, callback);
                }
              }
            }
          }

          function isPasswordValid(username, password) {
            // More than eight characters in length
            // Does not contain all or part of the username
            // Contains characters from at least 3 of the categories
            // - A-Z
            // - a-z
            // - 0-9
            // - Non-alphanumeric: !$#%

            var matches = 0;
            [ new RegExp('[A-Z]'), 
              new RegExp('[a-z]'), 
              new RegExp('[0-9]'), 
              new RegExp('[\\~\\`\\!\\@\\#\\$\\%\\^\\&\\*\\(\\)\\_\\-\\+\\=\\{\\[\\}\\]\\|\\\\:\\;\\"\\\'\\<\\,\\>\\.\\?\\/]')
            ].forEach(function (regex) {
              if (password.match(regex))
                matches++;
            });

            if (password.length > 8 && password.indexOf(username) == -1 && matches > 2) {
              return true;
            }
            else {
              log.warn('Password must:');
              log.warn('- be more than 8 characters long,');
              log.warn('- not contain the username,');
              log.warn('- contain characters from at least 3 of the categories:');
              log.warn('  - uppercase letter [A-Z],');
              log.warn('  - lowecase letter [a-z],');
              log.warn('  - digit [0-9],');
              log.warn('  - special character (e.g. !@#$%^&).');
              return false;
            }            
          }

          function isUsernameValid(username) {
            if (username.length > 0) {
              return true;
            }
            else {
              log.warn('User name cannot be empty');
              return false;
            }
          }

        });

  mobile.command('delete [servicename]')
        .usage('[options] [servicename]')
        .description('Delete a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-d, --deleteData', 'delete all data from the database')
        .option('-a, --deleteAll', 'delete all data, SQL database, and SQL server')
        .option('-q, --quiet', 'do not prompt for confirmation')
        .execute(function (servicename, username, password, options, callback) {
          var prompt;
          if (options.deleteAll) {
            prompt = ' with all data, SQL database, and the SQL server';
            options.deleteSqlDb = options.deleteData = true;
          }
          else if (options.deleteSqlDb) {
            prompt = ' with all data and the SQL database, but leave SQL server intact';
            options.deleteData = true;
          }
          else if (options.deleteData) {
            prompt = ' with all data but leave SQL database and SQL server intact';
          }
          else {
            prompt = ' but leave all data, SQL database, and SQL server intact';
          }

          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            mobile.getMobileServiceApplication(options, function (error, result) {
              if (error) {
                return callback(error);
              }

              var resources = {};
              var flat = mobile.getFlatApplicationDescription(result);
              log.silly(JSON.stringify(flat, null, 2));
              flat.Resources.forEach(function (resource) {
                if (!log.format().json) {
                  log.data(resource.TypeView, resource.NameView ? resource.NameView.green : 'N/A'.green);
                }

                resources[resource.Type] = resource;
              });

              options.quiet ? doProceed(true) : 
                cli.confirm('Do you want to delete the mobile service' + prompt + '? (y/n): ', doProceed);

              function doProceed(decision) {
                if (!decision) {
                  log.info('Deletion terminated with no changes made');
                  return callback();
                }

                var plan = [];

                // delete mobile service

                plan.push({
                  progress: 'Deleting mobile service',
                  success: 'Deleted mobile service',
                  failure: 'Failed to delete mobile service',
                  handler: function (callback) {
                    mobile.deleteService(options, callback);
                  }
                });

                // delete SQL server

                if (options.deleteAll) {
                  plan.push({
                    progress: 'Deleting SQL server',
                    success: 'Deleted SQL server',
                    failure: 'Failed to delete SQL server',
                    handler: function (callback) {
                      mobile.deleteSqlServer(options, resources['Microsoft.WindowsAzure.SQLAzure.Server'], callback);
                    }
                  });                  
                }

                // delete application

                plan.push({
                  progress: 'Deleting mobile application',
                  success: 'Deleted mobile application',
                  failure: 'Failed to delete mobile application',
                  handler: function (callback) {
                    mobile.deleteMobileServiceApplication(options, callback);
                  }
                });                  

                // execute plan

                var failures = 0;
                function doStep(stepIndex) {
                  if (stepIndex == plan.length) {
                    return callback(failures > 0 ? 'Not all delete operations completed successfuly.' : null);
                  }

                  var step = plan[stepIndex];
                  var progress = cli.progress(step.progress);
                  try {
                    step.handler(function (error) {
                      progress.end();
                      if (error) {
                        log.error(step.failure);
                        failures++;
                      }
                      else {
                        log.info(step.success);
                      }

                      doStep(stepIndex + 1);
                    });
                  }
                  catch (e) {
                    progress.end();
                    failures++;
                    doStep(stepIndex + 1);
                  }
                }

                doStep(0);
              }              
            });
          }
        });

  var computeModeView2Model = {
    'Free': 'Shared',
    'Reserved': 'Dedicated'
  };

  var computeModeModel2View = {
    'Shared': 'Free',
    'Dedicated': 'Reserved'
  };

  function displayWebspace(webspace) {
    log.data('computeMode', computeModeModel2View[webspace.computeMode].green);
    log.data('numberOfInstances', webspace.numberOfInstances.toString().green);
  }

  mobile.command('list')
        .usage('[options]')
        .description('List your mobile services')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (options, callback) {          
          mobile.listServices(options, function (error, services) {
            if (error) {
              return callback(error);
            }

            if (services && services.length > 0) {
              log.table(services, function (row, s) {
                row.cell('Name', s.name);
                row.cell('State', s.state);
                row.cell('URL', s.applicationUrl);
              });
            } else {
              log.info("No mobile services created yet. You can create new mobile services using the 'azure mobile create' command.");
            }            

            callback();
          });
        });

  mobile.command('show [servicename]')
        .usage('[options] [servicename]')
        .description('Show details for a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            var results = {};
            var resultCount = 0;

            var progress = cli.progress('Getting information');

            function tryFinish() {
              if (++resultCount < 3) {
                return;
              }

              progress.end();

              log.silly('Results:');
              log.silly(JSON.stringify(results, null, 2));

              if (log.format().json) {
                log.json(results);
              }
              else {
                if (results.application) {
                  log.info('Mobile application'.blue)
                  var flat = mobile.getFlatApplicationDescription(results.application);
                  log.silly(JSON.stringify(flat, null, 2));
                  log.data('status', flat.State == 'Healthy' ? 'Healthy'.green : flat.State.red);
                  flat.Resources.forEach(function (resource) {
                    log.data(resource.TypeView + ' name', resource.NameView ? resource.NameView.green : 'N/A'.green);
                    if (resource.Error) {
                      log.data(resource.TypeView + ' status', resource.State.red);
                      log.data(resource.TypeView + ' error', resource.Error.red);
                    }
                    else {
                      log.data(resource.TypeView + ' status', resource.State.green);
                    }
                  });
                }

                if (results.service) {
                  log.info('Mobile service'.blue);
                  ['name', 'state', 'applicationUrl', 'applicationKey', 'masterKey', 'webspace', 'region']
                    .forEach(function (item) {
                      if (results.service[item]) {
                        log.data(item, results.service[item].toString().green);
                      }
                    });

                  if (results.service.tables.length > 0)
                  {
                    var tables = '';
                    results.service.tables.forEach(function (table) { tables += (tables.length > 0 ? ',' : '') + table.name ; });
                    log.data('tables', tables.green);
                  }
                  else {
                    log.info('No tables are created. Use azure mobile table command to create tables.');
                  }          
                }    

                if (results.webspace) {
                  log.info('Scale'.blue);
                  displayWebspace(results.webspace);
                }
              }

              if (!results.service && !results.application) {
                return callback('Cannot obtain informaton about the service ' + options.servicename 
                  + '. Use azure mobile list to check if it exists.');
              }
              else {
                return callback();
              }
            }

            function createCallback(name) {
              return function (error, result) {
                log.silly(name, error);
                if (!error) {
                  results[name] = result;
                }

                if (name === 'service') {
                  if (result && result.webspace) {
                    mobile.getWebspace(options, result.webspace, createCallback('webspace'));
                  }
                  else {
                    resultCount++;
                  }
                }

                tryFinish();
              }
            }

            try {
              mobile.getService(options, createCallback('service'));
              mobile.getMobileServiceApplication(options, createCallback('application'));
            }
            catch (e) {
              progress.end();
              callback(e);
            }
          }
        });

  mobile.command('restart [servicename]')
        .usage('[options] [servicename]')
        .description('Restart a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            mobile.restartService(options, function (error, service) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                log.json({});
              }
              else {
                log.info('Service was restarted.');
              }
              
              callback();
            });
          }
        });

  var mobileKey = mobile.category('key')
        .description('Commands to manage your Azure mobile service keys');

  var keyTypes = ['application', 'master'];
  mobileKey.command('regenerate [servicename] [type]')
        .usage('[options] [servicename] [type]')
        .description('Regenerate the mobile service key')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, type, options, callback) {
          if (type) {
            ensuredType(type);
          }
          else {
            log.help('Choose key type:');
            cli.choose(keyTypes, function (i) { ensuredType(keyTypes[i]); });
          }

          function ensuredType(type) {
            if (type !== 'application' && type !== 'master') {
              return callback(new Error('The key type must be "application" or "master".'))
            }

            options.type = type;
            servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
            function ensuredServiceName(servicename) {
              options.servicename = servicename;
              mobile.regenerateKey(options, function (error, result) {
                if (error) {
                  return callback(error);
                }

                if (log.format().json) {
                  log.json(result);
                }
                else {
                  log.info('New ' + type + ' key is ' + result[type + 'Key']);
                }
                
                callback();
              });
            }
          }
        });

  mobile.command('log [servicename]')
        .usage('[options] [servicename]')
        .description('Get mobile service logs')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-r, --query <query>', 'log query; takes precedence over --type, --continuationToken, and --top')
        .option('-t, --type <type>', 'filter by entry <type>')
        .option('-c, --continuationToken <token>', 'show logs starting from the specified continuation token')
        .option('-p, --top <top>', 'return the first <top> number of remaining rows')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            mobile.getLogs(options, function (error, logs) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                log.json(logs);
              }
              else {
                if (logs && logs.results && logs.results.length > 0) {
                  logs.results.forEach(function (entry) {
                    log.data('', '');                      

                    for (var i in entry) {
                      log.data(i, entry[i]);
                    }
                  });

                  log.data('', '');
                  if (logs.continuationToken) {
                    log.data('Continuation token to receive the next result set:', logs.continuationToken.green);
                  }                      
                }
                else {
                  log.info('There are no matching log entries.')
                }
              }
              
              callback();
            });
          }
        });

  var mobileConfig = mobile.category('config')
        .description('Commands to manage your Azure mobile service configuration');

  mobileConfig.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('Show your mobile service configuration settings')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            // unlike async.parallel, we want all operations to execute regardless if some have errors

            var progress = cli.progress('Getting mobile service configuration');
            var results = {};
            var operationCount = 0;
            function tryFinish() {
              if (++operationCount < 4) {
                return;
              }

              progress.end();

              if (log.format().json) {
                log.json(results);
              }
              else {
                var settings = {};
                [ 'dynamicSchemaEnabled',
                  'microsoftAccountClientSecret',
                  'microsoftAccountClientId',
                  'microsoftAccountPackageSID',
                  'facebookClientId',
                  'facebookClientSecret',
                  'twitterClientId',
                  'twitterClientSecret',
                  'googleClientId',
                  'googleClientSecret',
                  'apns',
                ].forEach(function (name) {
                  settings[name] = 'Unable to obtain the value of this setting';
                });

                if (results.service) {
                  if (typeof results.service.dynamicSchemaEnabled == 'boolean') {
                    settings.dynamicSchemaEnabled = results.service.dynamicSchemaEnabled.toString();  
                  }
                  else {
                    settings.dynamicSchemaEnabled = 'Not configured';
                  }
                }

                if (results.live) {
                  settings.microsoftAccountClientSecret = results.live.clientSecret || 'Not configured';
                  settings.microsoftAccountClientId = results.live.clientID || 'Not configured';
                  settings.microsoftAccountPackageSID = results.live.packageSID || 'Not configured';
                }

                if (results.apns) {
                  settings.apns = results.apns.mode || 'Not configured';
                }

                if (Array.isArray(results.auth)) {
                  ['twitter', 'facebook', 'google'].forEach(function (provider) {
                    settings[provider + 'ClientId'] = 'Not configured';
                    settings[provider + 'ClientSecret'] = 'Not configured';
                  });

                  results.auth.forEach(function (creds) {
                    settings[creds.provider + 'ClientId'] = creds.appId;
                    settings[creds.provider + 'ClientSecret'] = creds.secret;
                  });
                }

                for (var i in settings) {
                  if (settings[i] == 'Not configured') {
                    log.data(i, settings[i].blue);  
                  }
                  else if (settings[i] == 'Unable to obtain the value of this setting') {
                    log.data(i, settings[i].red);  
                  }
                  else {
                    log.data(i, settings[i].green);  
                  }
                }
              }

              callback();
            }

            function createCallback(name) {
              return function (error, result) {
                log.silly(name, error);
                if (!error) {
                  results[name] = result;
                }

                tryFinish();
              }
            }

            try {
              mobile.getServiceSettings(options, createCallback('service'));
              mobile.getLiveSettings(options, createCallback('live'));
              mobile.getAuthSettings(options, createCallback('auth'));
              mobile.getApnsSettings(options, createCallback('apns'));
            }
            catch (e) {
              progress.end();
              callback(e);
            }
          }
        });

  function createSetConfigHandler(coreGetHandler, coreSetHandler, picker1, picker2) {
    return function (options, newValue, callback) {
      coreGetHandler(options, function (error, result) {
        if (error) {
          return callback(error);
        }

        if (picker2) {
          if (Array.isArray(result)) {
            var found;
            for (var i = 0; i < result.length; i++) {
              if (result[i].provider == picker1) {
                result[i][picker2] = newValue;
                found = true;
                break;
              }
            }

            if (!found) {
              var newProvider = { provider: picker1, appId: '', secret: '' };
              newProvider[picker2] = newValue;
              result.push(newProvider);
            }
          }
        }
        else {
          result[picker1] = newValue;
        }

        result = JSON.stringify(result);
        coreSetHandler(options, result, callback);
      });
    }
  }

  var setConfigHandlers = {
    'dynamicSchemaEnabled': createSetConfigHandler(mobile.getServiceSettings, mobile.setServiceSettings, 'dynamicSchemaEnabled'),
    'microsoftAccountClientSecret': createSetConfigHandler(mobile.getLiveSettings, mobile.setLiveSettings, 'clientSecret'),
    'microsoftAccountClientId': createSetConfigHandler(mobile.getLiveSettings, mobile.setLiveSettings, 'clientID'),
    'microsoftAccountPackageSID': createSetConfigHandler(mobile.getLiveSettings, mobile.setLiveSettings, 'packageSID'),
    'facebookClientId': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'facebook', 'appId'),
    'facebookClientSecret': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'facebook', 'secret'),
    'twitterClientId': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'twitter', 'appId'),
    'twitterClientSecret': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'twitter', 'secret'),
    'googleClientId': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'google', 'appId'),
    'googleClientSecret': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'google', 'secret'),
    'apns': parseAndSetApnsSettings
  };

  function parseAndSetApnsSettings(options, value, callback) {
    var match = value.match(/^(dev|prod):((?::{2}|[^:])*):(.+)/);
    if (!match) {
      return callback('The value of the apns setting must be in the format (dev|prod):<password>:<pkcs12CertificateFile>, '
        + 'e.g. dev:abc!123:./mycertificate.pfx. If the password contains : (colon) characters, they must be escaped as :: (double colon).');
    }

    var settings = {
      mode: match[1],
      password: match[2].replace(/::/g, ':')
    };

    if (settings.password.match(/:/)) {
      log.warn('Password was unescaped to ' + settings.password);
    }

    settings.data = fs.readFileSync(match[3], 'base64');

    mobile.setApnsSettings(options, JSON.stringify(settings), callback);
  }

  mobileConfig.command('set <servicename> <key> [value]')
        .usage('[options] <servicename> <key> [value]')
        .description('Set a mobile service configuration setting')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'read the value of the setting from a file')
        .execute(function (servicename, key, value, options, callback) {
          if (!setConfigHandlers[key]) {
            log.info('Supported keys:')
            for (var i in getConfigHandlers) {
              log.info(i.blue);
            }
            return callback('Unsupported key ' + key.red);
          }
          else if (!value && !options.file) {
            return callback('Either value parameter must be provided or --file option specified');
          }
          else {
            if (!value && options.file) {
              value = fs.readFileSync(options.file, 'utf8');
              log.info('Value was read from ' + options.file);
            }

            if (key === 'dynamicSchemaEnabled') {
              if (value === 'true') {
                value = true;
              }
              else if (value === 'false') {
                value = false;
              }
              else {
                return callback('The value must be either true or false');
              }
            }

            options.servicename = servicename;
            setConfigHandlers[key](options, value, callback);
          }
        });

  function createGetConfigHandler(coreHandler, picker1, picker2) {
    return function (options, callback) {
      coreHandler(options, function (error, result) {
        if (error) {
          return callback(error);
        }

        if (picker2) {
          if (Array.isArray(result)) {
            for (var i = 0; i < result.length; i++) {
              if (result[i].provider == picker1) {
                return callback(null, result[i][picker2]);
              }
            }
          }

          callback(null, null);
        }
        else {
          callback(null, result[picker1]);
        }
      });
    }
  }

  var getConfigHandlers = {
    'dynamicSchemaEnabled': createGetConfigHandler(mobile.getServiceSettings, 'dynamicSchemaEnabled'),
    'microsoftAccountClientSecret': createGetConfigHandler(mobile.getLiveSettings, 'clientSecret'),
    'microsoftAccountClientId': createGetConfigHandler(mobile.getLiveSettings, 'clientID'),
    'microsoftAccountPackageSID': createGetConfigHandler(mobile.getLiveSettings, 'packageSID'),
    'facebookClientId': createGetConfigHandler(mobile.getAuthSettings, 'facebook', 'appId'),
    'facebookClientSecret': createGetConfigHandler(mobile.getAuthSettings, 'facebook', 'secret'),
    'twitterClientId': createGetConfigHandler(mobile.getAuthSettings, 'twitter', 'appId'),
    'twitterClientSecret': createGetConfigHandler(mobile.getAuthSettings, 'twitter', 'secret'),
    'googleClientId': createGetConfigHandler(mobile.getAuthSettings, 'google', 'appId'),
    'googleClientSecret': createGetConfigHandler(mobile.getAuthSettings, 'google', 'secret'),
    'apns': createGetConfigHandler(mobile.getApnsSettings, 'mode')
  };

  mobileConfig.command('get <servicename> <key>')
        .usage('[options] <servicename> <key>')
        .description('Get a mobile service configuration setting')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'save the value of the setting to a file')
        .execute(function (servicename, key, options, callback) {
          if (!getConfigHandlers[key]) {
            log.info('Supported keys:')
            for (var i in getConfigHandlers) {
              log.info(i.blue);
            }
            return callback('Unsupported key ' + key.red);
          }
          else {
            options.servicename = servicename;
            getConfigHandlers[key](options, function (error, result) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                var value = {};
                value[key] = result;
                log.json(value);
              }
              else if (result) {
                if (typeof options.file === 'string') {
                  fs.writeFileSync(options.file, result, key == 'apnsCertificate' ? 'base64' : 'utf8');
                  log.info('Written value to ' + options.file);
                }
                else {
                  log.data(key, result.toString().green);
                }
              }
              else {
                log.warn('Setting is not configured'.blue)
              }

              return callback();
            });
          }
        });

  var mobileTable = mobile.category('table')
        .description('Commands to manage your Azure mobile service tables');

  mobileTable.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('List mobile service tables')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            mobile.listTables(options, function (error, tables) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                log.json(tables);
              }
              else if (tables && tables.length > 0) {
                log.table(tables, function (row, s) {
                  row.cell('Name', s.name);
                  row.cell('Indexes', s.metrics.indexCount);
                  row.cell('Rows', s.metrics.recordCount);
                });
              } else {
                log.info('No tables created yet. You can create a mobile service table using azure mobile table create command.');
              }            

              callback();
            });
          }
        });

  mobileTable.command('show [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Show details for a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, tablename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : promptString('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;

              // unlike async.parallel, we want all operations to execute regardless if some have errors

              var progress = cli.progress('Getting table information');
              var results = {};
              var operationCount = 0;
              function tryFinish() {
                if (++operationCount < 4) {
                  return;
                }

                progress.end();

                if (log.format().json) {
                  log.json(results);
                }
                else if (!results.table) {
                  return callback('Table ' + tablename + ' or mobile service ' + servicename + ' does not exist.')
                }
                else {
                  log.info('Table statistics:'.green);
                  log.data('Number of records', results.table.metrics.recordCount.toString().green);
                  log.info('Table operations:'.green);
                  log.table(['insert', 'read', 'update', 'delete'], function (row, s) {
                    row.cell('Operation', s);

                    var script;
                    if (results.scripts) {
                      for (var i = 0; i < results.scripts.length; i++) {
                        if (results.scripts[i].operation === s) {
                          script = results.scripts[i];
                          break;
                        }
                      }

                      row.cell('Script', script ? script.sizeBytes.toString() + ' bytes' : 'Not defined');
                    }
                    else {
                      row.cell('Script', 'N/A');
                    }

                    if (results.permissions) {
                      row.cell('Permissions', results.permissions[s] || 'default');
                    }
                    else {
                      row.cell('Permissions', 'N/A'); 
                    }

                  });

                  if (results.columns) {
                    log.info('Table columns:'.green);
                    log.table(results.columns, function (row, s) {
                      row.cell('Name', s.name);
                      row.cell('Type', s.type);
                      row.cell('Indexed', s.indexed ? 'Yes' : '');
                    });
                  }
                  else {
                    log.error('Unable to obtain table columns')
                  }
                }

                callback();
              }

              function createCallback(name) {
                return function (error, result) {
                  log.silly(name, error);
                  if (!error) {
                    results[name] = result;
                  }

                  tryFinish();
                }
              }

              try {
                mobile.getTable(options, createCallback('table'));
                mobile.getPermissions(options, createCallback('permissions'));
                mobile.getColumns(options, createCallback('columns'));
                mobile.getScripts(options, createCallback('scripts'));
              }
              catch (e) {
                progress.end();
                callback(e);
              }
            }
          }
        });

  var roles = ['user', 'public', 'application', 'admin'];
  var operations = ['insert', 'read', 'update', 'delete'];
  function parsePermissions(permissions) {
    var result = {};
    if (typeof permissions == 'string') {
      permissions.split(',').forEach(function (pair) {
        var match = pair.match(/^([^\=]+)\=(.+)$/);
        if (!match) {
          throw new Error('Syntax error in parsing the permission pair "' + pair + '"');
        }

        if (match[1] !== '*' && !operations.some(function (operation) { return operation === match[1]; })) {
          throw new Error('Unsupported operation name "' + match[1] + '". Operation must be one of *, ' + operations.join(', '));
        }

        if (!roles.some(function (role) { return role === match[2]; })) {
          throw new Error('Unsupported permission value "' + match[2] + '". Permission must be one of ' + roles.join(', '));
        }

        if (match[1] === '*') {
          operations.forEach(function (operation) {
            result[operation] = match[2];
          });
        }
        else {
          result[match[1]] = match[2];
        }
      })
    }

    return result;
  }

  mobileTable.command('create [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Create a new mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-p, --permissions <permissions>', 'comma delimited list of <operation>=<permission> pairs')
        .execute(function (servicename, tablename, options, callback) {
          var settings;
          try {
            settings = parsePermissions(options.permissions);
          }
          catch (e) {
            log.error('Permissions must be specified as a comma delimited list of <operation>=<permission> pairs.');
            log.error('<operation> must be one of ' + operations.join(', '));
            log.error('<permission> must be one of ' + roles.join(', '));
            return callback(e);
          }

          // default table permissions to 'application'
          operations.forEach(function (operation) {
            if (!settings[operation]) {
              settings[operation] = 'application';
            }
          });

          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : promptString('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;
              settings.name = tablename;
              var progress = cli.progress('Creating table');
              try {
                mobile.createTable(options, JSON.stringify(settings), function (error) {
                  progress.end();
                  callback(error);
                });
              }
              catch (e) {
                progress.end();
                throw e;
              }
            }
          };
        });

  mobileTable.command('update [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Update mobile service table properties')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-p, --permissions <permissions>', 'comma delimited list of <operation>=<permission> pairs')
        .option('--deleteColumn <columns>', 'comma separated list of columns to delete')
        .option('-q, --quiet', 'do not prompt for confirmation of column deletion')
        .option('--addIndex <columns>', 'comma separated list of columns to create an index on')
        .option('--deleteIndex <columns>', 'comma separated list of columns to delete an index from')
        .execute(function (servicename, tablename, options, callback) {
          if (!options.deleteIndex && !options.addIndex && !options.permissions && !options.deleteColumn) {
            return callback('No updates specified. Check the list of available updates with --help and specify at least one.');
          }

          try {
            options.permissions = parsePermissions(options.permissions);
          }
          catch (e) {
            log.error('Permissions must be specified as a comma delimited list of <operation>=<permission> pairs.');
            log.error('<operation> must be one of ' + operations.join(', '));
            log.error('<permission> must be one of ' + roles.join(', '));
            return callback(e);
          }

          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : promptString('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;
              if (typeof options.deleteColumn !== 'string' || options.quiet) {
                doProceed(true);
              }
              else {
                cli.confirm('Do you really want to delete the column(s)? (y/n): ', doProceed);
              }

              function doProceed(decision) {
                if (!decision) {
                  log.info('Update terminated with no changes made');
                  callback();
                }
                else {
                  var plan = [];

                  // add permission update to plan

                  if (Object.getOwnPropertyNames(options.permissions).length > 0) {
                    plan.push({
                      progress: 'Updating permissions',
                      success: 'Updated permissions',
                      failure: 'Failed to update permissions',
                      handler: function (callback) {
                        mobile.updatePermissions(options, options.permissions, callback);
                      }
                    });
                  }

                  // add index deletion to plan

                  if (options.deleteIndex) {
                    options.deleteIndex.split(',').forEach(function (column) {
                      plan.push({
                        progress: 'Deleting index from column ' + column,
                        success: 'Deleted index from column ' + column,
                        failure: 'Failed to delete index from column ' + column,
                        handler: function (callback) {
                          mobile.deleteIndex(options, column, callback);
                        }
                      });
                    });
                  }

                  // add index addition to plan

                  if (options.addIndex) {
                    options.addIndex.split(',').forEach(function (column) {
                      plan.push({
                        progress: 'Adding index to column ' + column,
                        success: 'Added index to column ' + column,
                        failure: 'Failed to add index to column ' + column,
                        handler: function (callback) {
                          mobile.createIndex(options, column, callback);
                        }
                      });
                    });
                  }

                  // add column deletion to plan

                  if (options.deleteColumn) {
                    options.deleteColumn.split(',').forEach(function (column) {
                      plan.push({
                        progress: 'Deleting column ' + column,
                        success: 'Deleted column ' + column,
                        failure: 'Failed to delete column ' + column,
                        handler: function (callback) {
                          mobile.deleteColumn(options, column, callback);
                        }
                      });
                    });
                  }

                  // execute plan

                  var failures = 0;
                  function doStep(stepIndex) {
                    if (stepIndex == plan.length) {
                      return callback(failures > 0 ? 'Not all update operations completed successfuly.' : null);
                    }

                    var step = plan[stepIndex];
                    var progress = cli.progress(step.progress);
                    try {
                      step.handler(function (error) {
                        progress.end();
                        if (error) {
                          log.error(step.failure);
                          failures++;
                        }
                        else {
                          log.info(step.success);
                        }

                        doStep(stepIndex + 1);
                      });
                    }
                    catch (e) {
                      progress.end();
                      failures++;
                      doStep(stepIndex + 1);
                    }
                  }

                  doStep(0);
                }
              }
            }
          }
        });

  mobileTable.command('delete [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Delete a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-q, --quiet', 'do not prompt for confirmation')
        .execute(function (servicename, tablename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : promptString('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;
              options.quiet ? doDelete(true) : cli.confirm('Do you really want to delete the table? (y/n): ', doDelete);
              function doDelete(decision) {
                if (decision) {
                  var progress = cli.progress('Deleting table');
                  try {
                    mobile.deleteTable(options, function (error) {
                      progress.end();
                      callback(error);
                    });
                  }
                  catch (e) {
                    progress.end();
                    throw e;
                  }
                }
                else {
                  log.info('Table was not deleted');
                  callback();
                }
              }
            }
          }
        });

  var mobileData = mobile.category('data')
        .description('Commands to manage the data in your mobile service tables');

  mobileData.command('read [servicename] [tablename] [query]')
        .usage('[options] [servicename] [tablename] [query]')
        .description('Query data from a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-k, --skip <top>', 'skip the first <skip> number of rows')
        .option('-t, --top <top>', 'return the first <top> number of remaining rows')
        .option('-l, --list', 'display results in list format')
        .execute(function (servicename, tablename, query, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : promptString('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;
              options.query = query;
              mobile.getData(options, function (error, data) {
                if (error) {
                  return callback(error);
                }

                if (log.format().json) {
                  log.json(data);
                }
                else if (!Array.isArray(data) || data.length == 0) {
                  log.info("No matching records found");
                }
                else if (options.list) {
                  data.forEach(function (record) {
                    log.data('', '');
                    for (var i in record) {
                      log.data(i, record[i] === null ? '<null>'.green : record[i].toString().green);
                    }
                  });
                  log.data('', '');                  
                }
                else {
                  log.table(data, function (row, s) {
                    for (var i in s) {
                      row.cell(i, s[i]);
                    }
                  });
                }

                callback();
              });
            }
          }
        });

  mobileData.command('truncate [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Delete all data from a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-q, --quiet', 'do not prompt for confirmation')
        .execute(function (servicename, tablename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : promptString('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;

              if (options.quiet) {
                mobile.truncateTable(options, JSON.stringify({confirm: true}), afterDelete);
              }
              else {
                mobile.truncateTable(options, JSON.stringify({confirm: false}), confirmDeletion);  
              }

              function confirmDeletion(error, result) {
                if (error) {
                  return callback(error);
                }

                if (result.rowCount === 0) {
                  log.info('There is no data in the table.');
                  return callback();
                }

                log.info('There are ' + result.rowCount + ' data rows in the table.');
                cli.confirm('Do you really want to delete all data from the table? (y/n): ', function (decision) {
                  if (decision) {
                    mobile.truncateTable(options, JSON.stringify({confirm: true}), afterDelete);    
                  }
                  else {
                    log.info('No data was deleted.');
                    callback();
                  }
                });
              }

              function afterDelete(error, result) {
                if (error) {
                  return callback(error);
                }

                if (log.format().json) {
                  log.json(result);
                }
                else {
                  log.info('Deleted ' + result.rowCount + ' rows.');
                }

                callback();
              }
            }
          }
        });

  function displayScheduledJob(row, s) {
    row.cell('Job name', s.name);
    row.cell('Script name', 'scheduler/' + s.name);
    row.cell('Status', s.status);
    row.cell('Interval', s.intervalUnit ? (s.intervalPeriod + ' [' + s.intervalUnit + ']') : 'on demand');
    row.cell('Last run', s.lastRun || 'N/A');
    row.cell('Next run', s.nextRun || 'N/A');
  } 

  var mobileScript = mobile.category('script')
        .description('Commands to manage your Azure mobile service scripts');

  mobileScript.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('List mobile service scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            // unlike async.parallel, we want all operations to execute regardless if some have errors

            var progress = cli.progress('Getting script information');
            var results = {};
            var operationCount = 0;
            function tryFinish() {
              if (++operationCount < 3) {
                return;
              }

              progress.end();

              if (log.format().json) {
                log.json(results);
              }
              else {
                if (!results.table) {
                  log.error('Unable to get table scripts');
                }
                else if (!Array.isArray(results.table) || results.table.length == 0) {
                  log.info('There are no table scripts. Create scripts using azure mobile script upload command.');
                }
                else {
                  log.info('Table scripts'.green);
                  log.table(results.table, function (row, s) {
                    row.cell('Name', 'table/' + s.table + '.' + s.operation);
                    row.cell('Size', s.sizeBytes);
                  });
                }

                if (!results.shared) {
                  log.error('Unable to get shared scripts');
                }
                else if (!Array.isArray(results.shared) || results.shared.length == 0) {
                  log.info('There are no shared scripts. Create scripts using azure mobile script upload command.');
                }
                else {
                  log.info('Shared scripts'.green);
                  log.table(results.shared, function (row, s) {
                    row.cell('Name', 'shared/' + s.name);
                    row.cell('Size', s.sizeBytes);
                  }); 
                }

                if (!results.scheduler) {
                  log.error('Unable to get scheduled job scripts');
                }
                else if (!Array.isArray(results.scheduler) || results.scheduler.length == 0) {
                  log.info('There are no scheduled job scripts. Create scheduled jobs using the \'azure mobile job\' command.');
                }
                else {
                  log.info('Scheduled job scripts'.green);
                  log.table(results.scheduler, displayScheduledJob);
                }
              }

              callback();
            }

            function createCallback(name) {
              return function (error, result) {
                log.silly(name, error);
                if (!error) {
                  results[name] = result;
                }

                tryFinish();
              }
            }

            try {
              mobile.getAllTableScripts(options, createCallback('table'));
              mobile.getSharedScripts(options, createCallback('shared'));
              mobile.getSchedulerScripts(options, createCallback('scheduler'));
            }
            catch (e) {
              progress.end();
              callback(e);
            }
          }
        });

  function parseScriptName(scriptname) {
    var result;

    var match = scriptname.match(/^table\/([^\.]+)\.(insert|read|update|delete)(?:$|\.js$)/);
    if (match) {
      result = { type: 'table', table: { name: match[1], operation: match[2] } };
    }
    else {
      match = scriptname.match(/^scheduler\/([^\.]+)(?:$|\.js$)/);
      if (match) {
        result = { type: 'scheduler', scheduler: { name: match[1] } };
      }
      else {
        match = scriptname.match(/^shared\/apnsFeedback(?:$|\.js$)/);
        if (match) {
          result = { type: 'shared', shared: { name: 'apnsFeedback' } };
        }
      }
    }

    return result;
  }

  function saveScriptFile(scriptSpec, script, output, force) {
    var file;
    var dir;

    if (output) {
      file = output;
    }
    else {
      dir = './' + scriptSpec.type;
      file = dir + '/';
      if (scriptSpec.type == 'table') {
        file += scriptSpec.table.name + '.' + scriptSpec.table.operation + '.js';
      }
      else {
        file += scriptSpec[scriptSpec.type].name + '.js';
      }
    }

    if (utils.pathExistsSync(file) && !force) {
      return 'File ' + file + ' already exists. Use --override to override.';
    }
    else {
      try {
        if (!output) {
          if (!utils.pathExistsSync(dir)) {
            fs.mkdirSync(dir);
          }
        }

        fs.writeFileSync(file, script, 'utf8');
        log.info('Saved script to ' + file);
      }
      catch (e) {
        return 'Unable to save file ' + file;
      }
    }    

    return null;
  }

  var getScriptHandlers = {
    table: mobile.getTableScript,
    scheduler: mobile.getSchedulerScript,
    shared: mobile.getSharedScript
  };

  mobileScript.command('download [servicename] [scriptname]')
        .usage('[options] [servicename] [scriptname]')
        .description('Downloads mobile service script')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'file to save the script to')
        .option('-o, --override', 'override existing files')
        .option('-c, --console', 'write the script to the console instead of a file')
        .execute(function (servicename, scriptname, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            scriptname ? ensuredScriptName(scriptname) : promptString('Script name: ', ensuredScriptName);
            function ensuredScriptName(scriptname) {
              options.scriptname = scriptname;
              options.script = parseScriptName(options.scriptname);
              if (!options.script) {
                log.info('For table script, specify table/<tableName>.{insert|read|update|delete}');
                log.info('For APNS script, specify shared/apnsFeedback');
                log.info('For scheduler script, specify scheduler/<scriptName>');
                return callback('Invalid script name ' + options.scriptname);
              }

              getScriptHandlers[options.script.type](options, function (error, script) {
                if (error) {
                  return callback(error);
                }

                if (options.console) {
                  console.log(script);
                }
                else {
                  callback(saveScriptFile(options.script, script, options.file, options.override));
                }
              });
            }
          }
        });

  var setScriptHandlers = {
    table: mobile.setTableScript,
    scheduler: mobile.setSchedulerScript,
    shared: mobile.setSharedScript
  };

  mobileScript.command('upload [servicename] [scriptname]')
        .usage('[options] [servicename] [scriptname]')
        .description('Uploads mobile service script')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'file to read the script from')
        .execute(function (servicename, scriptname, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            scriptname ? ensuredScriptName(scriptname) : promptString('Script name: ', ensuredScriptName);
            function ensuredScriptName(scriptname) {
              options.scriptname = scriptname;
              options.script = parseScriptName(options.scriptname);
              if (!options.script) {
                log.info('For table script, specify table/<tableName>.{insert|read|update|delete}');
                log.info('For APNS script, specify shared/apnsFeedback');
                log.info('For scheduler script, specify scheduler/<scriptName>');
                return callback('Invalid script name ' + options.scriptname);
              }

              if (!options.file) {
                options.file = './' + options.script.type + '/';
                if (options.script.table) {
                  options.file += options.script.table.name + '.' + options.script.table.operation + '.js';
                }
                else {
                  options.file += options.script[options.script.type].name + '.js';
                }
              }

              var script;
              try {
                script = fs.readFileSync(options.file, 'utf8');
              }
              catch (e) {
                return callback('Unable to read script from file ' + options.file);
              }

              setScriptHandlers[options.script.type](options, script, callback);
            }
          }
        });

  var deleteScriptHandlers = {
    table: mobile.deleteTableScript,
    scheduler: mobile.deleteSchedulerScript,
    shared: mobile.deleteSharedScript
  };

  mobileScript.command('delete [servicename] [scriptname]')
        .usage('[options] [servicename] [scriptname]')
        .description('Deletes mobile service script or scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, scriptname, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            scriptname ? ensuredScriptName(scriptname) : promptString('Script name: ', ensuredScriptName);
            function ensuredScriptName(scriptname) {
              options.scriptname = scriptname;
              options.script = parseScriptName(options.scriptname);
              if (!options.script) {
                log.info('For table script, specify tables/<tableName>.{insert|read|update|delete}');
                log.info('For APNS script, specify shared/apnsFeedback');
                log.info('For scheduler script, specify scheduler/<scriptName>');
                return callback('Invalid script name ' + options.scriptname);
              }

              deleteScriptHandlers[options.script.type](options, callback);
            }
          }
        });

  var mobileScale = mobile.category('scale')
        .description('Commands to scale your Azure mobile service');

  mobileScale.command('show [servicename]')
        .usage('[options] [servicename]')
        .description('Show the scalability settings of a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            mobile.getService(options, function (error, service) {
              if (error) {
                return callback(error);
              }

              if (typeof service.webspace !== 'string') {
                return callback('Unable to determine the webspace of the mobile service ' + options.servicename);
              }

              mobile.getWebspace(options, service.webspace, function (error, webspace) {
                if (error) {
                  return callback(error);
                }

                if (log.format().json) {
                  log.json(webspace);
                }
                else {
                  log.data('webspace', webspace.name.green);
                  displayWebspace(webspace);
                }

                callback();
              });
            });
          }
        });


  mobileScale.command('change [servicename]')
        .usage('[options] [servicename]')
        .description('Change the scalability settings of a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-c, --computeMode <mode>', 'choose Free or Reserved compute mode')
        .option('-i, --numberOfInstances <count>', 'number of instances in Reserved mode')
        .execute(function (servicename, options, callback) {
          if (!options.computeMode && !options.numberOfInstances) {
            return callback('Specify at least one option. Type --help for more information.');
          }

          if (options.computeMode) {
            options.computeMode = computeModeView2Model[options.computeMode];
          }

          if (options.computeMode !== undefined && options.computeMode !== 'Dedicated' && options.computeMode !== 'Shared') {
            return callback('Allowed values of compute mode are Free or Reserved.')
          }

          if (options.numberOfInstances !== undefined && isNaN(options.numberOfInstances)) {
            return callback('Number of instances must be a positive integer.');
          }

          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            var progress = cli.progress('Rescaling the mobile service');
            mobile.getService(options, function (error, service) {
              if (error) {
                progress.end();
                return callback(error);
              }

              if (typeof service.webspace !== 'string') {
                progress.end();
                return callback('Unable to determine the webspace of the mobile service ' + options.servicename);
              }

              mobile.getWebspace(options, service.webspace, function (error, webspace) {
                if (error) {
                  progress.end();
                  return callback(error);
                }

                if (options.computeMode !== 'Dedicated' && options.numberOfInstances > 1 && webspace.computeMode === 'Shared') {
                  progress.end();
                  return callback('Cannot set number of instances to ' + options.numberOfInstances +
                    ' because the mobile service is in Free mode. Change the compute mode to Reserved to enable increasing the number ' +
                    'of instances to more than 1.');
                }

                if ((options.computeMode === undefined || options.computeMode === webspace.computeMode) &&
                    (options.numberOfInstances === undefined || options.numberOfInstances == webspace.numberOfInstances)) {
                  // nothing to change
                  progress.end();
                  log.info('Current scale settings of the mobile service already match the requested settings. No changes are made.')
                  return callback();
                }

                var newWebspace = {
                  computeMode: options.computeMode || webspace.computeMode,
                  numberOfInstances: options.numberOfInstances || webspace.numberOfInstances
                };

                if (newWebspace.computeMode === 'Dedicated') {
                  newWebspace.workerSize = webspace.workerSize;
                }

                mobile.setWebspace(options, service.webspace, JSON.stringify(newWebspace), function (error) {
                  progress.end();
                  callback(error);
                });
              });
            });
          }
        });

  var mobileJob = mobile.category('job')
        .description('Commands to manage your Azure mobile service scheduled jobs');

  mobileJob.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('List mobile service scheduled jobs')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            mobile.getSchedulerScripts(options, function (error, results) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                log.json(results);
              }
              else {
                if (!Array.isArray(results) || results.length == 0) {
                  log.info('There are no scheduled jobs. Create scheduled jobs using the \'azure mobile job create\' command.');
                }
                else {
                  log.info('Scheduled jobs'.green);
                  log.table(results, displayScheduledJob);
                  log.info('You can manipulate scheduled job scripts using the \'azure mobile script\' command.'.green);
                }
              }

              callback();
            });
        }
      });

  var intervalUnits = ['second', 'minute', 'hour', 'day', 'month', 'year', 'none'];

  mobileJob.command('create [servicename] [jobname]')
        .usage('[options] [servicename] [jobname]')
        .description('Create a mobile service scheduled job')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-i, --interval <number>', 'job interval as an integer; defaults to 15')
        .option('-u, --intervalUnit <unit>', 'specify one of: minute, hour, day, month or none for on-demand jobs; defaults to minute')
        .option('-t, --startTime <time>', 'time of the first run of the script in ISO format; defaults to now')
        .execute(function (servicename, jobname, options, callback) {
          options.interval = typeof options.interval === 'undefined' ? 15 : +options.interval;
          options.intervalUnit = options.intervalUnit || 'minute';

          if (isNaN(options.interval) || options.interval < 0) {
            return callback('The --interval must be a positive integer');
          }

          if (!intervalUnits.some(function (unit) { return unit === options.intervalUnit; })) {
            return callback('The --intervalUnit must be one of ' + intervalUnits.join(', '));
          }

          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            jobname ? ensuredJobName(jobname) : promptString('Scheduled job name: ', ensuredJobName);
            function ensuredJobName(jobname) {
              options.jobname = jobname;

              var job = {
                name: options.jobname
              }

              if (options.intervalUnit !== 'none') {
                job.intervalUnit = options.intervalUnit;
                job.intervalPeriod = options.interval;
                job.startTime = options.startTime || new Date().toISOString();
              }

              mobile.createJob(options, JSON.stringify(job), function (error) {
                if (error) {
                  return callback(error);
                }

                log.info('Job was created in disabled state. You can enable the job using the \'azure mobile job update\' command.'.green);
                log.info('You can manipulate the scheduled job script using the \'azure mobile script\' command.'.green);
                callback();
              });
            }
          }
        });

  mobileJob.command('update [servicename] [jobname]')
        .usage('[options] [servicename] [jobname]')
        .description('Update a mobile service scheduled job')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-i, --interval <number>', 'job interval as an integer')
        .option('-u, --intervalUnit <unit>', 'specify one of: minute, hour, day, month or none for on-demand jobs')
        .option('-t, --startTime <time>', 'time of the first run of the script in ISO format')
        .option('-a, --status <status>', 'enabled or disabled')
        .execute(function (servicename, jobname, options, callback) {
          if (typeof options.interval !== 'undefined' && isNaN(options.interval) || options.interval < 0) {
            return callback('The --interval must be a positive integer');
          }

          if (typeof options.intervalUnits !== 'undefined' && !intervalUnits.some(function (unit) { return unit === options.intervalUnit; })) {
            return callback('The --intervalUnit must be one of ' + intervalUnits.join(', '));
          }

          if (options.status !== 'undefined' && options.status !== 'enabled' && options.status !== 'disabled') {
            return callback('The --status must be either enabled or disabled.');
          }

          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            jobname ? ensuredJobName(jobname) : promptString('Scheduled job name: ', ensuredJobName);
            function ensuredJobName(jobname) {
              options.jobname = jobname;

              mobile.getJob(options, function (error, job) {
                if (error) {
                  return callback(error);
                }

                var newJob = {
                  intervalPeriod: +options.interval || job.intervalPeriod,
                  intervalUnit: options.intervalUnit || job.intervalUnit,
                  startTime: options.startTime || job.startTime,
                  status: options.status || job.status
                };

                var changed = false;
                for (var i in newJob) {
                  if (newJob[i] != job[i]) {
                    changed = true;
                    break;
                  }
                }

                if (changed) {
                  mobile.setJob(options, JSON.stringify(newJob), callback);
                }
                else {
                  log.info('The scheduled job settings already match the requested settings. No changes made.');
                  callback();
                }
              });
            }
          }
        });

  mobileJob.command('delete [servicename] [jobname]')
        .usage('[options] [servicename] [jobname]')
        .description('Delete a mobile service scheduled job')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, jobname, options, callback) {
          servicename ? ensuredServiceName(servicename) : promptString('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            jobname ? ensuredJobName(jobname) : promptString('Scheduled job name: ', ensuredJobName);
            function ensuredJobName(jobname) {
              options.jobname = jobname;
              mobile.deleteSchedulerScript(options, callback);
            }
          }
        });

};
