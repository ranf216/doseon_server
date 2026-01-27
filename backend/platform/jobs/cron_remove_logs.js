const fs = require('fs');
const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "cron.infrajs.com", "cron_remove_logs");

process.on("SIGINT", (code) =>
{
    $Logger.logString($Const.LL_INFO, `Service is not active shutdown with: ${code}`);
    console.log(`Service is not active shutdown with: ${code}`);
    this.isc.endStandAlone($ERRS.ERR_SUCCESS);
});

$Utils.createCron({cronExpression: "0 11 * * *"}, doRemoveLogs);

console.log("Service started");
$Logger.logString($Const.LL_INFO, `Service started`);


function doRemoveLogs()
{
    let date = new $Date();
    date.addDays(-$Config.get("remove_logs_older_than_days"));
    let dateStr = date.format("Y_m_d");

    let logPath = $Config.get("log_requests_path");
    let files = fs.readdirSync(logPath);
    let count = 0;
    let aws = new $Aws();

    files.forEach(file =>
    {
        let ext = $Files.getFileExt(file);
        if (ext != ".log")
        {
            return;
        }

        let filePath = `${logPath}/${file}`;

        if (file < dateStr && file.substring(0, 2) == "20")
        {
            if ($Utils.empty($Config.get("archive_logs_to_s3_path")))
            {
                $Utils.unlink(filePath);
                count++;
            }
            else
            {
                let rv = aws.saveFile(filePath, $Config.get("archive_logs_to_s3_path") + `/${file}`);
                if ($Err.isERR(rv))
                {
                    $Logger.logString($Const.LL_ERROR, JSON.stringify(rv));
                }
                else
                {
                    $Utils.unlink(filePath);
                    count++;
                }
            }
        }
    });

    $Logger.logString($Const.LL_INFO, `Removed ${count} files`);
}
