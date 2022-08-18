## Get started

Install the dependencies...

```bash
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run dev
```

Navigate to [localhost:5100](http://localhost:5100). You should see your app running. Edit a component file in `src`, save it, and reload the page to see your changes.

By default, the server will only respond to requests from localhost. To allow connections from other computers, edit the `sirv` commands in package.json to include the option `--host 0.0.0.0`.

## Deploying to the web

Commiting to master will trigger a build in Azure Pipelines with automatic deploye to Azure App Service test environment. Approval is required for deploy to production, approvers are notified via email.

[![Build Status](https://dev.azure.com/luffe/Sheet%20Music%20Archive%20V4/_apis/build/status/Sheet%20Music%20App?repoName=Stavanger-Brass-Band%2FSBBSheetMusic&branchName=master)](https://dev.azure.com/luffe/Sheet%20Music%20Archive%20V4/_build/latest?definitionId=4&repoName=Stavanger-Brass-Band%2FSBBSheetMusic&branchName=master)

### Infrastructure

#### Sheetmusic [resource group]

|Name|Type|URL|Comment|
|---|---|---|---|
|sheetmusic-app-test|Azure App Service|https://sheetmusic-app-test.azurewebsites.net/|Test environment, running against api test environment|
|sheetmusic-app|Azure App Service|https://medlem.stavanger-brassband.no|Production app|
|sheetmusic-app-plan|Azure App Service Plan|N/A|Linux. Running both envs to save $|


#### Configuration
App Service only contains one application setting:    
``` API_BASE_URL = <url to api service>```

PS! Remember to set Configuration -> General settings -> Startup command on app service for it to serve content via Node.js:  
``` pm2 serve /home/site/wwwroot --no-daemon ```