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

var __ = require('underscore');
var async = require('async');
var url = require('url');
var util = require('util');

/*jshint camelcase:false*/
var child_process = require('child_process');

var utils = require('../util/utils');
var cacheUtils = require('../util/cacheUtils');
var kuduscript = require('kuduscript');

var WebsitesClient = require('./websites/websitesclient');

var linkedRevisionControl = require('../util/git/linkedrevisioncontrol');
var validation = require('../util/validation');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  cli.category('account').registerResourceType('website');

  var site = cli.category('site')
        .description($('Commands to manage your Web Sites'));

  var getSiteLocation = function (locations, site) {
    var webspace = locations.filter(function (l) {
      return utils.ignoreCaseEquals(l.name, site.webSpace);
    })[0];

    if (webspace) {
      return webspace.geoRegion;
    }

    // Should not really happen, but if it fails to find the webspace, show its name
    return site.webSpace;
  };

  var getSiteMode = function (site) {
    if (utils.ignoreCaseEquals(site.computeMode, 'dedicated')) {
      return 'Standard';
    } else if (utils.ignoreCaseEquals(site.siteMode, 'basic')) {
      return 'Shared';
    }

    return 'Free';
  };

  var ensureSpaces = function (context, _) {
    if (!context.spaces) {
      if (!context.skipCache) {
        context.spaces = cacheUtils.readSpaces(context, _);
      }

      if (!context.spaces || !context.spaces.length) {
        context.spaces = site.doSpacesGet(context, _);
      }
    }
  };

  site.command('list')
        .description($('List your web sites'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id
          };

          context.skipCache = true;
          ensureSpaces(context, _);
          var sites = site.doSitesGet(context, _);
          cli.interaction.formatOutput(sites, function (data) {
            if (data.length > 0) {
              log.table(data, function (row, item) {
                row.cell($('Name'), item.name);
                row.cell($('Status'), item.state);
                row.cell($('Location'), getSiteLocation(context.spaces, item));
                row.cell($('Mode'), getSiteMode(item));
                row.cell($('URL'), item.hostNames);
              });
            } else {
              log.info($('No sites created yet. You can create new sites using "azure site create" or through the portal'));
            }
          });
        });

  site.command('set [name]')
        .description($('Set configuration options for your web site [name]'))
        .option('--net-version <net-version>', $('the .NET version. Valid options are v3.5 and v4.5'))
        .option('--php-version <php-version>', $('the PHP version. Valid options are off, v5.3 and v5.4'))
        .option('--platform <platform>', $('the platform. Valid options are x86 and x64'))
        .option('-w, --web-socket', $('use this flag to enable web sockets'))
        .option('-W, --disable-web-socket', $('use this flag to disable web sockets'))
        .option('-r, --remote-debugging', $('use this flag to enable remote debugging'))
        .option('-R, --disable-remote-debugging', $('use this flag to disable remote debugging'))
        .option('-d, --remote-debugging-version <remote-debugging-version>', $('the version of remote debugging. It\'s either VS2012 or VS2013. This parameter is only valid when remote debugging is on.'))
        .option('-m, --managed-pipeline-mode <managed-pipeline-mode>', $('the mode for managed pipeline. valid values are Classic and Integrated.'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (name, options, _) {
      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      if (options.netVersion) {
        validation.isValidEnumValue(options.netVersion, [ '3.5', '4.5' ]);
      }

      if (options.phpVersion) {
        validation.isValidEnumValue(options.phpVersion, [ 'off', '5.3', '5.4' ]);
      }

      if (options.platform) {
        validation.isValidEnumValue(options.platform, [ 'x86', 'x64' ]);
      }

      if (options.remoteDebuggingVersion && !options.remoteDebugging) {
        throw new Error('remote-debugging-version can only be set if remote-debugging is also used');
      }

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = {};

      if (options.netVersion) {
        siteConfigurations.netFrameworkVersion = options.netVersion === '3.5' ? 'v2.0' : 'v4.0';
      }

      if (options.phpVersion) {
        if (options.phpVersion.toLowerCase() === 'off') {
          options.phpVersion = ' ';
        }

        siteConfigurations.phpVersion = options.phpVersion;
      }

      if (options.platform) {
        siteConfigurations.use32BitWorkerProcess = options.platform === 'x86';
      }

      if (options.webSocket || options.disableWebSocket) {
        siteConfigurations.webSocketsEnabled = (options.webSocket === true).toString();
      }

      if (options.remoteDebugging || options.disableRemoteDebugging) {
        siteConfigurations.remoteDebuggingEnabled = (options.remoteDebugging === true).toString();
      }

      if (options.remoteDebuggingVersion) {
        validation.isValidEnumValue(options.remoteDebuggingVersion, [ 'VS2012', 'VS2013' ]);
        siteConfigurations.remoteDebuggingVersion = options.remoteDebuggingVersion.toLowerCase() === 'vs2012' ? 'VS2012' : 'VS2013';
      }

      if (options.managedPipelineMode) {
        validation.isValidEnumValue(options.managedPipelineMode, [ 'Integrated', 'Classic' ]);
        siteConfigurations.managedPipelineMode = options.managedPipelineMode.toLowerCase() === 'integrated' ? 'Integrated' : 'Classic';
      }

      if (Object.getOwnPropertyNames(siteConfigurations) === 0) {
        throw new Error($('Command needs to perform at least one configuration change'));
      }

      site.doSiteConfigPUT(siteConfigurations, context, _);
    });

  // Handle deployment script command (azure site deploymentscript)
  var deploymentScriptCommand = site.command('deploymentscript');
  kuduscript.addDeploymentScriptOptions(deploymentScriptCommand);
  deploymentScriptCommand.execute(function (name, options, _) {
    kuduscript.deploymentScriptExecute(name, options, log, confirm, _);
  });

  function confirm(label, callback) {
    cli.confirm(label, function (x) {
      if (!x) {
        log.warn($('The operation was cancelled by the user'));
      }
      callback(undefined, x);
    });
  }
  site.confirm = confirm;

  site.command('create [name]')
        .description($('Create a web site'))
        .option('--location <location>', $('the geographic region to create the website'))
        .option('--hostname <hostname>', $('the custom host name to use'))
        .option('--git', $('Configure git on web site and local folder'))
        .option('--gitusername <gitusername>', $('the publishing username for git'))
        .option('--github', $('Configure github on web site and local folder'))
        .option('--githubusername <username>', $('the github username'))
        .option('--githubpassword <password>', $('the github password'))
        .option('--githubrepository <repository>', $('the github repository full name (i.e. user/repository)'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (nameArg, options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
            git: options.git,
            site: {
              name: nameArg,
              location: options.location,
              hostname: options.hostname
            },
            flags: { }
          };

          if (options.git && options.github) {
            throw new Error($('Please run the command with either --git or --github options. Not both'));
          }

          if (options.git) {
            context.publishingUser = options.gitusername;
          } else if (options.github) {
            context.github = {
              username: options.githubusername,
              password: options.githubpassword,
              repositoryFullName: options.githubrepository
            };
          }

          if (context.site.location !== undefined && context.site.location.trim() === '') {
            throw new Error($('Invalid location'));
          }

          // Start by creating the site
          promptForSiteName(_);
          determineIfSiteExists(_);
          promptForLocation(_);
          createSite(_);

          // Init git / github linking
          if (options.git || options.github) {
            if (options.github) {
              context.lvcClient = linkedRevisionControl.createClient(cli, 'github');
            } else if (options.git) {
              context.lvcClient = linkedRevisionControl.createClient(cli, 'git');
            }

            context.lvcClient.init(context, _);

            // Scaffold
            utils.copyIisNodeWhenServerJsPresent(log, '.', _);
            updateLocalConfigWithSiteName(_);

            initializeRemoteRepo(_);

            if (options.git) {
              addRemoteToLocalGitRepo(_);
            } else if (options.github) {
              site.ensureRepositoryUri(context, _);
            }

            context.lvcClient.deploy(context, _);
          } else {
            // Make sure there is a gitignore with publishsettings if we are within
            // a git repository
            context.lvcClient = linkedRevisionControl.createClient(cli, 'git');
            context.lvcClient.determineIfCurrentDirectoryIsGitWorkingTree(context, _);

            if (context.flags.isGitWorkingTree) {
              context.lvcClient.scaffoldGitIgnore(_);
            }
          }

          function promptForSiteName(_) {
            log.silly('promptForSiteName');
            if (context.site.name === undefined) {
              log.help($('Need a site name'));
              context.site.name = cli.interaction.prompt($('Name: '), _);
            }
          }

          function determineIfSiteExists(_) {
            log.silly('determineIfSiteExists');
            var sites = site.doSitesGet(context, _);
            var hits = sites.filter(function (item) {
              return utils.ignoreCaseEquals(item.name, context.site.name);
            });

            if (hits.length === 1) {
              log.info($('Updating existing site'));
              context.flags.siteExists = true;
              if (context.site.webspace === undefined) {
                context.site.webspace = hits[0].webSpace;
                log.verbose(util.format($('Existing site location is %s'), context.site.webspace));
              } else {
                ensureSpaces(context, _);
                var displayNameMatches = context.spaces.filter(function (space) {
                  return space.GeoRegion === context.site.webspace;
                })[0];

                if (displayNameMatches && displayNameMatches.Name !== hits[0].WebSpace) {
                  throw new Error(util.format($('Expected location %s but was %s'), context.site.webspace, displayNameMatches.GeoRegion));
                }
              }
            }
          }

          function promptForLocation(_) {
            log.silly('promptForLocation');
            ensureSpaces(context, _);

            var locations = site.doAvailableLocationsGet(context, _);
            var location = null;

            if (!context.site.location && !context.site.webspace) {
              log.help($('Choose a location'));
              location = locations[cli.interaction.choose(locations.map(function (location) {
                return location.name;
              }), _)];
            } else if (context.site.location) {
              // Map user-provided value to GeoRegion display name, if unique match exists
              location = locations.filter(function (loc) {
                return utils.ignoreCaseEquals(loc.name, context.site.location);
              })[0];
            } else {
              location = locations.filter(function (loc) {
                return utils.ignoreCaseEquals(loc.webSpace, context.site.webspace);
              })[0];
            }

            if (!location) {
              throw new Error($('Invalid location'));
            }

            context.site.location = location.name;
            context.site.webspace = location.webSpace;
          }

          function updateLocalConfigWithSiteName(_) {
            log.silly('updateLocalConfigWithSiteName');
            if (context.flags.isGitWorkingTree) {
              var cfg = site.readConfig(_);
              cfg.name = context.site.name;
              cfg.webspace = context.site.webspace;
              site.writeConfig(cfg, _);
            }
          }

          function createSite(_) {
            log.silly('createSite');
            if (!context.flags.siteExists) {
              site.doSitesPost(context, _);
            }
          }

          function initializeRemoteRepo(_) {
            log.silly('InitializeRemoteRepo');
            if (!context.flags.siteExists) {
              site.doRepositoryPost(context, _);
              context.repo = site.doRepositoryGet(context, _);
            } else {
              context.repo = site.doRepositoryGet(context, _);
              if (!context.repo) {
                site.doRepositoryPost(context, _);
                context.repo = site.doRepositoryGet(context, _);
              }
            }

            log.silly('context.repo', context.repo);
          }

          function addRemoteToLocalGitRepo(_) {
            log.silly('addRemoteToLocalGitRepo');
            if (!context.flags.isGitWorkingTree) {
              log.info('To create a local git repository to publish to the remote site, please rerun this command with the --git flag: "azure site create ' + ((context.site && context.site.name) || '{site name}') + ' --git".');
              return;
            }

            if (!context.publishingUser) {
              context.publishingUsers = site.doPublishingUsersGet(context, _);
              context.publishingUser = getPublishingUser(context, _);
            }

            log.verbose($('Detecting git and local git folder'));
            var remotes = exec('git remote', _);
            var azureExists = (remotes.stdout + remotes.stderr).split('\n').some(function (item) {
              return item === 'azure';
            });

            if (azureExists) {
              log.verbose($('Removing existing azure remote alias'));
              exec('git remote rm azure', _);
            }

            var gitUri = getGitUri(context.repo, context.site.name, context.publishingUser);
            log.info(util.format($('Executing `git remote add azure %s`'), gitUri));
            exec('git remote add azure ' + gitUri, _);
            log.info($('A new remote, \'azure\', has been added to your local git repository'));
            log.info($('Use git locally to make changes to your site, commit, and then use \'git push azure master\' to deploy to Azure'));
          }
        });

  function getPublishingUser(context, _) {
    function fallbackToPortal(_) {
      // For co-admin accounts the user still has to go the portal
      portalGitInitInstruction(context, _);
      throw new Error($('Git credentials needs to be setup on the portal'));
    }

    var administratorSlots = context.publishingUsers.map(function (user) {
      return user.name;
    });

    var administrators = administratorSlots.filter(function (item) {
      return typeof item === 'string' && item.length <= 64;
    });

    if (administratorSlots.length === 1 && administrators.length === 1) {
      // If it is not a co-admin account (there's 1 user defined and only 1 slot for admins)
      return administrators[0];
    }

    log.help($('Please provide the username for Git deployment'));

    if (administratorSlots.length === 1) {
      // For non co-admin accounts, it's possible to create git credentials
      log.help($('If you are a new git user under this subscription, please also provide a password'));
    } else if (administrators.length === 0) {
      fallbackToPortal(_);
    }

    var username = cli.interaction.prompt($('Publishing username: '), _);

    if (administrators.length === 0) {
      try {
        var password = cli.interaction.promptPassword($('Publishing password: '), _);
        var websiteManagementService = createWebsiteManagementService(context.subscription);
        websiteManagementService.webSpaces.createPublishingUser(username, password, { publishingUserName: username, publishingPassword: password }, _);
      } catch (e) {
        fallbackToPortal(_);
      }
    }

    return username;
  }

  function portalGitInitInstruction(context, _) {
    log.help($('You must create your git publishing credentials using the Windows Azure portal'));
    log.help($('Please follow these steps in the portal:'));
    log.help($('1. In the menu on the left select "Web Sites"'));
    log.help(util.format($('2. Click on the site named "%s" or any other site'), ((context.site && context.site.name) || '{site name}')));
    log.help($('3. Click on "Set up Git publishing" or "Reset deployment credentials" and setup a publishing username and password. Use those credentials for all new websites you create'));
    if (context.git) {
      log.help($('4. Back in the console window, rerun this command by typing "azure site create {site name} --git"'));
    }

    if (confirm($('Launch browser to portal now? [y/n] '), _)) {
      log.help($('Launching portal'));
      var href = cli.environmentManager.getPortalUrl();
      cli.interaction.launchBrowser(href, _);
    }
  }

  var location = site.category('location')
        .description($('Commands to manage your Web Site locations'));

  location.command('list')
        .description($('List locations available for your account'))
        .execute(function (options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id
          };

          var locations = site.doAvailableLocationsGet(context, _);
          log.table(locations, function (row, item) {
            row.cell($('Name'), item.name);
          });
        });

  site.command('browse [name]')
        .description($('Open your web site in a browser'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (name, options, _) {

          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
            site: {
              name: name
            }
          };

          var cache = lookupSiteNameAndWebSpace(context, _);
          var siteData = cache || site.doSiteGet(context, _);

          if (siteData && siteData.hostNames && siteData.hostNames.length > 0) {
            var href = 'http://' + siteData.hostNames[0];
            cli.interaction.launchBrowser(href, _);
          } else {
            throw new Error(util.format('Site %s does not exist or has no hostnames', name));
          }
        });

  site.command('show [name]')
        .description($('Show details for a web site'))
        .option('-d, --details', $('show additional site details'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info($('Showing details for site'));
          log.verbose($('Parameters'), context);

          var result = async.parallel([
            function (_) { return site.doSiteGet(context, _); },
            function (_) { return site.doSiteConfigGet(context, _); }
          ], _);

          var repositoryUri = getRepositoryUri(result[0]);
          var gitUri = repositoryUri ? getGitUri(repositoryUri, context.site.name) : 'none';

          var settings = [];
          var diagnosticsSettings = {};

          if (repositoryUri) {
            try {
              site.ensureRepositoryUri(context, _);
              settings = site.category('repository').doSettingsGet(context, _);

              var websiteClient = new WebsitesClient(cli, context.subscription);
              diagnosticsSettings = websiteClient.getDiagnosticsSettings(context, _);
            } catch (e) {
              // Do nothing if not possible to get SCM settings
              log.verbose('SCM Error', e.message.toString());
            }
          }

          if (log.format().json) {
            var data = {
              site: result[0],
              config: result[1],
              gitRepositoryUri: gitUri,
              settings: settings,
              diagnosticsSettings: diagnosticsSettings
            };

            log.json(data);
          } else {
            var showProperty = function (source, name, property, defaultValue) {
              if (source[property]) {
                log.data(name, source[property].toString());
                delete source[property];
              } else if(defaultValue) {
                log.data(name, defaultValue);
              } else {
                log.data(name, '');
              }
            };

            // General site data
            context.skipCache = true;
            ensureSpaces(context, _);

            log.data('');
            showProperty(result[0], $('Web Site Name: '), 'name');
            log.data($('Site Mode:     '), getSiteMode(result[0]));
            showProperty(result[0], $('Enabled:       '), 'enabled');
            showProperty(result[0], $('Availability:  '), 'availabilityState');
            showProperty(result[0], $('Last Modified: '), 'lastModifiedTimeUtc', $('Never'));
            log.data($('Location:      '), getSiteLocation(context.spaces, result[0]));

            // Host Names
            if (result[0].hostNames && result[0].hostNames.length > 0) {
              log.data('');
              log.table(result[0].hostNames, function (row, s) {
                row.cell($('Host Name'), s);
              });
            }

            delete result[0].hostNames;

            // SSL Host Names
            if (result[0].sslCertificates && result[0].sslCertificates.length > 0) {
              log.data('');
              log.table(Object.keys(result[1].sslCertificates), function (row, certificate) {
                for (var hostname in certificate.hostNames) {
                  row.cell($('SSL Host Names'), hostname);
                }
              });
            }

            delete result[0].sslCertificates;

            // App Settings
            if (result[1].appSettings && Object.keys(result[1].appSettings).length > 0) {
              log.data('');
              log.table(Object.keys(result[1].appSettings), function (row, s) {
                row.cell($('App Setting'), s);
                row.cell($('Value'), result[1].appSettings[s]);
              });
            }

            delete result[1].appSettings;

            // Default Documents
            if (result[1].defaultDocuments && result[1].defaultDocuments.length > 0) {
              log.data('');
              log.table(result[1].defaultDocuments, function (row, s) {
                row.cell($('Default Documents'), s);
              });
            }

            delete result[1].defaultDocuments;

            // Platform & Frameworks
            log.data('');
            log.data($('Platform & Frameworks'));
            log.data($('---------------------'));
            showProperty(result[1], $('.NET Framework Version:    '), 'netFrameworkVersion');
            showProperty(result[1], $('PHP Version:               '), 'phpVersion');
            log.data($('Work Process:              '), result[1].use32BitWorkerProcess ? '32-bit' : '64-bit');
            showProperty(result[1], $('Worker Count:              '), 'numberOfWorkers');
            delete result[1].use32BitWorkerProcess;

            // Logging and Diagnostics
            log.data('');
            log.data($('Logging and Diagnostics'));
            log.data($('-----------------------'));
            showProperty(result[1], $('HTTP Logging:  '), 'httpLoggingEnabled');

            // Source Control
            if (result[1].defaultDocuments && result[1].defaultDocuments.length > 0) {
              log.data('');
              log.table(result[1].defaultDocuments, function (row, s) {
                row.cell($('Source Control'), s);
              });
            }

            delete result[1].defaultDocuments;

            if (settings && settings.some(function (s) { return s.Key === 'ScmType'; })) {
              log.data('');
              log.data($('Source Control'));
              log.data($('--------------'));
              log.data($('Type:           '), settings.filter(function (s) { return s.Key === 'ScmType'; })[0].Value);
              log.data($('Git Repository: '), gitUri);
              log.data($('Branch:         '), settings.filter(function (s) { return s.Key === 'deployment_branch'; })[0].Value);

              for (var i = 0; i < settings.length; i++) {
                if (settings[i].Key === 'ScmType' || settings[i].Key === 'SCM_GIT_USERNAME' || settings[i].Key === 'deployment_branch') {
                  delete settings[i];
                }
              }
            }

            if (options.details) {
              log.data('');
              log.data($('Additional properties and settings'));
              log.data($('----------------------------------'));

              cli.interaction.logEachData($('Site'), result[0]);
              cli.interaction.logEachData($('Config'), result[1]);

              for (var index in settings) {
                log.data($('Settings') + ' ' + settings[index].Key, settings[index].Value);
              }

              for (var dSetting in diagnosticsSettings) {
                log.data($('Diagnostics Settings ') + dSetting, diagnosticsSettings[dSetting].toString());
              }
            }
          }
        });

  function lookupSiteName(context, _) {
    if (context.site.name !== undefined) {
      // no need to read further
      return;
    }

    var cfg = site.readConfig(_);
    if (cfg && cfg.name) {
      // using the name from current location
      context.site.name = cfg.name;
      context.site.webspace = cfg.webspace;
      return;
    }

    context.site.name = cli.interaction.prompt($('Web site name: '), _);

    if (!context.site.name) {
      throw new Error($('Invalid site name'));
    }
  }

  function lookupSiteWebSpace(context, _) {
    log.verbose(util.format($('Attempting to locate site '), context.site.name));
    var sites = site.doSitesGet(context, _);
    for (var index in sites) {
      if (utils.ignoreCaseEquals(sites[index].name, context.site.name)) {
        log.verbose(util.format($('Site located at %s'), sites[index].webSpace));
        context.site.webspace = sites[index].webSpace;
      }
    }

    if (context.site.webspace === undefined) {
      throw new Error(util.format($('Unable to locate site named %s'), context.site.name));
    }
  }

  function lookupSiteNameAndWebSpace(context, _) {
    lookupSiteName(context, _);
    var cache = cacheUtils.readSite(context, _);
    if (cache || context.site.webspace) {
      context.site.webspace = (cache && cache.webSpace) || context.site.webspace;
      return cache;
    }
    lookupSiteWebSpace(context, _);
  }

  site.lookupSiteNameAndWebSpace = lookupSiteNameAndWebSpace;

  function getRepositoryUri(siteData) {
    if (siteData.siteProperties.properties) {
      for (var property in siteData.siteProperties.properties) {
        if (utils.ignoreCaseEquals(property, 'RepositoryUri')) {
          if (typeof siteData.siteProperties.properties[property] === 'string') {
            if (!utils.stringEndsWith(siteData.siteProperties.properties[property], '/')) {
              // Make sure there is a trailing slash
              siteData.siteProperties.properties[property] += '/';
            }

            return siteData.siteProperties.properties[property];
          } else {
            return null;
          }
        }
      }
    }

    return null;
  }

  site.getRepositoryUri = getRepositoryUri;

  function getGitUri(repositoryUri, siteName, auth) {
    var repoUrl = url.parse(repositoryUri);

    if (auth) {
      repoUrl.auth = auth;
    }

    var sitePath = siteName + '.git';

    if (!utils.stringEndsWith(repoUrl.path, '/')) {
      // Make sure trailing slash exists
      repoUrl.path += '/';
    }
    repoUrl.path += sitePath;

    if (!utils.stringEndsWith(repoUrl.pathname, '/')) {
      // Make sure trailing slash exists
      repoUrl.pathname += '/';
    }
    repoUrl.pathname += sitePath;

    return url.format(repoUrl);
  }

  function getRepositoryAuth(siteData) {
    var userName, password;
    for (var property in siteData.siteProperties.properties) {
      if (utils.ignoreCaseEquals(property, 'PublishingUsername')) {
        userName = siteData.siteProperties.properties[property];
      } else if (utils.ignoreCaseEquals(property, 'PublishingPassword')) {
        password = siteData.siteProperties.properties[property];
      }
    }
    return userName && (userName + ':' + password);
  }
  site.getRepositoryAuth = getRepositoryAuth;

  function ensureRepositoryUri(context, _) {
    var siteData = site.lookupSiteNameAndWebSpace(context, _);

    var repositoryUri = siteData && site.getRepositoryUri(siteData);
    if (!repositoryUri) {
      siteData = site.doSiteGet(context, _);
      repositoryUri = site.getRepositoryUri(siteData);
    }

    if (repositoryUri) {
      context.repositoryAuth = site.getRepositoryAuth(siteData);
      context.repositoryUri = repositoryUri;
    }

    return repositoryUri;
  }
  site.ensureRepositoryUri = ensureRepositoryUri;

  site.command('delete [name]')
        .description($('Delete a web site'))
        .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info('Deleting site', context.site.name);
          if (!options.quiet && !confirm(util.format($('Delete site %s? [y/n] '), context.site.name), _)) {
            return;
          }

          var progress = cli.interaction.progress($('Deleting site'));
          try {
            var service = createWebsiteManagementService(context.subscription);
            service.webSites.delete(context.site.webspace, context.site.name, true, true, _);
            cacheUtils.deleteSite(context, _);
          } finally {
            progress.end();
          }

          log.info(util.format($('Site %s has been deleted'), context.site.name));
        });


  site.command('start [name]')
        .description($('Start a web site'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info(util.format($('Starting site %s'), context.site.name));

          site.doSitePUT(context, { state: 'Running' }, _);

          log.info(util.format($('Site %s has been started'), context.site.name));
        });

  site.command('stop [name]')
        .description($('Stop a web site'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info('Stopping site', context.site.name);

          site.doSitePUT(context, { state: 'Stopped' }, _);

          log.info('Site ' + context.site.name + ' has been stopped');
        });

  site.command('restart [name]')
        .description($('Stop and then start a web site'))
        .option('-s, --subscription <id>', $('the subscription id'))
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info(util.format($('Stopping site %s'), context.site.name));
          site.doSitePUT(context, { state: 'Stopped' }, _);

          log.info(util.format($('Site %s has been stopped, restarting'), context.site.name));
          site.doSitePUT(context, { state: 'Running' }, _);
          log.info(util.format($('Site %s has been restarted'), context.site.name));
        });


  /////////////////
  // config and settings

  site.readConfig = function (_) {
    return {
      name: site.readConfigValue('azure.site.name', _),
      webspace: site.readConfigValue('azure.site.webspace', _)
    };
  };

  site.writeConfig = function (cfg, _) {
    site.writeConfigValue('azure.site.name', cfg.name, _);
    site.writeConfigValue('azure.site.webspace', cfg.webspace, _);
  };

  site.readConfigValue = function (name, _) {
    try {
      var result = exec('git config --get ' + name, _);
      return (result.stdout + result.stderr).trim();
    }
    catch (err) {
      log.silly($('Unable to read config'), err);
      return '';
    }
  };

  site.writeConfigValue = function (name, value, _) {
    exec('git config ' + name + ' ' + value, _);
  };


  /////////////////
  // remote api operations

  site.doSitesPost = function (options, _) {
    var hostNameSuffix = getHostNameSuffix(options.subscription, _);
    var websiteAddress = options.site.name + '.' + hostNameSuffix;
    log.info(util.format($('Creating a new web site at %s'), websiteAddress));
    log.verbose('Subscription', options.subscription);
    log.verbose('Webspace', options.site.webspace);
    log.verbose('Site', options.site.name);

    if (options.site.hostNames) {
      options.site.hostNames.push(websiteAddress);
    } else {
      options.site.hostNames = [ websiteAddress ];
    }

    var service = createWebsiteManagementService(options.subscription);

    var progress = cli.interaction.progress($('Sending site information'));

    try {
      options.site.webSpaceName = options.site.webspace;
      options.site.webSpace = {
        name: options.site.webspace,
        geoRegion: options.site.location,
        plan: 'VirtualDedicatedPlan'
      };

      var result = service.webSites.create(options.site.webspace, options.site, _).webSite;
      log.info(util.format($('Created website at %s'), result.hostNames));
      log.verbose('Site', result);

      cacheUtils.saveSite(options, result, _);
      return result;
    } catch (err) {
      logError($('Failed to create site'), err);

      if (err.messagetemplate) {
        var errormessageargs = [];
        if (err.parameters && err.parameters['a:string']) {
          if (__.isArray(err.parameters['a:string'])) {
            errormessageargs = err.parameters['a:string'];
          } else {
            errormessageargs = [ err.parameters['a:string'] ];
          }
          errormessageargs.unshift($(err.messagetemplate.replace(/\{.*?\}/g, '%s')));

          console.log(err.messagetemplate.replace(/\{.*?\}/g, '%s'));

          throw new Error(new Error(util.format.apply(util, errormessageargs)));
        }
      } else if (typeof err.message !== 'string') {
        throw new Error($('Invalid service request'));
      } else {
        throw err;
      }
    } finally {
      progress.end();
    }
  };

  site.doRepositoryPost = function (options, callback) {
    log.info($('Initializing remote Azure repository'));
    log.verbose('Subscription', options.subscription);
    log.verbose('Webspace', options.site.webspace);
    log.verbose('Site', options.site.name);

    var progress = cli.interaction.progress($('Updating site information'));
    var service = createWebsiteManagementService(options.subscription);
    service.webSites.createRepository(options.site.webspace, options.site.name, function (err, result) {
        progress.end();
        if (err) {
          logError($('Failed to initialize repository'), err);
        } else {
          log.info($('Remote azure repository initialized'));
        }
        return callback(err, result);
      });
  };

  site.doRepositoryDelete = function(options, callback) {
    log.verbose('Subscription', options.subscription);
    log.verbose('Webspace', options.site.webspace);
    log.verbose('Site', options.site.name);

    var progress = cli.interaction.progress($('Updating site information'));
    var service = createWebsiteManagementService(options.subscription);

    service.webSites.deleteRepository(options.site.webspace, options.site.name, function (err, result) {
        progress.end();
        if (err) {
          logError($('Failed to delete repository'), err);
        } else {
          log.info($('Repository deleted'));
        }
        return callback(err, result);
      });
  };

  site.doRepositorySync = function(options, callback) {
    log.verbose('Subscription', options.subscription);
    log.verbose('Webspace', options.site.webspace);
    log.verbose('Site', options.site.name);

    var progress = cli.interaction.progress($('Sync site repository'));
    var service = createWebsiteManagementService(options.subscription);
    service.webSites.syncRepository(options.site.webspace, options.site.name, function (err, result) {
        progress.end();
        if (err) {
          logError($('Failed to sync repository'), err);
        } else {
          log.info($('Repository sync completed'));
        }
        return callback(err, result);
      });
  };

  /*jshint unused:false*/
  site.doAvailableLocationsGet = function (options, _) {
    log.verbose('Subscription', options.subscription);

    var progress = cli.interaction.progress($('Getting locations'));
    try {
      var service = createWebsiteManagementService(options.subscription);

      // Fetch locations that are "online"
      var locations = service.webSpaces.listGeoRegions(_).geoRegions;
      var result = locations.map(function (location) {
        return {
          name: location.name,
          webSpace: utils.webspaceFromName(location.name)
        };
      });

      // Fetch webspaces that were previously used
      var webspaces = service.webSpaces.list(_).webSpaces;
      webspaces.forEach(function (webspace) {
        if (!result.some(function (loc) {
          return loc.webSpace === webspace.name;
        })) {
          result.push({
            name: webspace.geoRegion,
            webSpace: webspace.name
          });
        }
      });

      return result;
    } finally {
      progress.end();
    }
  };

  site.doSpacesGet = function (options, _) {
    log.verbose('Subscription', options.subscription);

    var progress = cli.interaction.progress($('Getting locations'));
    try {
      var service = createWebsiteManagementService(options.subscription);
      var spaces = service.webSpaces.list(_).webSpaces;
      cacheUtils.saveSpaces(options, spaces, _);
      return spaces;
    } catch(err) {
      var message = err.Message;
      if (typeof message === 'string' && message.indexOf('Access is denied.') >= 0) {
        log.error($('Please use the Windows Azure portal to create your first web website'));
        log.error($('You can do so by following these steps:'));
        log.error($('1. At the bottom of the page, click on New > Web Site > Quick Create'));
        log.error($('2. Type a valid site name in the URL field'));
        log.error($('3. Click on "Create Web Site"'));
        log.error($('4. Once the site has been created, click on the site name'));
        log.error($('5. Click on "Set up Git publishing" or "Reset deployment credentials" and setup a publishing username and password. Use those credentials for all new websites you create'));

        if (confirm($('Launch browser to portal now? [y/n] '), _)) {
          log.help($('Launching portal'));
          var href = cli.environmentManager.getPortalUrl();
          cli.interaction.launchBrowser(href, _);
        }
      }

      throw err;
    } finally {
      progress.end();
    }
  };

  site.doSitesGet = function (context, _) {
    log.verbose('Subscription', context.subscription);

    var progress;
    var service = createWebsiteManagementService(context.subscription);

    ensureSpaces(context, _);

    progress = cli.interaction.progress($('Getting sites'));
    try {
      var result = async.map(context.spaces,
        function (webspace, _) {
          return service.webSpaces.listWebSites(webspace.name, {
            propertiesToInclude: [
              'repositoryuri',
              'publishingpassword',
              'publishingusername'
            ]
          }, _).webSites;
        },
        _);

      var sites = [];

      result.forEach(function (item) {
        sites = sites.concat(item);
      });

      log.json('verbose', sites);
      cacheUtils.saveSites(context, sites, _);
      return sites;
    }
    finally {
      progress.end();
    }
  };

  site.doSiteGet = function (options, _) {
    var service = createWebsiteManagementService(options.subscription);

    var result;
    var progress = cli.interaction.progress($('Getting site information'));

    try {
      result = service.webSites.get(options.site.webspace, options.site.name, {
        propertiesToInclude: [ 'repositoryuri', 'publishingpassword', 'publishingusername' ]
      }, _).webSite;

      log.verbose('Site', result);
      cacheUtils.saveSite(options, result, _);
    } catch (err) {
      logError($('Failed to get site info'), err);
      if (err.Code === 'NotFound') {
        return cacheUtils.deleteSite(options, function () {
          throw err;
        });
      } else {
        throw err;
      }
    } finally {
      progress.end();
    }

    return result;
  };

  site.doSiteConfigGet = function (options, callback) {
    var progress = cli.interaction.progress($('Getting site config information'));

    var service = createWebsiteManagementService(options.subscription);
    service.webSites.getConfiguration(options.site.webspace, options.site.name,
      function (err, result) {
        progress.end();
        if (err) {
          logError($('Failed to get site config info'), err);
        } else {
          log.verbose('SiteConfig', result);
        }
        return callback(err, result);
      });
  };

  site.doSitePUT = function (options, site, _) {
    var progress = cli.interaction.progress($('Updating site information'));

    try {
      var service = createWebsiteManagementService(options.subscription);
      return service.webSites.update(options.site.webspace, options.site.name, site, _);
    } finally {
      progress.end();
    }
  };

  site.doSiteConfigPUT = function (config, options, _) {
    var progress = cli.interaction.progress($('Updating site config information'));

    try {
      var service = createWebsiteManagementService(options.subscription);
      return service.webSites.updateConfiguration(options.site.webspace, options.site.name, config, _);
    } finally {
      progress.end();
    }
  };

  site.doRepositoryGet = function (options, _) {
    var siteData = site.doSiteGet(options, _);
    return getRepositoryUri(siteData);
  };

  site.doPublishingUsersGet = function (options, _) {
    var progress = cli.interaction.progress($('Getting user information'));
    try {
      try {
        var service = createWebsiteManagementService(options.subscription);
        var publishingUsers = service.webSpaces.listPublishingUsers(_).users;

        log.verbose($('PublishingUsers'), publishingUsers);
        return publishingUsers;
      }
      catch (e) {
        return [ '', '' ];
      }
    }
    finally {
      progress.end();
    }
  };

  function createWebsiteManagementService(subscription) {
    return utils._createWebsiteClient(cli.category('account').getCurrentSubscription(subscription), log);
  }

  function getHostNameSuffix(subscription, _) {
    var subscriptionId = cli.category('account').getCurrentSubscription(subscription).Id;
    if (subscriptionId) {
      var websiteManagementService = createWebsiteManagementService(subscriptionId);
      var hostNameSuffix = websiteManagementService.webSpaces.getDnsSuffix(_);

      return hostNameSuffix.dnsSuffix || cli.environmentManager.getHostNameSuffix();
    } else {
      return cli.environmentManager.getHostNameSuffix();
    }
  }

  /////////////////
  // helper methods

  function logError(message, err) {
    if (arguments.length == 1) {
      err = message;
      message = undefined;
    } else {
      log.error(message);
    }

    if (err) {
      if (err.message) {
        //                log.error(err.message);
        log.verbose('stack', err.stack);
        log.json('silly', err);
      }
      else if (err.Message) {
        //                log.error(err.Message);
        log.json('verbose', err);
      }
    }
  }

  function exec(cmd, cb) {
    /*jshint camelcase:false*/
    child_process.exec(cmd, function (err, stdout, stderr) {
      cb(err, {
        stdout: stdout,
        stderr: stderr
      });
    });
  }
};