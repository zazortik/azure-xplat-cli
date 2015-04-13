var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var TagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;

function Traffic(cli, trafficManagerProviderClient) {
  this.cli = cli;
  this.trafficManagerProviderClient = trafficManagerProviderClient;
}

__.extend(Traffic.prototype, {
  create: function (resourceGroup, name, options, _) {
  }
});

module.exports = Traffic;