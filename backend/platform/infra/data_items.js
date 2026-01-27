/*
 *	isValidItemId: function(dataId, dataTable)
 *	getItemName: function(dataId, dataTable, lang = null)
 *	getItem: function(dataId, dataTable, lang = null)
 *	getList: function(dataTable, lang = null, filterAttrs = null)
 *	getListExcluding: function(dataTable, exludeIdsArr, lang = null)
 *	getListOfIds: function(dataTable)
 *	getAttributedList: function(dataTable, attrsList, exludeIdsArr = [], skipMissingAttr = true, missingAttrDefVal = null, idAsAttrName = null, lang = null [null / lang_id / ALL])
 *	getKeys: function(dataTable)
 *	getNamesListAsJson: function(dataTable, lang = null)
 *	getListForApiDoc: function(dataTable, exludeByDefineStringArr = null)
 *	getItemAttr: function(dataId, dataTable, attr)
 *	getItemIdByAttr: function(attrName, attrVal, dataTable)
 * 	filterItemsIdByAttr: function(attrName, attrVal, dataTable)
 *	validateList: function(dataList [Can be commas sep string, or array], dataTable, forceUnique = true)
 *	search: function(searchString, dataTable, lang = null)
 *	count: function(dataTable)
 *	getString: function(dataId, lang = null)
 *	define: function(dataTable)
 *	clearCache: function(dataTable)
 */

 const fs = require('fs');

module.exports =
{
	_dataTablesData: {},
	_definedTables: {},

	isValidItemId: function(dataId, dataTable)
	{
		let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return false;
		}

		return $Utils.isset(data[dataId]);
	},

	getItemName: function(dataId, dataTable, lang = null)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

		let data = this._getDataTable(dataTable);
		if (data === null || !$Utils.isset(data[dataId]))
		{
			return "";
		}
		
		return ($Utils.isset(data[dataId].name[lang]) ? data[dataId].name[lang] : data[dataId].name[$Config.get("default_language")]);
	},

	getItem: function(dataId, dataTable, lang = null)
	{
        if ($Utils.empty(lang)) lang = $Config.get("default_language");

		let data = this._getDataTable(dataTable);
		if (data === null || !$Utils.isset(data[dataId]))
		{
			return "";
		}

		itemData = data[dataId];
		itemData.name = ($Utils.isset(itemData.name[lang]) ? itemData.name[lang] : itemData.name[$Config.get("default_language")]);

		return itemData;
	},

	getList: function(dataTable, lang = null, filterAttrs = null)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

        let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        let list = {};

        Object.entries(data).forEach(function(dataObj)
        {
            let itemId = dataObj[0];
            let item = dataObj[1];

            if (!$Utils.empty(filterAttrs))
			{
                let cont = Object.entries(filterAttrs).every(function(filterAttrsObj)
                {
                    let attr = filterAttrsObj[0];
                    let val = filterAttrsObj[1];
                    let attrValue;
        
					if (attr == "name")
					{
						attrValue = ($Utils.isset(item.name[lang]) ? item.name[lang] : item.name[$Config.get("default_language")]);
					}
					else
					{
						attrValue = item[attr];
					}

					if (attrValue != val)
					{
						return false;
					}

                    return true;
				});

                if (!cont)
                {
                    return;
                }
            }

            list[itemId] = ($Utils.isset(item.name[lang]) ? item.name[lang] : item.name[$Config.get("default_language")]);
        });

        return list;
	},

	getListExcluding: function(dataTable, exludeIdsArr, lang = null)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

        let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        let list = {};

        Object.entries(data).forEach(function(dataObj)
        {
            let itemId = dataObj[0];
            let item = dataObj[1];

			if (exludeIdsArr.includes(itemId))
			{
				return;
			}

            list[itemId] = ($Utils.isset(item.name[lang]) ? item.name[lang] : item.name[$Config.get("default_language")]);
        });

        return list;
	},

	getListOfIds: function(dataTable)
	{
        let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        let list = [];

        Object.entries(data).forEach(function(dataObj)
        {
            let itemId = dataObj[0];

            list.push(itemId);
        });

        return list;
	},

	getAttributedList: function(dataTable, attrsList, exludeIdsArr = [], skipMissingAttr = true, missingAttrDefVal = null, idAsAttrName = null, lang = null /* null / lang_id / ALL */)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

        let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        let list = ($Utils.empty(idAsAttrName) ? {} : []);

        Object.entries(data).forEach(function(dataObj)
        {
            let itemId = dataObj[0];
            let item = dataObj[1];

			if (exludeIdsArr.includes(itemId))
			{
				return;
			}

			let attrItem = {};

            attrsList.forEach(function(attr)
			{
				if (!$Utils.isset(item[attr]))
				{
					if (!skipMissingAttr)
					{
						attrItem[attr] = missingAttrDefVal;
					}

					return;
				}

				if (attr == "name" && lang != "ALL")
				{
					attrItem.name = ($Utils.isset(item.name[lang]) ? item.name[lang] : item.name[$Config.get("default_language")]);
				}
				else
				{
					attrItem[attr] = item[attr];
				}
			});

			if ($Utils.empty(idAsAttrName))
			{
            	list[itemId] = attrItem;
			}
			else
			{
                let idItem = {}
                idItem[idAsAttrName] = itemId;
                list.push({...idItem, ...attrItem});
			}
        });

        return list;
	},

	getKeys: function(dataTable)
	{
        let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        return Object.keys(data);
	},

	getNamesListAsJson: function(dataTable, lang = null)
	{
		let items = this.getList(dataTable, lang);
		return JSON.stringify(items);
	},

	getListForApiDoc: function(dataTable, exludeByDefineStringArr = null, filterByAttrName = null, filterByAttrVal = null)
	{
		let data;
        let str = "";

		if (filterByAttrName)
		{
			data = this.filterItemsIdByAttr(filterByAttrName, filterByAttrVal, dataTable);
		}
		else
		{
			data = this._getDataTable(dataTable);
		}

		if (data === null)
		{
			return "";
		}

        Object.entries(data).forEach(function(dataObj)
        {
            let itemId = dataObj[0];
            let item = dataObj[1];

			if (!$Utils.empty(exludeByDefineStringArr))
			{
				if ($Utils.isset(item.define) && exludeByDefineStringArr.includes(item.define))
				{
					return;
				}
			}

			let itemName = ($Utils.isset(item.name.en) ? item.name.en :  item.name[$Config.get("default_language")]);
			str += itemId + "\t= " + itemName + "<br/>";
		});

		return str;
	},

	getItemAttr: function(dataId, dataTable, attr)
	{
		let data = this._getDataTable(dataTable);
		if (data === null || !$Utils.isset(data[dataId]))
		{
			return "";
		}
		
		return ($Utils.isset(data[dataId][attr]) ? data[dataId][attr] : "");
	},

	getItemIdByAttr: function(attrName, attrVal, dataTable)
	{
		let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        let foundDataId = null;

        Object.entries(data).every(function(dataObj)
        {
            let dataId = dataObj[0];
            let item = dataObj[1];

			if ($Utils.isset(item[attrName]) && (item[attrName] == attrVal || (attrName == "name" && item[attrName].en == attrVal)))
			{
				foundDataId = dataId;
                return false;
			}

            return true;
		});
		
		return foundDataId;
	},

	filterItemsIdByAttr: function(attrName, attrVal, dataTable)
	{
		let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        let filteredData = {};

        Object.entries(data).forEach(function(dataObj)
        {
            let dataId = dataObj[0];
            let item = dataObj[1];

			if ($Utils.isset(item[attrName]) && item[attrName] == attrVal)
			{
				filteredData[`${dataId}`] = item;
			}
		});
		
		return filteredData;
	},

	validateList: function(dataList /* Can be commas sep string, or array */, dataTable, forceUnique = true)
	{
		let data;
		let isString;

		if ($Utils.isString(dataList))
		{
			isString = true;
			data = $Utils.commaSepListToArray(dataList, forceUnique);
		}
		else
		{
			isString = false;
			data = dataList;
		}

		let dataArray = [];
		
		let isValid = data.every(function(dataId)
		{
			if (!this.isValidItemId(dataId, dataTable))
			{
				return false;
			}
			
			dataArray.push(dataId);
            return true;
		}, this);

        if (!isValid)
        {
            return false;
        }

		if (forceUnique)
		{
			dataArray = $Utils.makeArrayUnique(dataArray);
		}

		if (isString)
		{
			dataList = dataArray.join(",");
		}
		else
		{
			dataList = dataArray;
		}

		return dataList;
	},

	search: function(searchString, dataTable, lang = null)
	{
        let data = this._getDataTable(dataTable);
		if (data === null)
		{
			return null;
		}

        let list = [];
		searchString = searchString.toLowerCase();

        Object.entries(data).forEach(function(dataObj)
        {
            let itemId = dataObj[0];
			let item = dataObj[1];
			let name = ($Utils.isset(item.name[lang]) ? item.name[lang] : item.name[$Config.get("default_language")]).toLowerCase();

			if (name.indexOf(searchString) !== -1)
			{
            	list.push(itemId);
			}
        });

        return list;
	},

	count: function(dataTable)
	{
		return this.getKeys(dataTable).length;
	},

	getString: function(dataId, lang = null)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

		let data = this._getDataTable("translation_strings");
		if (data === null || !$Utils.isset(data[dataId]))
		{
			return "";
		}
		
		return ($Utils.isset(data[dataId].name[lang]) ? data[dataId].name[lang] : data[dataId].name[$Config.get("default_language")]);
	},

	define: function(dataTable)
	{
		let data = this._getDataTable(dataTable);
		if (data === null || $Utils.isset(this._definedTables[dataTable]))
		{
			return;
		}

		this._definedTables[dataTable] = true;

        Object.entries(data).forEach(function(dataObj)
        {
            let dataId = dataObj[0];
            let item = dataObj[1];

			if ($Utils.isset(item.define))
			{
				$Const[item.define] = dataId;
			}
		});
	},

	clearCache: function(dataTable)
	{
		if (!$Utils.empty(this._dataTablesData[dataTable]))
		{
			delete this._dataTablesData[dataTable];
		}
	},


	_getDataTable: function(dataTable)
	{
		if (!$Utils.isString(dataTable))
		{
			return dataTable;
		}

		let cacheObj = this;

		if ($Utils.empty(this._dataTablesData[dataTable]))
		{
			let session = $HttpContext.get("session");
			if (!$Utils.empty(session) && !$Utils.empty(session._dataTablesData) && !$Utils.empty(session._dataTablesData[dataTable]))
			{
				return JSON.parse(session._dataTablesData[dataTable]);
			}

			if (!fs.existsSync($Const.INFRA_ROOT + "/platform/data/" + dataTable + ".json"))
			{
				return null;
			}

            let json = $Utils.fileGetContents($Const.INFRA_ROOT + "/platform/data/" + dataTable + ".json");

			data = JSON.parse(json);
			if (data && $Utils.isset(data.dynamic))
			{
				json = $DynamicDataTables[data.dynamic]();

				if (data.cache == false)
				{
					return JSON.parse(json);
				}

				if (data.cache == "session")
				{
					cacheObj = session;
					if (!$Utils.isset(session._dataTablesData))
					{
						session._dataTablesData = {};
					}
				}
			}

			cacheObj._dataTablesData[dataTable] = json;
		}

		return JSON.parse(cacheObj._dataTablesData[dataTable]);
	}
};
