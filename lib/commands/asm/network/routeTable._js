var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var Subnet = require('./subnet');
var $ = utils.getLocaleString;

function RouteTable(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(RouteTable.prototype, {
  addRouteTableToSubnet: function (vnetName, subnetName, routeTableName, options, _) {
    var subnetCRUD = new Subnet(this.cli, this.networkManagementClient);
    var subnet = subnetCRUD.get(vnetName, subnetName, options, _);
    var output = this.cli.output;
    if (!subnet) {
      output.warn(util.format($('Virtual network subnet with name "%s" not found in virtual network "%s"'), subnetName, vnetName));
      return;
    }

    var routeTable = this.getRouteTableForSubnet(vnetName, subnetName, _);
    if (routeTable && utils.ignoreCaseEquals(routeTable.routeTableName, routeTableName)) {
      output.warn(util.format($('Route table with name "%s" is already associated with subnet "%s"'), routeTableName, subnetName));
      return;
    }

    var parameters = {
      routeTableName: routeTableName
    };

    var progress = this.cli.interaction.progress(util.format($('Associating route table "%s" and subnet "%s"'), routeTableName, subnetName));
    try {
      this.networkManagementClient.routes.addRouteTableToSubnet(vnetName, subnetName, parameters, _);
    } finally {
      progress.end();
    }
    options.detailed = true;
    this.showRouteTableForSubnet(vnetName, subnetName, options, _);
  },

  deleteRouteTableFromSubnet: function (vnetName, subnetName, routeTableName, options, _) {
    var subnetCRUD = new Subnet(this.cli, this.networkManagementClient);
    var subnet = subnetCRUD.get(vnetName, subnetName, options, _);
    var output = this.cli.output;
    if (!subnet) {
      output.warn(util.format($('Virtual network subnet with name "%s" not found in virtual network "%s"'), subnetName, vnetName));
      return;
    }

    var routeTable = this.networkManagementClient.routes.getRouteTableForSubnet(vnetName, subnetName, _);
    if (!utils.ignoreCaseEquals(routeTable.routeTableName, routeTableName)) {
      output.warn(util.format($('Route table "%s" not found in virtual network "%s"'), routeTableName, vnetName));
      return;
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete the route table "%s" association with subnet "%s"? [y/n] '),
        routeTableName, subnetName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Removing route table "%s" and subnet "%s" association'),
      routeTableName, subnetName));
    try {
      this.networkManagementClient.routes.removeRouteTableFromSubnet(vnetName, subnetName, _);
    } finally {
      progress.end();
    }
  },

  showRouteTableForSubnet: function (vnetName, subnetName, options, _) {
    var defaultDetailLevel = 5;
    var output = this.cli.output;
    var routeTable = this.getRouteTableForSubnet(vnetName, subnetName, _);
    if (!routeTable) {
      output.warn(util.format($('No route table was found in virtual network "%s" subnet "%s"'), vnetName, subnetName));
      return;
    }

    var indent = 0;
    output.nameValue('Route table name', routeTable.routeTableName);

    if (options.detailed) {
      indent += 2;
      var gatewayDetails = this.networkManagementClient.routes.getRouteTableWithDetails(routeTable.routeTableName, defaultDetailLevel, _);
      gatewayDetails = gatewayDetails.routeTable;
      output.nameValue('Location', gatewayDetails.location, indent);
      output.nameValue('State', gatewayDetails.state, indent);
      output.nameValue('Label', gatewayDetails.label, indent);
      output.list('Routes', gatewayDetails.routeList, indent);
    }
  },

  getRouteTableForSubnet: function (vnetName, subnetName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up network gateway route tables in virtual network "%s" subnet "%s"'), vnetName, subnetName));
    var routeTable;
    try {
      routeTable = this.networkManagementClient.routes.getRouteTableForSubnet(vnetName, subnetName, _);
    } catch (e) {
      if (e.code === 'ResourceNotFound' || e.code === 'NotFound') {
        return null;
      } else {
        throw e;
      }
    } finally {
      progress.end();
    }
    return routeTable;
  }
});

module.exports = RouteTable;