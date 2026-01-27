const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "#SERVICE_DOMAIN#", "#LOGGER_NAME#");

process.on("SIGINT", (code) =>
{
    $Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
    console.log(`Service is not active shutdown with: ${code}`);
    this.isc.endStandAlone($ERRS.ERR_SUCCESS);
});

$Utils.createCron({secondsInterval: #CRON_EVERY_SECS#  OR  cronExpression: #CRON_EXPRESSION#}, #YOUR_ACTION_FUNCTION#);

console.log("Service started");
$Logger.logString($Const.LL_INFO, `Service started`);
