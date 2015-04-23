var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

function VMHardwareProfile(cli, params) {
    this.cli = cli;
    this.params = params;
}

__.extend(VMHardwareProfile.prototype, {
  generateHardwareProfile: function() {
    var hardwareProfile = this._parseHardwareProfileParams(this.params);
    return {
      profile: hardwareProfile
    };
  },

  _parseHardwareProfileParams: function(params) {
    var requestProfile = {
      virtualMachineSize: null
    };

    if (utils.stringIsNullOrEmpty(params.vmSize)) {
      requestProfile.virtualMachineSize = 'Standard_A1';
    } else {
      requestProfile.virtualMachineSize = params.vmSize;
    }

    this.cli.output.info(util.format($('Using the VM Size "%s"'), requestProfile.virtualMachineSize));
    return requestProfile;
  }
});

module.exports = VMHardwareProfile;