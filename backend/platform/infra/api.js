const ucwords = require('ucwords');

$API = [];

module.exports =
{
    init: function()
    {
        if (!$Utils.empty($API))
        {
            return;
        }

        let enableSuperuserApi = ($Config.get("enable_supreuser_api") && $Utils.isMyIpAuthorized($Config.get("restrict_supreuser_api_to_ip")));
        let enableTestApi = ($Config.get("enable_test_api") && $Utils.isMyIpAuthorized($Config.get("restrict_test_api_to_ip")));

        let modules = require($Const.CONFIG_PATH + "/using_api.js");
        if ($Config.get("use_2factor_auth"))
        {
            modules.push("two_factor_auth");
        }

        modules.sort();
        modules.forEach(module =>
        {
            let apis = require($Const.API_PATH + "/" + module + ".js");
            let moduleName = (ucwords(module.replace(/_/g, " "))).replace(/ /g, "");

            Object.entries(apis).forEach(function(apisObj)
            {
                let name = apisObj[0];
                let api = apisObj[1];
                let apiModes = ($Utils.isset(api["@mode"]) ? api["@mode"].split(",") : []).map(mode => mode.trim()).filter(mode => mode != "");

                if (apiModes.includes("off"))
                {
                    return;
                }

                if (!enableSuperuserApi && apiModes.includes("superuser"))
                {
                    return;
                }

                if (!enableTestApi && apiModes.includes("test"))
                {
                    return;
                }

                if (!$Utils.isset(api["@api_group"]))
                {
                    api["@api_group"] = moduleName;
                }

                if (!$Utils.isset($API[moduleName]))
                {
                    $API[moduleName] = [];
                }

                $API[moduleName][name] = api;
            });
        });
    }
};
