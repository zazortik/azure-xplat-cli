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
    if( (osType === 'Windows')) {
      requestProfile.windowsConfiguration = this._parseWindowsConfiguration(params);
    } else {
      requestProfile.linuxConfiguration = this._parseLinuxConfiguration(params);
    }

    requestProfile.adminUsername = params.adminUsername;
    requestProfile.adminPassword = params.adminPassword;

    return requestProfile;
  },

  _parseWindowsConfiguration: function (params) {
    var windowsConfig = {
      provisionVMAgent: true
    };

    if (utils.stringIsNullOrEmpty(params.adminUsername)) {
      throw new Error($('The parameters adminUsername is required'));
    }

    if (utils.ignoreCaseEquals(params.adminUsername, 'administrator')) {
      throw new Error($('The value administrator for parameter adminUsername is not allowed'));
    }

    this._ensurePasswordComplexity(params.adminPassword);

    if (params.sshDisablePasswordAuth) {
      this.cli.output.warn($('The parameter sshDisablePasswordAuth will be ignored when operating system type is Windows'));
    }

    if (params.sshPublickeyPemFile) {
      this.cli.output.warn($('The parameter sshPublickeyPemFile will be ignored when operating system type is Windows'));
    }

    return windowsConfig;
  },

  _parseLinuxConfiguration: function (params) {
    var linuxConfig = {
      disablePasswordAuthentication: false,
      ssh: null
    };

    if (utils.stringIsNullOrEmpty(params.adminUsername)) {
      throw new Error($('The parameters adminUsername is required'));
    }

    if (params.adminPassword) {
      if (params.sshDisablePasswordAuth) {
        throw new Error($('The parameters adminPassword and sshNoPasswordAuth cannot be specified together'));
      }
      this._ensurePasswordComplexity(params.adminPassword);
    } else {
      linuxConfig.disablePasswordAuthentication = true;
    }

    if (linuxConfig.disablePasswordAuthentication) {
      if (!params.sshPublickeyPemFile && params.sshDisablePasswordAuth === false) {
        throw new Error($('You did not provide adminPassword or sshPublickeyPemFile, to confirm you want to create VM with SSH disabled rerun the command with sshDisablePasswordAuth parameter'));
      }
    }

    if (params.sshPublickeyPemFile) {
      linuxConfig.ssh = {
        publicKeys: []
      };

      var publicKeyResult = this._parseSSHPublicKeyPemFile(params);
      var publicKey = {
        path: '/home/' + params.adminUsername + '/.ssh/authorized_keys',
        keyData: publicKeyResult.sshPublickeyPemDataBase64
      };

      linuxConfig.ssh.publicKeys.push(publicKey);
    }

    return linuxConfig;
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
  }
});

module.exports = VMOSProfile;