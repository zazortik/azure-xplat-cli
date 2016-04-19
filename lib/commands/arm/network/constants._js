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
  bool: ['true, false'],

  publicIp: {
    allocation: ['Dynamic', 'Static'],
    defTimeout: 4
  },

  nsg: {
    protocols: ['Tcp', 'Udp', '*'],
    access: ['Allow', 'Deny'],
    direction: ['Inbound', 'Outbound'],
    prefix: ['Internet', 'VirtualNetwork', 'AzureLoadBalancer'],
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
    protocols: ['tcp', 'udp'],
    distribution: ['Default', 'SourceIP', 'SourceIPProtocol']
  },

  route: {
    nextHopType: ['VirtualAppliance', 'VirtualNetworkGateway', 'VNETLocal', 'Internet', 'None']
  },

  vpnGateway: {
    subnetName: 'GatewaySubnet',
    gatewayType: ['Vpn', 'ExpressRoute'],
    vpnType: ['RouteBased', 'PolicyBased', 'Dedicated'],
    connectionType: ['Vnet2Vnet', 'IPsec', 'ExpressRoute'],
    sku: ['Basic', 'HighPerformance', 'Standard'],
    defWeight: 0
  },

  appGateway: {
    frontendIp: {
      privateIPAllocationMethod: ['Dynamic', 'Static']
    },
    httpListener: {
      protocol: ['http', 'https']
    },
    probe: {
      host: 'http://127.0.0.1',
      interval: 30,
      path: '/',
      timeout: 30,
      unhealthyThreshold: 5
    },
    routingRule: {
      type: ['Basic']
    },
    pool: {
      name: 'pool01'
    },
    settings: {
      name: 'httpSettings01',
      affinity: ['Disabled', 'Enabled'],
      protocol: ['http'],
      port: [0, 65535],
      defHttpPort: 80,
      defHttpsPort: 443
    },
    sku: {
      capacity: [2, 10],
      name: ['Standard_Medium', 'Standard_Small', 'Standard_Large'],
      tier: ['Standard']
    }
  },

  expressRoute: {
    defBandwidthInMbps: 100,
    tier: ['Standard', 'Premium'],
    family: ['MeteredData', 'UnlimitedData']
  },

  help: {
    tags: {
      create: 'the list of tags.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     For example, -t "tag1=value1;tag2"',
      set: 'the list of tags.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     Existing tag values will be replaced by the values specified.' +
      '\n     For example, -t "tag1=value1;tag2"'
    },
    id: {
      nsg: '/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/networkSecurityGroups/<nsg-name>',
      routeTable: '/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/routeTables/<route-table-name>',
      publicIp: '/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/publicIPAddresses/<public-ip-name>',
      localGateway: '/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/localNetworkGateways/<local-gateway-name>',
      subnet: '/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/VirtualNetworks/<vnet-name>/subnets/<subnet-name>',
      lbAddressPool: '/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/backendAddressPools/<address-pool-name>',
      lbInboundNatRule: '/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/inboundNatRules/<nat-rule-name>'
    }
  },

  toRange: function (array) {
    return '[' + array[0] + '-' + array[1] + ']';
  }
};
