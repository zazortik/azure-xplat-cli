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

var url = require('url');

var util = require('util');
var _ = require('underscore');

var should = require('should');
var mocha = require('mocha');

var cli = require('../../lib/cli');
var account = cli.category('account');

var ServiceBusManagement = require('../../lib/serviceBusManagement');

describe('Service Bus Management', function () {

  var service;

  before(function () {
    var subscriptionId = account.lookupSubscriptionId();
    var pem = account.managementCertificate();
    var auth = { keyvalue: pem.key, certvalue: pem.cert };
    var endpoint = url.parse(account.managementEndpointUrl());
    service = new ServiceBusManagement.ServiceBusManagementService(
      subscriptionId, auth,
      { host: endpoint.hostname,
        port: endpoint.port,
        serializetype: 'XML'});
  });

// TODO: Figure out how to manage service bus services better so that
// we can switch accounts to ones in the appropriate state
  describe('List Namespaces', function () {
    describe('No defined namespaces', function () {
      it('should return empty list of namespaces', function (done) {
        service.listNamespaces(function (err, namespaces) {
          should.exist(namespaces);
          namespaces.should.be.empty;
          done(err);
        });
      });
    });
  });

// TODO: Figure out how to manage service bus services better so that
// we can switch accounts to ones in the appropriate state
  describe.skip('Show namespace', function () {
    describe('namespace name exists', function () {
      it('should return the namespace definition', function (done) {
        service.getNamespace('cctsandbox', function (err, namespace) {
          should.not.exist(err);
          should.exist(namespace);
          namespace.Name.should.equal('cctsandbox');
          done(err);
        });
      });
    });
  });

  describe('Get regions', function() {
    it('should return array of available regions', function (done) {
      service.getRegions(function (err, result) {
        should.exist(result);
        result.should.be.an.instanceOf(Array);
        result.length.should.be.above(0);
        _.each(result, function (region) {
          should.exist(region.Code);
          should.exist(region.FullName);
        });
        done(err);
      });
    });
  });

});
