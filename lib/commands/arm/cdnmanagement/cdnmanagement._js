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
/*
* You can test sample commands get loaded by xplat by following steps:
* a. Copy the folder to '<repository root>\lib\commands\arm'
* b. Under <repository root>, run 'node bin/azure config mode arm'
* c. Run 'node bin/azure', you should see 'sample' listed as a command set
* d. Run 'node bin/azure', you should see 'create', "delete", etc 
      showing up in the help text 
*/
'use strict';

var util = require('util');
var cdnManagementUtil = require('./cdnmanagement.utils');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var tagUtils = require('../tag/tagUtils');

var $ = utils.getLocaleString;

exports.init = function(cli) {
  var log = cli.output;

  var cdn = cli.category('cdn')
    .description($('Commands to manage Azure Content Delivery Network (CDN)'));

  //================================================================================================================================
  //Profiles opertaion
  var profiles = cdn.category('profile')
    .description($('Commands to manage your Azure cdn profiles'));

  // List Profiles
  profiles.command('list')
    .description($('List all profiles under the current subscription'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group [resource-group]', $('Name of the Resource Group'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(options, _) {

      /////////////////////////
      // Create the client.  //
      /////////////////////////
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createCdnManagementClient(subscription);

      var operation;
      if (options.resourceGroup) {
        operation = client.profiles.listByResourceGroup(options.resourceGroup, _);
      } else {
        operation = client.profiles.listBySubscriptionId(_);
      }

      var progress = cli.interaction.progress(util.format($('Listing Cdn profile(s)')));
      var result;
      try {
        result = operation;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function() {
        if (!result || result.length === 0) {
          log.info($('No profiles found.'));
        } else {
          log.table(result, function(row, profile) {
            row.cell($('Name'), profile.name);
            row.cell($('ResourceGroup'), cdnManagementUtil.getResourceGroupFromProfileId(profile.id));
            row.cell($('Location'), profile.location);
            row.cell($('Tags'), tagUtils.getTagsInfo(profile.tags));
            row.cell($('ProvisioningState'), profile.provisioningState);
            row.cell($('ResourceState'), profile.resourceState);
            row.cell($('Sku'), profile.sku.name);
            row.cell($('Subscription'), subscription.id);
          });
        }
      });
    });

  // Get profile
  profiles.command('show <name> <resource-group>')
    .description($('Show the infomation of a specific cdn profile'))
    .usage('[options] <name> <resource-group>')
    .option('-n, --name [name]', $('Name of the Cdn Profile'))
    .option('-g, --resource-group [resource-group]', $('Name of the Resource Group'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      options.name = options.name || name;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Get cdn profile %s ...'), options.name));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.profiles.get(options.name, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('No profile named %s found.'), options.name);
        } else {
          log.data('');
          log.data($('Profile name :'), result.name);
          log.data('');
          log.data($('Resource Group     :'), options.resourceGroup);
          log.data($('Location           :'), result.location);
          log.data($('ResourceState      :'), result.resourceState);
          log.data($('ProvisioningState  :'), result.provisioningState);
          log.data($('Sku                :'), result.sku.name);
          log.data($('Tags               :'), tagUtils.getTagsInfo(result.tags));
          log.data($('Id                 :'), result.id);
          log.data('');
        }
      });
    });

  // Create Profile
  profiles.command('create <name> <resource-group> <location> <sku-name>')
    .description($('Create a profile under given resource group and subscription'))
    .usage('[options] <name> <resource-group> <location> <sku-name> [tags]')
    .option('-n, --name <name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile will be created in'))
    .option('-l, --location <location>', $('The location in which to create the Cdn Profile'))
    .option('-k, --sku-name <sku-name>', $('The pricing sku name of the Azure Cdn Profile'))
    .option('-t, --tags [tags]', $('Tags to set to the profile. Can be multiple. ' +
      'In the format of \'name=value\'. Name is required and value is optional.'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, resourceGroup, location, skuName, options, _) {

      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: name,
        options: options
      }));

      options.name = options.name || name;
      options.resourceGroup = options.resourceGroup || resourceGroup;
      options.location = options.location || location;
      options.skuName = options.skuName || skuName;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      } else if (!options.location) {
        return cli.missingArgument('location');
      } else if (!options.skuName) {
        return cli.missingArgument('sku-name');
      }

      var tags = {};
      tags = tagUtils.buildTagsParameter(tags, options);

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createCdnManagementClient(subscription);

      /////////////////////////
      // Prepare properties. //
      /////////////////////////
      var creationParameter = {
        location: options.location,
        sku: {
          name: options.skuName
        },
        tags: tags
      };

      var progress = cli.interaction.progress(util.format($('Attempting to create cdn profile %s ...'), options.name));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.profiles.create(options.name, creationParameter, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('No profile information available'));
        } else {
          log.data('');
          log.data($('Profile name :'), result.name);
          log.data('');
          log.data($('Resource Group     :'), options.resourceGroup);
          log.data($('Location           :'), result.location);
          log.data($('ResourceState      :'), result.resourceState);
          log.data($('ProvisioningState  :'), result.provisioningState);
          log.data($('Sku                :'), result.sku.name);
          log.data($('Tags               :'), tagUtils.getTagsInfo(result.tags));
          log.data($('Id                 :'), result.id);
          log.data('');
        }
      });

      if (response.statusCode == 200) {
        log.info('Cdn profile ' + options.name + ' is getting created...');
      } else {
        log.info('Failed in creating profile ' + options.name);
      }
    });

  // Delete Profile
  profiles.command('delete [name] [resource-group]')
    .description($('Delete a profile under given resource group and subscription'))
    .usage('[options] <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile will be delete in'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, resourceGroup, options, _) {

      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: name,
        options: options
      }));

      options.name = options.name || name;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      ////////////////////
      // Delete Tenant. //
      ////////////////////

      var progress = cli.interaction.progress(util.format($('Deleting Cdn Profile %s'), options.name));
      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.profiles.deleteIfExists(options.name, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } finally {
        progress.end();
      }

      if (response.statusCode == 200) {
        log.info('Delete command successfully invoked for Cdn Profile ' + options.name);
      } else if (response.statusCode == 204) {
        log.info('Delete sucess, but no profile named ' + options.name + ' was found');
      } else {
        log.info('Error in deleting profile ' + options.name);
      }
    });

  // Update profile
  profiles.command('set <name> <resource-group>')
    .description($('Update a profile\'s tags'))
    .usage('[options] <name> <resource-group> [tags]')
    .option('-n, --name <name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile will be created in'))
    .option('-t, --tags [tags]', $('Tags to set to the profile. Can be multiple. ' +
      'In the format of \'name=value\'. Name is required and value is optional.'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: name,
        options: options
      }));

      options.name = options.name || name;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      var tags = {};
      tags = tagUtils.buildTagsParameter(tags, options);

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Attempting to update tags for cdn profile %s ...'), options.name));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.profiles.update(options.name, options.resourceGroup, tags, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('No profile information available'));
        } else {
          log.data('');
          log.data($('Profile name :'), result.name);
          log.data('');
          log.data($('Resource Group     :'), options.resourceGroup);
          log.data($('Location           :'), result.location);
          log.data($('ResourceState      :'), result.resourceState);
          log.data($('ProvisioningState  :'), result.provisioningState);
          log.data($('Sku                :'), result.sku.name);
          log.data($('Tags               :'), tagUtils.getTagsInfo(result.tags));
          log.data($('Id                 :'), result.id);
          log.data('');
        }
      });

      if (response.statusCode == 202) {
        log.info('Successfully updated tags of profile ' + options.name);
      } else {
        log.info('Failed in updating tags of profile ' + options.name);
      }
    });

  //================================================================================================================================
  //SSO Uri operation
  var ssoUri = cdn.category('ssouri')
    .description($('Commands to generate sso uri of your Azure cdn profiles'));

  // Generate profile sso uri
  ssoUri.command('create <profile-name> <resource-group>')
    .description($('Create sso uri of the profile'))
    .usage('[options] <profile-name> <resource-group>')
    .option('-n, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(profileName, resourceGroup, options, _) {

      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Generating Cdn profile(s) sso uri')));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.profiles.generateSsoUri(options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      log.info($('Sso uri of profile ' + options.profileName + ' is:\n ' + result.ssoUriValue));
    });

  //==================================================================================================================================
  //Endpoint operation
  var endpoint = cdn.category('endpoint')
    .description($('Commands to manage Azure cdn profile endpoints'));

  //List Endpoint
  endpoint.command('list <profile-name> <resource-group>')
    .description($('List endpoints by profile and resource group'))
    .usage('[options] <profile-name> <resource-group>')
    .option('-n, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Listing endpoints...')));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.listByProfile(options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function() {
        if (!result || result.length === 0) {
          log.info($('No endpoints found.'));
        } else {
          log.table(result, function(row, endpoint) {
            row.cell($('Name'), endpoint.name);
            row.cell($('ProfileName'), options.profileName);
            row.cell($('ResourceGroup'), options.resourceGroup);
            row.cell($('Subscription'), subscription.id);
            row.cell($('Location'), endpoint.location);
            row.cell($('Tags'), tagUtils.getTagsInfo(endpoint.tags));
          });
        }
      });
    });

  //Get endpoint
  endpoint.command('show <name> <profile-name> <resource-group>')
    .description($('Get endpoint by endpoint name, profile name, and resource group'))
    .usage('[options] <name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Getting endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.get(options.name, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('No endpoint named %s found.'), options.profileName);
        } else {
          log.data('');
          log.data($('Endpoint name                  :'), result.name);
          log.data('');
          log.data($('Profile name                   :'), options.profileName);
          log.data($('Resource Group                 :'), options.resourceGroup);
          log.data($('Location                       :'), result.location);
          log.data($('Tags                           :'), tagUtils.getTagsInfo(result.tags));
          log.data($('Host Name                      :'), result.hostName);
          log.data($('Origin Host Header             :'), result.originHostHeader);
          log.data($('Origin Path                    :'), result.originPath);
          log.data($('Content Types To Compress      :'), result.contentTypesToCompress.join(','));
          log.data($('Is Compression Enabled         :'), result.isCompressionEnabled);
          log.data($('Is Http Allowed                :'), result.isHttpAllowed);
          log.data($('Is Https Allowed               :'), result.isHttpsAllowed);
          log.data($('Query String Caching Behavior  :'), result.queryStringCachingBehavior);
          log.data($('Origin Names                   :'), cdnManagementUtil.getOriginNamesString(result.origins));
          log.data($('Resource State                 :'), result.resourceState);
          log.data($('Provisioning State             :'), result.provisioningState);
          log.data('');
        }
      });
    });

  //Create endpoint
  endpoint.command('create <name> <profile-name> <resource-group> <location> <origin-name> <origin-host-name>')
    .description($('Create endpoint with given name and properties.'))
    .usage('[options] <name> <profile-name> <resource-group> <location> <origin-name> <origin-host-name> [origin-host-header] [origin-path] [content-type-to-compress] [is-compression-enabled] [is-http-allowed] [is-https-allowed] [query-string-caching-behavior]  [http-port] [https-port] [tags]')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('-l, --location <location>', $('The location of the Cdn endpoint'))
    .option('-o, --origin-name <origin-name>', $('The name of the origin used to identify the origin'))
    .option('-r, --origin-host-name <origin-host-name>', $('The host name of the origin'))
    .option('-e, --origin-host-header [origin-host-header]', $('The origin host header of the Azure Cdn Endpoint'))
    .option('-i, --origin-path [origin-path]', $('The origin path Azure Cdn Endpoint'))
    .option('-c, --content-types-to-compress [content-types-to-compress]', $('The list of mime types that need to be compressed by Cdn edge nodes'))
    .option('-d, --is-compression-enabled [is-compression-enabled]', $('Is the compression enabled for the Cdn. Valid input: -d [true|false]'))
    .option('-w, --is-http-allowed [is-http-allowed]', $('Is the http traffic allowed for the Cdn. Valid input: -w [true|false]'))
    .option('-a, --is-https-allowed [is-https-allowed]', $('Is the https traffic allowed for the Cdn. Valid input: -a [true|false]'))
    .option('-q, --query-string-caching-behavior [query-string-caching-behavior]', $('The way Cdn handles requests with query string'))
    .option('-u, --http-port [http-port]', $('The port http traffic used on the origin server'))
    .option('-w, --https-port [https-port]', $('The port https traffic used on the origin server'))
    .option('-t, --tags [tags]', $('The tags to associate with the Azure Cdn Endpoint'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, location, originName, originHostName, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;
      options.location = options.location || location;
      options.originName = options.originName || originName;
      options.originHostName = options.originHostName || originHostName;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      } else if (!options.location) {
        return cli.missingArgument('location');
      } else if (!options.originName) {
        return cli.missingArgument('origin-name');
      } else if (!options.originHostName) {
        return cli.missingArgument('origin-host-name');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var tags = {};
      tags = tagUtils.buildTagsParameter(tags, options);

      var contentTypesToCompress = options.contentTypesToCompress ? options.contentTypesToCompress.split(',') : [];

      var endpointCreateParameters = {
        contentTypesToCompress: contentTypesToCompress,
        location: options.location,
        originHostHeader: options.originHostHeader,
        originPath: options.originPath,
        origins: [{
          name: originName,
          hostName: originHostName,
          httpPort: options.httpPort,
          httpsPort: options.httpsPort
        }],
        queryStringCachingBehavior: options.queryStringCachingBehavior,
        tags: tags
      };

      if (options.isCompressionEnabled) {
        endpointCreateParameters.isCompressionEnabled = cdnManagementUtil.getBooleanFromString(options.isCompressionEnabled);
      }
      if (options.isHttpAllowed) {
        endpointCreateParameters.isHttpAllowed = cdnManagementUtil.getBooleanFromString(options.isHttpAllowed);
      }
      if (options.isHttpsAllowed) {
        endpointCreateParameters.isHttpsAllowed = cdnManagementUtil.getBooleanFromString(options.isHttpsAllowed);
      }


      var progress = cli.interaction.progress(util.format($('Creating endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.create(options.name, endpointCreateParameters, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('Error creating endpoint %s.'));
        } else {
          log.data('');
          log.data($('Endpoint name                  :'), result.name);
          log.data('');
          log.data($('Profile name                   :'), options.profileName);
          log.data($('Resource Group                 :'), options.resourceGroup);
          log.data($('Location                       :'), result.location);
          log.data($('Tags                           :'), tagUtils.getTagsInfo(result.tags));
          log.data($('Host Name                      :'), result.hostName);
          log.data($('Origin Host Header             :'), result.originHostHeader);
          log.data($('Origin Path                    :'), result.originPath);
          log.data($('Content Types To Compress      :'), result.contentTypesToCompress.join(','));
          log.data($('Is Compression Enabled         :'), result.isCompressionEnabled);
          log.data($('Is Http Allowed                :'), result.isHttpAllowed);
          log.data($('Is Https Allowed               :'), result.isHttpsAllowed);
          log.data($('Query String Caching Behavior  :'), result.queryStringCachingBehavior);
          log.data($('Origin Names                   :'), cdnManagementUtil.getOriginNamesString(result.origins));
          log.data($('Resource State                 :'), result.resourceState);
          log.data($('Provisioning State             :'), result.provisioningState);
          log.data('');
        }
      });
    });

  //Update Endpoint
  endpoint.command('set <name> <profile-name> <resource-group>')
    .description($('Update endpoint with given properties.'))
    .usage('[options] <name> <profile-name> <resource-group> [origin-host-header] [origin-path] [content-type-to-compress] [is-compression-enabled] [is-http-allowed] [is-https-allowed] [query-string-caching-behavior] [tags]')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('-e, --origin-host-header [origin-host-header]', $('The origin host header of the Azure Cdn Endpoint'))
    .option('-i, --origin-path [origin-path]', $('The origin path Azure Cdn Endpoint'))
    .option('-c, --content-types-to-compress [content-types-to-compress]', $('The list of mime types that need to be compressed by Cdn edge nodes'))
    .option('-d, --is-compression-enabled [is-compression-enabled]', $('Is the compression enabled for the Cdn. Valid input: -d [true|false]'))
    .option('-u, --is-http-allowed [is-http-allowed]', $('Is the http traffic allowed for the Cdn. Valid input: -u [true|false]'))
    .option('-w, --is-https-allowed [is-https-allowed]', $('Is the https traffic allowed for the Cdn. Valid input: -w [true|false]'))
    .option('-q, --query-string-caching-behavior [query-string-caching-behavior]', $('The way Cdn handles requests with query string'))
    .option('-t, --tags [tags]', $('The tags to associate with the Azure Cdn Endpoint'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);




      var endpointUpdateParameters = {};

      if (options.originHostHeader) {
        endpointUpdateParameters.originHostHeader = options.originHostHeader;
      }
      if (options.originPath) {
        endpointUpdateParameters.originPath = options.originPath;
      }
      if (options.isCompressionEnabled) {
        endpointUpdateParameters.isCompressionEnabled = cdnManagementUtil.getBooleanFromString(options.isCompressionEnabled);
      }
      if (options.contentTypesToCompress) {
        endpointUpdateParameters.contentTypesToCompress = options.contentTypesToCompress.split(',');
      }
      if (options.isHttpAllowed) {
        endpointUpdateParameters.isHttpAllowed = cdnManagementUtil.getBooleanFromString(options.isHttpAllowed);
      }
      if (options.isHttpsAllowed) {
        endpointUpdateParameters.isHttpsAllowed = cdnManagementUtil.getBooleanFromString(options.isHttpsAllowed);
      }
      if (options.queryStringCachingBehavior) {
        endpointUpdateParameters.queryStringCachingBehavior = options.queryStringCachingBehavior;
      }
      if (options.tags) {
        var tags = {};
        tags = tagUtils.buildTagsParameter(tags, options);
        endpointUpdateParameters.tags = tags;
      }


      var progress = cli.interaction.progress(util.format($('Updating endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.update(options.name, endpointUpdateParameters, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }



      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('Error updating endpoint %s.'));
        } else {
          log.data('');
          log.data($('Endpoint name                  :'), result.name);
          log.data('');
          log.data($('Profile name                   :'), options.profileName);
          log.data($('Resource Group                 :'), options.resourceGroup);
          log.data($('Location                       :'), result.location);
          log.data($('Tags                           :'), tagUtils.getTagsInfo(result.tags));
          log.data($('Host Name                      :'), result.hostName);
          log.data($('Origin Host Header             :'), result.originHostHeader);
          log.data($('Origin Path                    :'), result.originPath);
          log.data($('Content Types To Compress      :'), result.contentTypesToCompress.join(','));
          log.data($('Is Compression Enabled         :'), result.isCompressionEnabled);
          log.data($('Is Http Allowed                :'), result.isHttpAllowed);
          log.data($('Is Https Allowed               :'), result.isHttpsAllowed);
          log.data($('Query String Caching Behavior  :'), result.queryStringCachingBehavior);
          log.data($('Origin Names                   :'), cdnManagementUtil.getOriginNamesString(result.origins));
          log.data($('Resource State                 :'), result.resourceState);
          log.data($('Provisioning State             :'), result.provisioningState);
          log.data('');
        }
      });
    });


  //Delete Endpoint
  endpoint.command('delete <name> <profile-name> <resource-group>')
    .description($('Delete an endpoint by endpoint name, profile name, and resource group'))
    .usage('[options] <ename> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Deleting endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.deleteIfExists(options.name, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      if (response.statusCode == 200) {
        log.info('Delete command successfully invoked for endpoint ' + options.name);
      } else if (response.statusCode == 204) {
        log.info('Delete sucess, but no endpoint named ' + options.name + ' was found');
      } else {
        log.info('Error in deleting endpoint ' + options.name);
      }
    });

  //Start endpoint
  endpoint.command('start <name> <profile-name> <resource-group>')
    .description($('Start an endpoint by endpoint name, profile name, and resource group'))
    .usage('[options] <name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Starting endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.start(options.name, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      if (response.statusCode == 200) {
        log.info('Command successfully invoked for endpoint ' + options.name + ' and it is now running');
      } else {
        log.info('Error in starting endpoint ' + options.name);
      }
    });

  //Stop endpoint
  endpoint.command('stop <name> <profile-name> <resource-group>')
    .description($('Stop an endpoint by endpoint name, profile name, and resource group'))
    .usage('[options] <name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Stopping endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.stop(options.name, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      if (response.statusCode == 200) {
        log.info('Command successfully invoked for endpoint ' + options.name + ' and it is now stopped');
      } else {
        log.info('Error in stopping endpoint ' + options.name);
      }
    });

  //Endpoint Purge Content
  endpoint.command('purge <name> <profile-name> <resource-group> <content-paths>')
    .description($('Purge the content of the given paths in the endpoint'))
    .usage('[options] <name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('-c, --content-paths <content-paths>', $('Content paths to be purged'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, contentPaths, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;
      options.contentPaths = options.contentPaths || contentPaths;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      } else if (!options.contentPaths) {
        return cli.missingArgument('content-paths');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var parsedContentPaths = options.contentPaths ? options.contentPaths.split(',') : [];

      var progress = cli.interaction.progress(util.format($('Purging content for endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.purgeContent(options.name, options.profileName, options.resourceGroup, parsedContentPaths, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }
    });

  //Endpoint Load Content
  endpoint.command('load <name> <profile-name> <resource-group> <content-paths>')
    .description($('Load the content of the given paths in the endpoint'))
    .usage('[options] <name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('-c, --content-paths <content-paths>', $('Content paths to be purged'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, profileName, resourceGroup, contentPaths, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;
      options.contentPaths = options.contentPaths || contentPaths;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      } else if (!options.contentPaths) {
        return cli.missingArgument('content-paths');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var parsedContentPaths = options.contentPaths ? options.contentPaths.split(',') : [];

      var progress = cli.interaction.progress(util.format($('Loading content for endpoint named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.loadContent(options.name, options.profileName, options.resourceGroup, parsedContentPaths, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }
    });

  //Endpoint Check Name Availability
  endpoint.command('check <endpoint-name>')
    .description($('Check if the endpoint name has been used or not'))
    .usage('[options] <endpoint-name>')
    .option('-n, --endpoint-name <endpoint-name>', $('Endpoint name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(endpointName, options, _) {

      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        endpointName: endpointName,
        options: options
      }));

      options.endpointName = options.endpointName || endpointName;

      if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Checking name availability for ' + options.endpointName)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.nameAvailability.checkNameAvailability(options.endpointName, 'Microsoft.Cdn/Profiles/Endpoints', [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      if (response.statusCode != 200) {
        log.info('Command invoke failed, please retry');
      } else if (result.nameAvailable) {
        log.info(options.endpointName + ' is valid to use');
      } else {
        log.info(options.endpointName + ' is already in use');
      }
    });

  //==================================================================================================================================
  //Origin operation
  var origin = cdn.category('origin')
    .description($('Commands to manage Azure cdn profile endpoint origin'));

  //Get Origin
  origin.command('show <name> <endpoint-name> <profile-name> <resource-group>')
    .description($('Get origin by origin name, endpoint name, profile name, and resource group'))
    .usage('[options] <name> <endpoint-name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the origin'))
    .option('-e, --endpoint-name <endpoint-name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, endpointName, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.endpointName = options.endpointName || endpointName;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Getting origin named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.origins.get(options.name, options.endpointName, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('No origin named %s found.'), options.profileName);
        } else {
          log.data('');
          log.data($('origin name                  :'), result.name);
          log.data('');
          log.data($('endpoint name                  :'), options.endpointName);
          log.data($('profile name                   :'), options.profilename);
          log.data($('resource group                 :'), options.resourcegroup);
          log.data($('type                           :'), result.type);
          log.data($('host name                      :'), result.hostName);
          log.data($('http port                      :'), result.httpPort);
          log.data($('https port                     :'), result.httpsPort);
          log.data($('resource state                 :'), result.resourcestate);
          log.data($('provisioning state             :'), result.provisioningstate);
          log.data('');
        }
      });
    });

  //Update Origin
  origin.command('set <name> <endpoint-name> <profile-name> <resource-group>')
    .description($('Update origin of the given origin name, endpoint name, profile name, and resource group'))
    .usage('[options] <name> <endpoint-name> <profile-name> <resource-group> [host-name] [http-port] [https-port]')
    .option('-n, --name <name>', $('Name of the origin'))
    .option('-e, --endpoint-name <endpoint-name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('-o, --host-name [host-name]', $('Host name'))
    .option('-r, --http-port [http-port]', $('Http port'))
    .option('-w, --https-port [https-port]', $('Https port'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, endpointName, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////
      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.endpointName = options.endpointName || endpointName;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var originUpdateParameter = {};
      if (options.hostName) {
        originUpdateParameter.hostName = options.hostName;
      }
      if (options.httpPort) {
        originUpdateParameter.httpPort = parseInt(options.httpPort);
      }
      if (options.httpsPort) {
        originUpdateParameter.httpsPort = parseInt(options.httpsPort);
      }


      var progress = cli.interaction.progress(util.format($('Updating origin named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.origins.update(options.name, originUpdateParameter, options.endpointName, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('No origin named %s found to update.'), options.profileName);
        } else {
          log.data('');
          log.data($('origin name                  :'), result.name);
          log.data('');
          log.data($('endpoint name                  :'), options.endpointName);
          log.data($('profile name                   :'), options.profileName);
          log.data($('resource group                 :'), options.resourceGroup);
          log.data($('type                           :'), result.type);
          log.data($('host name                      :'), result.hostName);
          log.data($('http port                      :'), result.httpPort);
          log.data($('https port                     :'), result.httpsPort);
          log.data($('resource state                 :'), result.resourceState);
          log.data($('provisioning state             :'), result.provisioningState);
          log.data('');
        }
      });
    });

  //==============================================================================================================
  //Custom Domain

  var customDomain = cdn.category('customDomain')
    .description($('Commands to manage Azure cdn profile endpoint custom domain'));

  //List Custom Domain
  customDomain.command('list <endpoint-name> <profile-name> <resource-group>')
    .description($('List custom domains by endpoint name, profile name, and resource group'))
    .usage('[options] <endpoint-name> <profile-name> <resource-group>')
    .option('-e, --endpoint-name <endpoint-name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(endpointName, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.endpointName = options.endpointName || endpointName;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Listing custom domain under ' + options.endpointName)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.customDomains.listByEndpoint(options.endpointName, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function() {
        if (!result || result.length === 0) {
          log.info($('No custom domains found under ' + options.endpointName));
        } else {
          log.table(result, function(row, cd) {
            row.cell($('Name'), cd.name);
            row.cell($('Endpoint'), options.endpointName);
            row.cell($('HostName'), cd.hostName);
            row.cell($('ProvisioningState'), cd.provisioningState);
            row.cell($('ResourceState'), cd.resourceState);
          });
        }
      });
    });

  //Get Custom Domain
  customDomain.command('show <name> <endpoint-name> <profile-name> <resource-group>')
    .description($('Get custom domains by custom domain name, endpoint name, profile name, and resource group'))
    .usage('[options] <name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the custom domain'))
    .option('-e, --endpoint-name <endpoint-name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, endpointName, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.endpointName = options.endpointName || endpointName;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('name');
      } else if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Getting custom domain named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.customDomains.get(options.name, options.endpointName, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }


      cli.interaction.formatOutput(result, function(data) {
        if (!data) {
          log.info($('No custom domain named %s found.'), options.name);
        } else {
          log.data('');
          log.data($('custom domain name             :'), result.name);
          log.data('');
          log.data($('endpoint name                  :'), options.endpointName);
          log.data($('profile name                   :'), options.profileName);
          log.data($('resource group                 :'), options.resourceGroup);
          log.data($('type                           :'), result.type);
          log.data($('host name                      :'), result.hostName);
          log.data($('resource state                 :'), result.resourceState);
          log.data($('provisioning state             :'), result.provisioningState);
          log.data($('id                             :'), result.id);
          log.data('');
        }
      });
    });

  //Create Custom Domain
  customDomain.command('create <name> <endpoint-name> <profile-name> <resource-group> <custom-domain-host-name>')
    .description($('Create a custom domain of a perticular custom domain host name'))
    .usage('[options] <name> <endpoint-name> <profile-name> <resource-group> <custom-domain-host-name>')
    .option('-n, --name <name>', $('Name of the custom domain'))
    .option('-e, --endpoint-name <endpoint-name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('-d, --custom-domain-host-name <custom-domain-host-name>', $('The host name of the custom domain'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, endpointName, profileName, resourceGroup, customDomainHostName, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.endpointName = options.endpointName || endpointName;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;
      options.customDomainHostName = options.customDomainHostName || customDomainHostName;

      if (!options.name) {
        return cli.missingArgument('custom-domain-name');
      } else if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      } else if (!options.customDomainHostName) {
        return cli.missingArgument('custom-domain-host-name');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Creating custom domain named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.customDomains.create(options.name, options.endpointName, options.profileName, options.resourceGroup, options.customDomainHostName, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result, function() {
        log.data('');
        log.data($('custom domain name             :'), result.name);
        log.data('');
        log.data($('endpoint name                  :'), options.endpointName);
        log.data($('profile name                   :'), options.profileName);
        log.data($('resource group                 :'), options.resourceGroup);
        log.data($('type                           :'), result.type);
        log.data($('host name                      :'), result.hostName);
        log.data($('resource state                 :'), result.resourceState);
        log.data($('provisioning state             :'), result.provisioningState);
        log.data($('id                             :'), result.id);
        log.data('');
      });
    });

  //Delete Custom Domain
  customDomain.command('delete <name> <endpoint-name> <profile-name> <resource-group>')
    .description($('Delete a custom domain of a perticular custom domain host name'))
    .usage('[options] <name> <endpoint-name> <profile-name> <resource-group>')
    .option('-n, --name <name>', $('Name of the custom domain'))
    .option('-e, --endpoint-name <endpoint-name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(name, endpointName, profileName, resourceGroup, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.name = options.name || name;
      options.endpointName = options.endpointName || endpointName;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;

      if (!options.name) {
        return cli.missingArgument('custom-domain-name');
      } else if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Updating custom domain named ' + options.name)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.customDomains.deleteIfExists(options.name, options.endpointName, options.profileName, options.resourceGroup, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }

      if (response.statusCode == 200) {
        log.info('Delete command successfully invoked for custom domain ' + options.name);
      } else if (response.statusCode == 204) {
        log.info('Delete success, but no custom domain named ' + options.name + ' was found');
      } else {
        log.info('Error in deleting custom domain ' + options.customDomainName);
      }
    });

  //Validate custom domain
  customDomain.command('validate <endpoint-name> <profile-name> <resource-group> <custom-domain-host-name>')
    .description($('Check to see if a custom domain host name is registered for cname mapping to the endpoint '))
    .usage('[options] <endpoint-name> <profile-name> <resource-group> <custom-domain-host-name>')
    .option('-e, --endpoint-name <endpoint-name>', $('Name of the endpoint'))
    .option('-p, --profile-name <profile-name>', $('Name of the profile'))
    .option('-g, --resource-group <resource-group>', $('The resource group of the Azure Cdn Profile'))
    .option('-d, --custom-domain-host-name <custom-domain-host-name>', $('The host name of the custom domain'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(endpointName, profileName, resourceGroup, customDomainHostName, options, _) {
      ///////////////////////
      // Parse arguments.  //
      ///////////////////////

      log.verbose('arguments: ' + JSON.stringify({
        profileName: profileName,
        options: options
      }));

      options.endpointName = options.endpointName || endpointName;
      options.profileName = options.profileName || profileName;
      options.resourceGroup = options.resourceGroup || resourceGroup;
      options.customDomainHostName = options.customDomainHostName || customDomainHostName;

      if (!options.endpointName) {
        return cli.missingArgument('endpoint-name');
      } else if (!options.profileName) {
        return cli.missingArgument('profile-name');
      } else if (!options.resourceGroup) {
        return cli.missingArgument('resource-group');
      } else if (!options.customDomainHostName) {
        return cli.missingArgument('custom-domain-host-name');
      }

      /////////////////////////
      // Create the client.  //
      /////////////////////////

      var subscription = profile.current.getSubscription();
      var client = utils.createCdnManagementClient(subscription);

      var progress = cli.interaction.progress(util.format($('Validating custom domain host name: ' + options.customDomainHostName)));

      var callbackArgs = [];
      var result, response;
      try {
        callbackArgs = client.endpoints.validateCustomDomain(options.endpointName, options.profileName, options.resourceGroup, options.customDomainHostName, [_]);
        result = callbackArgs[0];
        response = callbackArgs[2];
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result, function() {
        if (response.statusCode != 200) {
          log.info('Command invoke failed, please retry');
        } else if (result.customDomainValidated) {
          log.info('Validate host name ' + options.customDomainHostName + ' success');
        } else {
          log.info('Validate host name ' + options.customDomainHostName + ' failed');
          log.info('Reason: ' + result.reason);
          log.info('Message: ' + result.message);
        }
      });
    });
};