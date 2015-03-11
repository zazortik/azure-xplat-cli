var __ = require('underscore');

var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

function VMOSProfile(cli, params) {
  this.cli = cli;
  this.params = params;
}

__.extend(VMOSProfile.prototype, {
  generateOSProfile: function() {
    var osProfile = this._parseOSProfileParams(this.params);
    return {
      profile: osProfile
    };
  },

  _parseOSProfileParams: function(params) {
    var requestProfile = {
      computerName: null,
      adminUsername: null,
      adminPassword: null
    };

    if (utils.stringIsNullOrEmpty(params.computerName)) {
      if(utils.stringIsNullOrEmpty(params.vmName)) {
        throw new Error($('Either computerName or vmName is required to prepare OS profile'));
      }

      requestProfile.computerName = params.vmName;
    } else {
      requestProfile.computerName = params.computerName;
    }

    if (utils.stringIsNullOrEmpty(params.osType)) {
      throw new Error($('The parameters osType is required'));
    }

    var osType = utils.verifyParamExistsInCollection(['Windows', 'Linux'], this.params.osDiskType, 'osType');

    if (utils.stringIsNullOrEmpty(params.adminUsername)) {
      throw new Error($('The parameters adminUsername is required'));
    }

    if( (osType === 'Windows') && utils.ignoreCaseEquals(params.adminUsername, 'administrator')) {
      throw new Error($('The value administrator for parameter adminUsername is not allowed'));
    }
    requestProfile.adminUsername = params.adminUsername;

    if (utils.stringIsNullOrEmpty(params.adminPassword)) {
      throw new Error($('The parameters adminPassword is required'));
    }

    var passwordRegEx = new RegExp(/^.*(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\*!@#$%^&+=]).*$/);
    if (!params.adminPassword.match(passwordRegEx)) {
      throw new Error($('Parameter adminPassword must be at least 8 character in length, it must contain a lower case, an upper case, a number and a special character such as !@#$%^&+='));
    }
    requestProfile.adminPassword = params.adminPassword;

    if (osType === 'Windows') {
      requestProfile.windowsConfiguration = {
        provisionVMAgent: true
      };
    }
    /*else {
      TODO: Request for updated Spec and see any linuxConfiguration like ASM
    }*/

    return requestProfile;
  }
});

module.exports = VMOSProfile;