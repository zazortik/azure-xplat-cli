exports = module.exports;

var Constants = {
  protocols: ['Tcp', 'Udp', '*'],
  accessModesList: ['Allow', 'Deny'],
  directionModesList: ['Inbound', 'Outbound'],
  priorityBoundsList: [100, 4096],
  portBoundsList: [0, 65535],

  toRange: function (array) {
    return '[' + array[0] + '-' + array[1] + ']';
  }
};

module.exports = Constants;
