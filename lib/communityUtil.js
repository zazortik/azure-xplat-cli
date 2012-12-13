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

// Module dependencies.
var http = require('http');
var url = require('url');
var util = require('util');

var ServiceClient = require('../node_modules/azure/lib/services/core/serviceclient');
var WebResource = require('../node_modules/azure/lib/http/webresource');
var Constants = require('../node_modules/azure/lib/util/constants');
var HeaderConstants = Constants.HeaderConstants;

// Expose 'CommunityUtil'.
exports = module.exports = CommunityUtil;

/**
* Creates a new CommunityUtil object.
*
* @constructor
*/
function CommunityUtil() {
  CommunityUtil.super_.call(this);
  this.Constants = {
	SERVICEHOST : 'vmdepot.msopentech.com',
	SERVICE: '/OData.svc'
  };

  this._initDefaultFilter();
}

util.inherits(CommunityUtil, ServiceClient);

/**
* Resolve uid
*
* @param {function} callback  The callback function called on completion. Required.
*/
CommunityUtil.prototype.resolveUid = function (uid, callback) {
  var path = this.Constants.SERVICE + '/ResolveUid?uid=\''+uid + '\'';
  var webResource = WebResource.get(path);
  this.performRequest(webResource, null, null, function (responseObject, next) {
    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.response);
    };

    next(responseObject, finalCallback);
  });
};

/**
* Builds the request options to be passed to the http.request method.
*
* @param {WebResource} webResource The webresource where to build the options from.
* @param {object}      options     The request options.
* @param {function(error, requestOptions)}  callback  The callback function.
* @return {undefined}
*/
CommunityUtil.prototype._buildRequestOptions = function(webResource, options, callback) {
  var self = this;

  webResource.addOptionalHeader(HeaderConstants.CONTENT_TYPE, self._getContentType());
  webResource.addOptionalHeader(HeaderConstants.ACCEPT_HEADER, self._getAcceptType());
  webResource.addOptionalHeader(HeaderConstants.ACCEPT_CHARSET_HEADER, 'UTF-8');
  webResource.addOptionalHeader(HeaderConstants.HOST_HEADER, self.host);

  if (!webResource.headers || !webResource.headers[HeaderConstants.CONTENT_LENGTH]) {
    webResource.addOptionalHeader(HeaderConstants.CONTENT_LENGTH, 0);
  }

  var requestOptions = {
    url: url.format({
      protocol: 'http',
      hostname: self._getHostname(),
      port: self.port,
      pathname: webResource.path + webResource.getQueryString(true)
    }),
    method: webResource.httpVerb,
    headers: webResource.headers,
    key: self.keyvalue,
    cert: self.certvalue
  };

  self._setRequestOptionsProxy(requestOptions);
  callback(null, requestOptions);
};

/**
* Get the content-type string based on serializeType
*
* @return {string}
*/
CommunityUtil.prototype._getContentType = function() {
    return 'application/xml';
};

/**
* Get the accept header string based on serializeType
*
* @return {string}
*/
CommunityUtil.prototype._getAcceptType = function() {
    return 'application/json';
};

/**
* Get service host name
*/
CommunityUtil.prototype._getHostname = function () {
  return this.Constants.SERVICEHOST;
};
