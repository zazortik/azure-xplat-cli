## Where to put your code
Depends on what mode your cmds in choose appropriate folder:
* In case of Service Management (RDFE): lib\commands\asm
* In case of Resource Manager (CSM): lib\commands\arm

## What your code will look like
* Copy `sample-service` folder under the directory chosen from previous step.
* Look at the sample folder that has `sample-service.sample._js` and replace the work `sample` with your actual entity name (i.e. storage account) and add code accordingly

## Hints
* Use file extensions `._js` so that you leverage node streamline package to write async code with sync code style
* Create util function under the same folder of `sample-service`
* For new on boarded service, please update utils.js file to add method to create your client and make sure that your service is registered as part of calling this method
* There's a file created under %USERPROFILE%\.azure that called `azureProfile.json` which hold all the imported and authenticated subscriptions and environments.
* Reserved arguments: -v: verbose, -h: help, -vv: debug by showing http traffic and -s: subscription.

## Commands Design Guidelines
* Naming for the regular verb is: create, update, list, show and delete.
* You can create the actual cmd argument but make sure it does not conflict with reserved words (like -v, -h, -s, etc ...)