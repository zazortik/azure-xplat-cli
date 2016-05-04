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

'use strict';

var should = require('should');
var util = require('util');
var _ = require('underscore');

var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var NetworkTestUtil = require('../../../util/networkTestUtil');
var networkUtil = new NetworkTestUtil();

var testPrefix = 'arm-network-dns-zone-tests',
  groupName = 'xplat-test-dns-zone-record-set',
  location;

var zoneProp = {
  name: 'example1.com',
  tags: networkUtil.tags
};

var aProp = {
  name: 'set-a',
  type: 'A',
  ttl: 3600,
  newTtl: 255,
  params: '-a 192.168.17.18',
  zoneName: zoneProp.name,
  tags: networkUtil.tags,
  newTags: networkUtil.newTags
};
var aaaaProp = {
  name: 'set-aaaa',
  type: 'AAAA',
  ttl: 3600,
  params: '-b 2001:cafe:130::100',
  zoneName: zoneProp.name,
  tags: networkUtil.tags
};
var mxProp = {
  name: 'set-mx',
  type: 'MX',
  ttl: 3600,
  params: '-f 100 -e mail.test.com.',
  zoneName: zoneProp.name,
  tags: networkUtil.tags
};
var nsProp = {
  name: 'set-ns',
  type: 'NS',
  ttl: 3600,
  params: '-d ns1.com.',
  zoneName: zoneProp.name,
  tags: networkUtil.tags
};
var txtProp = {
  name: 'set-txt',
  type: 'TXT',
  ttl: 3600,
  params: '-x longtexthere',
  zoneName: zoneProp.name,
  tags: networkUtil.tags
};
var srvProp = {
  name: 'set-srv',
  type: 'SRV',
  ttl: 3600,
  params: '-p 1 -w 2 -o 3 -u target.com.',
  zoneName: zoneProp.name,
  tags: networkUtil.tags
};

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        zoneProp.location = location;
        zoneProp.group = groupName;

        aProp.group = zoneProp.group;
        aaaaProp.group = zoneProp.group;
        mxProp.group = zoneProp.group;
        nsProp.group = zoneProp.group;
        txtProp.group = zoneProp.group;
        srvProp.group = zoneProp.group;

        done();
      });
    });
    after(function (done) {
      networkUtil.deleteGroup(groupName, suite, function () {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('dns record-set', function () {
      it('create should create dns zone', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createDnsZone(zoneProp, suite, function () {
            done();
          });
        });
      });

      /**
       * A
       */
      it('create should create a record-set of type A', function (done) {
        networkUtil.createDnsRecordSet(aProp, suite, done);
      });
      it('set should modify a record-set', function (done) {
        var cmd = 'network dns record-set set -g {group} -z {zoneName} -n {name} -y {type} -l {newTtl} -t {newTags} --json'
          .formatArgs(aProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var aSet = JSON.parse(result.text);
          aSet.name.should.equal(aProp.name);
          aSet.properties.ttl.should.equal(aProp.newTtl);
          networkUtil.shouldAppendTags(aSet);
          done();
        });
      });
      it('show should display details of record-set', function (done) {
        networkUtil.showDnsRecordSet(aProp, suite, function (aSet) {
          aSet.name.should.equal(aProp.name);
          done();
        });
      });
      it('add-record should add a record of type A', function (done) {
        networkUtil.addDnsRecord(aProp, suite, function (aSet) {
          aSet.properties.aRecords.should.containEql({ipv4Address: '192.168.17.18'});
          done();
        });
      });
      it('delete-record should delete a record of type A', function (done) {
        networkUtil.deleteDnsRecord(aProp, suite, done);
      });
      it('list should display all record-sets in dns zone', function (done) {
        networkUtil.listDnsRecordSets(zoneProp, suite, function (sets) {
          var added = sets.length >= 2;
          added.should.equal(true);
          done();
        });
      });
      it('delete should delete record-set of type A', function (done) {
        networkUtil.deleteDnsRecordSet(aProp, suite, done);
      });

      /**
       * AAAA
       */
      it('create should create a record-set of type AAAA', function (done) {
        networkUtil.createDnsRecordSet(aaaaProp, suite, done);
      });
      it('add-record should add a record of type AAAA', function (done) {
        networkUtil.addDnsRecord(aaaaProp, suite, function (aaaaSet) {
          aaaaSet.properties.aaaaRecords.should.containEql({ipv6Address: '2001:cafe:130::100'});
          done();
        });
      });
      it('delete-record should delete a record of type AAAA', function (done) {
        networkUtil.deleteDnsRecord(aaaaProp, suite, done);
      });
      it('delete should delete record-set of type AAAA', function (done) {
        networkUtil.deleteDnsRecordSet(aaaaProp, suite, done);
      });

      /**
       * MX
       */
      it('create should create a record-set of type MX', function (done) {
        networkUtil.createDnsRecordSet(mxProp, suite, done);
      });
      it('add-record should add a record of type MX', function (done) {
        networkUtil.addDnsRecord(mxProp, suite, function (mxSet) {
          mxSet.properties.mxRecords.should.containEql({preference: 100, exchange: 'mail.test.com'});
          done();
        });
      });
      it('delete-record should delete a record of type MX', function (done) {
        networkUtil.deleteDnsRecord(mxProp, suite, done);
      });
      it('delete should delete record-set of type MX', function (done) {
        networkUtil.deleteDnsRecordSet(mxProp, suite, done);
      });

      /**
       * NS
       */
      it('create should create a record-set of type NS', function (done) {
        networkUtil.createDnsRecordSet(nsProp, suite, done);
      });
      it('add-record should add a record of type NS', function (done) {
        networkUtil.addDnsRecord(nsProp, suite, function (mxSet) {
          mxSet.properties.nsRecords.should.containEql({nsdname: 'ns1.com.'});
          done();
        });
      });
      it('delete-record should delete a record of type NS', function (done) {
        networkUtil.deleteDnsRecord(nsProp, suite, done);
      });
      it('delete should delete record-set of type NS', function (done) {
        networkUtil.deleteDnsRecordSet(nsProp, suite, done);
      });

      /**
       * TXT
       */
      it('create should create a record-set of type TXT', function (done) {
        networkUtil.createDnsRecordSet(txtProp, suite, done);
      });
      it('add-record should add a record of type TXT', function (done) {
        networkUtil.addDnsRecord(txtProp, suite, function (mxSet) {
          mxSet.properties.txtRecords.should.containEql({value: 'longtexthere'});
          done();
        });
      });
      it('delete-record should delete a record of type TXT', function (done) {
        networkUtil.deleteDnsRecord(txtProp, suite, done);
      });
      it('delete should delete record-set of type TXT', function (done) {
        networkUtil.deleteDnsRecordSet(txtProp, suite, done);
      });

      /**
       * SRV
       */
      it('create should create a record-set of type SRV', function (done) {
        networkUtil.createDnsRecordSet(srvProp, suite, done);
      });
      it('add-record should add a record of type SRV', function (done) {
        networkUtil.addDnsRecord(srvProp, suite, function (mxSet) {
          mxSet.properties.srvRecords.should.containEql({priority: 1, weight: 2, port: 3, target: 'target.com'});
          done();
        });
      });
      it('delete-record should delete a record of type SRV', function (done) {
        networkUtil.deleteDnsRecord(srvProp, suite, done);
      });
      it('delete should delete record-set of type SRV', function (done) {
        networkUtil.deleteDnsRecordSet(srvProp, suite, done);
      });
    });
  });
});