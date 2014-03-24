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

exports = module.exports;

var Constants = {
  API_VERSIONS: {
    ASM: 'asm',
    ARM: 'arm'
  },

  /**
  * Constant default http port.
  *
  * @const
  * @type {string}
  */
  DEFAULT_HTTP_PORT: 80,

  /**
  * Constant default https port.
  *
  * @const
  * @type {string}
  */
  DEFAULT_HTTPS_PORT: 443,

  /**
  * Constant manangement url.
  *
  * @const
  * @type {string}
  */
  DEFAULT_MANAGEMENTENDPOINT_URL: 'https://management.core.windows.net',

  /**
  * Constant management endpoint for ARM resources
  *
  * @const
  * @type {string}
  */
  DEFAULT_RESOURCE_MANAGER_ENDPOINT_URL: 'https://management.azure.com/',

  /**
  * Constant SQL manangement url.
  *
  * @const
  * @type {string}
  */
  DEFAULT_SQL_MANAGEMENTENDPOINT_URL: 'https://management.core.windows.net:8443/',

  /**
  * Constant hostname suffix.
  *
  * @const
  * @type {string}
  */
  DEFAULT_HOSTNAME_SUFFIX: 'azurewebsites.net',

  /**
  * Constant SQL database hostname suffix.
  *
  * @const
  * @type {string}
  */
  DEFAULT_AZURE_SQL_SERVER_HOSTNAME_SUFFIX: '.database.windows.net',

  /**
  * Constant global publishing profile download url.
  *
  * @const
  * @type {string}
  */
  GLOBAL_PUBLISHINGPROFILE_URL: 'http://go.microsoft.com/fwlink/?LinkId=254432',

  /**
  * Constant china publishing profile download url.
  *
  * @const
  * @type {string}
  */
  CHINA_PUBLISHINGPROFILE_URL: 'http://go.microsoft.com/fwlink/?LinkID=301774',

  /**
  * Constant publishing profile download url.
  *
  * @const
  * @type {string}
  */
  DEFAULT_PUBLISHINGPROFILE_URL: 'http://go.microsoft.com/fwlink/?LinkId=254432',

  /**
  * Constant portal url.
  *
  * @const
  * @type {string}
  */
  GLOBAL_PORTAL_URL: 'http://go.microsoft.com/fwlink/?LinkId=254433',

  /**
  * Constant portal url.
  *
  * @const
  * @type {string}
  */
  CHINA_PORTAL_URL: 'http://go.microsoft.com/fwlink/?LinkId=301902',

  /**
  * Constant portal url.
  *
  * @const
  * @type {string}
  */
  DEFAULT_PORTAL_URL: 'http://go.microsoft.com/fwlink/?LinkId=254433',

  /**
  * Constant default active directory endpoint. By default, AD is not supported
  *
  * @const
  * @type {string}
  */
  DEFAULT_ACTIVEDIRECTORY_ENDPOINT_URL: null,

  /**
  * Constant default name of common ad tenant
  *
  * @const
  * @type {string}
  */
  DEFAULT_COMMON_ACTIVEDIRECTORY_TENANT_NAME: 'common',

  /**
  * Constant AD endpoint for public azure
  *
  * @const
  * @type {string}
  */
  GLOBAL_ACTIVEDIRECTORY_ENDPOINT_URL: 'https://login.windows.net',

  /**
  * Constant template gallery endpoint for public azure
  *
  * @const
  * @type {string}
  */
  DEFAULT_GALLERY_ENDPOINT_URL: 'https://gallery.azure.com/',

  /**
  * Constant client ID used by the CLI
  *
  * @const
  * @type {string}
  */
  XPLAT_CLI_CLIENT_ID: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',

  /**
  * Constant AD resource identifier for azure management endpoint
  *
  * @const
  * @type {string}
  */
  AZURE_MANAGEMENT_RESOURCE_ID: 'https://management.core.windows.net/',

  /**
  * Constant xml2js 1.0 metadata marker.
  *
  * @const
  * @type {string}
  */
  XML_METADATA_MARKER: '@',

  /**
  * Constant xml2js 1.0 value marker.
  *
  * @const
  * @type {string}
  */
  XML_VALUE_MARKER: '#',

  Namespaces: {
    Arrays: 'http://schemas.microsoft.com/2003/10/Serialization/Arrays',
    WindowsAzure: 'http://schemas.microsoft.com/windowsazure',
    XMLSchema: 'http://www.w3.org/2001/XMLSchema-instance'
  }
};

module.exports = Constants;