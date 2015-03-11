var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

function AvailabilitySet(cli, computeManagementClient, resourceGroupName, params) {
    this.cli = cli;
    this.computeManagementClient = computeManagementClient;
    this.resourceGroupName = resourceGroupName;
    this.params = params;
}

__.extend(AvailabilitySet.prototype, {
    _parseAvailSetCreateParams: function (params) {
      if (!utils.hasAllParams([params.availsetName, params.location])) {
        throw new Error($('To create new availability set the parameters availsetName and location are required'));
      }

      var createRequestProfile = {
        availabilitySet: {
          name: params.availsetName,
          location: params.location
        }
      };

      return createRequestProfile;
    },

    createAvailSetIfRequired: function(_) {
      if (utils.stringIsNullOrEmpty(this.params.availsetName)) {
        throw new Error($('The parameters availsetName is required'));
      }

      if (utils.stringIsNullOrEmpty(this.params.location)) {
        throw new Error($('The parameter location is required'));
      }

      var availsetInfo = {
        availsetName: this.params.availsetName,
        createdNew: false,
        createRequestProfile: {},
        profile: {}
      };

      var availSet = this._getAvailSet(this.resourceGroupName, this.params.availsetName, _);
      if (availSet) {
        if (!utils.ignoreCaseAndSpaceEquals(availSet.availabilitySet.location, this.params.location)) {
          throw new Error(util.format($('An Availability set with name "%s" already exists in another region "%s"'), this.params.availsetName, availSet.availabilitySet.location));
        }

        this.cli.output.info(util.format($('Found an Availability set "%s"'), this.params.availsetName));
        var connectedVMRefs = availSet.availabilitySet.properties.virtualMachinesReferences;
        if (connectedVMRefs instanceof Array) {
          var expectedVMId = '/resourceGroups/' + this.resourceGroupName + '/providers/Microsoft.Compute/virtualMachines/' + this.params.vmName;
          for (var i = 0 ; i < connectedVMRefs.length; i++) {
            if (utils.stringEndsWith(connectedVMRefs[i].referenceUri, expectedVMId, true)) {
              throw new Error(util.format($('A VM with name "%s" (reference "%s") is already in the availability set "%s"'), this.params.vmName, connectedVMRefs[i].referenceUri, this.params.availsetName));
            }
          }
        }

        availsetInfo.profile = availSet.availabilitySet;
        return availsetInfo;
      }

      this.cli.output.info(util.format($('Availability set with given name not found "%s", creating a new one'), this.params.availsetName));
      availsetInfo.createRequestProfile = this._createNewAvailSet(this.resourceGroupName, this.params, _);
      availsetInfo.createdNew = true;
      availSet = this._getAvailSet(this.resourceGroupName, this.params.availsetName, _);
      availsetInfo.profile = availSet.availabilitySet;
      return availsetInfo;
    },

    _getAvailSet: function (resourceGroupName, availsetName, _) {
      var progress = this.cli.interaction.progress(util.format($('Looking up the availability set "%s"'), availsetName));
      try {
        var availSet = this.computeManagementClient.availabilitySets.get(resourceGroupName, availsetName, _);
        return availSet;
      } catch (e) {
        if (e.code === 'ResourceNotFound') {
          return null;
        }
        throw e;
      } finally {
        progress.end();
      }
    },

    _createNewAvailSet: function (resourceGroupName, params, _) {
      var createRequestProfile = this._parseAvailSetCreateParams(params);
      var progress = this.cli.interaction.progress(util.format($('Creating availability set "%s"'), params.availsetName));
      try {
        this.computeManagementClient.availabilitySets.createOrUpdate(resourceGroupName, createRequestProfile,  _);
        return createRequestProfile;
      } finally {
        progress.end();
      }
    },

    hasAnyAvailSetParameters: function(params) {
      var allAvailSetParams = [ params.availsetName ];
      return utils.hasAnyParams(allAvailSetParams);
    }
});

module.exports = AvailabilitySet;