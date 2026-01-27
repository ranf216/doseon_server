const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "cron.infrajs.com", "cron_monitor_logs");

process.on("SIGINT", (code) =>
{
    $Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
    console.log(`Service is not active shutdown with: ${code}`);
    this.isc.endStandAlone($ERRS.ERR_SUCCESS);
});

$Utils.createCron({cronExpression: "* * * * *"}, doMonitorLogs);

console.log("Service started");
$Logger.logString($Const.LL_INFO, `Service started`);


function doMonitorLogs()
{
    let now = new $Date();
    let hour = parseInt(now.format("H"));
    let minute = parseInt(now.format("i"));

    $Logger.markCrashesAndErrors();
    $Logger.reportCrashes();

    if ($Config.get("send_error_logs_hours").includes(hour) && minute == 0)
    {
        $Logger.reportErrors();
    }
}