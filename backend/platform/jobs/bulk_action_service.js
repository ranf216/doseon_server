const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "service.infrajs.io", "bulk_action_service");


new $QueueService($Config.get("bulk_action_service")).startService(isc, (message) =>
{
    let data = JSON.parse(message);
    $BulkAction.execute(data.actionId);
});
