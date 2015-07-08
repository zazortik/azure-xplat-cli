/**
 * Copyright (c) Microsoft.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;
var constants = require('./constants');
var Subnet = require('./subnet');

function RouteTable(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.subnetCrud = new Subnet(cli, networkManagementClient);
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(RouteTable.prototype, {
  create: function (routeTableName, location, options, _) {
    var self = this;
    options.name = routeTableName;
    options.location = location;

    var progress = self.interaction.progress(util.format($('Creating route table "%s"'), routeTableName));
    try {
      self.networkManagementClient.routes.createRouteTable(options, _);
    } finally {
      progress.end();
    }
    self.show(routeTableName, options, _);
  },

  show: function (routeTableName, options, _) {
    var self = this;
    var routeTable = self.get(routeTableName, true, _);

    if (routeTable) {
      self.interaction.formatOutput(routeTable, function (routeTable) {
        self.output.nameValue($('Name'), routeTable.name);
        self.output.nameValue($('Location'), routeTable.location);
        self.output.nameValue($('Label'), routeTable.label);
        if (routeTable.routeList.length > 0) {
          self.output.header($('Route list'));
          routeTable.routeList.forEach(function (route) {
            self.output.nameValue($('Name'), route.name, 2);
            self.output.nameValue($('Address prefix'), route.addressPrefix, 2);
            self.output.nameValue($('Next hop type'), route.nextHop.type, 2);
          });
        }
      });
    } else {
      if (self.output.format().json) {
        self.output.json({});
      } else {
        self.output.warn(util.format($('A route table with name "%s" not found'), routeTableName));
      }
    }
  },

  list: function (options, _) {
    var self = this;
    var progress = self.interaction.progress(('Looking up route tables'));

    var routeTables;
    try {
      routeTables = self.networkManagementClient.routes.listRouteTables(_);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(routeTables.routeTables, function (data) {
      if (data.length === 0) {
        self.output.warn($('No route tables found'));
      } else {
        self.output.table(data, function (row, routeTable) {
          row.cell($('Name'), routeTable.name);
          row.cell($('Location'), routeTable.location);
        });
      }
    });
  },

  delete: function (routeTableName, options, _) {
    var self = this;
    var routeTable = self.get(routeTableName, false, _);
    if (!routeTable) {
      throw new Error(util.format($('Route table "%s" not found'), routeTableName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete route table "%s"? [y/n] '), routeTableName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting route table "%s"'), routeTableName));
    try {
      self.networkManagementClient.routes.deleteRouteTable(routeTableName, _);
    } finally {
      progress.end();
    }
  },

  get: function (routeTableName, withDetails, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Getting route table "%s"'), routeTableName));
    var routeTable;
    try {
      if (withDetails) {
        routeTable = self.networkManagementClient.routes.getRouteTableWithDetails(routeTableName, 'Full', _);
      } else {
        routeTable = self.networkManagementClient.routes.getRouteTable(routeTableName, _);
      }
    } catch (e) {
      if (e.code === 'ResourceNotFound' || e.code === 'NotFound') {
        return null;
      } else {
        throw e;
      }
    } finally {
      progress.end();
    }
    return routeTable.routeTable;
  },

  setRoute: function (routeTableName, routeName, addressPrefix, nextHopType, options, _) {
    var self = this;
    var parameters = self._parseRoute(routeName, addressPrefix, nextHopType, options, _);
    var routeTable = self.get(routeTableName, false, _);
    if (!routeTable) {
      throw new Error(util.format($('A route table with name "%s" not found'), routeTableName));
    }

    var route = utils.findFirstCaseIgnore(routeTable.routeList, {name: routeName});

    if (route) {
      self.output.error(util.format($('A route with name "%s" already exists in a route table "%s"'), routeName, routeTableName));
    } else {
      var progress = self.interaction.progress(util.format($('Setting route "%s" in a route table "%s"'), routeName, routeTableName));
      try {
        self.networkManagementClient.routes.setRoute(routeTableName, routeName, parameters, _);
      } finally {
        progress.end();
      }
    }
  },

  deleteRoute: function (routeTableName, routeName, options, _) {
    var self = this;
    var routeTable = self.get(routeTableName, true, _);
    if (!routeTable) {
      throw new Error(util.format($('A route table with name "%s" not found'), routeTableName));
    }

    var route = utils.findFirstCaseIgnore(routeTable.routeList, {name: routeName});
    if (route) {
      if (!options.quiet && !self.interaction.confirm(util.format($('Delete a route "%s"? [y/n] '), routeName), _)) {
        return;
      }

      var progress = self.interaction.progress(util.format($('Deleting route "%s" from a route table "%s"'), routeName, routeTableName));
      try {
        self.networkManagementClient.routes.deleteRoute(routeTableName, routeName, _);
      } finally {
        progress.end();
      }
    } else {
      self.output.error(util.format($('A route with name "%s" not found in a route table "%s"'), routeName, routeTableName));
    }
  },

  addRouteTableToSubnet: function (vnetName, subnetName, routeTableName, options, _) {
    var self = this;
    var subnet = self.subnetCrud.get(vnetName, subnetName, options, _);

    if (!subnet) {
      self.output.warn(util.format($('Virtual network subnet with name "%s" not found in virtual network "%s"'), subnetName, vnetName));
      return;
    }

    var routeTable = self.getRouteTableForSubnet(vnetName, subnetName, _);
    if (routeTable && utils.ignoreCaseEquals(routeTable.routeTableName, routeTableName)) {
      self.output.warn(util.format($('Route table with name "%s" is already associated with subnet "%s"'), routeTableName, subnetName));
      return;
    }

    var parameters = {
      routeTableName: routeTableName
    };

    var progress = self.interaction.progress(util.format($('Associating route table "%s" and subnet "%s"'), routeTableName, subnetName));
    try {
      self.networkManagementClient.routes.addRouteTableToSubnet(vnetName, subnetName, parameters, _);
    } finally {
      progress.end();
    }
    options.detailed = true;
    self.showRouteTableForSubnet(vnetName, subnetName, options, _);
  },

  deleteRouteTableFromSubnet: function (vnetName, subnetName, routeTableName, options, _) {
    var self = this;
    var subnet = self.subnetCrud.get(vnetName, subnetName, options, _);

    if (!subnet) {
      self.output.warn(util.format($('Virtual network subnet with name "%s" not found in virtual network "%s"'), subnetName, vnetName));
      return;
    }

    var routeTable = self.networkManagementClient.routes.getRouteTableForSubnet(vnetName, subnetName, _);
    if (!utils.ignoreCaseEquals(routeTable.routeTableName, routeTableName)) {
      self.output.warn(util.format($('Route table "%s" not found in virtual network "%s"'), routeTableName, vnetName));
      return;
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete the route table "%s" association with subnet "%s"? [y/n] '),
        routeTableName, subnetName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Removing route table "%s" and subnet "%s" association'), routeTableName, subnetName));
    try {
      self.networkManagementClient.routes.removeRouteTableFromSubnet(vnetName, subnetName, _);
    } finally {
      progress.end();
    }
  },

  showRouteTableForSubnet: function (vnetName, subnetName, options, _) {
    var self = this;
    var defaultDetailLevel = 5;
    var routeTable = self.getRouteTableForSubnet(vnetName, subnetName, _);
    if (!routeTable) {
      self.output.warn(util.format($('No route table was found in virtual network "%s" subnet "%s"'), vnetName, subnetName));
      return;
    }

    self.output.nameValue('Route table name', routeTable.routeTableName);
    if (options.detailed) {
      var gatewayDetails = self.networkManagementClient.routes.getRouteTableWithDetails(routeTable.routeTableName, defaultDetailLevel, _);
      gatewayDetails = gatewayDetails.routeTable;
      self.output.nameValue('Location', gatewayDetails.location, 2);
      self.output.nameValue('State', gatewayDetails.state, 2);
      self.output.nameValue('Label', gatewayDetails.label, 2);
      self.output.list('Routes', gatewayDetails.routeList, 2);
    }
  },

  getRouteTableForSubnet: function (vnetName, subnetName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up network gateway route tables in virtual network "%s" subnet "%s"'), vnetName, subnetName));
    var routeTable;
    try {
      routeTable = self.networkManagementClient.routes.getRouteTableForSubnet(vnetName, subnetName, _);
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
  },

  _parseRoute: function (routeName, addressPrefix, nextHopType, options, _) {
    var self = this;

    var route = {
      name: routeName,
      addressPrefix: addressPrefix,
      nextHop: {}
    };

    route.nextHop.type = utils.verifyParamExistsInCollection(constants.route.nextHopType,
      nextHopType, 'next hop type');

    // TODO: nextHopIpAddress is not supported by API & SDK
    if (route.nextHop.type === 'VirtualAppliance') {
      options.nextHopIpAddress = self.interaction.promptIfNotGiven($('Next hop ip address: '), options.nextHopIpAddress, _);
    }
    return route;
  }
});

module.exports = RouteTable;