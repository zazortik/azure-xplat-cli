var EndPointUtil = require('../../../util/endpointUtil');
exports = module.exports;

var endPointUtil = new EndPointUtil();
var Constants = {
  protocols: ['Tcp', 'Udp', '*'],
  inboundNatRuleProtocols: endPointUtil.endPointConsts.protocols,
  accessModesList: ['Allow', 'Deny'],
  directionModesList: ['Inbound', 'Outbound'],
  priorityBoundsList: [100, 4096],
  portBoundsList: [0, 65535],
  statusesList: ['Enabled', 'Disabled'],
  trafficRoutingMethodsList: ['Performance', 'Weighted', 'Priority'],

  toRange: function (array) {
    return '[' + array[0] + '-' + array[1] + ']';
  }
};

module.exports = Constants;
