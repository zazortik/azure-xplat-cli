//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

require('should');
var sinon = require('sinon');
var nockhelper = require('../framework/nock-helper.js');
var executeCmd = require('../framework/cli-executor').execute;
var keyFiles = require('../../lib/util/keyFiles');
var profile = require('../../lib/util/profile');
var testUtil = require('../util/util');

describe('cli', function () {
  describe('mobile', function() {
    describe('recover', function() {

      before(function (done) {
        process.env.AZURE_ENABLE_STRICT_SSL = false;

        sinon.stub(keyFiles, 'readFromFile', function () {
          return {
            cert: testUtil.getCertificate(),
            key: testUtil.getCertificateKey()
          };
        });

        sinon.stub(keyFiles, 'writeToFile', function () {});

        var originalProfileLoad = profile.load;
        sinon.stub(profile, 'load', function(fileNameOrData) {
          if (!fileNameOrData || fileNameOrData === profile.defaultProfileFile) {
            return originalProfileLoad({
              environments: [],
              subscriptions: [
                {
                  id: 'ba090344-f0ae-4520-b8a0-205635df65ed',
                  name: 'testAccount',
                  managementEndpointUrl: 'https://management.core.windows.net/',
                  managementCertificate: {
                    cert: process.env.AZURE_CERTIFICATE,
                    key: process.env.AZURE_CERTIFICATE_KEY
                  }
                }
              ]
            });
          }
          return originalProfileLoad(fileNameOrData);
        });

        profile.current = profile.load();

        done();
      });

      after(function (done) {
        delete process.env.AZURE_ENABLE_STRICT_SSL;

        if (keyFiles.readFromFile.restore) {
          keyFiles.readFromFile.restore();
        }

        if (keyFiles.writeToFile.restore) {
          keyFiles.writeToFile.restore();
        }

        if (profile.load.restore) {
          profile.load.restore();
        }

        done();
      });

      beforeEach(function (done) {
        nockhelper.nockHttp();
        done();
      });

      afterEach(function (done) {
        nockhelper.unNockHttp();
        done();
      });

      it('should recover successfully', function(done) {
        nockhelper.nock('https://management.core.windows.net')
          .post('/ba090344-f0ae-4520-b8a0-205635df65ed/services/mobileservices/mobileservices/foo/recover?targetMobileService=bar')
          .reply(200, '', {
            'cache-control': 'no-cache',
            pragma: 'no-cache',
            'transfer-encoding': 'chunked',
            expires: '-1',
            server: '33.0.6190.871 (rd_rdfe_n.130610-2140) Microsoft-HTTPAPI/2.0',
            'x-powered-by': 'ASP.NET',
            'x-ms-request-id': '58543a3771d8444c9a63e196568cde99',
            date: 'Tue, 18 Jun 2013 17:09:40 GMT'
          })

          .delete('/ba090344-f0ae-4520-b8a0-205635df65ed/applications/barmobileservice')
          .reply(202, '', {
            'cache-control': 'no-cache',
            'content-length': '0',
            server: '33.0.6190.871 (rd_rdfe_n.130610-2140) Microsoft-HTTPAPI/2.0',
            'x-ms-request-id': 'ea355dfe8247400b92c2170abed6dc2f',
            date: 'Tue, 18 Jun 2013 17:09:43 GMT'
          })

          .get('/ba090344-f0ae-4520-b8a0-205635df65ed/operations/ea355dfe8247400b92c2170abed6dc2f')
          .reply(200, '<Operation xmlns=\"http://schemas.microsoft.com/windowsazure\" xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\"><ID>ea355dfe-8247-400b-92c2-170abed6dc2f</ID><Status>Succeeded</Status><HttpStatusCode>200</HttpStatusCode></Operation>', {
            'cache-control': 'no-cache',
            'content-length': '232',
            'content-type': 'application/xml; charset=utf-8',
            server: '33.0.6190.871 (rd_rdfe_n.130610-2140) Microsoft-HTTPAPI/2.0',
            'x-ms-request-id': '597f23a22ec645b398e0fb68f8d8967d',
            date: 'Tue, 18 Jun 2013 17:09:47 GMT'
          });

        var cmd = ('node cli.js mobile recover foo bar -q -s ba090344-f0ae-4520-b8a0-205635df65ed --json').split(' ');
        executeCmd(cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});