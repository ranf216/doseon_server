const path = require('path');
const fs = require('fs');
const ucwords = require('ucwords');

const infraRoot = path.dirname(path.dirname(__dirname));
$Const = require(infraRoot + "/platform/definitions/constants.js");
$Const.INFRA_ROOT = infraRoot;

require(infraRoot + "/platform/infra/prototypes.js");

$Config = null;
$ERRS = null;
$Cache = null;
$Db = null;
$Date = null;
$DataItems = null;
$Logger = null;
$Imaging = null;
$KeyValueSet = null;
$CountryUtils = null;
$Utils = require(infraRoot + "/platform/infra/utils.js");
$Files = null;
$Globals = {};
$executeAPI = null;

const listOfModules = [];

function initModules()
{
    listOfModules.forEach(mod =>
    {
        mod.__initialize();
    });
}

module.exports =
{
    init: function()
    {
        if ($Config)
        {
            if ($Config.get("api_server_active") == false)
            {
                this.echoJsonEncode($ERRS.ERR_API_SERVER_IS_NOT_ACTIVE);
                process.exit();
            }

            while (listOfModules.length)
            {
                listOfModules.shift(listOfModules.length);
            }

            return;
        }


        process.env.TZ = $Const.SYSTEM_TIME_ZONE;

        $Const.CONFIG_PATH = $Const.INFRA_ROOT + "/platform/config";
        $Const.SYSTEM_MODULES_PATH = $Const.INFRA_ROOT + "/platform/system_modules";
        $Const.USER_MODULES_PATH = $Const.INFRA_ROOT + "/platform/user_modules";
        $Const.API_PATH = $Const.INFRA_ROOT + "/platform/api";
        $Const.FUNCS_PATH = $Const.INFRA_ROOT + "/platform/funcs";
        $Const.DEFS_PATH = $Const.INFRA_ROOT + "/platform/definitions";

        $Config = require(infraRoot + "/platform/infra/config_funcs.js");
        $Config.init($Const.CONFIG_PATH);

        $Cache = require(infraRoot + "/platform/infra/cache.js");
        $Db = require(infraRoot + "/platform/infra/database.js");
        $Err = require(infraRoot + "/platform/infra/error.js");
        $Date = require(infraRoot + "/platform/infra/date.js");
        $DataItems = require(infraRoot + "/platform/infra/data_items.js");
        $Logger = require(infraRoot + "/platform/infra/logger.js");
        $Imaging = require(infraRoot + "/platform/infra/imaging.js");
        $KeyValueSet = require(infraRoot + "/platform/infra/key_value_set.js");
        $CountryUtils = require(infraRoot + "/platform/infra/country_utils.js");
        $Files = require(infraRoot + "/platform/infra/files.js");
        $executeAPI = require(infraRoot + "/api/main.js").execute;

        if ($Config.get("api_server_active") == false)
        {
            this.echoJsonEncode($ERRS.ERR_API_SERVER_IS_NOT_ACTIVE);
            process.exit();
        }

        $ACL = {};
        $Globals.allUserRoles = require($Const.DEFS_PATH + "/user_roles.js");
        $Globals.allUserRolesList = [];
        $Globals.allUserRoles.forEach(userRole =>
        {
            $ACL[userRole[0]] = 1000 + userRole[1];
            $Const[userRole[0]] = userRole[1];
            $Globals.allUserRolesList.push(userRole[1]);
        });

        $Globals.allUserTypes = require($Const.DEFS_PATH + "/user_types.js");
        $Globals.allUserTypes.forEach(userType =>
        {
            $ACL[userType[0]] = userType[1];
            $Const[userType[0]] = userType[1];
        });


        let usingModulesFile = $Const.CONFIG_PATH + "/" + $Config.get("environment") + ".using_modules.js";
        if (!fs.existsSync(usingModulesFile))
        {
            usingModulesFile = $Const.CONFIG_PATH + "/using_modules.js";
        }

        let modules = require(usingModulesFile);
        if ($Config.get("file_access_level", "enabled") && !modules.system.includes("cipher"))
        {
            modules.system.push("cipher");
        }
        if ($Config.get("using_s3") && !modules.system.includes("aws"))
        {
            modules.system.push("aws");
        }

        modules.system.forEach(module =>
        {
            let moduleName = "$" + (ucwords(module.replace(/_/g, " "))).replace(/ /g, "");
            global[moduleName] = require($Const.SYSTEM_MODULES_PATH + "/" + module + ".js");

            if (!$Utils.empty(global[moduleName].__initialize))
            {
                listOfModules.push(global[moduleName]);
            }
        });
        modules.user.forEach(module =>
        {
            let moduleName = "$" + (ucwords(module.replace(/_/g, " "))).replace(/ /g, "");
            global[moduleName] = require($Const.USER_MODULES_PATH + "/" + module + ".js");

            if (!$Utils.empty(global[moduleName].__initialize))
            {
                listOfModules.push(global[moduleName]);
            }
        });

        if ($Config.get("project_log_type_name") && !(/^[a-z0-9_\-]+$/i.test($Config.get("project_log_type_name"))))
        {
            console.error("project_log_type_name numst be alphanumeric with no spaces");
            process.exit(1); 
        }

        $Db.init();
        initModules();
    },

    initLight: function()
    {
        process.env.TZ = $Const.SYSTEM_TIME_ZONE;

        $Const.CONFIG_PATH = $Const.INFRA_ROOT + "/platform/config";

        $Config = require(infraRoot + "/platform/infra/config_funcs.js");
        $Config.init($Const.CONFIG_PATH);

        $Err = require(infraRoot + "/platform/infra/error.js");
        $Date = require(infraRoot + "/platform/infra/date.js");
        $Logger = require(infraRoot + "/platform/infra/logger.js");
        $Imaging = require(infraRoot + "/platform/infra/imaging.js");

        if ($Config.get("api_server_active") == false)
        {
            this.echoJsonEncode($ERRS.ERR_API_SERVER_IS_NOT_ACTIVE);
            process.exit();
        }
    },
};
