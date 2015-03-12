var __ = require('underscore');

var AvailabilitySet = require('./availabilitySet');

function VMAvailabilitySetProfile(cli, resourceGroupName, params, serviceClients) {
    this.cli = cli;
    this.resourceGroupName = resourceGroupName;
    this.params = params;
    this.clients = serviceClients;
}

__.extend(VMAvailabilitySetProfile.prototype, {
    generateAvailabilitySetProfile: function(_) {
      var availabilitySet = new AvailabilitySet(this.cli, this.clients.computeManagementClient, this.resourceGroupName, this.params);
      if (!availabilitySet.hasAnyAvailSetParameters(this.params)) {
        return {
          profile: null,
          availSetInfo: null
        };
      }

      var availSetInfo = availabilitySet.createAvailSetIfRequired(_);
      return {
        profile: {
          referenceUri: availSetInfo.profile.id
        },
        availSetInfo: availSetInfo
      };
    }
});

module.exports = VMAvailabilitySetProfile;