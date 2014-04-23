# Microsoft Azure Xplat-CLI for Windows, Mac and Linux

[![NPM version](https://badge.fury.io/js/azure-cli.png)](http://badge.fury.io/js/azure-cli) [![Build Status](https://travis-ci.org/Azure/azure-sdk-tools-xplat.png?branch=master)](https://travis-ci.org/Azure/azure-sdk-tools-xplat)

This project provides a cross-platform command line interface for developers and IT administrators to develop, deploy and manage Microsoft Azure applications.

## Features

* Accounts
    * Azure Active Directory authentication for Organizational ID
    * Download and import Azure publish settings
    * List imported Azure subscriptions
    * Select current subscription
    * Manage Azure environments
    * Create and manage affinity groups
    * Export management certificate
* Storage
    * Create and manage Storage Accounts
    * Create and manage container, blob and ACL
* Websites
    * Create and manage Microsoft Azure websites
    * Download site log files and get real time log streaming
    * Manage Deployments
    * Configure GitHub integration
    * Create, manage and swap slots
    * Create and manage WebJobs
* Virtual machines
    * Create and manage Windows and Linux Virtual machines
    * Create and manage VM endpoints
    * Create and manage Virtual Machine Images
    * Create and manage certificates
    * CloudInit for Ubuntu VM
* Network
    * Import and export network configuration
    * Create and manage virtual network
    * Create and manage DNS server
* Mobile Services
    * Create and manage Mobile Services
    * Manage tables, scripts, and configuration
    * Access logs
    * Access data
* Service Bus
    * Create and manage Service Bus namespaces
* SQL Database
    * Create and manage SQL Servers, Firewall rules and Databases
* Resource Manager
    * Manage resource groups and deployments
    * Query and download gallery templates
    * Manage individual resources

## Installation

### Install from npm

You can install the azure-cli npm package directly.
```bash
npm install -g azure-cli
```

### Pre-compiled installers

* Windows
* Mac
* Linux

### Download Source Code

To get the source code of the SDK via **git** just type:

```bash
git clone https://github.com/Azure/azure-sdk-tools-xplat.git
cd ./azure-sdk-tools-xplat
npm install
```

### Configure auto-complete

Auto-complete is supported for Mac and Linux.

To enable it in zsh, run:

```bash
echo '. <(azure --completion)' >> .zshrc
```

To enable it in bash, run:

```bash
azure --completion >> ~/azure.completion.sh
echo 'source ~/azure.completion.sh' >> .bash_profile
```

## Get Started

In general, following are the steps:

* Get yourself authenticated with Microsoft Azure. For details, please check out [this article](http://www.windowsazure.com/en-us/documentation/articles/xplat-cli/).
  * Option 1: Login with your Organizational account. Azure Active Directory authentication is used in this case. No management certificate is needed. **Note**: Microsoft account is not supported in this approach right now. You can create an Organizational account from the Azure portal for free.
  * Option 2: Download and import a publish settings file which contains a management certificate.
* Use the commands

The first step can be different for different environment you are targeting. Following are detail instructions for each supported environment.

### Microsoft Azure

If you use both mechanisms on the same subscription, Azure Active Directory authentication always wins. If you want to go back to management certificate authentication, please use ``azure logout``, which will remove the Azure Active Directory information and bring management certificate authentication back in.

#### Login directly from xplat-cli (Azure Active Directory authentication)

```bash
# This will prompt for your password in the console
azure login -u <your organizational ID email address>

# use the commands to manage your services/applications
azure site create --location "West US" mywebsite
```

#### Use publish settings file (Management certificate authentication)

```bash
# Download a file which contains the publish settings information of your subscription.
# This will open a browser window and ask you to log in to get the file.
azure account download

# Import the file you just downloaded.
# Notice that the file contains credential of your subscription so you don't want to make it public
# (like check in to source control, etc.).
azure account import <file location>

# Use the commands to manage your services/applications
azure site create --location "West US" mywebsite
```

## 2 Modes

Starting from 0.8.0, we are adding a separate mode for Resource Manager. You can use the following command to switch between the

* Service management: commands using the Azure service management API
* Resource manager: commands using the Azure Resource Manager API

They are not designed to work together.

```bash
azure config mode asm # service management
azure config mode arm # resource manager
```

**For more details on the commands, please see the [command line tool reference](http://go.microsoft.com/fwlink/?LinkId=252246&clcid=0x409) and this [How to Guide](http://www.windowsazure.com/en-us/develop/nodejs/how-to-guides/command-line-tools/)**

## Running tests

The tests included in the repository execute CLI commands against live Widows Azure management endpoints. In order to run the tests, you must have a Microsoft Azure subscription as well as a GitHub account.

Before running tests, you must take a one-time action to configure the CLI with the Microsoft Azure subscription by running

```bash
azure account download
azure account import
```

Next, provide the following parameters by setting environment variables:

- `AZURE_STORAGE_ACCOUNT` - your Microsoft Azure Storage Account name
- `AZURE_STORAGE_ACCESS_KEY` - secret access key to that Storage Account
- `AZURE_SERVICEBUS_NAMESPACE` - your Microsoft Azure Service Bus Namespace
- `AZURE_SERVICEBUS_ACCESS_KEY` - secret access to that Service Bus namespace
- `AZURE_GITHUB_USERNAME` - GitHub account username
- `AZURE_GITHUB_PASSWORD` - GitHub account password
- `AZURE_GITHUB_REPOSITORY` - name an empty GitHub repository to use during tests (e.g. `tjanczuk/clitest`)
- `SSHCERT` - path of SSH Certificate (eg. `path\cert.pem`)
- `BLOB_SOURCE_PATH` - source url path for disk upload (`container\subcontainer\disk.vhd`)


To run the tests, call

```bash
npm test
```

from the root of your clone of the repository. Most tests execute against live Microsoft Azure management APIs, and running them takes considerable time.

Note: by default, the tests targeting the Microsoft Azure Mobile Services run against a mocked Microsoft Azure HTTP endpoints. In order to execute these tests against live Microsoft Azure management APIs instead, set the `NOCK_OFF=true` environment variable before running the tests.

## Learn More
For documentation on how to host Node.js applications on Microsoft Azure, please see the [Microsoft Azure Node.js Developer Center](http://www.windowsazure.com/en-us/develop/nodejs/).

For more extensive  documentation on the new cross platform CLI tool for Mac and Linux, please see this [reference](http://go.microsoft.com/fwlink/?LinkId=252246&clcid=0x409) and this [How to Guide](http://www.windowsazure.com/en-us/develop/nodejs/how-to-guides/command-line-tools/)
