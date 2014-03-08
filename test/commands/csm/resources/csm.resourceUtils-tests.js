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

var assert = require('assert');
var testutil = require('../../../util/util');

var resourceUtil = testutil.libRequire('commands/csm/resources/resourceUtils');

suite('resourceUtil-tests', function() {
  test('should merge', function (done) {
    var source = {
      'a' : 'a-val-new',
      'a-nest-prop':{
        'a-nest': 'a-nest-val-new',
        'a-nest-nest-prop': {
          'a-nest-nest' : 'a-nest-nest-val'
        }
      }
    };
    var dest = {
      'a' : 'a-val',
      'b' : 'b-val',
      'a-nest-prop':{
        'a-nest': 'a-nest-val-2'
      }
    };
    resourceUtil.mergeCsmResourceProperties(dest, source);
    
    assert.equal(dest['a'], 'a-val-new');
    assert.equal(dest['b'], 'b-val');
    assert.equal(dest['a-nest-prop']['a-nest'], 'a-nest-val-new');
    assert.equal(dest['a-nest-prop']['a-nest-nest-prop']['a-nest-nest'], 'a-nest-nest-val');
    done();
  });

});
