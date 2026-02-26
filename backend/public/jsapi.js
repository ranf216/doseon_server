exports.run = function (req, res)
{
	if ($Config.get("enable_api_client") != true)
	{
		$Utils.unauthorize();
		return;
	}

	$Utils.authorizeIP($Config.get("restrict_api_client_to_ip"));

	res.set("Pragma", "public");
	res.set("Cache-Control", "max-age=29030400, public");
	res.set("Content-type", "application/javascript");

	(require($Const.INFRA_ROOT + "/platform/infra/api.js")).init();

	var js = createContent();
	res.send(js);
}

function createContent()
{
	let contentText =`
var BASE_API_URL = "` + $Config.get("api_url") + `";
var USES_GET = false;
var loginEmail = "";
var customOnSuccess = null;
var customOnFail = null;


$(document).ready(function()
{
	$("#btnDeleteCtx").unbind().click(function()
	{
		var context = loadContext();
		if (context.sessions.length == 0)
		{
			return;
		}
		
		var email = $("#userCtxSelect").val();

		for (var i = 0; i < context.sessions.length; i++)
		{
			var ctx = context.sessions[i];
			if (ctx.email == email)
			{
				context.sessions.splice(i, 1);
			}

			saveContext(context);
			break;
		}
		
		fillContextSelector();
	});

	$("#btnDeleteAllCtx").unbind().click(function()
	{
		saveContext(null);
		setNoContextLoaded();
	});
});


function customResetPage()
{
}

function customBeforeCallAPI(reqParams, postData, getParams)
{
	if (postData["#request"] == "User/login")
	{
		loginEmail = postData["email"];
	}
}

function onSuccess(json)
{
	if (json["rc"] != 0)
	{
		if (customOnFail != null)
		{
			customOnFail(json);
		}

		return {error: true, errorMsg: json["rc"] + " - " + json["error"]};
	}
	
	if (customOnSuccess != null)
	{
		customOnSuccess(json);
	}
}

function onSuccessLogin(json)
{
	if (json["rc"] != 0)
	{
		loginEmail = "";
		return onSuccess(json);
	}

	var context = loadContext();
	var ctxFound = false;
	
	for (var i = 0; i < context.sessions.length; i++)
	{
		if (context.sessions[i].email == loginEmail)
		{
			ctxFound = true;
			context.sessions[i].token = json["#token"];
		}
	}
	
	if (!ctxFound)
	{
		var newCtx = new Object();
		newCtx.email = loginEmail;
		newCtx.token = json["#token"];
		context.sessions.push(newCtx);
	}
	
	saveContext(context);
	
	loginEmail = "";
	
	onSuccess(json);
}

function setNoContextLoaded()
{
	$("#userCtxSelect").unbind();
	$("#userCtxSelect").html("<option>--- NO LOADED CONTEXT ---</option>");
	$("#post_token_0").val("");
}

function fillContextSelector()
{
	var context = loadContext();
	if (context.sessions.length == 0)
	{
		setNoContextLoaded();
		return;
	}
	
	var html = "";

	for (var i = 0; i < context.sessions.length; i++)
	{
		var ctx = context.sessions[i];
		html += "<option value=\\"" + ctx.email + "\\">" + ctx.email + "</option>"
	}
	
	$("#userCtxSelect").html(html);
	$("#userCtxSelect").unbind().change(function(){selectContext($(this).val())});
	
	selCtx = getSelectedContext();
	if (selCtx == null)
	{	
		selectContext(context.sessions[0].email);
	}
	else
	{
		$("#post_token_0").val(selCtx.token);
		$("#userCtxSelect").val(selCtx.email);
	}
}

function selectContext(email)
{
	var context = loadContext();

	for (var i = 0; i < context.sessions.length; i++)
	{
		var ctx = context.sessions[i];
		if (ctx.email == email)
		{
			$("#post_token_0").val(ctx.token);
			setSelectedContext(email);
			break;
		}
	}
}

function setSelectedContext(email)
{
	context = loadContext();
	
	for (var i = 0; i < context.sessions.length; i++)
	{
		var ctx = context.sessions[i];
		ctx.isSelected = (ctx.email == email);
	}
	
	saveContext(context);
}

function getSelectedContext()
{
	context = loadContext();
	
	for (var i = 0; i < context.sessions.length; i++)
	{
		var ctx = context.sessions[i];
		if (ctx.isSelected)
		{
			return ctx;
		}
	}

	return null;
}

function saveContext(context)
{
	if (context == null)
	{
		jQuery.cookie("loginContext", null, {});
		return;
	}
	
	jQuery.cookie("loginContext", JSON.stringify(context), {expires: 365});
}

function loadContext()
{
	var context = null;
	
	var contextCookie = jQuery.cookie("loginContext");
	if (contextCookie == null)
	{
		context = new Object();
		context.sessions = new Array();
		return context;
	}

	context = jQuery.parseJSON(contextCookie);
	if (context.length == 0)
	{
		context = new Object();
		context.sessions = new Array();
	}

	return context;
}


var apiCalls = new Array();
var apiCallAcl = new Array();
var apiCallNames = new Array();
var apiCallExtraData = new Array();
var apiCallAlerts = new Array();
var apiGroups = new Array();
var userTypes = new Array();
var userRoles = new Array();`;

	let types = [];
	$Globals.allUserTypes.forEach(userType =>
	{
		types[userType[1]] = userType[2];
		contentText += "userTypes.push('" + userType[2] + "');\n";
	});

	$Globals.allUserRoles.forEach(userRole =>
	{
		types[1000 + userRole[1]] = "[R] " + userRole[2];
		contentText += "userRoles.push('[R] " + userRole[2] + "');\n";
	});

	Object.entries($API).forEach(function(apiObj)
	{
		let module = apiObj[0];
		let requests = apiObj[1];

		Object.entries(requests).forEach(function(reqObj)
		{
			let request = reqObj[0];
			let params = reqObj[1];

			let acl = params["@acl"];
			let group = ($Utils.empty(params["@api_group"]) ? "_General" : params["@api_group"]);
			let requestName = request;
			let requestAcl = "[";
			let hasAcl = false;
			let apiModes = ($Utils.isset(params["@mode"]) ? params["@mode"].split(",") : []).map(mode => mode.trim()).filter(mode => mode != "");
			let alert = ($Utils.empty(params["@alert"]) ? null : params["@alert"]);
			
			Object.entries(types).forEach(function(typeObj)
			{
				let userType = parseInt(typeObj[0]);
				let typeName = typeObj[1];

				if (acl.includes(userType))
				{
					if (!hasAcl)
					{
						hasAcl = true;
						requestName += " (";
					}
					else
					{
						requestName += ", ";
						requestAcl += ", ";
					}

					requestName += typeName;
					requestAcl += "\"" + typeName + "\"";
				}
			});

			if (hasAcl)
			{
				requestName += ")";
			}

			requestAcl += "]";

			contentText += `			
	apiCalls.push({module: "` + group + `", method: "` + request + `"});
	apiCallNames["` + request + `"] = "` + requestName + `";
	apiCallAcl["` + request + `"] = ` + requestAcl + `;
	apiCallExtraData["` + request + `"] = {"apiModes": ` + JSON.stringify(apiModes) + `};`;

			if (!$Utils.empty(alert))
			{
				contentText += `apiCallAlerts["${group}/${request}"] = "${alert}";`;
			}

		contentText += `
	if (apiGroups["` + group + `"] == null) apiGroups["` + group + `"] = new Array();
	apiGroups["` + group + `"].push({module: "` + group + `", method: "` + request + `"});

	function ` + group + "__" + request + `()
	{
		var postData = new Object();
		var docData = new Object();
		var paramTypes = new Object();
		postData["#request"] = "` + group + "/" + request + `";
		var optionals = new Array();
	`;

			contentText += parseApiParams(params);
	
			if ($Utils.empty(params["@doc"]))
			{
				contentText += "\tvar doc = null;\r\n";
			}
			else
			{
				contentText += "\tvar doc = \"" + params["@doc"] + "\";\r\n";
			}
			
			let paramsOrder = (request == "get_image" || request == "get_file" ? "null, postData" : "postData, null");
			contentText += `RestControl.createRequest('POST', BASE_API_URL, doc, ` + paramsOrder + `, ` + (request == "login" ? "onSuccessLogin" : "onSuccess") + `, null, optionals, docData, paramTypes);`;

			if (!$Utils.empty(params["#token"]))
			{
				contentText += `
		$("#userCtx").show();
		fillContextSelector();
				`;
			}
			else
			{
				contentText += "\t$(\"#userCtx\").hide();\r\n";
			}

			contentText += "}";
		});
	});

	return contentText;
}

function parseApiParams(params, arrayName = "", parentArrayName = "")	
{
	let contentText = "";

	Object.entries(params).forEach(function(paramObj)
	{
		let name = paramObj[0];
		let typeWithMod = paramObj[1];
		let type;
		let paramDoc;

		if (name.startsWith("@"))
		{
			return;
		}
		if (name.startsWith("&"))
		{
			return;
		}

		if (typeWithMod instanceof Object)
		{
			type = typeWithMod;
		}
		else
		{
			let typeParts = typeWithMod.split("***");
			type = typeParts[0];
			paramDoc = ($Utils.empty(typeParts[1]) ? "" : typeParts[1]);
		}
		

		let isOptional = false;
		let optionalDefVal = "";
		
		if (!(type instanceof Object) && type.startsWith("o:"))
		{
			optionalDefVal = type.substring(4);
			type = type.substring(2, 3);
			isOptional = true;
			contentText += "\toptionals.push(\"" + name + "\");\r\n";
		}
		
		
		let defaultVal;
		if (type instanceof Object)
		{
			defaultVal = "new Array()";
			paramDoc = "new Array()";
		}
		else
		{
			let arrSubObjX = (arrayName == "" ? name : arrayName.split(".").concat([name]).join("_"));

			let info = parseParamInfo(type, arrSubObjX, isOptional, optionalDefVal, paramDoc);
			defaultVal = info.defaultVal;
			paramDoc = info.doc;
			contentText += info.contentText;
		}

		if (type instanceof Object)
		{
			let arrSubObj = (arrayName == "" ? "" : `_${arrayName.split(".").join("_")}`);
			let newArrName = (arrayName == "" ? name : `${arrayName}.${name}`);

			contentText += `\tvar arrayObj${arrSubObj} = new Object();\r\n`;
			contentText += `\tvar arrayDoc${arrSubObj} = new Object();\r\n`;

			let path = newArrName.split(".").join("[0].");
			contentText += `\tpostData.${path} = [];\r\n`;
			contentText += `\tdocData.${path} = [];\r\n`;


			contentText += `\tpostData.${path}.push(arrayObj${arrSubObj});\r\n`;
			contentText += `\tpostData.${path}.push(arrayObj${arrSubObj});\r\n`;
			contentText += `\tpostData.${path}.push(arrayObj${arrSubObj});\r\n`;

			contentText += `\tdocData.${path}.push(arrayDoc${arrSubObj});\r\n`;
			contentText += `\tdocData.${path}.push(arrayDoc${arrSubObj});\r\n`;
			contentText += `\tdocData.${path}.push(arrayDoc${arrSubObj});\r\n`;

			contentText += parseApiParams(type, newArrName, arrayName);
		}
		else
		{
			if (arrayName == "")
			{
				contentText += "\tpostData[\"" + name + "\"] = " + defaultVal + ";\r\n";
				contentText += "\tdocData[\"" + name + "\"] = " + paramDoc + ";\r\n";
			}
			else
			{
				let parentArrSubObj = (parentArrayName == "" ? "" : `_${parentArrayName.split(".").join("_")}`);

				contentText += `\tarrayObj${parentArrSubObj}.${name} = ${defaultVal};\r\n`;
				contentText += `\tarrayDoc${parentArrSubObj}.${name} = ${paramDoc};\r\n`;
			}
		}
	});

	return contentText;
}

function parseParamInfo(type, path, isOptional, optionalDefVal, paramDoc, arrayName = "")
{
	let defaultVal = "";
	let doc = "";
	let contentText = "";

	if (arrayName != "")
	{
		arrayName = "_" + arrayName;
	}

	if (type == "i")
	{
		defaultVal = (isOptional ? optionalDefVal : 0);
		doc = `"(integer) ${paramDoc}"`;
	}
	else if (type == "d")
	{
		defaultVal = (isOptional ? optionalDefVal : 0);
		doc = `"(decimal) ${paramDoc}"`;
	}
	else if (type == "b")
	{
		defaultVal = (isOptional ? optionalDefVal : "false");
		doc = `"(boolean) ${paramDoc}"`;
	}
	else if (type == "n")
	{
		defaultVal = 0;
		doc = `"(array of numbers) ${paramDoc}"`;
		contentText = `\tparamTypes.${path} = \"narray\";\r\n`;
	}
	else if (type == "a")
	{
		defaultVal = "\"\"";
		doc = `"(array of strings) ${paramDoc}"`;
		contentText = `\tparamTypes.${path} = \"sarray\";\r\n`;
	}
	else
	{
		defaultVal = "\"" + optionalDefVal + "\"";
		doc = `"(string) ${paramDoc}"`;
	}

	return {defaultVal, doc, contentText};
}
