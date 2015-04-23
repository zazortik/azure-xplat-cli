module.exports = {
  protocols: ['Tcp', 'Udp', '*'],
  inboundNatRuleProtocols: ['tcp', 'udp'],
  accessModes: ['Allow', 'Deny'],
  directionModes: ['Inbound', 'Outbound'],
  priorityBounds: [100, 4096],
  portBounds: [0, 65535],
  statuses: ['Enabled', 'Disabled'],
  trafficRoutingMethods: ['Performance', 'Weighted', 'Priority'],
  monitorProtocols: ['http', 'https'],

  LB_DEFAULT_PROTOCOL: 'Tcp',
  LB_DEFAULT_FRONTEND_PORT: 80,
  LB_DEFAULT_BACKEND_PORT: 80,
  LB_DEFAULT_FLOATING_IP: false,
  LB_DEFAULT_IDLE_TIMEOUT: 4,
  LB_DEFAULT_PROBE_PROTOCOL: 'Tcp',
  LB_DEFAULT_PROBE_PORT: 80,

  NSG_DEFAULT_PROTOCOL: 'Tcp',
  NSG_DEFAULT_SOURCE_PORT: 80,
  NSG_DEFAULT_DESTINATION_PORT: 80,
  NSG_DEFAULT_SOURCE_ADDRESS_PREFIX: '*',
  NSG_DEFAULT_DESTINATION_ADDRESS_PREFIX: '*',
  NSG_DEFAULT_ACCESS: 'Allow',
  NSG_DEFAULT_DIRECTION: 'Inbound',
  NSG_DEFAULT_PRIORITY: 100,

  TM_DEFAULT_LOCATION: 'global',
  TM_DEFAULT_PROFILE_STATUS: 'Enabled',
  TM_DEFAULT_ROUTING_METHOD: 'Performance',
  TM_DEFAULT_TIME_TO_LIVE: 300,
  TM_DEFAULT_MONITOR_PROTOCOL: 'http',
  TM_DEFAULT_MONITOR_PORT: {'http': '80', 'https': 443},
  TM_VALID_ENDPOINT_STATUSES: ['Enabled', 'Disabled'],
  TM_VALID_ENDPOINT_TYPES: ['externalEndpoint'],

  DNS_RS_DEFAULT_LOCATION: 'global',
  DNS_RS_TYPES: ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'SRV', 'TXT', 'SOA', 'PTR'],
  DNS_RS_DEFAULT_TYPE: 'A',
  DNS_RS_DEFAULT_TTL: 4,

  gatewayConnectionTypes: ['Ipsec', 'Dedicated', 'VpnClient', 'Vnet2Vnet'],
  vnetGatewayTypes: ['Route-Based-IPSec-VPN', 'Policy-Based-IPSec-VPN', 'Dedicated'],

  toRange: function (array) {
    return '[' + array[0] + '-' + array[1] + ']';
  }
};
