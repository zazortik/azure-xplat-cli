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

'use strict';

var __ = require('underscore');
var uuid = require('node-uuid');
var utils = require('../../../../util/utils');
var $ = utils.getLocaleString;

//
// General implementation helpers for deployment operations.
//

function ApiAppDeployer(options) {
  __.extend(this, options);

  this.apiappClient = utils.createApiAppManagementClient(options.subscription);
  this.resourceClient = utils.createResourceClient(options.subscription);
}

__.extend(ApiAppDeployer.prototype, {

  doDeployment: function doDeployment(_) {
    var self = this;
    self.withProgress($('Getting package metadata'),
      function (log, _) {
        self.getMetadata(_);
      }, _);

    self.gatherParameters(_);

    var deployment = self.withProgress($('Creating deployment'),
      function (log, _) {
        self.getDeploymentTemplate(_);
        return self.createDeployment(_);
      }, _);
    return deployment.deployment;
  },

  getMetadata: function(_) {
    if (this.package) {
      this.packageMetadata = this.apiappClient.templates.getMetadata({
        microserviceId: this.package.fullName,
        resourceGroup: this.resourceGroup
      }, _);

      // If parameters come back as required with empty string as
      // default value, treat it as not having a default value at all.
      // This is consistent with portal validation behavior.
      var parameters = this.packageMetadata.metadata.parameters || [];
      this.packageMetadata.metadata.parameters = parameters.map(function (p) {
        if (p.constraints && p.constraints.required && p.defaultValue === '') {
          p = __.omit(p, 'defaultValue');
        }
        return p;
      });
    }
  },

  getDeploymentTemplate: function (_) {
    var request = this.getGenerateDeploymentTemplateRequest(_);
    this.deploymentTemplate = this.apiappClient.templates.generate(this.resourceGroup, request, _);
  },

  gatherParameters: function (_) {
    if (this.packageMetadata) {
      var parameterData = this.packageMetadata.metadata.parameters;
      var apiNameParam = {
        name: '$apiAppName',
        displayName: 'ApiApp Name',
        defaultValue: this.package.id,
        extraValidator: validateApiAppName
      };

      var parameterKey = this.package.id;
      var values = {};
      var valueProvider = this.valueProvider;
      values[parameterKey] = { '$apiAppName': valueProvider(apiNameParam, _) };

      this.parameterValues = parameterData.reduce_(_, function (_, acc, p) {
        acc[parameterKey][p.name] = valueProvider(p, _);
        return acc;
      }, values);
    }
  },

  getGenerateDeploymentTemplateRequest: function (_) {
    return {
      location: this.location,
      gateway: this.gatewayFragment,
      hostingPlan: this.hostingPlanFragment(),
      packages: this.createPackageFragment(_)
    };
  },

  // Helper functions to generate various pieces of the payload
  // to generate the deployment template.
  gatewayFragment: function() {
    return {
      resourceType: 'Microsoft.AppService/gateways'
      // TODO: Add support for nuget installs, specific versions
    };
  },

  hostingPlanFragment: function() {
    return {
      resourceType: 'Microsoft.Web/serverfarms',
      isNewHostingPlan: false,
      // Hosting plan name is the last segment of the id
      hostingPlanName: this.hostingPlanId.split('/').pop()
    };
  },

  createPackageFragment: function(_) {
    if (this.package) {
      // TODO: Handle dependencies when building this up?
      var fragment = {
        resourceType: 'Microsoft.Web/apiapps',
        id: this.package.id,
        version: this.package.version,
      };

      this.getMetadata(_);
      // TODO: This is WRONG!
      fragment.settings = this.parameterValues;
      return [fragment];
    } else {
      // No package, just the gateway
      return [];
    }
  },

  createDeploymentParameters: function () {
    return {
      properties: {
        template: this.deploymentTemplate,
        parameters: __.chain(this.parameterValues || {}).pairs().map(function (pair) { return [pair[0], { value: pair[1] }]; }).object().value(),
        mode: 'Incremental'
      }
    };
  },

  createDeployment: function(_) {
    return this.resourceClient.deployments.createOrUpdate(this.resourceGroup,
      // Important to call through exports here so tests can mock out this logic
      exports.createDeploymentName(),
      this.createDeploymentParameters(),
      _);
  }
});

function validateApiAppName(value) {
  if(value.length < 8 || value.length > 50) {
    return 'Name must be between 8 and 50 characters long.';
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9.]*$/.test(value)) {
    return 'Name contains invalid characters.';
  }
}

function createDeploymentName() {
  return 'AppServiceDeployment_' + uuid();
}

__.extend(exports, {
  ApiAppDeployer: ApiAppDeployer,
  validateApiAppName: validateApiAppName,
  createDeploymentName: createDeploymentName
});
