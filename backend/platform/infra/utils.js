/*
*	=== PHP Compatible Functions ===
*
*	function isset(prop)
*	function isObject(obj)
*	function isString(str)
*	function fileGetContents(fileName, isBinary = false)
*	function unlink(fileName)
*	function arrayCombine(arr1, arr2)
*	function arrayCompare(a1, a2)
*	function inArray(needle, haystack)
*	function arrayValues(arrayObj)
*	function deleteFromArray(needle, haystack)
*	function empty(mixedVar)
*	function strFormat(pattern, ...args)
*	function clone(obj)
*	function arraySearch(needle, haystack, argStrict = false)
*	function base64Encode(content)
*	function base64Decode(string)
*	function urlGet(url)
*	function deg2rad(degrees)
*	function round(num, precision = 0)
*	function sleep(timeMs)
*	function escapeHtml(text)
*
*
*	=== Utils Functions ===
*
*	function isHTTPS()
*	function authorizeIP(array ipList)
*	function isMyIpAuthorized(array ipList)
*	function unauthorize()
*	function hash(string)
*	function uniqueHash()
*	function simpleUniqueHash()
*	function getRandomCode(numOfChars, chars = null)
*	function now()
*	function debugEchoQuery(query, params)
*	function debugLogQuery(query, params)
*	function hasWebClientMessages()
*	function getWebClientEnvironment()
*	function getWebClientMessages()
*	function callAPI(serverUrl, params)
*	function callAsyncAPI(params)
*	function getUserTypesList()
*	function getUserTypesListAsJson()
*	function getUserRolesList(excludeRolesArr = [])
*	function getUserRoleName(userRole)
*	function getUserRolesListAsJson(excludeRolesArr = [])
*	function getUserRolesListForApiDoc(excludeRolesArr = [])
*	function rolesBitsToArray(rolesBits)
*	function getCalculatedUserRoles(userType, allowRolesBits, denyRolesBits)
*	function bitsToArray(bits)
*	function arrayToBits(array arr, array validValues = null, bool ignoreInvalids = false)
*	function validateDateStr(dateStr, useDateOnly = false, isEndOfDate = false)
*	function allAuthedUserTypesExcluding(array excludeType)
*	function allAuthedUserTypes(array excludeType = null)
*	function allUserTypes(array excludeType = null)
*	function getUserTypesForDoc(array userTypes)
*	function getDefinesListForDoc(array defines, int prefixLen = null)
*	function getCommonPrefix(array strings, bool returnStrippedStrings = false)
*	function underscores2text(string str, bool allFirstsCaps = false)
*	function updateLang(lang)
*	function saveImagesList(fileOwner, images, configSet, accessLevel = null)
*	function parseImagesList(imagesJson)
*	function parseNamedImagesList(imagesJson)
*	function saveNewImageOrKeepOld(fileOwner, image, configSet, imageName = "", accessLevel = null)
*	function sendSystemErrorEmail(title, message)
*	function sendSystemErrorSMS(message)
*	function saveFilesList(fileOwner, files, accessLevel = null, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
*	function saveNewFileOrKeepOld(fileOwner, file, ext, accessLevel = null, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
*	function parseFilesList(filesJson, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
*	function formatPhone(phoneNum)
*	function validatePhone(phoneNum, doFormat = false, canBeEmpty = false)
*	function makeIntlPhoneNum(obj, phoneField, countryCodeField)
*	function validateEmail(email)
*	function isValidPassword(password)
*	function forwardRequest(req, res, url)
*	function commaSepListToArray(list, unique = false)
*	function commaSepListIsUnique(list)
*	function commaSepDataItemsToArray(list, dataTable, unique = false)
*	function commaSepDataItemsToIdsAndNames(list, dataTable, unique = false)
*	function makeHttpRequest(url, method, params, isRaw = false, headers = {})
*	function createCron(options, cronActionFunc)		options: {secondsInterval: #CRON_EVERY_SECS#  OR  cronExpression: #CRON_EXPRESSION#}
*	function validateTimeString(timeString)
*	function parseTimeString(timeString)
*	function parseTimeStringFromDatetime(datetimeStr)
*	function formatDateObjectToDbFormat(date)
*	function getUserType(userId)
*	function makeArrayUnique(arr, removeEmpties = false)
*	function compareArrays(arr1, arr2, getAdded = true, getRemoved = true, getCommon = false)
*	function filterObject(obj, allowedProps)
*	function castArrayToNumbers(arr)
*	function castArrayToStrings(arr)
*	function escapeRegExp(string)
*	function sortObjectByValue(obj, sortFunc)
*   function getObscuredPhone(phone, countryCode)
*   function getObscuredEmail(email)
*	function isCorrectPwd(userId, inputPwd, dbPwd)
*	function calculateCentroid(polygon)
*	function isPointInPolygon(point, polygon)
*	function sortByFieldOrder(arr, fieldName, orderArr)
*	function createAcronym(name, exceptions = [])
*/

const fs = require('fs');
const urlnjs = require('url');
const crypto = require('crypto');
const ucwords = require('ucwords');
const ucfirst = require('ucfirst');
const {v1: uuidv1, v4: uuidv4} = require('uuid');
const cron = require("node-cron");

module.exports =
{
    isset: function(prop)
    {
        return (typeof prop !== 'undefined');
    },

    isObject: function(obj)
    {
        return ((typeof obj === "object" || typeof obj === 'function') && (obj !== null));
    },

    isString: function(str)
    {
        return (typeof str === 'string' || (str instanceof String))
    },

    fileGetContents: function(fileName, isBinary = false, canBeMissing = false)
    {
        try
        {
            return fs.readFileSync(fileName, isBinary ? {flag:'r'} : {encoding:'utf8', flag:'r'});
        }
        catch (err)
        {
			if (!canBeMissing)
			{
				$Logger.logString($Const.LL_ERROR, `Failed to read file (${fileName}): ${JSON.stringify(err)}`);
			}
            return null;
        }
    },

    unlink: function(fileName)
    {
		if (fs.existsSync(fileName))
		{
	        fs.unlinkSync(fileName);
		}
    },

    arrayCombine: function(arr1, arr2)
    {
        let l = Math.min(arr1.length, arr2.length);
        let ret = {};
    
        for (let i = 0; i < l; i++)
        {
           ret[arr1[i]] = arr2[i];
        }
    
        return ret;
    },

    arrayCompare: function(a1, a2)
    {
        if (a1.length != a2.length) return false;
        let length = a2.length;
        for (let i = 0; i < length; i++)
        {
            if (a1[i] !== a2[i]) return false;
        }
        return true;
    },
    
    inArray: function(needle, haystack)
    {
        let length = haystack.length;
        for(let i = 0; i < length; i++)
        {
            if(typeof haystack[i] == 'object')
            {
                if(arrayCompare(haystack[i], needle)) return true;
            }
            else
            {
                if(haystack[i] == needle) return true;
            }
        }
        return false;
    },

    arrayValues: function(arrayObj)
    {
        tempObj = [];
        Object.keys(arrayObj).forEach(function(prop)
        {
            if (arrayObj[prop])
            {
                tempObj.push(arrayObj[prop]);
            }
        });
        return tempObj;
    },

	deleteFromArray: function(needle, haystack)
	{
		const index = haystack.indexOf(needle);
		if (index !== -1) 
		{
			haystack.splice(index, 1);
		}
	},

    empty: function(mixedVar)
    {
        let undef;
        let key;
        let i;
        let len;
        const emptyValues = [undef, null, false, 0, '', '0'];

        for (i = 0, len = emptyValues.length; i < len; i++)
        {
            if (mixedVar === emptyValues[i])
            {
                return true;
            }
        }
        if (typeof mixedVar === 'object')
        {
            for (key in mixedVar)
            {
                if (mixedVar.hasOwnProperty(key))
                {
                    return false;
                }
            }
            return true;
        }
        return false;
    },

    strFormat: function(pattern, ...args)
    {
        return pattern.replace(/{(\d+)}/g, function(match, number)
        { 
            return typeof args[number] != 'undefined' ? args[number]  : match;
        });
    },

    clone: function(obj)
    {
        let copy;
    
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;
    
        // Handle Date
        if (obj instanceof Date)
        {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }
    
        // Handle Array
        if (obj instanceof Array)
        {
            copy = [];
            for (let i = 0, len = obj.length; i < len; i++) 
            {
                copy[i] = this.clone(obj[i]);
            }
            return copy;
        }
    
        // Handle Object
        if (obj instanceof Object)
        {
            copy = {};
            for (let attr in obj)
            {
                if (obj.hasOwnProperty(attr)) copy[attr] = this.clone(obj[attr]);
            }
            return copy;
        }
    
        throw new Error("Unable to copy obj! Its type isn't supported.");
    },

    arraySearch: function(needle, haystack, argStrict = false)
    {
        const strict = !!argStrict;
        let key = '';

        if (typeof needle === 'object' && needle.exec)
        {
            if (!strict)
            {
                // Let's consider case sensitive searches as strict
                const flags = 'i' + (needle.global ? 'g' : '') + (needle.multiline ? 'm' : '') + (needle.sticky ? 'y' : '');
                needle = new RegExp(needle.source, flags);
            }
            for (key in haystack)
            {
                if (haystack.hasOwnProperty(key))
                {
                    if (needle.test(haystack[key]))
                    {
                        return key;
                    }
                }
            }
            return false;
        }

        for (key in haystack)
        {
            if (haystack.hasOwnProperty(key))
            {
                if ((strict && haystack[key] === needle) || (!strict && haystack[key] == needle))
                {
                    return key;
                }
            }
        }

        return false;
    },

	base64Encode: function(content)
	{
		return Buffer.from(content).toString('base64');
	},

	base64Decode: function(string)
	{
		return Buffer.from(string, 'base64');
	},

	urlGet: function(url)
	{
		const client = (url.startsWith("https") ? require('https') : require('http'));
		let data = "";
        let asyncDone = false;

		client.get(url, (resp) =>
		{
			resp.on('data', (chunk) =>
			{
				data += chunk;
			});

			resp.on('end', () =>
			{
				asyncDone = true;
			});

		}).on("error", (err) =>
		{
			$Logger.queueString($Const.LL_ERROR, `URL GET (${url}) failed: ${err.message}`);
			data = "";
			asyncDone = true;
		});

		require('deasync').loopWhile(function(){return !asyncDone;});

		$Logger.logQueue();

		return data;
	},

	deg2rad: function(degrees)
	{
		return degrees * (Math.PI / 180);
	},

	round: function(num, precision = 0)
	{
		if (precision == 0)
		{
			return Math.round(num);
		}

		let exp = 10 ** precision;
		return Math.round(num * exp) / exp;
	},

	sleep: function(timeMs)
	{
		let asyncDone = false;
	
		setTimeout(function()
		{
			asyncDone = true;
		}, timeMs);
	
		require('deasync').loopWhile(function(){return !asyncDone;});
	},

	escapeHtml: function(text)
	{
		let map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};

		return text.replace(/[&<>"']/g, function(m) { return map[m]; });
	},

/*=============================================================================================*/


	authorizeIP: function(ipList)
	{
		if (!this.isMyIpAuthorized(ipList))
		{
			this.unauthorize();
		}
	},

	isMyIpAuthorized: function(ipList)
	{
		if (!this.empty(ipList))
		{
			let myip = $HttpContext.get("session").getRemoteAddress();
			if (!ipList.includes(myip))
			{
				return false;
			}
		}
		
		return true;
	},

	unauthorize: function()
	{
		$HttpContext.get("session").response.status(401).send('Unauthorized');
	},

	setCurrUserLang: function(language)
	{
        let session = $HttpContext.get("session");
		language = (this.empty(language) ? $Config.get("default_language") : language);

		if (session.userLang != language)
		{
			session.userLang = language;

			let file = $Const.INFRA_ROOT + "/platform/definitions/errorcodes." + session.userLang + ".js";
			if (!fs.existsSync(file))
			{
				file = $Const.INFRA_ROOT + "/platform/definitions/errorcodes." + $Config.get("default_language") + ".js";
			}

            $ERRS = require(file);
		}
	},

    hash: function(string)
    {
        return crypto.createHash("sha256").update($Config.get("salt") + string).digest("hex");
    },

    uniqueHash: function()
    {
        return crypto.createHash("sha256").update(uuidv1() + uuidv4()).digest("hex");
    },

    simpleUniqueHash: function()
    {
        return crypto.createHash("md5").update(uuidv1() + uuidv4()).digest("hex");
    },

	getRandomCode: function(numOfChars, chars = null)
	{
		if (chars == null)
		{
			chars = "0123456789";
		}
		
		let len = chars.length;
		let code = "";

		for (let i = 0; i < numOfChars; i++)
		{
			let d = Math.floor(Math.random(len) * len);
			code += chars.substring(d, d + 1);
		}
		
		return code;
	},

	now: function()
	{
		return new $Date().format("Y-m-d H:i:s");
	},

	debugEchoQuery: function(query, params)
	{
        let resp = query + "\r\n" + params + "\r\n\r\n";
        $HttpContext.get("res").send(resp);
	},

	debugLogQuery: function(query, params)
	{
		str = query + JSON.stringify(params);
		$Logger.logString($Const.LL_DEBUG, str);
	},
	
	hasWebClientMessages: function()
	{
		let html = this.getWebClientMessages();
		return !this.empty(html);
	},
	
	getWebClientEnvironment: function()
	{
		let html = "";
		
		if ($Config.get("env_display"))
		{
			let envName = (this.empty($Config.get("env_name")) ? ucwords($Config.get("environment"), '_').replace(/_/g, " ") : $Config.get("env_name"));

			let envStyles = "padding: 5px 120px 5px 120px; border: solid 2px black; display: inline; line-height: 30px; white-space: nowrap;";
			let sepStyles = "display: block; line-height: 12px; font-size: 1px;";

			html += "<div style='" + sepStyles + "'>&nbsp;</div>";
			html += "<div style='" + envStyles + " color: " + $Config.get("env_text_color") + "; background-color: " + $Config.get("env_bkg_color") + ";'>Environment: <b>" + envName + "</b></div> ";
			html = "<div style='margin-bottom: 6px;'>" + html + "</div>";
		}
		
		return html;
	},
	
	getWebClientMessages: function()
	{
		let warningStyles = "padding: 3px 3px 3px 3px; border: solid 2px blue; display: inline; line-height: 30px; white-space: nowrap;";
		let highStyles = "color: white; background: #c00000; font-weight: bold;";
		let mediumStyles = "color: #000000; background: #ff8a01; font-weight: bold;";
		let lowStyles = "color: #000000; background: #f8f594;";
		
		let html = "";
		
		if ($Config.get("enable_supreuser_api") && this.empty($Config.get("restrict_supreuser_api_to_ip")))
		{
			html += "<div style='" + warningStyles + " " + highStyles + "'>Superuser API is publicly enabled</div> ";
		}

		if ($Config.get("log_protected_params"))
		{
			html += "<div style='" + warningStyles + " " + highStyles + "'>Logging of protected params is enabled</div> ";
		}

		if ($Config.get("enable_logtail") && this.empty($Config.get("restrict_logtail_to_ip")) && !$Config.get("enable_system_login"))
		{
			html += "<div style='" + warningStyles + " " + highStyles + "'>Log viewer is publicly enabled</div> ";
		}

		if ($Config.get("enable_socket_viewer") && this.empty($Config.get("restrict_socket_viewer_to_ip")) && !$Config.get("enable_system_login"))
		{
			html += "<div style='" + warningStyles + " " + highStyles + "'>Socket viewer is publicly enabled</div> ";
		}

		if ($Config.get("enable_log_analyzer") && this.empty($Config.get("restrict_log_analyzer_to_ip")) && !$Config.get("enable_system_login"))
		{
			html += "<div style='" + warningStyles + " " + highStyles + "'>Log analyzer is publicly enabled</div> ";
		}

		if ($Config.get("log_requests") & $Const.LL_DEBUG)
		{
			html += "<div style='" + warningStyles + " " + highStyles + "'>Logging of debug messages is enabled</div> ";
		}

		if (!this.empty($Config.get("restrict_supreuser_api_to_ip")))
		{
			html += "<div style='" + warningStyles + " " + mediumStyles + "'>Superuser API is restrictly enabled</div> ";
		}

		if ($Config.get("enable_test_api") && this.empty($Config.get("restrict_test_api_to_ip")))
		{
			html += "<div style='" + warningStyles + " " + mediumStyles + "'>Test API is publicly enabled</div> ";
		}

		if ($Config.get("enable_api_client") && this.empty($Config.get("restrict_api_client_to_ip")))
		{
			html += "<div style='" + warningStyles + " " + lowStyles + "'>API client is publicly enabled</div> ";
		}

		if ($Config.get("salt") == "" || $Config.get("salt") == "{Any Salt String}")
		{
			html += "<div style='" + warningStyles + " " + lowStyles + "'>Salt is not defined</div> ";
		}

		if (!$Config.get("fail_deprecated_api"))
		{
			html += "<div style='" + warningStyles + " " + lowStyles + "'>Deprecated API are enabled</div> ";
		}

		if (!$Config.get("log_activate_truncated_params"))
		{
			html += "<div style='" + warningStyles + " " + lowStyles + "'>Log truncated params is disabled</div> ";
		}

		if (html != "")
		{
			html = "<div style='margin-bottom: 6px;'>" + html + "</div>";
		}
		
		return html;
	},

	callAPI: function(serverUrl, params)
	{
		let result = $ERRS.ERR_HTTP_ERROR;
		let asyncDone = false;

		try
		{
			const url = new URL(serverUrl);
			const paramsData = JSON.stringify(params);

			const requestOptions =
			{
				hostname    : url.hostname,
				port		: url.port,
				path        : url.pathname,
				method      : "POST",
				headers     : {
								"content-type": "application/json",
								"accept": "application/json",
								'Content-Length': paramsData.length
							}
			}


			$Logger.queueString($Const.LL_DEBUG, `Request: ${JSON.stringify(requestOptions)} with params: ${paramsData}`)

			function requestCallback(res)
			{
				let data = "";

				res.on("data", (chunk) =>
				{
					data += chunk;
				});

				res.on("end", () =>
				{
					try
					{
						result = JSON.parse(data);
					}
					catch(error)
					{
						$Logger.queueString($Const.LL_ERROR, `catch error ${JSON.stringify(error.message)}`);
					}

					$Logger.queueString($Const.LL_DEBUG, `Response: ${data}`)
					asyncDone  = true;
				});
			}

			const client = (serverUrl.startsWith("https") ? require('https') : require('http'));
			const httpsRequest = client.request(requestOptions, requestCallback);

			httpsRequest.on("error", (error) =>
			{
				$Logger.queueString($Const.LL_ERROR, `Request error ${JSON.stringify(error.message)}`);
				asyncDone = true;
			});

			httpsRequest.write(paramsData);
			httpsRequest.end();
		}
		catch(error)
		{
			$Logger.queueString($Const.LL_ERROR, `catch error ${JSON.stringify(error.message)}`);
			asyncDone = true;
		}

		require('deasync').loopWhile(function(){return !asyncDone;});

		$Logger.logQueue();

		return result;
	},

	callAsyncAPI: function(params)
	{
		let urlParts = urlnjs.parse($Config.get("api_url"));
		const client = (urlParts.protocol == "https" ? require('https') : require('http'));

		const data = JSON.stringify(params);
		  
		const options = {
			hostname: urlParts.hostname,
			port: urlParts.port,
			path: urlParts.path,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': data.length
			}
		};
		  
		const req = client.request(options);
		  
		req.on('error', error =>
		{
			$Logger.logString($Const.LL_ERROR, error);
		});

		req.write(data);
		req.end();
	},
	
	getUserTypesList: function()
	{
		let types = {};

        $Globals.allUserTypes.forEach(type =>
        {
			let typeId = type[1];
			let typeName = type[2];
			types[typeId] = typeName;
        });
		
		return types;
	},

	getUserTypesListAsJson: function()
	{
		let types = this.getUserTypesList();
		return JSON.stringify(types);
	},

	getUserRolesList: function(excludeRolesArr = [])
	{
		let roles = {};

        $Globals.allUserRoles.forEach(role =>
        {
			if (excludeRolesArr.includes(role[1]))
			{
				return;
			}

			let roleId = role[1];
			let roleName = role[2];
			roles[roleId] = roleName;
        });
		
		return roles;
	},

	getUserRoleName: function(userRole)
	{
		let roleName = "";

        $Globals.allUserRoles.every(role =>
        {
			if ((role[1]) == userRole)
			{
				roleName = role[2];
				return false;
			}

			return true;
        });
		
		return roleName;
	},

	getUserRolesListAsJson: function(excludeRolesArr = [])
	{
		let roles = this.getUserRolesList(excludeRolesArr);
		return JSON.stringify(roles);
	},

	getUserRolesListForApiDoc: function(excludeRolesArr = [])
	{
		let str = "";

        $Globals.allUserRoles.forEach(role =>
		{
			if (excludeRolesArr.includes(role[1]))
			{
				return;
			}

			let roleId = role[1];
			let roleName = role[2];
			str += roleId + "\t= " + roleName + "<br/>";
		});
		
		return str;
	},

	rolesBitsToArray: function(rolesBits)
	{
		let roles = [];
		let roleIndex = 0;
		
		while (rolesBits > 0)
		{
			roleIndex++;
			if (rolesBits % 2 == 1 && $Globals.allUserRolesList.includes(roleIndex))
			{
				roles.push(roleIndex);
			}
			
			rolesBits = rolesBits >> 1;
		}
		
		return roles;
	},

	getCalculatedUserRoles: function(userType, allowRolesBits, denyRolesBits)
	{
		let roles = this.clone($Globals.allUserTypes[userType][3]);

		let roleIndex = 0;
		let roleAllow = allowRolesBits;
		
		while (roleAllow > 0)
		{
			roleIndex++;
			
			if (roleAllow % 2 == 1 && !roles.includes(roleIndex))
			{
				roles.push(roleIndex);
			}
			
			roleAllow = roleAllow >> 1;
		}
		
		roleIndex = 0;
		roleAllow = denyRolesBits;

		while (roleAllow > 0)
		{
			roleIndex++;
			
			if (roleAllow % 2 == 1)
			{
				let key = this.arraySearch(roleIndex, roles);
				if (key !== false)
				{
					delete roles[key];
				}
			}
			
			roleAllow = roleAllow >> 1;
		}

		roles = roles.filter(role => role !== null);
		roles.sort();

		return roles;
	},

    bitsToArray: function(bits)
	{
		let arr = [];
		let index = 0;
		
		while (bits > 0)
		{
			index++;
			if (bits % 2 == 1)
			{
				arr.push(index);
			}
			
			bits = bits >> 1;
		}
		
		return arr;
    },

	arrayToBits: function(arr, validValuesArr = null, ignoreInvalids = false)
	{
        let bits = 0;

        arr.every((index) =>
        {
			index = parseInt(index);
            if (this.empty(index))
            {
                return true;
            }

            if (validValuesArr !== null)
            {
                if (!validValuesArr.includes(index))
                {
                    if (ignoreInvalids)
                    {
                        return true;
                    }

                    bits = false;
                    return false
                }
            }

            bits += 2 ** (index - 1);
            return true;
        });

        return bits;
	},

	validateDateStr: function(dateStr, useDateOnly = false, isEndOfDate = false)
	{
        if (useDateOnly)
        {
            dateStr = dateStr.substring(0, 10) + (isEndOfDate ? " 23:59:59" : " 00:00:00");
		}
		else if (dateStr.length == 10)
		{
			dateStr += (isEndOfDate ? " 23:59:59" : " 00:00:00");
		}

		if ($Utils.empty(dateStr))
		{
			return false;
		}

		let d = new $Date(dateStr);
		if (!d.isValid())
		{
			return false;
		}

		return d.format();
	},

	allAuthedUserTypesExcluding: function(excludeTypeArr)
	{
		return this.allAuthedUserTypes(excludeTypeArr);
	},

	allAuthedUserTypes: function(excludeTypeArr = null)
	{
		let types = [];

        $Globals.allUserTypes.forEach(userType =>
        {
			if (userType[1] == $Const.USER_TYPE_NA)
			{
				return;
			}

			if (!this.empty(excludeTypeArr) && excludeTypeArr.includes(userType[1]))
			{
				return;
			}

			types.push(userType[1]);
        });

		return types;
	},

	allUserTypes: function(excludeTypeArr = null)
	{
		let types = [];

        $Globals.allUserTypes.forEach(userType =>
        {
			if (!this.empty(excludeTypeArr) && excludeTypeArr.includes(userType[1]))
			{
				return;
			}

			types.push(userType[1]);
        });

		return types;
	},

	getUserTypesForDoc: function(userTypesArr)
	{
		let types = [];

        $Globals.allUserTypes.forEach(userType =>
        {
			if (userTypesArr.includes(userType[1]))
			{
				types.push(userType[1] + " = " + userType[2]);
			}
		});

		return types.join("<br/>");
	},

	getDefinesListForDoc: function(definesArr, prefixLen = null)
	{
		let defs = [];
		let prefix;
		let list;

		if (prefixLen === null)
		{
			let rv = this.getCommonPrefix(definesArr, true);
            prefix = rv.prefix;
            list = rv.list;
		}
		else
		{
			prefix = definesArr[0].substring(0, $prefixLen);
			list = [];

            definesArr.forEach(define =>
			{
				list.push(substr(define, prefixLen));
			});
		}

        list.forEach(def =>
		{
			defs.push($Const[prefix + def] + " = " + this.underscores2text(def));
		});

		return defs.join("<br/>");
	},

	getCommonPrefix: function(stringsArr, returnStrippedStrings = false)
	{
		let commonPrefix = "";
        let doWhile = true;

		while (doWhile)
		{
			let testPF = commonPrefix + stringsArr[0].substring(commonPrefix.length, commonPrefix.length + 1);
			let isEOS = false;

			stringsArr.every(str =>
			{
				if (testPF == str)
				{
					isEOS = true;
				}

				let testItterPF = commonPrefix + str.substring(commonPrefix.length, commonPrefix.length + 1);

				if (testPF != testItterPF)
				{
                    doWhile = false;
					return false
				}

                return true;
			});

			if (isEOS || !doWhile)
			{
				break;
			}

			commonPrefix = testPF;
		}

		if (returnStrippedStrings)
		{
			let retStrings = [];
			let len = commonPrefix.length;

			stringsArr.forEach(str =>
			{
				retStrings.push(str.substring(len));
			});

			return {commonPrefix: commonPrefix, retStrings: retStrings};
		}

		return commonPrefix;
	},

	underscores2text: function(str, allFirstsCaps = false)
	{
		let parts = str.split("_");
		
		parts.forRach (part =>
		{
			part = part.toLowerCase();
		});

		let rv = parts.join(" ");

		if (allFirstsCaps)
		{
			rv = ucwords(rv);
		}
		else
		{
			rv = ucfirst(rv);
		}

		return rv;
	},

	updateLang: function(lang)
	{
		if (!this.empty(lang))
		{
			return lang;
		}

        let userLang = $HttpContext.get("session").userLang;

		if (!this.empty(userLang))
		{
			return userLang;
		}
		
		return $Config.get("default_language");
	},

	saveImagesList: function(fileOwner, images, configSet, accessLevel = null)
	{
		let vals = {"images_names": ""};
		let rc = $ERRS.ERR_SUCCESS;
	
		if (this.empty(images))
		{
			return {...rc, ...vals};
		}
	
		let allImages = [];
	
		for (let i = 0; i < images.length; i++)
		{
			let rv = this.saveNewImageOrKeepOld(fileOwner, images[i].image, configSet, "", accessLevel);
			if ($Err.isERR(rv))
			{
				return rv;
			}
	
			allImages.push(rv.image_name);
		}
	
		vals.images_names = (this.empty(allImages) ? "" : JSON.stringify(allImages));
	
		return {...rc, ...vals};
	},

	parseImagesList: function(imagesJson)
	{
		let imagesList = [];
	
		if (!this.empty(imagesJson))
		{
			let imgs = JSON.parse(imagesJson);
	
			imgs.forEach(img =>
			{
				imagesList.push($Files.getUrl(img));
			});
		}
	
		return imagesList;
	},

	parseNamedImagesList: function(imagesJson)
	{
		let imagesList = [];
	
		if (!this.empty(imagesJson))
		{
			let imgs = JSON.parse(imagesJson);
	
			Object.entries(imgs).forEach(function(imgObj)
			{
				let name = imgObj[0];
				let img = imgObj[1];

				imagesList[name] = $Files.getUrl(img);
			});
		}
	
		return imagesList;
	},
	
	saveNewImageOrKeepOld: function(fileOwner, image, configSet = null, imageName = "", accessLevel = null)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
	
		const filesUrl = $Config.get("files_url");
		const filesUrlLen = filesUrl.length;
	
		if (image.substring(0, filesUrlLen) == filesUrl)
		{
			vals.image_name = $Files.getFileNameFromUrl(image.substring(filesUrlLen));
		}
		else
		{
			let maxWidth;
			let maxHeight;
			
			if (this.empty(configSet))
			{
				maxWidth = null;
				maxHeight = null;
			}
			else
			{
				maxWidth = $Config.get(configSet, "max_width");
				maxHeight = $Config.get(configSet, "max_height");
			}
	
			let rv = $Files.saveImageFromBase64(fileOwner, image, imageName, null, accessLevel, maxWidth, maxHeight);
			if ($Err.isERR(rv))
			{
				return rv;
			}
	
			vals.image_name = rv.image_name;
		}
	
		return {...rc, ...vals};
	},

    sendSystemErrorEmail : function(title, message)
    {
		if (this._isMassSysErrReport("email"))
		{
			return;
		}

		title = $Config.get("SYSTEM_NAME") + ` - System Error - ${title}`;

		let emails = $Config.get("admin_emails");

		emails.forEach (email =>
		{
			let mail = new $MailerQueue("system alert", title, email);
			if (!mail.isValid)
			{
				return;
			}

			mail.sendMail(message);
		});
    },

    sendSystemErrorSMS : function(message)
    {
		if (this._isMassSysErrReport("sms"))
		{
			return;
		}

		message = $Config.get("SYSTEM_NAME") + ` - System Error - ${message}`;

		let phones = $Config.get("admin_phones");

		phones.forEach (phoneNum =>
		{
			$Sms.sendSms(phoneNum, message);
		});
    },

	_isMassSysErrReport: function(type)
	{
		let sysErrKvs = new $KeyValueSet($Const.KVS_SYSTEM_ERROR_REPORT);
		let lastReport = sysErrKvs.getValue(`last_report_${type}`);
		let timestamp = new $Date().getTimestamp();

		if (this.empty(lastReport))
		{
			sysErrKvs.setValue(`last_report_${type}`, timestamp);
			sysErrKvs.setValue(`report_count_${type}`, 1);
		}
		else
		{
			if (timestamp - lastReport > $Config.get("SYSTEM_ERROR_REPORT_REST_SECS"))
			{
				sysErrKvs.setValue(`last_report_${type}`, timestamp);
				sysErrKvs.setValue(`report_count_${type}`, 1);
			}
			else
			{
				let reportCount = sysErrKvs.getValue(`report_count_${type}`);
				if (reportCount >= $Config.get("SYSTEM_ERROR_REPORT_COUNT_BEFORE_REST"))
				{
					return true;
				}

				sysErrKvs.setValue(`last_report_${type}`, timestamp);
				sysErrKvs.setValue(`report_count_${type}`, reportCount + 1);
			}
		}

		return false;
	},

	saveFilesList: function(fileOwner, files, accessLevel = null, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let vals = {"files_names": ""};
		let rc = $ERRS.ERR_SUCCESS;
	
		if (this.empty(files))
		{
			return {...rc, ...vals};
		}
	
		let allFiles = [];
	
		for (let i = 0; i < files.length; i++)
		{
			let rv = this.saveNewFileOrKeepOld(fileOwner, files[i].file, files[i].ext, accessLevel, fileTypePath);
			if ($Err.isERR(rv))
			{
				return rv;
			}
	
			allFiles.push(rv.file_name);
		}
	
		vals.files_names = JSON.stringify(allFiles);
	
		return {...rc, ...vals};
	},

	saveNewFileOrKeepOld: function(fileOwner, file, ext, accessLevel = null, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
	
		const filesUrl = $Config.get(`${fileTypePath}_url`);
		const filesUrlLen = filesUrl.length;
	
		if (file.substring(0, filesUrlLen) == filesUrl)
		{
			vals.image_name = $Files.getFileNameFromUrl(file.substring(filesUrlLen));
		}
		else
		{
            let fileName = this.uniqueHash() + "." + ext;

			let rv = $Files.saveFileFromBase64(fileOwner, file, fileName, $Files.getMimeTypeByExt(ext), accessLevel, fileTypePath);
			if ($Err.isERR(rv))
			{
				return rv;
			}
	
			vals.file_name = rv.file_name;
		}
	
		return {...rc, ...vals};
	},

	parseFilesList: function(filesJson, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let filesList = [];
	
		if (!this.empty(filesJson))
		{
			let files = JSON.parse(filesJson);
	
			files.forEach(file =>
			{
				filesList.push($Config.get(`${fileTypePath}_url`)  + file);
			});
		}
	
		return filesList;
	},

	formatPhone(phoneNum)
    {
		let phone = $CountryUtils.makeIntlPhoneNumber(phoneNum, "us");
        if ($Utils.empty(phone))
        {
            return "";
        }

        return `+1-${phone.substring(2, 5)}-${phone.substring(5, 8)}-${phone.substring(8)}`;
    },

	validatePhone(phoneNum, doFormat = false, canBeEmpty = false)
	{
		if ($Utils.empty(phoneNum))
		{
			return canBeEmpty ? "" : false;
		}

		let phone = $CountryUtils.makeIntlPhoneNumber(phoneNum, "us");
		if ($Utils.empty(phone) || phone.length != 12)
		{
			return false;
		}

        if (doFormat)
        {
            return `${phone.substring(0, 2)} (${phone.substring(2, 5)}) ${phone.substring(5, 8)}-${phone.substring(8)}`;
        }

        return phone;
    },

	makeIntlPhoneNum: function(obj, phoneField, countryCodeField)
	{
		if (typeof $CountryUtils === 'undefined')
		{
			console.log("CountryUtils is not activated");
			return;
		}

		let phoneNumber = $CountryUtils.getIntlPhoneNumber(obj[phoneField], obj[countryCodeField]);
		obj[phoneField] = phoneNumber.intlFormat;
		delete obj[countryCodeField];
	},

	validateEmail: function(email)
	{
		return String(email).toLowerCase().match(
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
		);
	},

	isValidPassword: function(password)
	{
		if (this.empty(password))
		{
			return false;
		}

		if (!$Config.get("password_criteria", "force_criteria"))
		{
			return true;
		}

		const parts = [];
		if ($Config.get("password_criteria", "has_lowercase"))	parts.push("(?=.*[a-z])");
		if ($Config.get("password_criteria", "has_uppercase"))	parts.push("(?=.*[A-Z])");
		if ($Config.get("password_criteria", "has_number"))		parts.push("(?=.*\\d)");
		if ($Config.get("password_criteria", "has_special"))	parts.push("(?=.*[\\W_])");

		const minChars = ($Config.get("password_criteria", "min_chars") || 1);
		const maxChars = ($Config.get("password_criteria", "max_chars") || 1000);

		const regex = new RegExp(`^${parts.join("")}.{${minChars},${maxChars}}$`);
		return regex.test(password);
	},

	getPasswordCriteriaError: function(base, charsCount, lowerCaseChar, upperCaseChar, numberChar, specialChar)
	{
		const minChars = $Config.get("password_criteria", "min_chars");
		const maxChars = $Config.get("password_criteria", "max_chars");

		let chars = null;
		if (minChars && maxChars)
		{
			chars = `${minChars}-${maxChars}`;
		}
		else if (minChars)
		{
			chars = `${minChars}+`;
		}

		charsCount = charsCount.replace("#CHARS#", chars);

		const more = [];
		if (chars)												more.push(charsCount);
		if ($Config.get("password_criteria", "has_lowercase"))	more.push(lowerCaseChar);
		if ($Config.get("password_criteria", "has_uppercase"))	more.push(upperCaseChar);
		if ($Config.get("password_criteria", "has_number"))		more.push(numberChar);
		if ($Config.get("password_criteria", "has_special"))	more.push(specialChar);

		let suffix = "";
		
		if (more.length > 0)
		{
			suffix = ` ${more[0]}${more.length > 2 ? ", " : ""}${more.slice(1, more.length - 1).join(", ")}${more.length > 1 ? " and " + more[more.length - 1] : ""}`;
		}

		return base + suffix;
	},

	forwardRequest: function(req, res, urlToForward)
	{
		const client = (urlToForward.startsWith("https") ? require('https') : require('http'));

		try
		{
			let asyncDone = false;
			let result = null;

			let params = qs.stringify(req.query);
			if (!$Utils.empty(params))
			{
				params = `?${params}`;
			}

			const url = new URL(`${urlToForward}${params}`);

			const requestOptions =
			{
				hostname    : url.hostname,
				path        : url.pathname + url.search,
				method      : "POST",
				headers     : {
								"content-type": "application/json",
								"accept": "application/json"
							}
			}


			$Logger.logString($Const.LL_DEBUG, `${JSON.stringify(requestOptions, null, 2)}`)

			function forwardRequestCallback(res)
			{
				let data = "";

				res.on("data", (chunk) =>
				{
					data += chunk;
				});

				res.on("end", () =>
				{
					result = data;
					asyncDone  = true;
				});
			}

			const httpsRequest = client.request(requestOptions, forwardRequestCallback);

			httpsRequest.on("error", (error) =>
			{
				$Logger.queueString($Const.LL_ERROR, `found request error ${JSON.stringify(error.message)}`);
				asyncDone = true;
			});

			httpsRequest.write(JSON.stringify(req.body));
			httpsRequest.end();

			require('deasync').loopWhile(function(){return !asyncDone;});
			$Logger.logQueue();

			res.end();
		}
		catch(error)
		{
			$Logger.logString($Const.LL_ERROR, `catch error ${JSON.stringify(error.message)}`);
			res.end()
		}
	},

	commaSepListToArray: function(list, unique = false)
	{
		if (unique)
		{
			return list.split(",").map(item => item.trim()).filter((item, index, array) => array.indexOf(item) === index && item.length > 0);
		}

		return list.split(",").map(item => item.trim()).filter(item => item.length > 0);
	},

	commaSepListIsUnique: function(list)
	{
		let clean = list.split(",").map(item => item.trim()).filter(item => item.length > 0);
		let unique = clean.filter((item, index, array) => array.indexOf(item) === index);
		return clean.length == unique.length;
	},

	commaSepDataItemsToArray: function(list, dataTable, unique = false)
	{
		if (unique)
		{
	        return list.split(",").map(item => item.trim()).filter((item, index, array) => item.length > 0 &&
																							array.indexOf(item) === index &&
																							$DataItems.isValidItemId(item.trim(), dataTable));
		}

        return list.split(",").map(item => item.trim()).filter(item => item.length > 0 && $DataItems.isValidItemId(item.trim(), dataTable));
	},

	commaSepDataItemsToIdsAndNames: function(list, dataTable, unique = false)
	{
		let newList = [];

        dataTable = $DataItems.getAttributedList(dataTable, ["name"], [], true, null, null, "ALL");

		this.commaSepDataItemsToArray(list, dataTable, unique).forEach(id =>
		{
			newList.push({id: id, name: $DataItems.getItemName(id, dataTable)});
		});

		return newList;
	},

    makeHttpRequest(url, method, params = null, isRaw = false, headers = {})
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

		let headersObj = headers;
		let paramsData = "";

		if ($Utils.empty(params))
		{
			isRaw = true;
		}
		else
		{
			if (isRaw)
			{
				paramsData = JSON.stringify(params);
				headersObj = {...headersObj, ...{
													"content-type": "application/json",
													"accept": "application/json",
													'Content-Length': new TextEncoder().encode(paramsData).length
												}};
			}
			else
			{
				paramsData = new FormData();

				Object.entries(params).forEach(function(param)
				{
					let name = param[0];
					let value = param[1];
					paramsData.append(name , value);	
				});

				headersObj = {...headersObj, ...paramsData.getHeaders()};
			}
		}

        try
        {
			let asyncDone = false;

			url = new URL(url);

			const requestOptions =
			{
				hostname: url.hostname,
				port: url.port,
				path: url.pathname + url.search,
				method: method,
				headers: headersObj
			}

			$Logger.logString($Const.LL_DEBUG, `Request: ${JSON.stringify(requestOptions)} with params: ${JSON.stringify(params)}`)

			const client = (url.protocol.startsWith("https") ? require('https') : require('http'));

            const internal = () =>
			{
                const req = client.request(requestOptions, (res) =>
				{
                    let response = "";

                    res.on("data", (chunk) =>
					{
                        response += chunk;
                    });

                    res.on("end", () =>
					{
						if (res.statusCode >= 400)
						{
							$Logger.logString($Const.LL_ERROR, `found https request error. response status code ${res.statusCode} - ${res.statusMessage}`);
							rc = $ERRS.ERR_HTTP_ERROR;
							rc.err_info = `HTTP/S response code ${res.statusCode}: ${res.statusMessage}`;
						}

                        $Logger.queueString($Const.LL_DEBUG, `makeHttpRequest response: ${response}`);
                        vals.response = response;
                        asyncDone = true;
                    })
                });
        
                req.on("error", (err) =>
				{
                    $Logger.queueString($Const.LL_ERROR, `found https request error ${err.message}`);
					rc = $ERRS.ERR_HTTP_ERROR;
					rc.err_info = err.message;
                    asyncDone = true;
                });
        
                if (isRaw)
                {
                    req.write(paramsData);
                }
                else
                {
                    paramsData.pipe(req);
                }
    
                req.end();
            }
    
            internal();
			require('deasync').loopWhile(function(){return !asyncDone;});

			$Logger.logQueue();
        }
        catch(error)
        {
            $Logger.logString($Const.LL_ERROR, `catch error inside makeHttpRequest error ${JSON.stringify(error.message)}`);
			rc = $ERRS.ERR_HTTP_ERROR;
			rc.err_info = error.message;
        }
        
        return {...rc, ...vals};
    },

	/* options:  {secondsInterval: #CRON_EVERY_SECS#  OR  cronExpression: #CRON_EXPRESSION#} */
	createCron(options, cronActionFunc)
	{
		let cronExpression = "* * * * * *";
		if (options.cronExpression)
		{
			cronExpression = options.cronExpression;
		}
		else if (options.secondsInterval)
		{
			let secs = "*";
			let mins = "*";
			let hours = "*";
			let every = options.secondsInterval;

			if (every < 60)
			{
				secs = (every <= 1 ? "*" : `*/${every}`);
			}
			else
			{
				secs = "0";
				every = Math.floor(every / 60);
				if (every < 60)
				{
					mins = (every <= 1 ? "*" : `*/${every}`);
				}
				else
				{
					mins = "0";
					every = Math.floor(every / 60);
					hours = (every <= 1 ? "*" : `*/${every}`);
				}
			}

			cronExpression = `${secs} ${mins} ${hours} * * *`;
		}

		cron.schedule(cronExpression, cronActionFunc);
	},

	validateTimeString(timeString)
	{
		const timeFormat = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
		return timeFormat.test(timeString);
	},

	parseTimeString(timeString)
	{
		if (!this.validateTimeString(timeString))
		{
			return false;
		}

		const [hours, minutes, seconds] = timeString.split(":").map(Number);
		const totalSeconds = hours * 3600 + minutes * 60 + seconds;

		return {hours, minutes, seconds, totalSeconds};
	},

	parseTimeStringFromDatetime(datetimeStr)
	{
		if (!(datetimeStr = this.validateDateStr(datetimeStr)))
		{
			return false;
		}

		return this.parseTimeString(datetimeStr.substring(11));
	},

	formatDateObjectToDbFormat(date)
	{
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');

		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
	},

	getUserType(userId)
	{
		let usrs = $Db.executeQuery(`SELECT USR_TYPE FROM \`user\` WHERE USR_ID=?`, [userId]);
		if (usrs.length == 0)
		{
			return $Const.USER_TYPE_NA;
		}
		return usrs[0].USR_TYPE;
	},

	makeArrayUnique(arr, removeEmpties = false)
	{
		if (removeEmpties)
		{
			return arr.filter((item, index, array) => (!$Utils.empty(item) && array.indexOf(item) === index));
		}

		return arr.filter((item, index, array) => array.indexOf(item) === index);
	},

	compareArrays(arr1, arr2, getAdded = true, getRemoved = true, getCommon = false)
	{
		let rv = {};
		if (getAdded) rv.added = arr2.filter(item => !arr1.includes(item)); // Items added in arr2 (appear in arr2, but not in arr1)
		if (getRemoved) rv.removed = arr1.filter(item => !arr2.includes(item)); // Items removed in arr2 (appear in arr1, but not in arr2)
		if (getCommon) rv.common = arr1.filter(item => arr2.includes(item)); // Items found in both arrays
		return rv;
	},

	filterObject(obj, allowedProps)
	{
		Object.keys(obj).forEach((key) =>
		{
			if (!allowedProps.includes(key))
			{
				delete obj[key];
			}
		});
		return obj;
	},

	castArrayToNumbers(arr)
	{
		return arr.map(item => Number(item));
	},

	castArrayToStrings(arr)
	{
		return arr.map(item => String(item));
	},

	escapeRegExp(string)
	{
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	},

	sortObjectByValue(obj, sortFunc)
	{
		const sortedEntries = Object.entries(obj).sort(([, valueA], [, valueB]) => sortFunc(valueA, valueB));
		return Object.fromEntries(sortedEntries);
	},

	sortObjectByKey(obj, sortFunc)
	{
		const sortedEntries = Object.entries(obj).sort(([keyA], [keyB]) => sortFunc(keyA, keyB));
		return Object.fromEntries(sortedEntries);
	},

    getObscuredPhone(phone, countryCode)
    {
		if (this.empty(phone) || this.empty(countryCode))
		{
			return "";
		}

        let country = $CountryUtils.getCountryByCode(countryCode);
		if (country)
		{
			countryCode = country.code;
		}
		else if (!$CountryUtils.getCountryByDialingCode(countryCode))
		{
			return "";
		}
        let len = phone.length;
        return `+${countryCode} ${phone.substring(0, 3)}${"**********".substring(0, len - 5)}${phone.substr(len - 2)}`;
    },

    getObscuredEmail(email)
    {
		if (!this.validateEmail(email))
		{
			return "";
		}

        let placeholders = "**************************************************";
        let parts = email.split("@");
        let part1Len = parts[0].length;
        let dotIndex = parts[1].indexOf(".");
        return `${parts[0].substring(0, 2)}${placeholders.substring(0, part1Len - 2)}@${placeholders.substring(0, dotIndex - 2)}${parts[1].substring(dotIndex - 2)}`;
    },

    isCorrectPwd(userId, inputPwd, dbPwd)
    {
        return ((dbPwd.charAt(0) == "X" && dbPwd == inputPwd) || (dbPwd.charAt(0) != "X" && dbPwd == $Utils.hash(userId + inputPwd)));
    },

	calculateCentroid(polygon)
	{
		const n = polygon.length;
		let sumX = 0;
		let sumY = 0;
	
		polygon.forEach(point =>
		{
			sumX += point[0];
			sumY += point[1];
		});
	
		const centroidX = sumX / n;
		const centroidY = sumY / n;
	
		return [centroidX, centroidY];
	},

	isPointInPolygon(point, polygon)
    {
		const [lat, lon] = point;
		let isInside = false;
	
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++)
        {
			const [lat1, lon1] = polygon[i];
			const [lat2, lon2] = polygon[j];
	
			// Check if point is within the y-bounds of the edge and if the ray crosses it
			if ((lon1 > lon) !== (lon2 > lon) &&
				lat < (lat2 - lat1) * (lon - lon1) / (lon2 - lon1) + lat1)
			{
				isInside = !isInside;
			}
		}
		return isInside;
	},  

	sortByFieldOrder(arr, fieldName, orderArr)
	{
		return arr.slice().sort((a, b) => orderArr.indexOf(a[fieldName]) - orderArr.indexOf(b[fieldName]));
	},

	/**
	 * Create the "best" 3-letter acronym for a name.
	 * - Supports multiple words.
	 * - Splits camelCase / PascalCase tokens into words.
	 * - Skips common stop words (of, the, and, etc.) when possible.
	 * - Avoids acronyms in the given exception list (case-insensitive).
	 *
	 * @param {string} name - The full name, e.g. "International Business Machines"
	 * @param {string[]} exceptions - List of forbidden acronyms, e.g. ["IBM"]
	 * @returns {string} - A 3-letter acronym (uppercase), or "" if none found.
	 */
	createAcronym(name, exceptions = [])
	{
		return _createAcronym(name, exceptions);
	}
};

function _createAcronym(name, exceptions, count = 0)
{
	const upperExceptions = new Set(
		(exceptions || []).map(e => String(e).toUpperCase())
	);

	// Common stop words we try to ignore when forming the acronym
	const STOP_WORDS = new Set([
		"a", "an", "and", "of", "the", "for", "to", "in", "on", "at", "by"
	]);

	// Split by whitespace and some separators, then by camelCase
	let words = [];
	const tokens = String(name || "").trim().split(/[\s_\-]+/);

	for (const token of tokens)
	{
		if (!token) continue;
		const parts = token.replace(/([a-z])([A-Z])/g, '$1`$2').split("`");
		for (const p of parts)
		{
			if (p) words.push(p);
		}
	}

	if (!words.length)
	{
		return "";
	}

	// Remove stop words if that leaves any word at all
	const filtered = words.filter(
		w => !STOP_WORDS.has(w.toLowerCase())
	);
	if (filtered.length)
	{
		words = filtered;
	}

	const candidates = [];
	const seen = new Set();

	function pushCandidate(str)
	{
		const up = String(str || "").toUpperCase();
		if (up.length !== 3) return;
		if (!seen.has(up))
		{
			seen.add(up);
			candidates.push(up);
		}
	}

	function initial(word)
	{
		return word && word[0] ? word[0] : "";
	}

	// ===== generate candidates depending on word count =====
	if (words.length === 1)
	{
		const w = words[0];

		if (w.length >= 3)
		{
			// Straightforward: first 3 letters
			pushCandidate(w.slice(0, 3));

			// First, second, last
			pushCandidate(w[0] + w[1] + w[w.length - 1]);
		}
		else
		{
			// Pad if very short, e.g. "AI" -> "AIX"
			const padded = (w + "XXX").slice(0, 3);
			pushCandidate(padded);
		}
	}
	else if (words.length === 2)
	{
		const [w0, w1] = words;

		// Main heuristic: first letters + second letter from second word (if exists)
		pushCandidate(
			initial(w0) +
			initial(w1) +
			(w1[1] || w0[1] || initial(w1))
		);

		// Variations using extra letters
		if (w0.length > 1)
		{
			pushCandidate(initial(w0) + w0[1] + initial(w1));
		}
		if (w1.length > 1)
		{
			pushCandidate(initial(w0) + initial(w1) + w1[1]);
		}

		// First three letters of each word
		if (w0.length > 2)
		{
			pushCandidate(w0.slice(0, 3));
		}
		if (w1.length > 2)
		{
			pushCandidate(w1.slice(0, 3));
		}

		// First 3 of concatenation
		const joined = (w0 + w1).replace(/[^A-Za-z0-9]/g, "");
		if (joined.length >= 3)
		{
			pushCandidate(joined.slice(0, 3));
		}
	}
	else
	{
		// 3+ words

		const n = words.length;

		// A. All combinations of 3 distinct word initials (in order),
		//    prioritizing earlier words automatically.
		for (let i = 0; i < n; i++)
		{
			for (let j = i + 1; j < n; j++)
			{
				for (let k = j + 1; k < n; k++)
				{
					pushCandidate(
						initial(words[i]) +
						initial(words[j]) +
						initial(words[k])
					);
				}
			}
		}

		// B. Variations on the first triple (words 0,1,2) using extra letters
		const tripleIdx = [0, 1, 2];
		for (let pos = 0; pos < 3 && pos < words.length; pos++)
		{
			const w = words[tripleIdx[pos]];
			// Use alternate letters from that word at this position
			for (let altIdx = 1; altIdx < Math.min(4, w.length); altIdx++)
			{
				const letters = tripleIdx.map((wi, idx) =>
				{
					if (idx === pos)
					{
						return w[altIdx];
					}
					return initial(words[wi]);
				});

				pushCandidate(letters.join(""));
			}
		}

		// C. Fallback: first 3 of concatenated words
		const joined = words.join("").replace(/[^A-Za-z0-9]/g, "");
		if (joined.length >= 3)
		{
			pushCandidate(joined.slice(0, 3));
		}
	}

	// ===== pick first candidate not in exceptions =====
	for (const cand of candidates)
	{
		if (!upperExceptions.has(cand))
		{
			return cand;
		}
	}

	// ===== extreme fallback: any 3 chars from the cleaned string =====
	const clean = words.join("").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	for (let i = 0; i < clean.length; i++)
	{
		for (let j = i + 1; j < clean.length; j++)
		{
			for (let k = j + 1; k < clean.length; k++)
			{
				const cand = "" + clean[i] + clean[j] + clean[k];
				if (!upperExceptions.has(cand))
				{
					return cand;
				}
			}
		}
	}

	// If everything is blocked by exceptions
	if (count < 3)
	{
		return _createAcronym(name + " ABCDEFGHIJKLMNOPQRSTUVWXYZ", exceptions, count + 1);
	}

	return "";
}
