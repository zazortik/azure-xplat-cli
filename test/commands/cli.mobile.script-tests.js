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
var fs = require('fs');
var MobileTest = require('../util/mobileTest');
var utils = require('../../lib/util/utils');

var suite;
var servicename;
var testArtifactDir;

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject();

mobileTest.createServicesAndRunForEach(scriptTests);

function scriptTests(service) {
  //script commands
  it('script list is empty', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;
    testArtifactDir = mobileTest.testArtifactDir;

    suite.execute('mobile script list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.include({
        "table": []
      });
      done();
    });
  });

  it('table create adds table1', function (done) {
    suite.execute('mobile table create %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script upload insert script', function (done) {
    suite.execute('mobile script upload %s table/table1.insert -f ' + testArtifactDir + '/table1.insert.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script upload read script', function (done) {
    suite.execute('mobile script upload %s table/table1.read -f ' + testArtifactDir + '/table1.read.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script upload update script', function (done) {
    suite.execute('mobile script upload %s table/table1.update -f ' + testArtifactDir + '/table1.update.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script upload delete script', function (done) {
    suite.execute('mobile script upload %s table/table1.delete -f ' + testArtifactDir + '/table1.delete.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script list all scripts', function (done) {
    suite.execute('mobile script list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.table).should.be.ok;
      response.table.length.should.equal(4);
      response.table.forEach(function (item) {
        switch (item.operation) {
        case 'insert':
          {
            item.table.should.equal('table1');
            item.selflink.should.include(servicename + '/repository/service/table/table1.insert.js');
            item.should.have.property('sizeBytes');
          }
          break;
        case 'update':
          {
            item.table.should.equal('table1');
            item.selflink.should.include(servicename + '/repository/service/table/table1.update.js');
            item.should.have.property('sizeBytes');
          }
          break;
        case 'delete':
          {
            item.table.should.equal('table1');
            item.selflink.should.include(servicename + '/repository/service/table/table1.delete.js');
            item.should.have.property('sizeBytes');
          }
          break;
        case 'read':
          {
            item.table.should.equal('table1');
            item.selflink.should.include(servicename + '/repository/service/table/table1.read.js');
            item.should.have.property('sizeBytes');
          }
          break;
        default:
          {
            false.should.not.be.false;
          }
          break;
        }
      });
      done();
    });
  });

  it('script delete read script', function (done) {
    suite.execute('mobile script delete %s table/table1.read --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script upload apns script', function (done) {
    suite.execute('mobile script upload %s shared/apnsFeedback -f ' + testArtifactDir + '/feedback_upload.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script download apns script', function (done) {
    suite.execute('mobile script download %s shared/apnsFeedback -o -f ' + testArtifactDir + '/feedback_download.js --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.errorText.should.equal('');
      result.text.should.equal('');
      var data_str = null;
      fs.readFileSync(testArtifactDir + '/feedback_download.js', 'utf8', function (err, data) {
        if (err) {
          return console.log(err);
        }
        data_str = data;
      });
      fs.readFileSync(testArtifactDir + '/feedback_upload.js', 'utf8', function (err, data) {
        if (err) {
          return console.log(err);
        }
        data.should.equal(data_str);
      });

      try {
        fs.unlinkSync(testArtifactDir + '/feedback_download.js');
      } catch (e) {}
      done();
    });
  });

  it('script list has apns but no read', function (done) {
    suite.execute('mobile script list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.shared).should.be.ok;
      response.shared.length.should.equal(1);
      response.shared[0].name.toLowerCase().should.equal('apnsfeedback.js');

      Array.isArray(response.table).should.be.ok;
      response.table.length.should.equal(3);
      response.table.forEach(function (item) {
        item.operation.should.not.equal('read');
      });
      done();
    });
  });

  // Source control tests for shared scripts
  it('script upload shared script', function (done) {
    suite.execute('mobile script upload %s shared/test -f ' + testArtifactDir + '/table1.delete.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script upload changes shared script', function (done) {
    suite.execute('mobile script upload ' + servicename + ' shared/test -f ' + testArtifactDir + '/table1.read.js --json', function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script delete shared script', function (done) {
    suite.execute('mobile script delete %s shared/test --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });
}
