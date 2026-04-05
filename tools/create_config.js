global.$IGNORE_CONFOG_ENC = true;
const infraRoot = __dirname + "/../backend";
const isc = require(infraRoot + "/platform/infra/init_server_config.js");

if (process.argv.length <= 3)
{
    console.log("\x1b[33m\x1b[1m%s\x1b[0m", "create_config <prefix (usually branch)> <default / domain>");
    return;
}

isc.initStandAlone(infraRoot, "infra", "create_config");

const prefix = process.argv[2];
const domain = process.argv[3];

const rv = $Config.createEncConfig(prefix, domain);
if ($Err.isERR(rv))
{
    console.log("\x1b[31m\x1b[1m%s\x1b[0m", `Error: ${rv.message}`);
}
else
{
    console.log("\x1b[32m\x1b[1m%s\x1b[0m", `File: ${rv.config_file_name}`);
}

isc.endStandAlone($ERRS.ERR_SUCCESS);
