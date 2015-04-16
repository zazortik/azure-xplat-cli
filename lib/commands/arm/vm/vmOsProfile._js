var __ = require('underscore');
var fs = require('fs');
var util = require('util');

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
      adminPassword: null,
      customData: null
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

    var osType = utils.verifyParamExistsInCollection(['Windows', 'Linux'], this.params.osType, 'osType');
    if( (osType === 'Windows')) {
      requestProfile.windowsConfiguration = this._parseWindowsConfiguration(params);
    } else {
      requestProfile.linuxConfiguration = this._parseLinuxConfiguration(params);
    }

    requestProfile.adminUsername = params.adminUsername;
    requestProfile.adminPassword = params.adminPassword;

    if (!utils.stringIsNullOrEmpty(params.customData)) {
      requestProfile.customData = this._loadCustomData(params.customData);
    }

    return requestProfile;
  },

  _parseWindowsConfiguration: function (params) {
    var windowsConfiguration = {
      provisionVMAgent: true
    };

    if (utils.stringIsNullOrEmpty(params.adminUsername)) {
      throw new Error($('The parameters adminUsername is required'));
    }

    if (utils.ignoreCaseEquals(params.adminUsername, 'administrator')) {
      throw new Error($('The value administrator for parameter adminUsername is not allowed'));
    }

    this._ensurePasswordComplexity(params.adminPassword);
    if (params.sshPublickeyPemFile) {
      this.cli.output.warn($('The parameter sshPublickeyPemFile will be ignored when operating system type is Windows'));
    }

    return windowsConfiguration;
  },

  _parseLinuxConfiguration: function (params) {
    var linuxConfiguration = {
      disablePasswordAuthentication: false,
      ssh: null
    };

    if (utils.stringIsNullOrEmpty(params.adminUsername)) {
      throw new Error($('The parameters adminUsername is required'));
    }

    if (params.adminPassword) {
      this._ensurePasswordComplexity(params.adminPassword);
    } else {
      linuxConfiguration.disablePasswordAuthentication = true;
    }

    if (params.sshPublickeyPemFile) {
      linuxConfiguration.sshConfiguration = {
        publicKeys: []
      };

      var publicKeyResult = this._parseSSHPublicKeyPemFile(params);
      var publicKey = {
        path: '/home/' + params.adminUsername + '/.ssh/authorized_keys',
        keyData: publicKeyResult.sshPublickeyPemDataBase64
      };

      linuxConfiguration.sshConfiguration.publicKeys.push(publicKey);
    } else {
      if (linuxConfiguration.disablePasswordAuthentication) {
        throw new Error($('You need to enable one of the following SSH login support for Linux VM: \n [1] Password only (adminPassword) \n [2] Public key only (sshPublickeyPemFile)  \n [3] Both password and public key'));
      }
    }

    return linuxConfiguration;
  },

  _ensurePasswordComplexity: function (password) {
    if (utils.stringIsNullOrEmpty(password)) {
      throw new Error($('The parameters adminPassword is required'));
    }

    var passwordRegEx = new RegExp(/^.*(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\*!@#$%^&+=]).*$/);
    if (!password.match(passwordRegEx)) {
      throw new Error($('Parameter adminPassword must be at least 8 character in length, it must contain a lower case, an upper case, a number and a special character such as !@#$%^&+='));
    }
  },

  _parseSSHPublicKeyPemFile: function (params) {
    this.cli.output.info(util.format($('Verifying the public key SSH file: %s'), params.sshPublickeyPemFile));
    var sshPublickeyPemData = fs.readFileSync(params.sshPublickeyPemFile);
    var sshPublickeyPemDataStr = sshPublickeyPemData.toString();
    if (!utils.isPemCert(sshPublickeyPemDataStr)) {
      throw new Error($('Specified SSH public key file is not in PEM format'));
    }

    return {
      sshPublickeyPemDataBase64: utils.extractBase64CertFromPEM(sshPublickeyPemDataStr)
    };
  },

  _loadCustomData: function (customDataFilePath) {
    var stats = fs.statSync(customDataFilePath);
    var maxSize = 65535; // 64 KB

    if (stats['size'] > maxSize) {
      throw new Error($('--custom-data must be less than 64 KB'));
    }

    var customData = fs.readFileSync(customDataFilePath);
    return customData.toString('base64');
  }
});

module.exports = VMOSProfile;