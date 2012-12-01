var common = require('../common');
var url = require('url');
var utils = require('../utils');

exports.init = function(cli) {
  var log = cli.output;
  cli.command('portal')
    .description('Opens the portal in a browser')
    .option("-r, --realm <realm>", "specifies organization used for login")
    .execute(function (options, _) {
      var href = url.parse(utils.getPortalUrl(), true);
      log.info('url' + href);
      delete href.search;
      delete href.path;
      if(options && options.realm){
        href.query.whr = options.realm;
      }
      targetUrl = url.format(href);
      common.launchBrowser(targetUrl);
   });
}