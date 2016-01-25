## Where to put your code
Depends on what mode your cmds in choose appropriate folder:
* In case of Service Management (RDFE): lib\commands\asm
* In case of Resource Manager (CSM): lib\commands\arm

## What your code will look like
* Copy the `sample-service` [folder](./sample-service) under the directory chosen from previous step.
* Look at the `sample-service.sample._js` in the above mentioned folder and replace the word `sample` with your actual entity name (i.e. storage account) and add code accordingly

## Notes
* For loading performance, the command system has changed to load commands based on metedata of "lib\\plugins.arm.json" or "lib\\plugins.asm.json". This means 2 things to you. 
  * Refresh the metadata by run "node bin/azure --gen ('asm', 'arm' or nothing)" when submit a PR
  * If you are actively developing several commands, continuous refreshing is taxing. You can temporarily remove the metadate files and fall back to dynamic loading, meaing trade away performance for flexible.
* While developing the commands, the command can be executed from the root folder of the cloned repo like this: ```node bin\azure sample create . . .```
  * Once the development of command is complete install the source code from the root folder of your cloned repo at the global location for installing node modules ```npm install . -g```
  * Now you can execute your developed command using azure like this: ```azure sample create . . .```
* Use file extensions `._js` so that you leverage node streamline package to write async code with synchronized coding style. More information about streamline can be found [here](http://blog.rivaliq.com/develop-double-time-node-plus-streamline/) and [here](http://www.stateofcode.com/2011/05/bruno-jouhier/).
* Create util function under the same folder of `sample-service`
* For the new service to onboard, please update utils.js file to add method to create your client and make sure that your service is registered as part of calling this method
* You command will inherit several arguments
  * --subscription : If the user does not provide the subscription then the current subscription from the azureProfile.json will be used to execute the command. This file is saved under ```%USERPROFILE%/.azure``` folder. It acts as a repository of the subscriptions associated with a particular user/account)
  * -vv : verbose and log http traffic to console
  * -h  : provide help information
  * --json: please always verify your command's output format is valid json when this flag is on, so that your tests have a reliable way to assert.

## Command Design Guidelines
* Please strictly adhere to this verb usage for basic [CRUD] operations: 
  * create - create a new entity
  * set - update an existing enity
  * list - list all the entities
  * show - provide more information about the specified entity
  * delete - delete the specified entity
* While creating arguments/parameters for your command, please make sure that the switch name (long version "--username" and short version "-u") does not conflict with already used switches in the same command

## Specifying Required or Optional parameters for a cmdlet
CLI uses [commander](https://github.com/tj/commander.js?utm_source=jobboleblog) for defining the cmdlets. Please read the commander documentation for proper understanding. Commander treats a parameter as a **required parameter** when it is specified with **angle brackets '< >'** in it's definition and it treats a parameter as an **optional parameter** when it is specified with **square brackets '[ ]'** in it's definition. Please take a look at an example here
```
group.command('set <name>')
  .description($('Set tags to a resource group'))
  .usage('[options] <name> [tags]')
/*REQUIRED*/  .option('-n --name <name>', $('the resource group name')) 
/*OPTIONAL*/  .option('-t --tags [tags]', $('Tags to set to the resource group. Can be multiple. ' +
        'In the format of \'name=value\'. Name is required and value is optional. ' + 
        'For example, -t 'tag1=value1;tag2'. Providing an empty string '' will delete the tags.'))  
  .option('--subscription <subscription>', $('the subscription identifier'))
  .execute(function (name, options, _) {
    var updatedGroup = group.createResourceGroup(name, '', options, _);
    showResourceGroup(updatedGroup);
  });
```
