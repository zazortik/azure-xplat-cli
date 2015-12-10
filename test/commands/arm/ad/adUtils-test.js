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

var adUtils;

try {
  adUtils = require('../../../../lib/commands/arm/ad/adUtils._js');
} catch (err) {
  if (err.code === 'MODULE_NOT_FOUND') {
    adUtils = require('../../../../lib/commands/arm/ad/adUtils.js');
  } else {
    throw error;
  }
}

describe('ad-utils', function () {
  it('should report error when either no values or more than one parameter values provided', function () {
    //throw when no parameter value was provided
    (function () {
      adUtils.validateParameters({ upn: '' });
    }).should.throw();
    
    //throw when more than one parameter values were provided
    (function () {
      adUtils.validateParameters({ upn: 'test1@foo.com', spn: 'test2@bar.com' });
    }).should.throw();

    //No exceptions when there is only one parameter value provided
    adUtils.validateParameters({ upn: 'test1@foo.com', spn: '' });

    //No exceptions when there is no parameter at all.
    adUtils.validateParameters({});
    
  });
});