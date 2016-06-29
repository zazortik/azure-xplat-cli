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

var should = require('should');
var azureCommon = require('azure-common');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.storage.service-tests';
var crypto = require('crypto');

function stripAccessKey(connectionString) {
  return connectionString.replace(/AccountKey=[^;]+/, 'AccountKey=null');
}

var requiredEnvironment = [
  { name: 'AZURE_STORAGE_CONNECTION_STRING', secure: stripAccessKey }
];

/**
* Convert a cmd to azure storage cli
*/
describe('cli', function () {
  describe('storage', function() {

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.skipSubscription = true;

      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('logging', function() {
      describe('show', function() {
        it('should show logging properties for all services', function(done) {
          suite.execute('storage logging show --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(3);
            properties.forEach(function(property) {
              property.Version.should.equal('1.0');
              property.Type.should.not.be.empty;
              property.Read.should.be.a.Boolean;
              property.Write.should.be.a.Boolean;
              property.Delete.should.be.a.Boolean;
              property.RetentionPolicy.should.be.an.Object;
            });            
            done();
          });
        });

        it('should show logging properties for blob service', function(done) {
          suite.execute('storage logging show --blob --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.greaterThan(0);
            properties.forEach(function(property) {
              property.Version.should.equal('1.0');
              property.Type.should.not.be.empty;
              property.Read.should.be.a.Boolean;
              property.Write.should.be.a.Boolean;
              property.Delete.should.be.a.Boolean;
              property.RetentionPolicy.should.be.an.Object;
            });            
            done();
          });
        });

        it('should show logging properties for table service', function(done) {
          suite.execute('storage logging show --table --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.greaterThan(0);
              properties.forEach(function(property) {
              property.Version.should.equal('1.0');
              property.Type.should.not.be.empty;
              property.Read.should.be.a.Boolean;
              property.Write.should.be.a.Boolean;
              property.Delete.should.be.a.Boolean;
              property.RetentionPolicy.should.be.an.Object;
              });            
            done();
          });
        });

        it('should show logging properties for queue service', function(done) {
          suite.execute('storage logging show --queue --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.greaterThan(0);
            properties.forEach(function(property) {
              property.Version.should.equal('1.0');
              property.Type.should.not.be.empty;
              property.Read.should.be.a.Boolean;
              property.Write.should.be.a.Boolean;
              property.Delete.should.be.a.Boolean;
              property.RetentionPolicy.should.be.an.Object;
            });            
            done();
          });
        });
      });

      describe('set', function() {
        it('should set logging properties for blob service', function(done) {
          var retention = 10;
          suite.execute('storage logging set --blob --retention %s --read --write --delete-off --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.Version.should.equal('1.0');
            property.Type.should.equal('blob');
            property.Read.should.be.true;
            property.Write.should.be.true;
            property.Delete.should.be.false;
            property.RetentionPolicy.Enabled.should.be.true;
            property.RetentionPolicy.Days.should.equal(retention);
            done();
          });
        });

        it('should set logging properties for table service', function(done) {
          var retention = '0';
          suite.execute('storage logging set --table --retention %s --read --write-off --delete --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.Version.should.equal('1.0');
            property.Type.should.equal('table');
            property.Read.should.be.true;
            property.Write.should.be.false;
            property.Delete.should.be.true;
            property.RetentionPolicy.Enabled.should.be.false;
            done();
          });
        });

        it('should set logging properties for queue service', function(done) {
          var retention = 5;
          suite.execute('storage logging set --queue --retention %s --read-off --write --delete --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.Version.should.equal('1.0');
            property.Type.should.equal('queue');
            property.Read.should.be.false;
            property.Write.should.be.true;
            property.Delete.should.be.true;
            property.RetentionPolicy.Enabled.should.be.true;
            property.RetentionPolicy.Days.should.equal(retention);
            done();
          });
        });
      });
    });

    describe('metrics', function() {
      describe('show', function() {
        it('should show metrics properties for all services', function(done) {
          suite.execute('storage metrics show --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(4);
            properties.forEach(function(property) {
              property.type.should.not.be.empty;
              property.HourMetrics.length.should.equal(1);
              property.HourMetrics[0].should.be.an.Object;
              property.HourMetrics[0].Version.should.equal('1.0');
              property.HourMetrics[0].Enabled.should.be.a.Boolean;
              property.HourMetrics[0].RetentionPolicy.should.be.an.Object;

              property.MinuteMetrics.length.should.equal(1);
              property.MinuteMetrics[0].should.be.an.Object;
              property.MinuteMetrics[0].Version.should.equal('1.0');
              property.MinuteMetrics[0].Enabled.should.be.a.Boolean;
            });
            done();
          });
        });

        it('should show metrics properties for blob service', function(done) {
          suite.execute('storage metrics show --blob --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.greaterThan(0);
            properties.forEach(function(property) {
              property.type.should.not.be.empty;
              property.HourMetrics.length.should.equal(1);
              property.HourMetrics[0].should.be.an.Object;
              property.HourMetrics[0].Version.should.equal('1.0');
              property.HourMetrics[0].Enabled.should.be.a.Boolean;
              property.HourMetrics[0].RetentionPolicy.should.be.an.Object;

              property.MinuteMetrics.length.should.equal(1);
              property.MinuteMetrics[0].should.be.an.Object;
              property.MinuteMetrics[0].Version.should.equal('1.0');
              property.MinuteMetrics[0].Enabled.should.be.a.Boolean;
            });
            done();
          });
        });

        it('should show metrics properties for table service', function(done) {
          suite.execute('storage metrics show --table --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.greaterThan(0);
            properties.forEach(function(property) {
              property.type.should.not.be.empty;
              property.HourMetrics.length.should.equal(1);
              property.HourMetrics[0].should.be.an.Object;
              property.HourMetrics[0].Version.should.equal('1.0');
              property.HourMetrics[0].Enabled.should.be.a.Boolean;
              property.HourMetrics[0].RetentionPolicy.should.be.an.Object;

              property.MinuteMetrics.length.should.equal(1);
              property.MinuteMetrics[0].should.be.an.Object;
              property.MinuteMetrics[0].Version.should.equal('1.0');
              property.MinuteMetrics[0].Enabled.should.be.a.Boolean;
            });
            done();
          });
        });

        it('should show metrics properties for queue service', function(done) {
          suite.execute('storage metrics show --queue --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.greaterThan(0);
            properties.forEach(function(property) {
              property.type.should.not.be.empty;
              property.HourMetrics.length.should.equal(1);
              property.HourMetrics[0].should.be.an.Object;
              property.HourMetrics[0].Version.should.equal('1.0');
              property.HourMetrics[0].Enabled.should.be.a.Boolean;
              property.HourMetrics[0].RetentionPolicy.should.be.an.Object;

              property.MinuteMetrics.length.should.equal(1);
              property.MinuteMetrics[0].should.should.be.an.Object;
              property.MinuteMetrics[0].Version.should.equal('1.0');
              property.MinuteMetrics[0].Enabled.should.be.a.Boolean;
            });
            done();
          });
        });

        it('should show metrics properties for file service', function(done) {
          suite.execute('storage metrics show --file --json', function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.greaterThan(0);
            properties.forEach(function(property) {
              property.type.should.not.be.empty;
              property.HourMetrics.length.should.equal(1);
              property.HourMetrics[0].should.be.an.Object;
              property.HourMetrics[0].Version.should.equal('1.0');
              property.HourMetrics[0].Enabled.should.be.a.Boolean;
              property.HourMetrics[0].RetentionPolicy.should.be.an.Object;

              property.MinuteMetrics.length.should.equal(1);
              property.MinuteMetrics[0].should.should.be.an.Object;
              property.MinuteMetrics[0].Version.should.equal('1.0');
              property.MinuteMetrics[0].Enabled.should.be.a.Boolean;
            });
            done();
          });
        });
      });

      describe('set', function() {
        it('should set hourly metrics properties for blob service', function(done) {
          var retention = 10;
          suite.execute('storage metrics set --blob --retention %s --hour --api --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.type.should.equal('blob');
            property.HourMetrics.length.should.equal(1);
            property.HourMetrics[0].should.be.an.Object;
            property.HourMetrics[0].Version.should.equal('1.0');
            property.HourMetrics[0].Enabled.should.be.true;
            property.HourMetrics[0].IncludeAPIs.should.be.true;
            property.HourMetrics[0].RetentionPolicy.should.be.an.Object;
            property.HourMetrics[0].RetentionPolicy.Enabled.should.be.true;
            property.HourMetrics[0].RetentionPolicy.Days.should.equal(retention);
            
            property.MinuteMetrics.length.should.equal(1);
            property.MinuteMetrics[0].should.be.an.Object;
            property.MinuteMetrics[0].Version.should.equal('1.0');
            property.MinuteMetrics[0].Enabled.should.be.a.Boolean;
            done();
          });
        });

        it('should set hourly metrics properties and turn off minute metrics for table service', function(done) {
          var retention = '0';
          suite.execute('storage metrics set --table --retention %s --hour --api-off --minute-off --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.type.should.equal('table');
            property.HourMetrics.length.should.equal(1);
            property.HourMetrics[0].should.be.an.Object;
            property.HourMetrics[0].Version.should.equal('1.0');
            property.HourMetrics[0].Enabled.should.be.true;
            property.HourMetrics[0].IncludeAPIs.should.be.false;
            property.HourMetrics[0].RetentionPolicy.should.be.an.Object;
            property.HourMetrics[0].RetentionPolicy.Enabled.should.be.false;

            property.MinuteMetrics.length.should.equal(1);
            property.MinuteMetrics[0].should.be.an.Object;
            property.MinuteMetrics[0].Version.should.equal('1.0');
            property.MinuteMetrics[0].Enabled.should.be.false;
            done();
          });
        });
    
        it('should set minute metrics properties and turn off hourly metrics for queue service', function(done) {
          var retention = 10;
          suite.execute('storage metrics set --queue --retention %s --hour-off --minute --api --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.type.should.equal('queue');
            property.HourMetrics.length.should.equal(1);
            property.HourMetrics[0].should.be.an.Object;
            property.HourMetrics[0].Version.should.equal('1.0');
            property.HourMetrics[0].Enabled.should.be.false;
            property.HourMetrics[0].RetentionPolicy.should.be.an.Object;
            property.HourMetrics[0].RetentionPolicy.Enabled.should.be.a.Boolean;

            property.MinuteMetrics.length.should.equal(1);
            property.MinuteMetrics[0].should.be.an.Object;
            property.MinuteMetrics[0].Version.should.equal('1.0');
            property.MinuteMetrics[0].Enabled.should.be.true;
            property.MinuteMetrics[0].IncludeAPIs.should.be.true;
            property.MinuteMetrics[0].RetentionPolicy.should.be.an.Object;
            property.MinuteMetrics[0].RetentionPolicy.Enabled.should.be.true;
            property.MinuteMetrics[0].RetentionPolicy.Days.should.equal(retention);
            done();
          });
        });

        it('should turn off both minute and hourly metrics for queue service', function(done) {
          var retention = 10;
          suite.execute('storage metrics set --queue --retention %s --hour-off --minute-off --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.type.should.equal('queue');
            property.HourMetrics.length.should.equal(1);
            property.HourMetrics[0].should.be.an.Object;
            property.HourMetrics[0].Version.should.equal('1.0');
            property.HourMetrics[0].Enabled.should.be.false;
            property.HourMetrics[0].RetentionPolicy.should.be.an.Object;
            property.HourMetrics[0].RetentionPolicy.Enabled.should.be.a.Boolean;

            property.MinuteMetrics.length.should.equal(1);
            property.MinuteMetrics[0].should.be.an.Object;
            property.MinuteMetrics[0].Version.should.equal('1.0');
            property.MinuteMetrics[0].Enabled.should.be.false;
            property.MinuteMetrics[0].RetentionPolicy.should.be.an.Object;
            property.MinuteMetrics[0].RetentionPolicy.Enabled.should.be.a.Boolean;
            done();
          });
        });
    
        it('should set minute metrics and hourly metrics properties for file service', function(done) {
          var retention = 10;
          suite.execute('storage metrics set --file --retention %s --hour-off --minute --api --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.type.should.equal('file');
            property.HourMetrics.length.should.equal(1);
            property.HourMetrics[0].should.be.an.Object;
            property.HourMetrics[0].Version.should.equal('1.0');
            property.HourMetrics[0].Enabled.should.be.false;
            property.HourMetrics[0].RetentionPolicy.should.be.an.Object;
            property.HourMetrics[0].RetentionPolicy.Enabled.should.be.a.Boolean;

            property.MinuteMetrics.length.should.equal(1);
            property.MinuteMetrics[0].should.be.an.Object;
            property.MinuteMetrics[0].Version.should.equal('1.0');
            property.MinuteMetrics[0].Enabled.should.be.true;
            property.MinuteMetrics[0].IncludeAPIs.should.be.true;
            property.MinuteMetrics[0].RetentionPolicy.should.be.an.Object;
            property.MinuteMetrics[0].RetentionPolicy.Enabled.should.be.true;
            property.MinuteMetrics[0].RetentionPolicy.Days.should.equal(retention);
            done();
          });
        });
    
        it('should set minute metrics properties and turn off hourly metrics for file service', function(done) {
          var retention = 10;
          suite.execute('storage metrics set --file --retention %s --hour-off --minute --api --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.type.should.equal('file');
            property.HourMetrics.length.should.equal(1);
            property.HourMetrics[0].should.be.an.Object;
            property.HourMetrics[0].Version.should.equal('1.0');
            property.HourMetrics[0].Enabled.should.be.false;
            property.HourMetrics[0].RetentionPolicy.should.be.an.Object;
            property.HourMetrics[0].RetentionPolicy.Enabled.should.be.a.Boolean;

            property.MinuteMetrics.length.should.equal(1);
            property.MinuteMetrics[0].should.be.an.Object;
            property.MinuteMetrics[0].Version.should.equal('1.0');
            property.MinuteMetrics[0].Enabled.should.be.true;
            property.MinuteMetrics[0].IncludeAPIs.should.be.true;
            property.MinuteMetrics[0].RetentionPolicy.should.be.an.Object;
            property.MinuteMetrics[0].RetentionPolicy.Enabled.should.be.true;
            property.MinuteMetrics[0].RetentionPolicy.Days.should.equal(retention);
            done();
          });
        });

        it('should turn off both minute and hourly metrics for file service', function(done) {
          var retention = 10;
          suite.execute('storage metrics set --file --retention %s --hour-off --minute-off --json', retention, function(result) {
            result.errorText.should.be.empty;
            var properties = JSON.parse(result.text);
            properties.length.should.equal(1);
            var property = properties[0];
            property.type.should.equal('file');
            property.HourMetrics.length.should.equal(1);
            property.HourMetrics[0].should.be.an.Object;
            property.HourMetrics[0].Version.should.equal('1.0');
            property.HourMetrics[0].Enabled.should.be.false;
            property.HourMetrics[0].RetentionPolicy.should.be.an.Object;
            property.HourMetrics[0].RetentionPolicy.Enabled.should.be.a.Boolean;

            property.MinuteMetrics.length.should.equal(1);
            property.MinuteMetrics[0].should.be.an.Object;
            property.MinuteMetrics[0].Version.should.equal('1.0');
            property.MinuteMetrics[0].Enabled.should.be.false;
            property.MinuteMetrics[0].RetentionPolicy.should.be.an.Object;
            property.MinuteMetrics[0].RetentionPolicy.Enabled.should.be.a.Boolean;
            done();
          });
        });
      });
    });

    describe('cors', function() {
      var services = ['blob', 'table', 'queue', 'file'];
      var serviceIndex = 0;

      var allowedOrigins = 'www.azure.com,www.microsoft.com';
      var allowedMethods = 'GET,PUT';
      var allowedHeaders = 'x-ms-meta-xyz,x-ms-meta-foo,x-ms-meta-data*,x-ms-meta-target*';
      var exposedHeaders = 'x-ms-meta-abc,x-ms-meta-bcd,x-ms-meta-data*,x-ms-meta-source*';
      var maxAge = 500;

      function executeDeletion(done) {
        if (serviceIndex >=  services.length) {
          return done();
        } else {
          suite.execute('storage cors delete %s -q --json', '--' + services[serviceIndex], function(result) {
            result.errorText.should.be.empty;

            serviceIndex++;
            executeDeletion(done);
          });
        }
      }

      describe('delete', function() {
        it('should delete all the CORS rules for the services', function(done) {
          serviceIndex = 0;
          executeDeletion(done);
        });
      });

      describe('set', function() {
        it('should set new CORS rules for the services', function(done) {
          function executeCreation(done) {
             if (serviceIndex >=  services.length) {
              return done();
            } else {
              var rules = [];
              var ruleCount = serviceIndex + 1;
              for (var index = 0; index <= serviceIndex; index++) {
                var rule = {
                  AllowedOrigins: allowedOrigins,
                  AllowedMethods: allowedMethods,
                  AllowedHeaders: allowedHeaders,
                  ExposedHeaders: exposedHeaders,
                  MaxAgeInSeconds: maxAge + index,
                };
                rules.push(rule);
              }

              suite.execute('storage cors set %s --cors %s --json', '--' + services[serviceIndex], JSON.stringify(rules), function(result) {
                result.errorText.should.be.empty;
                var corsRules = JSON.parse(result.text);
                corsRules.length.should.equal(ruleCount);
                var rule = corsRules[ruleCount-1];
                rule.AllowedOrigins.toString().should.equal(allowedOrigins);
                rule.AllowedMethods.toString().should.equal(allowedMethods);
                rule.AllowedHeaders.toString().should.equal(allowedHeaders);
                rule.ExposedHeaders.toString().should.equal(exposedHeaders);
                rule.MaxAgeInSeconds.should.equal(maxAge + ruleCount - 1);

                serviceIndex++;
                executeCreation(done);
              });
            }
          }

          serviceIndex = 0;
          executeCreation(done);
        });
      });

      describe('show', function() {
        it('should show the CORS rules for the services', function(done) {
          function executeShow(done) {
            if (serviceIndex >=  services.length) {
              return done();
            } else {
              suite.execute('storage cors show %s --json', '--' + services[serviceIndex], function(result) {
                result.errorText.should.be.empty;
                var corsRules = JSON.parse(result.text);
                corsRules.length.should.equal(serviceIndex+1);
                var rule = corsRules[serviceIndex];
                rule.AllowedOrigins.toString().should.equal(allowedOrigins);
                rule.AllowedMethods.toString().should.equal(allowedMethods);
                rule.AllowedHeaders.toString().should.equal(allowedHeaders);
                rule.ExposedHeaders.toString().should.equal(exposedHeaders);
                rule.MaxAgeInSeconds.should.equal(maxAge + serviceIndex);

                serviceIndex++;
                executeShow(done);
              });
            }
          }

          serviceIndex = 0;
          executeShow(done);
        });
      });

      describe('clear', function() {
        it('should clear all the CORS rules for the services', function(done) {
          serviceIndex = 0;
          executeDeletion(done);
        });
      });
    });
  });
});
