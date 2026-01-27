const fs = require('fs');

module.exports =
{
	cacheTables:  require($Const.INFRA_ROOT + "/platform/config/cache_tables.js"),
  
	put: function(table, key, dataArr)
	{
		let tableFields = this.cacheTables[table];
		let fileName = this._get_file_name(table, key);

		if (dataArr.length != tableFields.length)
		{
			return $ERRS.ERR_CACHE_INVALID_DATA_COUNT;
		}
		
		let content = dataArr.join("\n");
		
		let rv = $Files.saveFile(fileName, content, $Config.get("standard_file_access"));
		if ($Err.isERR(rv))
		{
			return $ERRS.ERR_CACHE_WRITE_FAILED;
		}

		return $ERRS.ERR_SUCCESS;
	},

	get: function(table, key)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		let tableFields = this.cacheTables[table];
		let fileName = this._get_file_name(table, key);
		
		let content = $Utils.fileGetContents(fileName, false, true);
		if (content === null)
		{
			return $ERRS.ERR_CACHE_READ_FAILED;
		}
		
		let data = content.split("\n");
		
		vals.data = $Utils.arrayCombine(tableFields, data);
		
		return {...rc, ...vals};
	},

	delete: function(table, key)
	{
		fileName = this._get_file_name(table, key);
		$Utils.unlink(fileName);
		return $ERRS.ERR_SUCCESS;
	},

	truncate: function(table)
	{
		fileNames = fs.readdirSync($Config.get("cache_path"));

        filenames.forEach(file =>
        {
            if (file.startsWith(table + "_"))
            {
                $Utils.unlink(file);
            }
        });

		return $ERRS.ERR_SUCCESS;
	},


	_get_file_name: function(table, key)
	{
		return $Config.get("cache_path") + "/" + table + "_" + key + ".txt";
	}
}
