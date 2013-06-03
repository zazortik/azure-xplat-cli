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

/*jshint camelcase:false*/
var child_process = require('child_process');

var interaction = require('../util/interaction');
var utils = require('../util/utils');
var cacheUtils = require('../util/cacheUtils');
var Constants = require('../util/constants');
var generator = require('./scriptgenerator/generator');

var linkedRevisionControl = require('../util/git/linkedrevisioncontrol');

exports.init = function (cli) {

  var log = cli.output;

  cli.category('account').registerResourceType('website');

  var site = cli.category('site')
        .description('Commands to manage your Web Sites');

  site.command('list')
        .description('List your web sites')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (options, _) {
          var parameters = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription)
          };

          var sites = site.doSitesGet(parameters, _);
          if (sites && sites.length > 0) {
            for (var s in sites) {
              sites[s] = clean(sites[s]);
            }

            var getSiteMode = function (site) {
              if (utils.ignoreCaseEquals(site.ComputeMode, 'dedicated')) {
                return 'Reserved';
              } else if (utils.ignoreCaseEquals(site.SiteMode, 'basic')) {
                return 'Shared';
              }

              return 'Free';
            };

            log.table(sites, function (row, s) {
              row.cell('Name', s.Name);
              row.cell('Status', s.State);
              row.cell('Mode', getSiteMode(s));
              row.cell('Host names', s.HostNames);
            });
          } else {
            log.info('No sites created yet. You can create new sites using "azure site create" or through the portal.');
          }
        });

  site.command('deploymentscript')
        .usage('[options]')
        .description('Generate custom deployment script')
        .option('-r, --repositoryRoot [dir path]', 'The root path for the repository (default: .)')
        .option('--aspWAP <projectFilePath>', 'Create a deployment script for .NET web application, specify the project file path')
        .option('--aspWebSite', 'Create a deployment script for basic website')
        .option('--node', 'Create a deployment script for node.js website')
        .option('--php', 'Create a deployment script for php website')
        .option('--python', 'Create a deployment script for python website')
        .option('--basic', 'Create a deployment script for any other website')
        .option('-s, --solutionFile [file path]', 'The solution file path (sln)')
        .option('-p, --sitePath [directory path]', 'The path to the site being deployed (default: same as repositoryRoot)')
        .option('-t, --scriptType [batch|bash]', 'The script output type (default: batch)')
        .option('-o, --outputPath <output path>', 'The path to output generated script (default: same as repository root)')
        .option('-y, --suppressPrompt', 'Suppresses prompting to confirm you want to overwrite an existing destination file.')
        .option('--no-dot-deployment', 'Do not generate the .deployment file.')
        .option('--no-solution', 'Do not require a solution file path (only for --aspWAP otherwise ignored).')
        .execute(function (name, options, _) {
          var repositoryRoot = options.repositoryRoot || '.';
          var outputPath = options.outputPath || repositoryRoot;
          var scriptType = options.scriptType;
          var projectFile = options.aspWAP;
          var solutionFile = options.solutionFile;
          var sitePath = options.sitePath || repositoryRoot;
          var noDotDeployment = options.dotDeployment === false;
          var noSolution = options.solution === false;

          var exclusionFlags = [options.aspWAP, options.php, options.python, options.aspWebSite, options.node, options.basic];
          var flagCount = 0;
          for (var i in exclusionFlags) {
            if (exclusionFlags[i]) {
              flagCount++;
            }
          }

          if (flagCount === 0) {
            options.helpInformation();
            log.help('');
            log.help('Please specify one of these flags: --aspWAP, --aspWebSite, --php, --python, --basic or --node');
            return;
          } else if (flagCount > 1) {
            throw new Error('Please specify only one of these flags: --aspWAP, --aspWebSite, --php, --python, --basic or --node');
          }

          var projectType;
          if (options.aspWAP) {
            projectType = generator.ProjectType.wap;
          } else if (options.aspWebSite) {
            projectType = generator.ProjectType.website;
          } else if (options.node) {
            projectType = generator.ProjectType.node;
          } else {
            projectType = generator.ProjectType.basic;
          }

          var confirmFunc = confirm;
          if (options.suppressPrompt) {
            confirmFunc = function (message, callback) { callback(undefined, true); };
          }

          var scriptGenerator = new generator.ScriptGenerator(repositoryRoot, projectType, projectFile, solutionFile, sitePath, scriptType, outputPath, noDotDeployment, noSolution, log, confirmFunc);
          scriptGenerator.generateDeploymentScript(_);
        });

  function choose(data, callback) {
    cli.choose(data, function (x) { callback(undefined, x); });
  }
  function prompt(label, callback) {
    cli.prompt(label, function (x) { callback(undefined, x); });
  }
  function confirm(label, callback) {
    cli.confirm(label, function (x) {
      if (!x) {
        log.warn('The operation was cancelled by the user');
      }
      callback(undefined, x);
    });
  }
  site.confirm = confirm;

  site.command('create [name]')
        .description('Create a new web site')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('--location <location>', 'the geographic region to create the website')
        .option('--hostname <hostname>', 'custom host name to use')
        .option('--git', 'configure git on web site and local folder')
        .option('--gitusername <gitusername>', 'The publishing username for git')
        .option('--github', 'configure github on web site and local folder')
        .option('--githubusername <username>', 'The github username')
        .option('--githubpassword <password>', 'The github password')
        .option('--githubrepository <repository>', 'The github repository full name (i.e. user/repository)')
        .execute(function (nameArg, options, _) {
          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription),
            git: options.git,
            site: {
              name: nameArg,
              location: options.location,
              hostname: options.hostname
            },
            flags: { }
          };

          if (options.git && options.github) {
            throw new Error('Please run the command with either --git or --github options. Not both.');
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
            throw new Error('Invalid location');
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
              log.help('Need a site name');
              context.site.name = prompt('Name: ', _);
            }
          }

          function determineIfSiteExists(_) {
            log.silly('determineIfSiteExists');
            var sites = site.doSitesGet(context, _);
            var hits = sites.filter(function (item) {
              return utils.ignoreCaseEquals(item.Name, context.site.name);
            });

            if (hits.length === 1) {
              log.info('Updating existing site');
              context.flags.siteExists = true;
              if (context.site.webspace === undefined) {
                context.site.webspace = hits[0].WebSpace;
                log.verbose('Existing site location is ', context.site.webspace);
              } else {
                ensureSpaces(context, _);
                var displayNameMatches = context.spaces.filter(function (space) {
                  return space.GeoRegion === context.site.webspace;
                })[0];

                if (displayNameMatches && displayNameMatches.Name !== hits[0].WebSpace) {
                  throw new Error('Expected location ' + context.site.webspace + ' but was ' + displayNameMatches.GeoRegion);
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
              log.help('Choose a location');
              location = locations[choose(locations.map(function (location) {
                return location.Name;
              }), _)];
            } else if (context.site.location) {
              // Map user-provided value to GeoRegion display name, if unique match exists
              location = locations.filter(function (loc) {
                return utils.ignoreCaseEquals(loc.Name, context.site.location);
              })[0];
            } else {
              location = locations.filter(function (loc) {
                return utils.ignoreCaseEquals(loc.WebSpace, context.site.webspace);
              })[0];
            }

            if (!location) {
              throw new Error('Invalid location');
            }

            context.site.webspace = location.WebSpace;
            if (context.spaces.filter(function (space) {
              return space.Name === location.WebSpace;
            }).length === 0) {
              context.site.webSpaceToCreate = {
                GeoRegion: location.Name,
                Name: location.WebSpace,
                Plan: 'VirtualDedicatedPlan'
              };
            }
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

            log.verbose('Detecting git and local git folder');
            var remotes = exec('git remote', _);
            var azureExists = (remotes.stdout + remotes.stderr).split('\n').some(function (item) {
              return item === 'azure';
            });

            if (azureExists) {
              log.verbose('Removing existing azure remote alias');
              exec('git remote rm azure', _);
            }

            var gitUri = getGitUri(context.repo, context.site.name, context.publishingUser);
            log.info('Executing `git remote add azure ' + gitUri + '`');
            exec('git remote add azure ' + gitUri, _);
            log.info('A new remote, \'azure\', has been added to your local git repository.');
            log.info('Use git locally to make changes to your site, commit, and then use \'git push azure master\' to deploy to Azure.');
          }

          function ensureSpaces(context, _) {
            if (!context.spaces) {
              context.spaces = cacheUtils.readSpaces(context, _);
              if (!context.spaces || !context.spaces.length) {
                context.spaces = site.doSpacesGet(context, _);
              }
            }
          }
        });

  function getPublishingUser(context, _) {
    function fallbackToPortal(_) {
      // For co-admin accounts the user still has to go the portal
      portalGitInitInstruction(context, _);
      throw new Error('Git credentials needs to be setup on the portal');
    }

    var administratorSlots = context.publishingUsers;
    var administrators = administratorSlots.filter(function (item) {
      return typeof item === 'string' && item.length <= 64;
    });

    if (administratorSlots.length === 1 && administrators.length === 1) {
      // If it is not a co-admin account (there's 1 user defined and only 1 slot for admins)
      return administrators[0];
    }

    log.help('Please provide the username for Git deployment.');

    if (administratorSlots.length === 1) {
      // For non co-admin accounts, it's possible to create git credentials
      log.help('If you are a new git user under this subscription, please also provide a password.');
    } else if (administrators.length === 0) {
      fallbackToPortal(_);
    }

    var username = interaction.prompt(cli, 'Publishing username: ', _);

    if (administrators.length === 0) {
      try {
        var password = interaction.promptPassword(cli, 'Publishing password: ', _);
        var websiteManagementService = createWebsiteManagementService(context.subscription);
        websiteManagementService.createPublishingUser(username, password, _);
      } catch (e) {
        fallbackToPortal(_);
      }
    }

    return username;
  }

  function portalGitInitInstruction(context, _) {
    log.help('You must create your git publishing credentials using the Windows Azure portal.');
    log.help('Please follow these steps in the portal:');
    log.help('1. In the menu on the left select "Web Sites"');
    log.help('2. Click on the site named "' + ((context.site && context.site.name) || '{site name}') + '" or any other site');
    log.help('3. Click on "Set up Git publishing" or "Reset deployment credentials" and setup a publishing username and password. Use those credentials for all new websites you create.');
    if (context.git) {
      log.help('4. Back in the console window, rerun this command by typing "azure site create {site name} --git"');
    }

    if (confirm('Launch browser to portal now? (y/n) ', _)) {
      log.help('Launching portal.');
      var href = utils.getPortalUrl();
      interaction.launchBrowser(href);
    }
  }

  var location = site.category('location')
        .description('Commands to manage your Web Site locations');

  location.command('list')
        .description('List locations available for your account')
        .execute(function (options, _) {
          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription)
          };

          var locations = site.doAvailableLocationsGet(context, _);
          log.table(locations, function (row, item) {
            row.cell('Name', item.Name);
          });
        });

  site.command('browse [name]')
        .description('Open your web site in a browser.')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, _) {

          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription),
            site: {
              name: name
            }
          };

          var cache = lookupSiteNameAndWebSpace(context, _);
          var siteData = clean(cache || site.doSiteGet(context, _));

          var href = 'http://' + toArray(siteData.HostNames)[0];

          interaction.launchBrowser(href);
        });

  site.command('show [name]')
        .description('Show details for a web site')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription),
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info('Showing details for site');
          log.verbose('Parameters', context);

          var result = async.parallel([
            function (_) { return site.doSiteGet(context, _); },
            function (_) { return site.doSiteConfigGet(context, _); }
          ], _);

          var repositoryUri = getRepositoryUri(result[0]);
          var gitUri = repositoryUri ? getGitUri(repositoryUri, context.site.name) : 'none';
          var settings = [];
          if (repositoryUri) {
            site.ensureRepositoryUri(context, _);
            settings = site.category('repository').doSettingsGet(context, _);
          }

          if (log.format().json) {
            var data = {
              site: clean(result[0]),
              config: clean(result[1]),
              gitRepositoryUri: gitUri,
              settings: settings
            };

            log.json(data);
          } else {
            logEachData('Site', result[0]);
            logEachData('Config', result[1]);

            log.data('GitRepositoryUri', gitUri);
            for (var index in settings) {
              log.data('Settings' + ' ' + settings[index].Key, settings[index].Value);
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

    context.site.name = prompt('Web site name: ', _);

    if (!context.site.name) {
      throw new Error('Invalid site name');
    }
  }

  function lookupSiteWebSpace(context, _) {
    log.verbose('Attempting to locate site ', context.site.name);
    var sites = site.doSitesGet(context, _);
    for (var index in sites) {
      if (utils.ignoreCaseEquals(sites[index].Name, context.site.name)) {
        log.verbose('Site located at ', sites[index].WebSpace);
        context.site.webspace = sites[index].WebSpace;
      }
    }
    if (context.site.webspace === undefined) {
      throw new Error('Unable to locate site named ' + context.site.name);
    }
  }

  function lookupSiteNameAndWebSpace(context, _) {
    lookupSiteName(context, _);
    var cache = cacheUtils.readSite(context, _);
    if (cache || context.site.webspace) {
      context.site.webspace = (cache && cache.WebSpace) || context.site.webspace;
      return cache;
    }
    lookupSiteWebSpace(context, _);
  }

  site.lookupSiteNameAndWebSpace = lookupSiteNameAndWebSpace;

  function getRepositoryUri(siteData) {
    if (siteData.SiteProperties.Properties) {
      for (var i = 0; i < siteData.SiteProperties.Properties.NameValuePair.length; ++i) {
        var pair = siteData.SiteProperties.Properties.NameValuePair[i];
        if (utils.ignoreCaseEquals(pair.Name, 'RepositoryUri')) {
          if (typeof pair.Value === 'string') {
            if (!endsWith(pair.Value, '/')) {
              // Make sure there is a trailing slash
              pair.Value += '/';
            }

            return pair.Value;
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

    if (!endsWith(repoUrl.path, '/')) {
      // Make sure trailing slash exists
      repoUrl.path += '/';
    }
    repoUrl.path += sitePath;

    if (!endsWith(repoUrl.pathname, '/')) {
      // Make sure trailing slash exists
      repoUrl.pathname += '/';
    }
    repoUrl.pathname += sitePath;

    return url.format(repoUrl);
  }

  function getRepositoryAuth(siteData) {
    var userName, password;
    for (var i = 0; i < siteData.SiteProperties.Properties.NameValuePair.length; ++i) {
      var pair = siteData.SiteProperties.Properties.NameValuePair[i];
      if (utils.ignoreCaseEquals(pair.Name, 'PublishingUsername')) {
        userName = pair.Value;
      } else if (utils.ignoreCaseEquals(pair.Name, 'PublishingPassword')) {
        password = pair.Value;
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
        .description('Delete a web site')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-q, --quiet', 'quiet mode, do not ask for delete confirmation')
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription),
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info('Deleting site', context.site.name);
          if (!options.quiet && !confirm('Delete ' + context.site.name + ' site?  (y/n) ', _)) {
            return;
          }

          var progress = cli.progress('Deleting site');
          try {
            var service = createWebsiteManagementService(context.subscription);
            service.deleteSite(context.site.webspace, context.site.name, _);
            cacheUtils.deleteSite(context, _);
          } finally {
            progress.end();
          }

          log.info('Site ' + context.site.name + ' has been deleted');
        });


  site.command('start [name]')
        .description('Start a web site')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription),
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info('Starting site', context.site.name);

          site.doSitePUT(context, { State: 'Running' }, _);

          log.info('Site ' + context.site.name + ' has been started');
        });

  site.command('stop [name]')
        .description('Stop a web site')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription),
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info('Stopping site', context.site.name);

          site.doSitePUT(context, { State: 'Stopped' }, _);

          log.info('Site ' + context.site.name + ' has been stopped');
        });

  site.command('restart [name]')
        .description('Stop and then start a web site')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, _) {
          var context = {
            subscription: cli.category('account').lookupSubscriptionId(options.subscription),
            site: {
              name: name
            }
          };

          lookupSiteNameAndWebSpace(context, _);

          log.info('Stopping site', context.site.name);
          site.doSitePUT(context, { State: 'Stopped' }, _);

          log.info('Site ' + context.site.name + ' has been stopped, restarting');
          site.doSitePUT(context, { State: 'Running' }, _);
          log.info('Site ' + context.site.name + ' has been restarted');
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
      log.silly('Unable to read config', err);
      return '';
    }
  };

  site.writeConfigValue = function (name, value, _) {
    exec('git config ' + name + ' ' + value, _);
  };


  /////////////////
  // remote api operations

  site.doSitesPost = function (options, callback) {
    getHostNameSuffix(options.subscription, function (err, hostNameSuffix) {
      var websiteAddress = options.site.name + '.' + hostNameSuffix;
      log.info('Creating a new web site at ' + websiteAddress);
      log.verbose('Subscription', options.subscription);
      log.verbose('Webspace', options.site.webspace);
      log.verbose('Site', options.site.name);

      var site = __.clone(options.site);

      site.HostNames = {
        'a:string': [ websiteAddress ]
      };
      site.HostNames['$'] = {
        'xmlns:a': Constants.Namespaces.Arrays
      };

      if (site.hostname) {
        site.HostName['a:string'].push(site.hostname);
      }
      delete site.hostname;

      if (site.name) {
        site.Name = site.name;
      }
      delete site.name;

      if (site.webspace && !site.webSpaceToCreate) {
        site.WebSpace = site.webspace;
      }
      delete site.webspace;

      if (site.webSpaceToCreate) {
        site.WebSpaceToCreate = site.webSpaceToCreate;
      }
      delete site.webSpaceToCreate;

      var progress = cli.progress('Sending site information');
      var service = createWebsiteManagementService(options.subscription);
      service.createSite(options.site.webspace, options.site.name, site, function (err, result) {
        progress.end();
        if (err) {
          logError('Failed to create site', err);
        } else {
          return cacheUtils.saveSite(options, result, function (err) {
            log.info('Created website at ' + clean(result).HostNames);
            log.verbose('Site', clean(result));
            return callback(err, result);
          });
        }

        if (err && typeof err.Message !== 'string') {
          return callback('Invalid service request', result);
        } else {
          return callback(err, result);
        }
      });
    });
  };

  site.doRepositoryPost = function (options, callback) {
    log.info('Initializing remote Azure repository');
    log.verbose('Subscription', options.subscription);
    log.verbose('Webspace', options.site.webspace);
    log.verbose('Site', options.site.name);

    var progress = cli.progress('Updating site information');
    var service = createWebsiteManagementService(options.subscription);
    service.createSiteRepository(options.site.webspace, options.site.name, function (err, result) {
        progress.end();
        if (err) {
          logError('Failed to initialize repository', err);
        } else {
          log.info('Remote azure repository initialized');
        }
        return callback(err, result);
      });
  };

  site.doRepositoryDelete = function(options, callback) {
    log.verbose('Subscription', options.subscription);
    log.verbose('Webspace', options.site.webspace);
    log.verbose('Site', options.site.name);

    var progress = cli.progress('Updating site information');
    var service = createWebsiteManagementService(options.subscription);
    service.deleteSiteRepository(options.site.webspace, options.site.name, function (err, result) {
        progress.end();
        if (err) {
          logError('Failed to delete repository', err);
        } else {
          log.info('Repository deleted');
        }
        return callback(err, result);
      });
  };

  /*jshint unused:false*/
  site.doAvailableLocationsGet = function (options, _) {
    log.verbose('Subscription', options.subscription);

    var progress = cli.progress('Enumerating locations');
    try {
      var service = createWebsiteManagementService(options.subscription);

      // Fetch locations that are "online"
      var locations = service.listGeoRegions(_);
      var result = locations.map(function (location) {
        return {
          Name: location.Name,
          WebSpace: utils.webspaceFromName(location.Name)
        };
      });

      // Fetch webspaces that were previously used
      var webspaces = service.listWebspaces(_);
      webspaces.forEach(function (webspace) {
        if (!result.some(function (loc) {
          return loc.WebSpace === webspace.Name;
        })) {
          result.push({
            Name: webspace.GeoRegion,
            WebSpace: webspace.Name
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

    var progress = cli.progress('Enumerating locations');
    try {
      var service = createWebsiteManagementService(options.subscription);
      var spaces = service.listWebspaces(_);
      cacheUtils.saveSpaces(options, spaces, _);
      return spaces;
    } catch(err) {
      var message = err.Message;
      if (typeof message === 'string' && message.indexOf('Access is denied.') >= 0) {
        log.error('Please use the Windows Azure portal to create your first web website.');
        log.error('You can do so by following these steps:');
        log.error('1. At the bottom of the page, click on New > Web Site > Quick Create');
        log.error('2. Type a valid site name in the URL field');
        log.error('3. Click on "Create Web Site"');
        log.error('4. Once the site has been created, click on the site name');
        log.error('5. Click on "Set up Git publishing" or "Reset deployment credentials" and setup a publishing username and password. Use those credentials for all new websites you create.');

        if (confirm('Launch browser to portal now? (y/n) ', _)) {
          log.help('Launching portal.');
          var href = utils.getPortalUrl();
          interaction.launchBrowser(href);
        }
      }

      throw err;
    } finally {
      progress.end();
    }
  };

  site.doSitesGet = function (options, _) {
    log.verbose('Subscription', options.subscription);

    var service = createWebsiteManagementService(options.subscription);
    var spaces = service.listWebspaces(_);

    var progress = cli.progress('Enumerating sites');
    try {
      var result = async.map(spaces,
        function (webspace, _) {
          return service.listSites(webspace.Name, { propertiesToInclude: [
            'repositoryuri',
            'publishingpassword',
            'publishingusername'
          ] }, _);
        },
        _);

      var sites = [];

      result.forEach(function (item) {
        sites = sites.concat(item);
      });

      log.json('verbose', sites);
      cacheUtils.saveSites(options, sites, _);
      return sites;
    }
    finally {
      progress.end();
    }
  };

  site.doSiteGet = function (options, callback) {
    var progress = cli.progress('Retrieving site information');

    var service = createWebsiteManagementService(options.subscription);
    service.getSite(options.site.webspace, options.site.name, {
        propertiesToInclude: [ 'repositoryuri', 'publishingpassword', 'publishingusername' ]
      },
      function (err, result) {
        progress.end();
        if (err) {
          logError('Failed to get site info', err);
          if (err.Code === 'NotFound') {
            return cacheUtils.deleteSite(options, function () {
              return callback(err, result);
            });
          }
        } else {
          return cacheUtils.saveSite(options, result, function (err) {
            log.verbose('Site', clean(result));
            return callback(err, result);
          });
        }
        return callback(err, result);
      });
  };

  site.doSiteConfigGet = function (options, callback) {
    var progress = cli.progress('Retrieving site config information');

    var service = createWebsiteManagementService(options.subscription);
    service.getSiteConfiguration(options.site.webspace, options.site.name,
      function (err, result) {
        progress.end();
        if (err) {
          logError('Failed to get site config info', err);
        } else {
          log.verbose('SiteConfig', clean(result));
        }
        return callback(err, result);
      });
  };

  site.doSitePUT = function (options, site, _) {
    var progress = cli.progress('Updating site information');

    try {
      var service = createWebsiteManagementService(options.subscription);
      return service.updateSite(options.site.webspace, options.site.name, site, _);
    } finally {
      progress.end();
    }
  };

  site.doSiteConfigPUT = function (config, options, _) {
    var progress = cli.progress('Updating site config information');

    try {
      var service = createWebsiteManagementService(options.subscription);
      return service.updateSiteConfiguration(options.site.webspace, options.site.name, config, _);
    } finally {
      progress.end();
    }
  };

  site.doRepositoryGet = function (options, _) {
    var siteData = site.doSiteGet(options, _);
    return getRepositoryUri(siteData);
  };

  site.doPublishingUsersGet = function (options, _) {
    var progress = cli.progress('Retrieving user information');
    try {
      try {
        var service = createWebsiteManagementService(options.subscription);
        var publishingUsers = service.listPublishingUsers(_);

        log.verbose('PublishingUsers', publishingUsers);
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
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    return utils.createWebsiteManagementService(subscriptionId, account, log);
  }

  function getHostNameSuffix(subscription, callback) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);

    if (subscriptionId) {
      var websiteManagementService = createWebsiteManagementService(subscriptionId, account, log);
      websiteManagementService.listDNSSuffix(function (err, hostNameSuffix) {
        callback(err, hostNameSuffix || utils.getHostNameSuffix());
      });
    } else {
      callback(null, utils.getHostNameSuffix());
    }
  }

  /////////////////
  // helper methods

  function clean(source) {
    if (typeof (source) === 'string') {
      return source;
    }

    var target = {};
    var hasString = false;
    var hasNonString = false;
    var stringValue = '';

    for (var prop in source) {
      if (prop === '$') {
        continue;
      } else {
        if (prop === '_' || prop === 'string' || prop.substring(prop.length - 7) === ':string') {
          hasString = true;
          stringValue = source[prop];
        } else {
          hasNonString = true;
        }

        target[prop] = clean(source[prop]);
      }
    }

    if (hasString && !hasNonString) {
      return stringValue;
    }
    return target;
  }

  function logEachData(title, data) {
    var cleaned = clean(data);
    for (var property in cleaned) {
      log.data(title + ' ' + property, cleaned[property]);
    }
  }

  site.logEachData = logEachData;

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
        log.json('verbose', clean(err));
      }
    }
  }

  function isArray(testObject) {
    return testObject && !(testObject.propertyIsEnumerable('length')) && typeof testObject === 'object' && typeof testObject.length === 'number';
  }

  function toArray(testObject) {
    return isArray(testObject) ? testObject : typeof testObject === 'undefined' ? [] : [testObject];
  }

  function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
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
