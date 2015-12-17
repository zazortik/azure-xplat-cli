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

module.exports = {
  protocols: ['Tcp', 'Udp', '*'],
  portBounds: [0, 65535],

  nsg: {
    protocols: ['Tcp', 'Udp', '*'],
    access: ['Allow', 'Deny'],
    direction: ['Inbound', 'Outbound'],
    prefixDef: '*',
    levelDef: 'Full',
    portMin: 0,
    portMax: 65535,
    portDef: 80,
    priorityMin: 100,
    priorityMax: 4096
  },

  trafficManager: {
    defLocation: 'global',
    status: ['Enabled', 'Disabled'],
    routingMethod: ['Performance', 'Weighted', 'Priority'],
    protocols: ['http', 'https'],
    endpointType: ['ExternalEndpoints', 'AzureEndpoints', 'NestedEndpoints'],
    externalType: 'ExternalEndpoints',
    azureType: 'AzureEndpoints',
    nestedType: 'NestedEndpoints',
    typePrefix: 'Microsoft.Network/trafficManagerProfiles/',
    defTtl: 300,
    defMonitorPath: '/',
    securePort: 443,
    unsecurePort: 80,
    priorityMin: 1,
    priorityMax: 1000,
    weightMin: 1,
    weightMax: 1000
  },

  dnsZone: {
    defTtl: 3600,
    defLocation: 'global',
    recordClasses: ['IN'],
    recordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'SRV', 'TXT', 'SOA', 'PTR'],
    A: 'A',
    AAAA: 'AAAA',
    CNAME: 'CNAME',
    MX: 'MX',
    NS: 'NS',
    SRV: 'SRV',
    TXT: 'TXT',
    SOA: 'SOA',
    PTR: 'PTR'
  },

  lb: {
    defPort: 80,
    defProtocol: 'tcp',
    defFloatingIp: false,
    defTimeout: 4,
    defLoadDistribution: 'Default',
    protocols: ['tcp', 'udp']
  },

  route: {
    nextHopType: ['VirtualAppliance', 'VirtualNetworkGateway', 'VNETLocal', 'Internet', 'None']
  },

  vpnGateway: {
    type: ['RouteBased', 'PolicyBased', 'Dedicated'],
    connectionType: ['Vnet2Vnet', 'IPsec', 'ExpressRoute'],
    defWeight: 0
  },

  expressRoute: {
    defBandwidthInMbps: 100,
    tier: ['Standard', 'Premium'],
    family: ['MeteredData', 'UnlimitedData']
  },

  tags: {
    createHelp: 'the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t "tag1=value1;tag2"',
    setHelp: 'the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     Existing tag values will be replaced by the values specified.' +
    '\n     For example, -t "tag1=value1;tag2"'
  },

  toRange: function (array) {
    return '[' + array[0] + '-' + array[1] + ']';
  }
};
