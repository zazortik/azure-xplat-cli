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

var _ = require('underscore');
var async = require('async');

var utils = require('../../util/utils');
var $ = utils.getLocaleString;

function VMClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;

  this.serviceManagementService = this.createServiceManagementService();
}

_.extend(VMClient.prototype, {
  getDeployments: function(options, callback) {
    var self = this;
    var deployments = [];

    var progress = self.cli.interaction.progress($('Getting virtual machines'));

    var getDeploymentSlot = function(hostedServices) {
      async.each(hostedServices, function (hostedService, cb) {
        utils.doServiceManagementOperation(self.serviceManagementService, 'getDeploymentBySlot', hostedService.ServiceName, 'Production', function(error, response) {
          if (error) {
            if (error.code === 'ResourceNotFound') {
              return cb(null);
            } else {
              return cb(error);
            }
          }

          var deployment = { svc: hostedService.ServiceName, deploy: response.body };

          if (hostedService && hostedService.HostedServiceProperties) {
            deployment.Location = hostedService.HostedServiceProperties.Location;
            deployment.AffinityGroup = hostedService.HostedServiceProperties.AffinityGroup;
          }

          deployments.push(deployment);

          cb(null);
        });
      }, function (err) {
        progress.end();

        callback(err, deployments);
      });
    };

    // get deployment by slot. Checks which slots to query.
    options.dnsPrefix = options.dnsPrefix || utils.getDnsPrefix(options.dnsName, true);
    if (options.dnsPrefix) {
      getDeploymentSlot([ { ServiceName: options.dnsPrefix } ]);
    } else {
      utils.doServiceManagementOperation(self.serviceManagementService, 'listHostedServices', function(error, response) {
        if (error) { return callback(error); }

        return getDeploymentSlot(response.body);
      });
    }
  },

  createServiceManagementService: function() {
    return utils.createServiceManagementService(this.cli.category('account').getCurrentSubscription(this.subscription), this.cli.output);
  }
});

module.exports = VMClient;