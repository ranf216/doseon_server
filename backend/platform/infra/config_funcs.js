const fs = require('fs');
const crypto = require('crypto');

module.exports =
{
	confArr: {},
	confArrRuntime: {},
	config: {},
	
	init(configPath)
	{
		const ignoreEnc = global.$IGNORE_CONFOG_ENC || false;
		let envs = require(configPath + "/environments.js");
		let domain = ($Utils.isset($Const.ENV_DOMAIN) ? $Const.ENV_DOMAIN : $Const.HOST_NAME);
		let environment = "default";
		let configFileName = "config.js";
		let encConfigFileName = ".config.enc";
		let privateConfigFileName = ".config.js";


		if ($Utils.isset(envs[domain]))
		{
			environment = envs[domain];
			configFileName = `${environment}.config.js`;
			encConfigFileName = `.${environment}.config.enc`;
			privateConfigFileName = `.${environment}.config.js`;

			if (!fs.existsSync(configPath + "/" + configFileName))
			{
				configFileName = "config.js";
			}

			if (!fs.existsSync(configPath + "/" + encConfigFileName))
			{
				encConfigFileName = ".config.enc";
			}

			if (!fs.existsSync(configPath + "/" + privateConfigFileName))
			{
				privateConfigFileName = ".config.js";
			}
		}

		const encExists = fs.existsSync(configPath + "/" + encConfigFileName);
		const privateExists = fs.existsSync(configPath + "/" + privateConfigFileName);

		if (!encExists && !ignoreEnc)
		{
			console.log(`Shutting down server due to critical error - Can't find .config file at: ${configPath}/${encConfigFileName}`);
			process.exit(1);
		}


        let _envArr = {"environment": environment};
		
		this.confArr = require(configPath + "/" + configFileName);
		validateConfigSecurity(this.confArr);

		if (encExists && !ignoreEnc)
		{
			const uid = this.confArr["env_uid"];
			const encData = $Utils.fileGetContents(configPath + "/" + encConfigFileName);
			const decData = decryptData(encData, uid);
			if ($Utils.empty(decData))
			{
				console.log(`Shutting down server due to critical error - Decryption failed for ${configPath}/${encConfigFileName}`);
				process.exit(1);
			}
			const encConfArr = safeJsonParse(decData);
			if ($Utils.empty(encConfArr))
			{
				console.log(`Shutting down server due to critical error - Decrypted data is not a valid JSON for ${configPath}/${encConfigFileName}`);
				process.exit(1);
			}

			overrideConfigWithPrivateConfig(configPath, this.confArr, encConfArr);
		}

		if (privateExists)
		{
			const privConfArr = require(configPath + "/" + privateConfigFileName);
			overrideConfigWithPrivateConfig(configPath, this.confArr, privConfArr);
		}

		this.confArrRuntime = require(configPath + "/runtime_config.js");
		this.config = {..._envArr, ...this.confArr, ...this.confArrRuntime};
	},

	get(key, subkey = null)
	{
		if (!$Utils.isset(this.config[key]))
		{
			key = "#" + key;
			if (!$Utils.isset(this.config[key]))
			{
				return null;
			}
		}
		
		if (subkey == null)
		{
			return this.config[key];
		}
		
		
		if (!$Utils.isset(this.config[key][subkey]))
		{
			subkey = "#" + subkey;
			if (!$Utils.isset(this.config[key][subkey]))
			{
				return null;
			}
		}
		
		return this.config[key][subkey];
	},

	// We do not want to save on config, because it is shared. We should use session.custom
	// set(key, value)
	// {
	// 	this.confArrRuntime[key] = value;
	// 	this.config[key] = value;
	// 	return this.confArrRuntime[key];
	// },

	getSystemConfig()
	{
		config = {};

		Object.entries(this.confArr).forEach(function(item, index, arr)
        {
            let key = item[0];
			if (key.substring(0, 1) != "#")
			{
				removeHiddenVals(item[1]);
				config[key] = item[1];
			}
        }, this);

		Object.entries(this.confArrRuntime).forEach(function(item, index, arr)
        {
            let key = item[0];
			if (key.substring(0, 1) != "#")
			{
				removeHiddenVals(item[1]);
				config[key] = item[1];
			}
        }, this);
		
		return config;
	},

	getRuntimeConfig()
	{
		let config = {};

		Object.entries(this.confArrRuntime).forEach(function(item, index, arr)
        {
            let key = item[0];
			if (key.substring(0, 1) != "#")
			{
				removeHiddenVals(item[1]);
				config[key] = item[1];
			}
        }, this);
		
		return config;
	},

	createEncConfig(prefix, domain)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let envs = require($Const.CONFIG_PATH + "/environments.js");
		let environment = "default";
		let decConfigFileName = `.${prefix}.config.dec.js`;
		let encConfigFileName = ".config.enc";


		if (domain != "default")
		{
			if ($Utils.isset(envs[domain]))
			{
				environment = envs[domain];
				encConfigFileName = `.${environment}.config.enc`;
			}
			else
			{
				return $ERRS.ERR_FILE_NOT_FOUND;
			}
		}

		if (!fs.existsSync($Const.CONFIG_PATH + "/" + decConfigFileName))
		{
			return $ERRS.ERR_FILE_NOT_FOUND;
		}

		const privConfArr = require($Const.CONFIG_PATH + "/" + decConfigFileName);
		const decData = JSON.stringify(privConfArr);
		const encData = encryptData(decData, this.get("env_uid"));

		const rv = $Files.saveFile($Const.CONFIG_PATH + "/" + encConfigFileName, encData);
		if ($Err.isERR(rv))
		{
			return rv;
		}

		vals.config_file_name = encConfigFileName;

		return {...rc, ...vals};
	}
};


function removeHiddenVals(subitem)
{
	if ($Utils.isObject(subitem))
	{
		Object.entries(subitem).forEach(function(item, index, arr)
		{
			let key = item[0];
			if (key.substring(0, 1) == "#")
			{
				delete subitem[key];
			}
		});
	}
}

function validateConfigSecurity(confArr, parent = null)
{
	Object.entries(confArr).forEach(item =>
	{
		const key = item[0];
		const val = item[1];

		if (key.startsWith("#"))
		{
			if ((typeof val !== 'string' && !(val instanceof String)) || !val.startsWith("{") || !val.endsWith("}"))
			{
				const cleanKey = key.substring(1);
				console.log(`Shutting down server due to critical error - private config data item is not secured: ${parent ? [parent, cleanKey].join("/") : cleanKey}`);
				process.exit(1);
			}
		}

		if ((typeof val === "object" || typeof val === 'function') && (val !== null))
		{
			validateConfigSecurity(val, key);
		}
	});
}

function overrideConfigWithPrivateConfig(configPath, confArr, privConfArr, parent = null)
{
	Object.entries(privConfArr).forEach(item =>
	{
		const key = item[0];
		let val = item[1];

		if ((typeof val === "object" || typeof val === 'function') && (val !== null))
		{
			overrideConfigWithPrivateConfig(configPath, confArr[key], val, key);
		}
		else
		{
			if (val.startsWith("file://"))
			{
				val = $Utils.fileGetContents(`${configPath}/${val.substring(7)}`).trim();
			}
			confArr[key] = val;
		}
	});
}

function encryptData(data, uid)
{
	const keyHash = crypto.createHash("sha256").update(uid).digest("hex");
	const ivHash = crypto.createHash("sha256").update(keyHash).digest("hex");
	const key = crypto.createHash('sha512').update(keyHash).digest('hex').substring(0, 32);
	const iv = crypto.createHash('sha512').update(ivHash).digest('hex').substring(0, 16);
	const encMethod = "aes-256-cbc";

	const cipher = crypto.createCipheriv(encMethod, key, iv);
	const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');

	return Buffer.from(encrypted).toString('base64');
}

function decryptData(data, uid)
{
	const keyHash = crypto.createHash("sha256").update(uid).digest("hex");
	const ivHash = crypto.createHash("sha256").update(keyHash).digest("hex");
	const key = crypto.createHash('sha512').update(keyHash).digest('hex').substring(0, 32);
	const iv = crypto.createHash('sha512').update(ivHash).digest('hex').substring(0, 16);
	const encMethod = "aes-256-cbc";

	let text = "";

	try
	{
		const buff = Buffer.from(data, 'base64');
		data = buff.toString('utf-8');
		const decipher = crypto.createDecipheriv(encMethod, key, iv);
		text = decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
	}
	catch (error)
	{
		text = "";
	}

	return text;
}

function safeJsonParse(json)
{
	try
	{
		return JSON.parse(json);
	}
	catch (error)
	{
		return null;
	}
}
