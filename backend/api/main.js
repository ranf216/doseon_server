const ucwords = require('ucwords');

let isInitModules = false;



module.exports =
{
	run(req, res)
	{
		const session = $HttpContext.get("session");
		const rawPostData = req.rawBody;
		const json = ($Utils.empty(rawPostData) ? [] : JSON.parse(rawPostData));

		let rc = runAPI(json, req.query, session, true);
		if (!$Utils.isObject(rc) || !$Utils.isset(rc.rc))
		{
			rc = $ERRS.ERR_UNKNOWN_ERROR;
		}

		session.closeDbAndEchoJsonEncode(rc);
	},

	execute(session, apiName, params = {})
	{
		return runAPI({"#request": apiName, ...params}, [], session, false);
	},
}


function runAPI(json, reqQuery, session, isRun)
{
	try
	{
		(require($Const.INFRA_ROOT + "/platform/infra/api.js")).init();

		if (!isInitModules)
		{
			let modules = require($Const.CONFIG_PATH + "/using_api.js");
			if ($Config.get("use_2factor_auth") && !modules.includes("two_factor_auth"))
			{
				modules.push("two_factor_auth");
			}

			modules.sort();
			modules.forEach(module =>
			{
				moduleName = "$" + (ucwords(module.replace(/_/g, " "))).replace(/ /g, "");
				global[moduleName] = require($Const.FUNCS_PATH + "/" + module + ".js");
			});

			isInitModules = true;
		}
	
	
		let reqParams = [];
		let reqToken = null;
		let reqPasscode = null;
	
	
		if ($Utils.empty(json["#request"]))
		{
			if (!$Utils.empty(reqQuery["#request"]) && (reqQuery["#request"] == "get_image" || reqQuery["#request"] == "get_file"))
			{
				json = {};
				json["#request"] = reqQuery["#request"];
				if (!$Utils.empty(reqQuery["#token"])) json["#token"] = reqQuery["#token"]; else json["#token"] = "";
				if (!$Utils.empty(reqQuery.image_id)) $json.image_id = reqQuery.image_id;
				if (!$Utils.empty(reqQuery.file_id)) $json.file_id = reqQuery.file_id;
			}
			else
			{
				let rc = $ERRS.ERR_INVALID_API_CALL;
				let vals = {"cause": "no request", "post_data": JSON.stringify(json)};
				return {...rc, ...vals};
			}
		}
	
		let request = json["#request"];
		let requestParts = request.split("/");
		if (requestParts.length != 2 || !$Utils.isset($API[requestParts[0]]) || !$Utils.isset($API[requestParts[0]][requestParts[1]]))
		{
			$Logger.logRequest(json, true);
	
			let rc = $ERRS.ERR_INVALID_API_CALL;
			let vals = {"cause": "unknown call " + request};
			return {...rc, ...vals};
		}
	
		let requestModule = requestParts[0];
		let requestMethod = requestParts[1];
		let apiRequest = $API[requestModule][requestMethod];
		let apiModes = ($Utils.isset(apiRequest["@mode"]) ? apiRequest["@mode"].split(",") : []).map(mode => mode.trim()).filter(mode => mode != "");
		let acceptXToken = ($Utils.isset(apiRequest["@accept_x_token"]) ? apiRequest["@accept_x_token"] : "no"); // no / yes / only

		if (isRun)
		{
			let traetedParamsForLogging = [];
			if ($Utils.isset(apiRequest["@protected_request"]))
			{
				traetedParamsForLogging.protected_request = apiRequest["@protected_request"];
			}
			if ($Utils.isset(apiRequest["@protected_response"]))
			{
				traetedParamsForLogging.protected_response = apiRequest["@protected_response"];
			}
			if ($Utils.isset(apiRequest["@truncated_request"]))
			{
				traetedParamsForLogging.truncated_request = apiRequest["@truncated_request"];
			}
			if ($Utils.isset(apiRequest["@truncated_response"]))
			{
				traetedParamsForLogging.truncated_response = apiRequest["@truncated_response"];
			}

			if (apiModes.includes("unlogged"))
			{
				session.custom.log_requests = 0;
			}

			$Logger.logRequest(json, true, traetedParamsForLogging);
		}
	
		let isDeprecated = false;
		if (apiModes.includes("deprecated"))
		{
			isDeprecated = true;
			if ($Config.get("fail_deprecated_api"))
			{
				return $ERRS.ERR_DEPRECATED_API;
			}
		}
	
		if ($Config.get("log_unknown_params_to_api") == true)
		{
			let unused = [];
			
			Object.entries(json).forEach(function(jsonObj)
			{
				let name = jsonObj[0];
	
				if (name == "#request" || name == "#user_id")
				{
					return;
				}
				
				if (!$Utils.isset(apiRequest[name]))
				{
					unused.push(name);
				}
			});
			
			if (unused.length > 0)
			{
				$Logger.logString($Const.LL_WARNING, "Received unknown params for \"" + request + "\": " + unused.join(", "));
			}
		}
	
		let missingApiParam = [];
	
		Object.entries(apiRequest).forEach(function(apiObj)
		{
			let name = apiObj[0];
			let typeWithMod = apiObj[1];

			if (!isRun && ["#token", "#passcode"].includes(name))
			{
				return;
			}

			if (name == "#token" && !$Utils.empty(json[name]))
			{
				reqToken = json[name].trim();
				session.token = reqToken;
				return;
			}
			if (name == "#passcode")
			{
				reqPasscode = ($Utils.empty(json[name]) ? "xyxyx" : json[name].trim());
				return;
			}
			if (name.startsWith("@"))
			{
				return;
			}

			if (name.startsWith("&"))
			{
				name = name.substring(1);
			}

			let type;
			let value;
			
			if (typeWithMod instanceof Object)
			{
				type = typeWithMod;
			}
			else
			{
				let typeParts = typeWithMod.split("***");
				type = typeParts[0];
			}

			isOptional = false;
			if (!(type instanceof Object) && type.startsWith("o:"))
			{
				isOptional = true;
			}

			if ($Utils.isset(json[name]))
			{
				if (isOptional && json[name] === null)
				{
					delete json[name];
				}
				else
				{
					value = json[name];
				}
			}

			if (!$Utils.isset(json[name]))
			{
				if (isOptional)
				{
					value = type.substring(4).trim();
					type = type.substring(2,3);
	
					if (type == "b")
					{
						value = (value == "true");
					}
					else if (type == "a")
					{
						value = (value == "" ? [] : [value]);
					}
					else if (type == "n")
					{
						value = (value == "" ? [] : [Number(value)]);
					}
				}
				else if (type instanceof Object)
				{
					json[name] = [];
				}
				else
				{
					missingApiParam.push(name);
					return;
				}
			}
	
			if (value instanceof Object)
			{
				reqParams[name] = value;
			}
			else if (type == "s")
			{
				reqParams[name] = `${value}`.trim();
			}
			else
			{
				if (type == "i" || type == "d")
				{
					value = Number(value);
				}
				reqParams[name] = value;
			}
		});
	
		if (missingApiParam.length > 0)
		{
			let rc = $ERRS.ERR_MISSING_API_PARAM;
			let vals = {"param": missingApiParam.join(",") + " in " + request};
			return {...rc, ...vals};
		}

		if (isRun)
		{
			let acl = apiRequest["@acl"];
			let aclDecline = apiRequest["@acl_decline"];

			if (acl.includes($Const.USER_TYPE_NA) && $Utils.empty(reqToken))
			{
				// Request with no token
			}
			else if (!$Utils.empty(apiRequest["#token"]))
			{
				const isXToken = reqToken && reqToken.startsWith("X");
				if (isXToken && acceptXToken != "only" && acceptXToken != "yes")
				{
					return $ERRS.ERR_INVALID_USER_TOKEN;
				}
				else if (!isXToken && acceptXToken == "only")
				{
					return $ERRS.ERR_INVALID_USER_TOKEN;
				}

				if (!session.tokenValidator.isValidToken(reqToken))
				{
					return $ERRS.ERR_INVALID_USER_TOKEN;
				}

				if (!$Utils.empty(json["#user_id"]))
				{
					if (session.getCurrentUserRoles().includes($Const.USER_ROLE_ACCOUNT_IMPERSONATION))
					{
						const rv = session.impersonateAccount(json["#user_id"]);
						if ($Err.isERR(rv))
						{
							return rv;
						}
					}
					else
					{
						return $ERRS.ERR_NO_PRIVILEGES;
					}
				}

				if (!acl.includes(session.userType))
				{
					let roles = session.getCurrentUserRoles();
					let aclRoles = roles.filter(value => acl.includes(value + 1000));
					if ($Utils.empty(aclRoles))
					{
						return $ERRS.ERR_NO_PRIVILEGES;
					}
				}

				if (!$Utils.empty(aclDecline))
				{
					if (aclDecline.includes(session.userType))
					{
						return $ERRS.ERR_NO_PRIVILEGES;
					}

					let roles = session.getCurrentUserRoles();
					let aclRoles = roles.filter(value => aclDecline.includes(value + 1000));
					if (!$Utils.empty(aclRoles))
					{
						return $ERRS.ERR_NO_PRIVILEGES;
					}
				}
			}
			else
			{
				console.log("TEST");
			}

			if (!$Utils.empty(reqPasscode))
			{
				if (reqPasscode != $Config.get("open_api_passcode"))
				{
					return $ERRS.ERR_INVALID_PASSCODE;
				}
			}
		}

		if (!$Utils.isset(global["$" + requestModule]))
		{
			return $ERRS.ERR_INVALID_API_MODULE;
		}
	
		let apiModule = new global["$" + requestModule];
		if (!$Utils.isset(apiModule[requestMethod]))
		{
			return $ERRS.ERR_NOT_IMPLEMENTED;
		}
	
		apiModule["$Session"] = session;
	
		Object.entries(reqParams).forEach(function(paramObj)
		{
			let name = paramObj[0];
			let value = paramObj[1];
	
			apiModule["$" + name] = value;
		});
	
		let response = apiModule[requestMethod]();
	
		if (isDeprecated && response.rc == 0)
		{
			$Logger.logString($Const.LL_WARNING, "API is deprecated");
			response.message = $ERRS.ERR_DEPRECATED_API.message;
		}
	
		return response;
	}
	catch(error)
	{
		$Logger.logString($Const.LL_ERROR, `catch error on Main.run ${JSON.stringify(error.message)}`);
		if(session != null)
		{
			$Db.rollbackTransaction();

			const index = error.message.indexOf(" ");
			if (error.message.substring(index) == " is not defined" && error.message.substring(0, 1) == "$")
			{
				return $Err.errWithInfo("ERR_INVALID_MODULE_OR_METHOD", `${error.message.substring(0, index)}`);
			}
			else
			{
				return $ERRS.ERR_API_CRASH;
			}
		}
	}
};
