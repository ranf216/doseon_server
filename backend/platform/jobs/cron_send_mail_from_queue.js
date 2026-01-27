const path = require('path');
const infraRoot = path.dirname(path.dirname(__dirname));
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

isc.initStandAlone(infraRoot, "cron.infrajs.com", "cron_send_mail_from_queue");

new $QueueService($Config.get("send_mail_queue_service")).startService(isc, () =>
{
    $MailerQueue.batchSend();
});
