var __ = require('underscore');
var fs = require('fs');

var utils = require('../../../util/utils');
var tagUtils = require('../tag/tagUtils');

var $ = utils.getLocaleString;

function VMExtensionProfile(cli, params) {
    this.cli = cli;
    this.params = params;
}

__.extend(VMExtensionProfile.prototype, {
  generateExtensionProfile: function() {
    var extensionProfile = this._parseExtensionProfileParams(this.params);
    return {
      profile: extensionProfile
    };
  },

  _parseExtensionProfileParams: function(params) {
    if (params.publicConfig && params.publicConfigPath) {
      throw new Error($('Both optional parameters --public-config and --public-config-path cannot be specified together.'));
    }

    if (params.privateConfig && params.privateConfigPath) {
      throw new Error($('Both optional parameters --private-config and --private-config-path cannot be specified together.'));
    }

    var extensionProfile = {
      name: params.extensionName,
      type: 'Microsoft.Compute/virtualMachines/extensions',
      location: params.location,
      tags: null,
      publisher: params.publisherName,
      extensionType: params.extensionName,
      typeHandlerVersion: params.version,
      settings: null,
      protectedSettings: null
    };

    if (params.publicConfig) {
      extensionProfile.settings = params.publicConfig;
    }

    if (params.privateConfig) {
      extensionProfile.protectedSettings = params.privateConfig;
    }

    if (params.publicConfigPath) {
      var publicConfig = fs.readFileSync(params.publicConfigPath);
      extensionProfile.settings = publicConfig.toString();
    }

    if (params.privateConfigPath) {
      var privateConfig = fs.readFileSync(params.privateConfigPath);
      extensionProfile.protectedSettings = privateConfig.toString();
    }

    if (params.tags) {
      extensionProfile.tags = {};
      extensionProfile.tags = tagUtils.buildTagsParameter(extensionProfile.tags, { tags: params.tags });
    }

    return extensionProfile;
  }
});

module.exports = VMExtensionProfile;