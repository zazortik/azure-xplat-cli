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

var VMConstants = {
  EXTENSIONS: {
    TYPE: 'Microsoft.Compute/virtualMachines/extensions',

    LINUX_DIAG_NAME: 'LinuxDiagnostic',
    LINUX_DIAG_PUBLISHER: 'Microsoft.OSTCExtensions',
    LINUX_DIAG_VERSION: '2.2',
    IAAS_DIAG_NAME: 'IaaSDiagnostics',
    IAAS_DIAG_PUBLISHER: 'Microsoft.Azure.Diagnostics',
    IAAS_DIAG_VERSION: '1.5',

    DOCKER_PORT: 2376,
    DOCKER_VERSION_ARM: '1.0',
    DOCKER_VERSION_ASM: '1.*',
    DOCKER_NAME: 'DockerExtension',
    DOCKER_PUBLISHER: 'Microsoft.Azure.Extensions',

    LINUX_ACCESS_VERSION: '1.1',
    LINUX_ACCESS_NAME: 'VMAccessForLinux',
    LINUX_ACCESS_PUBLISHER: 'Microsoft.OSTCExtensions',
    WINDOWS_ACCESS_VERSION: '2.0',
    WINDOWS_ACCESS_NAME: 'VMAccessAgent',
    WINDOWS_ACCESS_PUBLISHER: 'Microsoft.Compute',

    BGINFO_VERSION: '2.1',
    BGINFO_NAME: 'BGInfo',
    BGINFO_PUBLISHER: 'Microsoft.Compute',

    AZURE_DISK_ENCRYPTION_WINDOWS_EXTENSION_VERSION: '1.0',
    AZURE_DISK_ENCRYPTION_WINDOWS_EXTENSION_NAME: 'AzureDiskEncryption',
    AZURE_DISK_ENCRYPTION_WINDOWS_EXTENSION_PUBLISHER: 'Microsoft.Azure.Security',
    AZURE_DISK_ENCRYPTION_LINUX_EXTENSION_VERSION: '0.1',
    AZURE_DISK_ENCRYPTION_LINUX_EXTENSION_NAME: 'AzureDiskEncryptionForLinux',
    AZURE_DISK_ENCRYPTION_LINUX_EXTENSION_PUBLISHER: 'Microsoft.OSTCExtensions',
    EXTENSION_PROVISIONING_SUCCEEDED: 'Succeeded'
  }
};

module.exports = VMConstants;
