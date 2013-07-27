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

var util = require('util');
var path = require('path');
var fs = require('fs');

var __ = require('underscore');

var interaction = require('../util/interaction');
var utils = require('../util/utils');

exports.init = function (cli) {

  var log = cli.output;
  var site = cli.category('site');
  var siteCertificates = site.category('cert')
    .description('Commands to manage your Web Site certificates');

  siteCertificates.command('list [name]')
    .usage('[options] [name]')
    .description('Show your site certificates')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteGet(context, _);
      siteConfigurations.SSLCertificates = getCertificates(siteConfigurations.SSLCertificates);
      interaction.formatOutput(cli, siteConfigurations.SSLCertificates.Certificate, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell('Subject', item.SubjectName);
            row.cell('Expiration Date', item.ExpirationDate);
            row.cell('Thumbprint', item.Thumbprint);
          });
        } else {
          log.info('No certificates defined yet.');
        }
      });
    });

  siteCertificates.command('add <certificate-path> [name]')
    .usage('[options] <certificate-path> [name]')
    .description('Adds a site certificate in pfx format')
    .option('-k, --key <key>', 'The certificate key')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (certificatePath, name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      if (!fs.existsSync(certificatePath)) {
        throw new Error(util.format('Invalid certificate file path %s', certificatePath));
      }

      if (path.extname(certificatePath) !== '.pfx') {
        throw new Error('Only pfx certificates are supported');
      }

      key = interaction.promptPasswordOnceIfNotGiven(cli, 'Certificate key: ', options.key, _);

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteGet(context, _);
      siteConfigurations.SSLCertificates = getCertificates(siteConfigurations.SSLCertificates);

      var certificateContent = fs.readFile(certificatePath, _).toString('base64');

      var newCertificate = {
        Password: key,
        PfxBlob: certificateContent
      };

      siteConfigurations.SSLCertificates.Certificate.push(newCertificate);

      site.doSitePUT(context, {
        SSLCertificates: siteConfigurations.SSLCertificates
      }, _);
    });

  siteCertificates.command('delete <thumbprint> [name]')
    .usage('[options] <thumbprint> [name]')
    .description('Deletes a site certificate')
    .option('-q, --quiet', 'quiet mode, do not ask for delete confirmation')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (thumbprint, name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteGet(context, _);
      siteConfigurations.SSLCertificates = getCertificates(siteConfigurations.SSLCertificates);

      var match = siteConfigurations.SSLCertificates.Certificate.filter(function (c) {
        return utils.ignoreCaseEquals(c.Thumbprint, thumbprint);
      })[0];

      if (match) {
        if (!options.quiet && !interaction.confirm(cli, util.format('Delete certificate with subject %s? (y/n) ', match.SubjectName), _)) {
          return;
        }

        match.ToDelete = 'true';

        site.doSitePUT(context, {
          SSLCertificates: siteConfigurations.SSLCertificates
        }, _);
      } else {
        throw new Error(util.format('Certificate with thumbprint "%s" does not exist.', thumbprint));
      }
    });

  siteCertificates.command('show <thumbprint> [name]')
    .usage('[options] <thumbprint> [name]')
    .description('Shows a site certificate')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (thumbprint, name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteGet(context, _);
      siteConfigurations.SSLCertificates = getCertificates(siteConfigurations.SSLCertificates);
      var match = siteConfigurations.SSLCertificates.Certificate.filter(function (c) {
        return utils.ignoreCaseEquals(c.Thumbprint, thumbprint);
      })[0];

      if (match) {
        interaction.formatOutput(cli, match, function (data) {
          interaction.logEachData(cli, 'Certificate', data);
        });
      } else {
        throw new Error(util.format('Certificate with thumbprint "%s" does not exist.', thumbprint));
      }
    });

  function getCertificates(certificates) {
    if (!certificates) {
      certificates = {};
    }

    if (!certificates.Certificate) {
      certificates.Certificate = [ ];
    } else if (!__.isArray(certificates.Certificate)) {
      certificates.Certificate = [ certificates.Certificate ];
    }

    return certificates;
  }
};