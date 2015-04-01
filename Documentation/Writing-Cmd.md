## Where to put your code
Depends on what mode your cmds in choose appropriate folder:
* In case of Service Management (RDFE): lib\commands\asm
* In case of Resource Manager (CSM): lib\commands\arm

## What your code will look like
* Copy `sample-service` folder under the directory chosen from previous step.
* Look at the sample folder that has `sample-service.sample._js` and replace the work `sample` with your actual entity name (i.e. storage account) and add code accordingly

## Notes
* Use file extensions `._js` so that you leverage node streamline package to write async code with synchronized coding style
* Create util function under the same folder of `sample-service`
* For new on boarded service, please update utils.js file to add method to create your client and make sure that your service is registered as part of calling this method
* You command will inherit several arguments
   ** --subscription : If the user does not provide the subscription then the current subscription from the azureProfile.json will be used to execute the command. This file is saved under %USERPROFILE%.azure folder. It acts as a repository of the subscriptions associated with a particular user/account)
   ** -vv : verbose and log http traffic to console
   ** -h  : provide help information
   ** --json: please always verify your command's output format is valid json when this flag is on, so that your tests have a reliable way to assert.

## Commands Design Guidelines
* Naming for the regular verb is: create, set, list, show and delete.
* You can create the actual cmd argument but it should not conflict with already used switches in the same command