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

var __ = require('underscore');
var util = require('util');
var fs = require('fs');
var url = require('url');
var forge = require('node-forge');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function(cli) {
    var log = cli.output;
    var withProgress = cli.interaction.withProgress.bind(cli.interaction);

    var secret = cli.category('vault').category('secret')
        .description($('Commands to manage vault secrets'));

    secret.command('list [vault-name]')
        .description($('Lists secrets of a vault'))
        .usage('[--vault-name] <vault-name> [options]')
        .option('-u, --vault-name <vault-name>', $('the vault name'))
        .execute(function(vaultName, options, _) {

            ///////////////////////
            // Parse arguments.  //
            ///////////////////////
        
            log.verbose('arguments: ' + JSON.stringify({vaultName:vaultName,options:options}));
            
            options.vaultName = options.vaultName || vaultName;

            if (!options.vaultName) {
                return cli.missingArgument('vault-name');
            }

            ////////////////////////////////////////////
            // Create the client and list secrets.       //
            ////////////////////////////////////////////
            
            var client = createClient(options, _);

            var progress = cli.interaction.progress(util.format($('Loading secrets of vault %s'), options.vaultUri));
            try {
              var result = client.secrets.list(options.vaultUri, null, _);
              var secrets = [];
              for (;;) {
                  if (result.value && result.value.length) {
                      secrets = secrets.concat(result.value);
                  }
                  if (!result.nextLink) {
                      break;
                  }
                  log.verbose(util.format($('Found %d secrets, loading more'), secrets.length));
                  result = client.secrets.listNext(result.nextLink, _);
              }
            } finally {
                progress.end();
            }

            log.table(secrets, showSecretRow);

            log.info(util.format($('Found %d secrets'), secrets.length));
        });

    secret.command('list-versions [vault-name] [secret-name]')
        .description($('Lists secret versions'))
        .usage('[--vault-name] <vault-name> [[--secret-name] <secret-name>] [options]')
        .option('-u, --vault-name <vault-name>', $('the vault name'))
        .option('-s, --secret-name <secret-name>', $('lists only versions of this secret'))
        .execute(function(vaultName, secretName, options, _) {

            ///////////////////////
            // Parse arguments.  //
            ///////////////////////
        
            log.verbose('arguments: ' + JSON.stringify({vaultName:vaultName,secretName:secretName,options:options}));
            
            options.vaultName = options.vaultName || vaultName;
            options.secretName = options.secretName || secretName;

            if (!options.vaultName) {
                return cli.missingArgument('vault-name');
            }

            ////////////////////////////////////////////
            // Create the client and list secrets.       //
            ////////////////////////////////////////////
            
            var client = createClient(options, _);

            var secrets;
            if (!options.secretName) {            
                secrets = [];
                var progress = cli.interaction.progress(util.format($('Loading secrets of vault %s'), options.vaultUri));
                try {
                  var result = client.secrets.list(options.vaultUri, null, _);
                  for (;;) {
                      var items = result.value;
                      if (items && items.length) {
                          for (var i = 0; i < items.length; ++i) {
                              var secretIdentifier = parseSecretIdentifier(items[i].id);
                              var secretVersions = getSecretVersions(client, secretIdentifier.vaultUri, secretIdentifier.name, _);
                              secrets = secrets.concat(secretVersions);
                          }
                      }
                      if (!result.nextLink) {
                          break;
                      }
                      log.verbose(util.format($('Found %d secrets, loading more'), secrets.length));
                      result = client.secrets.listNext(result.nextLink, _);
                  }
                } finally {
                    progress.end();
                }
            } else {
                var progress = cli.interaction.progress(util.format($('Loading secrets of vault %s'), options.vaultUri));
                try {
                    secrets = getSecretVersions(client, options.vaultUri, options.secretName, _);
                } finally {
                    progress.end();
                }
            }

            log.table(secrets, showSecretRow);

            log.info(util.format($('Found %d secrets'), secrets.length));
        });

    secret.command('set [vault-name] [secret-name] [secret-value]')
        .description($('Stores a secret on the vault'))
        .usage('[--vault-name] <vault-name> [--secret-name] <secret-name> [--value] <secret-value> [options]')
        .option('-u, --vault-name <vault-name>', $('the vault name'))
        .option('-s, --secret-name <secret-name>', $('name of the secret to be created; if already exists, a new secret version is created'))
        .option('-s, --value <secret-value>', $('the secret value'))
        .option('--enabled <boolean>', $('tells if the secret should be enabled; valid values: [false, true]; default is true'))
        .option('-e, --expires <datetime>', $('expiration time of secret, in UTC format'))
        .option('-n, --not-before <datetime>', $('time before which secret cannot be used, in UTC format'))
        .option('-t, --tags <tags>', $('Tags to set on the secret. Can be multiple in the format \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
        .execute(function(vaultName, secretName, value, options, _) {
            
            ///////////////////////
            // Parse arguments.  //
            ///////////////////////

            var secretVersion; // must be undefined on this command.
            parseSecretPropertiesArguments(vaultName, secretName, secretVersion, value, options, true, _);

            /////////////////////////////////////////////////
            // Perform the request.                        //
            /////////////////////////////////////////////////

            var client = createClient(options, _);
            
            var request = {
                value: options.value,
                attributes: {
                    enabled: options.enabled,
                    nbf: options.notBefore,
                    exp: options.expires
                },
                tags: options.tags
            };
            
            log.verbose('request: ' + JSON.stringify(request));

            var secret;
            var secretIdentifier = getSecretIdentifier(options);
            var progress = cli.interaction.progress(util.format($('Creating secret %s'), secretIdentifier));
            try {
                secret = client.secrets.set(secretIdentifier, request, _);
            } finally {
                progress.end();
            }

            showSecret(secret);
        });

    secret.command('set-attributes [vault-name] [secret-name] [secret-version]')
        .description($('Changes attributes of an existing secret'))
        .usage('[--vault-name] <vault-name> [--secret-name] <secret-name> [[--secret-version] <secret-version>] [options]')
        .option('-u, --vault-name <vault-name>', $('the vault name'))
        .option('-s, --secret-name <secret-name>', $('name of the secret to be modified'))
        .option('-r, --secret-version <secret-version>', $('the version to be modified; if ommited, modifies only the most recent'))
        .option('--enabled <enabled>', $('if informed, command will change the enabled state; valid values: [false, true]'))
        .option('-e, --expires <datetime>', $('if informed, command will change secret expiration time; must be a date in UTC format or null'))
        .option('-n, --not-before <datetime>', $('if informed, command will change time before which secret cannot be used; must be a date in UTC format or null'))
        .option('-t, --tags <tags>', $('Tags to set on the secret. Can be multiple in the format \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
        .option('--reset-tags', $('remove previously existing tags; can combined with --tags'))
        .execute(function(vaultName, secretName, secretVersion, options, _) {
            
            ///////////////////////
            // Parse arguments.  //
            ///////////////////////

            // Detect informed parameters.
            var informed = {
              enabled: options.enabled || false,
              expires: options.expires || false,
              notBefore: options.notBefore || false,
              secretOps: options.secretOps || false,
              tags: options.tags || false,
              resetTags: options.resetTags || false
            };

            parseSecretPropertiesArguments(vaultName, secretName, secretVersion, null, options, false, _);

            //////////////////////////////////////////////////////
            // Deal with tags. Load existing vault, if needed.  //
            //////////////////////////////////////////////////////
            
            var client = createClient(options, _);

            var secret;
            var secretIdentifier = getSecretIdentifier(options);
            
            if (informed.tags) {
              
              if (informed.resetTags) {
                
                // Clear existing tags and set new ones, no need to read existing object.
                
              } else {
                
                // We must read existing tags and add the new ones.
                log.info(util.format($('Getting secret %s'), secretIdentifier));
                secret = client.secrets.get(secretIdentifier, _);
                var currentTags = secret.tags;
                if (!currentTags) {
                  // Defend against undefined.
                  currentTags = { };
                }
                options.tags = mergeTags(currentTags, options.tags);
                
              }
              
            } else {
              
              if (informed.resetTags) {

                // Clear all tags ignoring existing one.
                informed.tags = true;
                options.tags = { };

              } else {
                
                // Request will not touch tags.
                
              }
              
            }

            ////////////////////////////////////////////////////////////
            // Build the request based on informed parameters.        //
            ////////////////////////////////////////////////////////////
            
            var request = {
                attributes: {}
            };
            
            if (informed.secretOps) request.secret_ops = options.secretOps;
            if (informed.enabled) request.attributes.enabled = options.enabled;
            if (informed.notBefore) request.attributes.nbf = options.notBefore;
            if (informed.expires) request.attributes.exp = options.expires;
            if (informed.tags) request.tags = options.tags;

            /////////////////////////////////////////////////
            // Send the request.                           //
            /////////////////////////////////////////////////
            
            log.verbose('request: ' + JSON.stringify(request, null, ' '));

            var progress = cli.interaction.progress(util.format($('Updating secret %s'), secretIdentifier));
            try {
              secret = client.secrets.update(secretIdentifier, request, _);
            } finally {
              progress.end();
            }

            showSecret(secret);
        });

    secret.command('show [vault-name] [secret-name] [secret-version]')
        .description($('Shows a vault secret'))
        .usage('[--vault-name] <vault-name> [--secret-name] <secret-name> [[--secret-version] <secret-version>] [options]')
        .option('-u, --vault-name <vault-name>', $('the vault name'))
        .option('-s, --secret-name <secret-name>', $('the secret name'))
        .option('-r, --secret-version <secret-version>', $('the secret version; if ommited, uses the most recent'))
        .execute(function(vaultName, secretName, secretVersion, options, _) {

            ///////////////////////
            // Parse arguments.  //
            ///////////////////////

            log.verbose('arguments: ' + JSON.stringify({vaultName:vaultName,secretName:secretName,secretVersion:secretVersion,options:options}));

            options.vaultName = options.vaultName || vaultName;
            options.secretName = options.secretName || secretName;
            options.secretVersion = options.secretVersion || secretVersion;

            if (!options.vaultName) {
                return cli.missingArgument('vault-name');
            }
            
            if (!options.secretName) {
                return cli.missingArgument('secret-name');
            }
            
            /////////////////////////
            // Send the request.   //
            /////////////////////////

            var client = createClient(options, _);

            var secretIdentifier = getSecretIdentifier(options);
            var progress = cli.interaction.progress(util.format($('Getting secret %s'), secretIdentifier));
            try {
              secret = client.secrets.get(secretIdentifier, _);
            } finally {
              progress.end();
            }
            
            showSecret(secret);
        });
        
    secret.command('delete [vault-name] [secret-name]')
        .description($('Deletes a secret from the vault'))
        .usage('[--vault-name] <vault-name> [--secret-name] <secret-name> [options]')
        .option('-u, --vault-name <vault-name>', $('the vault name'))
        .option('-s, --secret-name <secret-name>', $('the secret name'))
        .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
        .option('-p, --pass-thru', $('outputs the deleted secret'))
        .execute(function(vaultName, secretName, options, _) {

            ///////////////////////
            // Parse arguments.  //
            ///////////////////////

            log.verbose('arguments: ' + JSON.stringify({vaultName:vaultName,secretName:secretName,options:options}));

            options.vaultName = options.vaultName || vaultName;
            options.secretName = options.secretName || secretName;

            if (!options.vaultName) {
                return cli.missingArgument('vault-name');
            }
            
            if (!options.secretName) {
                return cli.missingArgument('secret-name');
            }
            
            if (!options.quiet && !cli.interaction.confirm(util.format($('Delete secret %s from vault %s? [y/n] '), options.secretName, options.vaultName), _)) {
                throw new Error($('Aborted by user'));
            }

            /////////////////////////
            // Send the request.   //
            /////////////////////////

            var client = createClient(options, _);
            
            var secret;
            var secretIdentifier = getSecretIdentifier(options);
            var progress = cli.interaction.progress(util.format($('Deleting secret %s'), secretIdentifier));
            try {
              secret = client.secrets.deleteMethod(secretIdentifier, _);
            } finally {
              progress.end();
            }
            
            if (options.passThru) {
              showSecret(secret);
            }
        });
        
    function createClient(options, _) {    
        var subscription = profile.current.getSubscription(options.subscription);
        log.verbose(util.format($('Using subscription %s (%s)'), subscription.name, subscription.id));
        options.vaultUri = 'https://' + options.vaultName + '.vault.azure.net';
        return utils.createKeyVaultClient(subscription, options.vaultUri);
    }

    function getSecretIdentifier(options) {
        var id = options.vaultUri + '/secrets/' + options.secretName;
        if (options.secretVersion) {
            id += '/' + options.secretVersion;
        }
        return id;
    }

    function parseSecretIdentifier(secretIdentifier) {
        var parsed = url.parse(secretIdentifier);
        
        var vaultUri = '';
        vaultUri += parsed.protocol || '';
        if (parsed.slashes) {
            vaultUri += '//';
        }
        vaultUri += parsed.host || '';
        
        if (!parsed.pathname) {
            throw unsupported();
        }
        
        var secretPath = parsed.pathname.split('/');
        if (secretPath.length < 3 || !utils.ignoreCaseEquals(secretPath[1], 'secrets')) {
            throw unsupported();          
        }
        
        var secretName = secretPath[2];
        var secretVersion;
        if (secretPath.length > 3) {
            secretVersion = secretPath[3];
        }
        
        return {
            vaultUri: vaultUri,
            name: secretName,
            version: secretVersion
        };
        
        function unsupported() {
            throw new Error(util.format($('Unsupported secret identifier: %s'), secretIdentifier));
        }        
    }

    function parseSecretPropertiesArguments(vaultName, secretName, secretVersion, value, options, requireValue, _) {

        log.verbose('arguments: ' + JSON.stringify({vaultName:vaultName,secretName:secretName,secretVersion:secretVersion,value:value,options:options}));

        options.vaultName = options.vaultName || vaultName;
        options.secretName = options.secretName || secretName;
        options.secretVersion = options.secretVersion || secretVersion;
        options.value = options.value || value;

        if (!options.vaultName) {
            return cli.missingArgument('vault-name');
        }
        
        if (!options.secretName) {
            return cli.missingArgument('secret-name');
        }
        
        if (requireValue && !options.value) {
            return cli.missingArgument('value');
        }

        options.expires = parseDateArgument('expires', options.expires, null);
        options.notBefore = parseDateArgument('not-before', options.notBefore, null);
        options.enabled = parseBooleanArgument('enabled', options.enabled, true);
        options.tags = parseTagsArgument('tags', options.tags);

    }
    
    function getSecretVersions(client, vaultUri, secretName, _) {

        log.verbose(util.format($('Loading versions of secret %s'), secretName));
    
        var secrets = [];
        var result = client.secrets.listVersions(vaultUri, secretName, null, _);
        for (;;) {
            var items = result.value;
            if (items && items.length) {
                secrets = secrets.concat(items);
            }
            if (!result.nextLink) {
                break;
            }
            log.verbose(util.format($('Found %d versions, loading more'), secrets.length));
            result = client.secrets.listVersionsNext(result.nextLink, _);
        }
        
        return secrets;
    }

    function showSecret(secret) {
        cli.interaction.formatOutput(secret, function(secret) {
            log.data($('id'), secret.id);
            log.data($('value'), secret.value);
            cli.interaction.logEachData($('attributes'), getAttributesWithPrettyDates(secret.attributes));
            cli.interaction.logEachData($('tags'), secret.tags);
        });
    }
    
    function showSecretRow(row, item) {
        row.cell($('Id'), item.id);
        row.cell($('Enabled'), item.attributes.enabled);
        var attributes = getAttributesWithPrettyDates(item.attributes);
        row.cell($('Not Before'), attributes.nbf || '');
        row.cell($('Expires'), attributes.exp || '');
        row.cell($('Created'), attributes.created);
        row.cell($('Updated'), attributes.updated);
        row.cell($('Tags'), getTagsInfo(item.tags));
    }
    
    function getAttributesWithPrettyDates(attributes) {
        if (!attributes) {
            return attributes;
        }
        var result = JSON.parse(JSON.stringify(attributes));
        makePrettyDate(result, 'created');
        makePrettyDate(result, 'updated');
        makePrettyDate(result, 'nbf');
        makePrettyDate(result, 'exp');
        return result;
    }
    
    function makePrettyDate(obj, unixTimeField) {
        var d = obj[unixTimeField];
        if (__.isNumber(d) && !__.isNaN(d)) {
            obj[unixTimeField] = new Date(d * 1000).toISOString();
        }
    }

    function parseDateArgument(argName, argValue, _default) {
        if (__.isUndefined(argValue)) {
            return _default;
        }
        if (utils.ignoreCaseEquals(argValue, 'null')) {
          return null;
        }
        var n = parseInt(argValue);       
        if ((''+n) !== argValue) {
            // Unix Time (seconds from 1970-01-01 00:00:00)
            n = (new Date(argValue)).getTime() / 1000;
        }
        if (__.isNumber(n) && !__.isNaN(n)) {
            return n;
        }
        throw new Error(util.format($('Invalid date specified on %s: %s.'), argName, argValue));
    }

    function parseBooleanArgument(argName, argValue, _default) {
        if (__.isUndefined(argValue)) {
            return _default;
        }
        if (utils.ignoreCaseEquals(argValue, 'false')) {
          return false;
        }
        if (utils.ignoreCaseEquals(argValue, 'true')) {
          return true;
        }
        throw new Error(util.format($('Invalid value specified on %s: %s (not boolean).'), argName, argValue));
    }

    function parseArrayArgument(argName, argValue, validValues, _default) {
        if (__.isUndefined(argValue)) {
            return _default;
        }
        var a;
        try {
            a = JSON.parse(argValue);
        } catch(err) {
            throw new Error(util.format($('Not a JSON value informed on %s: %s.'), argName, argValue));
        }
        if (__.isArray(a)) {
            // get all elements that are not present on validValues.
            var left = a.filter(function(elem) {
                return validValues.indexOf(elem) == -1;
            });
            // if some is left, we abort as invalid.
            if (left.length != 0) {
                throw new Error(util.format($('Argument %s has invalid elements: %s.'), argName, JSON.stringify(left)));
            }
            return a;
        }
        throw new Error(util.format($('Invalid value specified on %s: %s.'), argName, argValue));
    }

    function parseTagsArgument(argName, argValue) {
        if (__.isUndefined(argValue)) {
            return argValue;
        }
        var result = {};
        argValue.split(';').forEach(function (tagValue) {
          var tv = tagValue.split('=');
          if (tv.length === 2) {
            result[tv[0]] = tv[1];
          } else {
            result[tv[0]] = '';
          }
        });
        return result;
    }

    function mergeTags(currentTags, newTags) {
      for (var property in newTags) {
          if (newTags.hasOwnProperty(property)) {
              currentTags[property] = newTags[property];
          }
      }
      return currentTags;
    }

    function getTagsInfo(tags) {
      var tagsInfo = '';
      for (var tagName in tags) {
        if (tags.hasOwnProperty(tagName)) {
          var tagEntity = tags[tagName] ? (tagName + '=' + tags[tagName]) : tagName;
          tagsInfo = tagsInfo ? (tagsInfo + ';' + tagEntity) : tagEntity;
        }
      }
      return tagsInfo;
    }

};
