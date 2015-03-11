var __ = require('underscore');

var NetworkNic = require('./networkNic');

function VMNetworkProfile(cli, resourceGroupName, params, serviceClients) {
  this.cli = cli;
  this.resourceGroupName = resourceGroupName;
  this.params = params;
  this.clients = serviceClients;
}

__.extend(VMNetworkProfile.prototype, {
  generateNetworkProfile: function(_) {
    var networkNic = new NetworkNic(this.cli, this.clients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var nicInfo = networkNic.createNICIfRequired(_);

    return {
      profile: {
        networkInterfaces: [{ referenceUri: nicInfo.profile.id }]
      },
      nicInfo: nicInfo
    };
  }
});

module.exports = VMNetworkProfile;