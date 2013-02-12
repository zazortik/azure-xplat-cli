# Windows Azure CLI tool for Mac and Linux

This project provides a cross platform command line tool for managing Windows Azure Websites and Virtual Machines.

With Windows Azure Websites you can deploy node.js applications to the cloud in just seconds using git. 

# CLI Features

* Accounts
    * Download and import Azure publish settings
    * Create and manage Storage Accounts
* Websites
    * Create and manage Windows Azure websites
    * Download site logs
    * Manage Deployments
    * Configure Github integration
* Virtual machines
    * Create and manage Windows and Linux Virtual machines
    * Create and manage VM endpoints
    * Create and manage Virtual Machine Images
    * Create and manage certificates
* Mobile Services
    * Create and manage Mobile Services
    * Manage tables, scripts, and configuration
    * Access logs
    * Access data
* Service Bus
    * Create and manage Service Bus namespaces
* Azure SQL Server
    * Create and manage SQL Servers, Firewall rules and Databases
    
# Getting Started
## Download Source Code

To get the source code of the SDK via **git** just type:

    git clone https://github.com/WindowsAzure/azure-sdk-tools-xplat.git
    cd ./azure-sdk-tools-xplat
    npm install 

## Install the npm package

You can install the azure cli npm package directly. 

    npm install -g azure-cli

# Using the cli

The azure cli has several top-level commands, which correspond to different features of Windows Azure. Each top-level command is then broken up into further sub commands. Typing "azure" by itself or "azure --help" will list out each of the sub commands.

Below is a list of some of the more common commands and explanations on how to use them. 

## azure account - Managing Azure accounts

In order to use the CLI, you must first import credentials.

    azure account download
Download your credentials from Windows Azure. Logs you in to the Azure portal and downloads a publishsettings file.

    azure account import [file]
Imports previously downloaded credentials

### azure account storage - Manage Azure Storage accounts

You can create and manage store accounts for leveraging blobs, tables and queues within your applications.

    azure account storage list
Lists all your storage accounts

    azure account storage create [name]
Creates a new storage account

**--location** - Location for the storage account 

**--affinitygroup** - Affinity group for the storage account

**Note:** Either location or affinity group is required.

    azure account storage update [name]
Updates a storage account label, description, etc.

    azure account storage delete [name]
Removes the storage account

    azure account storage keys list [name]
Lists out storage account keys for the specified account

    azure account storage keys renew [name]
Renews storage account keys for the specified account

## azure site - Managing Windows Azure Websites

You can create websites for deploying static HTML, node.js, PHP, and .NET applications.

    azure site list
Lists all your websites

    azure site create [site]
Creates a new Windows Azure website. If run in a folder that has an app.js or a server.js, we will assume this is a node.js application and create an iisnode.yml file for configuring the node hosted environment. 

**--git** - create a git repo for deploying the application. Will call "git init" to initialize the local folder as repo and will add an "azure" remote for the remote repository. --publishingUsername can be used for scripting scenarios. If publishing user is not provider, you will be prompted. ex. "azure site create foo --git".

**--github** - connect this website to a github repo. If run in a local repo, will use the remotes present. --githubusername / --githubpassword / -- githubrepository can be used for scripting scenarios. If these are not provided, you will be prompted. ex. "azure site create foo --github"

    azure site show [site]
Lists the details for a specific website. 

    azure site browse [site]
Opens the website in the browser. 

    azure site delete [site]
Deletes the current site. Will prompt for deletion.

    azure site stop [site]
Stops the website

    azure site start [site]
Starts the website

    azure site restart [site]
Stops and starts the website

    azure site deploymentscript 
Generates a bash or cmd script for customizing the deployment of your Website

**--quiet** - overrides prompting for delete.

**Note:** Above [site] is not required if the command is run in the main app folder.

### azure site config - Managing site app settings

You can set application settings, which will propagate to environment variables for your node and PHP applications. Changes are instant, and you do not need to stop/start the app to pick up the new variables.

    azure site config list [site]
Lists all application settings.

    azure site config add [keyvaluepair] [site]
Adds a new app setting. [keyvaluepair] is of the form "[key]=[value]" i.e. "foo=bar".

    azure site config clear [key] [site]
Removes the specified app setting.

    azure site config get [key] [site]
Retrieves the value for the selected key.

    azure site log tail [options] [name]
Streams live diagnostic logs from your website to the console
**--path [path]** - Path under the LogFiles folder to pull logs from.

**--filter** - Filter to match against for displaying log output.

**--log** - Write output in a log format.

## azure vm - Managing Windows Azure virtual machines.

You can create and manage both Windows and Linux virtual machines in Windows Azure.

    azure vm list
List your virtual machines and their statuses

    azure vm location list
List available locations for hosting virtual machines.

    azure vm create [name] [image] [username] [password] [location]
Create a new virtual machine using the specific image and credentials. An image can be a base image or an custom image uploaded to your account ex. "azure create myvm SUSE__openSUSE-12-1-20120603-en-us-30GB.vhd user pa$$w0rd westus".

**--ssh [port]** - Enable a Linux VM to be remotely administered via ssh. By default port 22 is chosen.

**--rdp [port]** - Enable a Windows VM to be remotely administered via RDP. By default port 3389 is chosen.

**--community** - Specifies that the image is a community image

    azure vm create-from [name] [rolefile]
Create a virtual machine from a previously exported rolefile.

    azure vm export [name] [file]
Export a virtual machine definition.

    azure vm show [name]
Display details about the VM.

    azure vm shutdown [name]
Stop the virtual machine

    azure vm start
Start a previously shutdown virtual machine

    azure vm restart [name]
Restart the virtual machine

    azure vm delete [name]
Delete the virtual machine

### azure vm image - Managing VM images

Windows Azure allows you to create virtual machines using a set of preconfigured based images or using your own custom images which you create either by uploaded, or saving an existing vm.

    azure vm image list
List base and custom vm images

    azure vm image show [image]
Show details about a specific image

    azure vm image create [name] [path]
Upload a new custom image. The path can point to a local file or a public hosted blob, including a secure blob.

**--os [os]** - specify the OS, "Linux" or "Windows"

**--basevhd [blob]** - Specify a base vhd blob url.

**--source-key [key]** - If the blob is secured, specifies the access key.

    azure vm image delete [name]
Deletes the specified image.

### azure vm disk - Managing VM data disks

You can create additional data disks, which you mount within your virtual machines.

    azure vm disk list
Lists available data disks

    azure vm disk show [name]
Displays details on a specific disk

    azure vm disk create [name] [path]
Uploads and creates a new disk using the specified path. The path can point to a local file or a public hosted blob, including a secure blob.

**--source-key [key]** - If the blob is secured, specifies the access key.

    azure vm disk attach [vm-name] [image]
Attaches an image to an existing VM.

    azure vm disk detach [vm-name] [image]
Detaches an image from an existing VM.

## azure mobile - Managing Azure Mobile Services

You can create and manage your mobile services right from the cli. You can create new services and databases, work directly with table data, and manage scripts and more.

    azure mobile list
Lists all mobile services for this subscription

    azure mobile create [servicename] [sqlAdminUsername] [sqlAdminPassword]
Creates a new mobile service using the specific service name. Also creates a new SQL Database using the specified user and password.
 
    azure mobile show [servicename]
Displays details about a mobile service including database details, applicationUrl and applicationKey

    azure mobile delete [servicename]
Deletes a mobile service 

## azure mobile scale - Manage scale for your mobile service

    azure mobile scale show [servicename]
Show the scalability settings of a mobile sservice

    azure mobile scale change [options] [servicename]
Change the scalability settings of a mobile service

**--computeMode [mode]** - 'Free' or 'Reserved'

**--numberOfInstances [count]** - number of instances in reserved mode.

    azure mobile log [servicename]
Retrieves mobile logs 

### azure mobile config - Manage your mobile service configuration

You can configure your Microsoft account, Facebook, Twitter, Google and push notification settings using these commands.

    azure mobile config list [servicename]
Lists the available mobile configuration settings and their values

    azure mobile config set [servicename] [key] [value]
Sets mobile configuration settings

    azure mobile config get [servicename] [key]
Gets a specific mobile configuration setting

### azure mobile table - Manage your mobile service tables

    azure mobile table list [servicename]
List the tables for a specific service

    azure mobile table create [servicename] [tablename]
Creates a new table for your mobile service

**--permissions [permissions]** - comma delimited list of <operation>=<permission> pairs

    azure mobile table show [servicename] [tablename]
Display table details such as the number of records, the list of columns and which scripts are defined.

    azure mobile table update [options] [servicename] [tablename] 
Updates mobile table schema, permissions and indexes

**--permissions [permissions]** - comma delimited list of <operation>=<permission> pairs

**--deleteColumn [columns]** - comma delimited list of columns to delete

    azure mobile table delete [servicename] [tablename]
Deletes a mobile table

### azure mobile script - Manage your mobile service scripts

You can create and upload scripts for your table operations.

    azure mobile script list
List scripts for the specified service

    azure mobile script download [servicename] [scriptname]
Downloads the specified script. Table script names are in the format table/.{read|insert|update|delete} (e.g. table/todoitem.insert)

    azure mobile script upload [servicename] [scriptname]
Uploads a script

    azure mobile script delete [servicename] [scriptname]
Deletes a script

### azure mobile data - Manage data from your mobile service

    azure mobile data read [servicename] [tablename] [query]
Query a mobile service table

    azure mobile data truncate [servicename] [tablename]
Delete all data from a mobile service table
**--quiet** - do not prompt before deleting

### azure mobile job - Manage scheduled jobs

    azure mobile job list [servicename]
List jobs

    azure mobile job create [servicename] [jobname]
Create a new job

**--interval [number]** - Interval for executing the job, defaults to 15.

**--intervalUnit [unit]** - 'minute', 'hour', 'day', 'month' or 'none'. 

**--startTime [time]** - Time that the script should start in ISO format

    azure mobile job update [servicename] [jobname]
Update job settings

**--interval [number]** - Interval for executing the job, defaults to 15.

**--intervalUnit [unit]** - 'minute', 'hour', 'day', 'month' or 'none'. 

**--startTime [time]** - Time that the script should start in ISO format

**--status [status]** - 'enabled' or 'disabled'

    azure mobile job delete [servicename] [jobname]
Delete a scheduled job

## azure sb - Manage your Service Bus configuration

### azure sb namespace - Manage your Service Bus namespaces

    azure sb namespace list
List all your Service Bus namespaces

    azure sb namespace create [namespace] [region]
Create a new Service Bus namespace in the specified region

    azure sb namespace show [name]
Display details about a namespace such as the connection string and endpoint information

    azure sb namespace check [name]
Check if a namespace is available

    azure sb namespace delete [name]
Delete a namespace

    azure sb namespace location list
Lists all available regions for creating new namespaces

## azure sql - Manage Azure SQL

### azure sql server - Manage your Azure SQL Servers

    azure sql server show [serverName]
Display server details

    azure sql server list
Lists all your Azure SQL Servers

    azure sql server create [administratorLogin] [administratorPassword] [location]
Create a new Azure SQL Server

**--administratorLogin** - Administrator login user

**--administratorPassword** - Administrator Password

**--location** - Region where the server will be located

    azure sql server delete [serverName]
Delete an Azure SQL Server

### azure sql firewallrule - Manage you Azure SQL Firewall Rules

    azure sql firewallrule create [serverName] [ruleName] [startIPAddress] [endIPAddress]
Create a new firewall rule

**--serverName** - Server to create the rule on.

**--ruleName** - Name for the rule

**--startIPAddress** - Start IP Range for the rule

**--endIPAddress** - (Optional) End IP Range for the rule. If not supplied this will equal startIPAddress.

    azure sql firewallrule show [serverName] [rulename]
Show details for a firewall rule

**--serverName** - Server the rule resides on.

**--ruleName** - Rule to show

    azure sql firewallrule list [serverName]
List all firewall rules on specified server.

**--serverName** - Server to list rules for

    azure sql firewall delete [serverName] [ruleName]
Delete a rule

**--serverName** - Server where the rule resides

**--ruleName** - Rule to delete.

### azure sql db - Manage Azure SQL Databases

    azure sql db create [serverName] [databaseName] [administratorLogin] [administratorPassword] [options]
Create a new database

**--serverName** - Server to create the database on

**--databaseName** - Name for the database

**--administratorLogin** - Administrator login user

**--administratorPassword** - Administrator Password

**--collationName** - Collation for the DB

**--edition** - Database edition

**--maxSizeInGB** - Database max size

    azure sql db list [serverName] [administratorLogin] [administratorPassword]
List databases

**--serverName** - Server to create the database on

**--administratorLogin** - Administrator login user

**--administratorPassword** - Administrator Password

    azure sql db show [serverName] [databaseName] [administratorLogin] [administratorPassword]
Show database details

**--serverName** - Server to create the database on

**--databaseName** - Name for the database

**--administratorLogin** - Administrator login user

**--administratorPassword** - Administrator Password

    azure sql db delete [serverName] [databaseName] [administratorPassword]
Delete a database

**--serverName** - Server to create the database on

**--databaseName** - Name for the database

**--administratorPassword** - Administrator Password
    

**For more details on the commands, please see the [command line tool reference](http://go.microsoft.com/fwlink/?LinkId=252246&clcid=0x409) and this [How to Guide](http://www.windowsazure.com/en-us/develop/nodejs/how-to-guides/command-line-tools/)**

# Need Help?

Be sure to check out the Windows Azure [Developer Forums on Stack Overflow](http://go.microsoft.com/fwlink/?LinkId=234489) if you have trouble with the provided code.

# Contribute Code or Provide Feedback

If you would like to become an active contributor to this project please follow the instructions provided in [Windows Azure Projects Contribution Guidelines](http://windowsazure.github.com/guidelines.html).

If you encounter any bugs with the library please file an issue in the [Issues](https://github.com/WindowsAzure/azure-sdk-for-node/issues) section of the project.

## Running tests

The tests included in the repository execute CLI commands against live Widows Azure management endpoints. In order to run the tests, you must have a Windows Azure subscription as well as a GitHub account. 

Before running tests, you must take a one-time action to configure the CLI with the Windows Azure subscription by running

```
azure account download
azure account import
```

Next, provide the following parameters by setting environment variables:

- `AZURE_STORAGE_ACCOUNT` - your Windows Azure Storage Account name
- `AZURE_STORAGE_ACCESS_KEY` - secret access key to that Storage Account
- `AZURE_SERVICEBUS_NAMESPACE` - your Windows Azure Service Bus Namespace
- `AZURE_SERVICEBUS_ACCESS_KEY` - secret access to that Service Bus namespace
- `AZURE_GITHUB_USERNAME` - GitHub account username
- `AZURE_GITHUB_PASSWORD` - GitHub account password
- `AZURE_GITHUB_REPOSITORY` - name an empty GitHub repository to use during tests (e.g. `tjanczuk/clitest`)

To run the tests, call

```
npm test
```

from the root of your clone of the repository. Most tests execute against live Windows Azure management APIs, and running them takes considerable time. 

Note: by default, the tests targeting the Windows Azure Mobile Services run against a mocked Windows Azure HTTP endpoints. In order to execute these tests against live Windows Azure management APIs instead, set the `NOCK_OFF=true` environment variable before running the tests. 

# Learn More
For documentation on how to host Node.js applications on Windows Azure, please see the [Windows Azure Node.js Developer Center](http://www.windowsazure.com/en-us/develop/nodejs/).

For more extensive  documentation on the new cross platform CLI tool for Mac and Linux, please see this [reference](http://go.microsoft.com/fwlink/?LinkId=252246&clcid=0x409) and this [How to Guide](http://www.windowsazure.com/en-us/develop/nodejs/how-to-guides/command-line-tools/)

Check out our new IRC channel on freenode, node-azure.

