const fs = require('fs');

module.exports =
{
	confArr: {},
	confArrRuntime: {},
	config: {},
	
	init: function(configPath)
	{
		let envs = require(configPath + "/environments.js");
		let domain = ($Utils.isset($Const.ENV_DOMAIN) ? $Const.ENV_DOMAIN : $Const.HOST_NAME);
		let environment = "default";
		let configFileName = "config.js";
		let privateConfigFileName = ".config.js";


		if ($Utils.isset(envs[domain]))
		{
			environment = envs[domain];
			configFileName = `${environment}.config.js`;
			privateConfigFileName = `.${environment}.config.js`;

			if (!fs.existsSync(configPath + "/" + configFileName))
			{
				configFileName = "config.js";
			}

			if (!fs.existsSync(configPath + "/" + privateConfigFileName))
			{
				privateConfigFileName = ".config.js";
			}
		}

		if (!fs.existsSync(configPath + "/" + privateConfigFileName))
		{
			console.log(`Shutting down server due to critical error - Can't find .config file at: ${configPath}/${privateConfigFileName}`);
			process.exit(1);
		}


        let _envArr = {"environment": environment};
		
		this.confArr = require(configPath + "/" + configFileName);
		validateConfigSecurity(this.confArr);

		this.privConfArr = require(configPath + "/" + privateConfigFileName);
		overrideConfigWithPrivateConfig(this.confArr, this.privConfArr);

		this.confArrRuntime = require(configPath + "/runtime_config.js");
		this.config = {..._envArr, ...this.confArr, ...this.confArrRuntime};
	},

	get: function(key, subkey = null)
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
	// set: function(key, value)
	// {
	// 	this.confArrRuntime[key] = value;
	// 	this.config[key] = value;
	// 	return this.confArrRuntime[key];
	// },

	getSystemConfig: function()
	{
		config = {};

		Object.entries(this.confArr).forEach(function(item, index, arr)
        {
            let key = item[0];
			if (key.substring(0, 1) != "#")
			{
				this._removeHiddenVals(item[1]);
				config[key] = item[1];
			}
        }, this);

		Object.entries(this.confArrRuntime).forEach(function(item, index, arr)
        {
            let key = item[0];
			if (key.substring(0, 1) != "#")
			{
				this._removeHiddenVals(item[1]);
				config[key] = item[1];
			}
        }, this);
		
		return config;
	},

	getRuntimeConfig: function()
	{
		let config = {};

		Object.entries(this.confArrRuntime).forEach(function(item, index, arr)
        {
            let key = item[0];
			if (key.substring(0, 1) != "#")
			{
				this._removeHiddenVals(item[1]);
				config[key] = item[1];
			}
        }, this);
		
		return config;
	},

	_removeHiddenVals: function(subitem)
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
            }, this);
		}
	}
};


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

function overrideConfigWithPrivateConfig(confArr, privConfArr, parent = null)
{
	Object.entries(privConfArr).forEach(item =>
	{
		const key = item[0];
		const val = item[1];

		if ((typeof val === "object" || typeof val === 'function') && (val !== null))
		{
			validateConfigSecurity(confArr[key], val, key);
		}
		else
		{
			confArr[key] = val;
		}
	});
}
