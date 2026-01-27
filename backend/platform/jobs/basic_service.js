const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "#SERVICE_DOMAIN#", "#LOGGER_NAME#");


new $QueueService($Config.get("queue_service")).startService(isc, (message) =>
{
    $Logger.logString($Const.LL_DEBUG, message);
});
