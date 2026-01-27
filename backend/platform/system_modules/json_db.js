const defaultSettings = {
    isAutoIncrement:    true,
    firstId:            1,
};

const defaultGetAllOptions = {
    sortById:           false,
    nameOfId:           "id",
    nameOfValue:        "value",
    extractValueProps:  false,
    hideId:             false,
};

const defaultGetAllIdsOptions = {
    sortById:           false,
};

module.exports = class
{
    constructor(jsonOrSettings = null)
    {
		if ($Utils.empty(jsonOrSettings))
        {
            jsonOrSettings = $Utils.clone(defaultSettings);
        }

        if ($Utils.isObject(jsonOrSettings))
        {
            jsonOrSettings = {...defaultSettings, ...jsonOrSettings};

            if (!jsonOrSettings.isAutoIncrement)
            {
                jsonOrSettings.firstId = -1;
            }

            this.db = {next_id: jsonOrSettings.firstId, data: [], index: {}};
        }
        else
        {
            this.db = JSON.parse(jsonOrSettings);
        }

        this.isAutoInc = (this.db.next_id > -1);
    }

    render()
    {
        return JSON.stringify(this.db);
    }

    getAllIds(options = null)
    {
        options = {...defaultGetAllIdsOptions, ...options};

        let rv = [];

        if (options.sortById)
        {
            let lclData = this.db.data;
            Object.entries(this.db.index).forEach(function(dataObj)
            {
                let id = dataObj[0];
                let ix = dataObj[1];
                let d = lclData[ix];

                rv.push($Utils.clone(d.id));
            });
        }
        else
        {
            this.db.data.forEach(dataObj =>
            {
                if (dataObj === null)
                {
                    return;
                }

                rv.push($Utils.clone(dataObj.id));
            });
        }

        return rv;
    }

    getAll(options = null)
    {
        options = {...defaultGetAllOptions, ...options};

        let rv = [];

        if (options.sortById)
        {
            let lclData = this.db.data;
            Object.entries(this.db.index).forEach(function(dataObj)
            {
                let id = dataObj[0];
                let ix = dataObj[1];
                let d = $Utils.clone(lclData[ix]);

                let obj = {};

                if (!options.hideId)
                {
                    obj[options.nameOfId] = d.id;
                }

                if (options.extractValueProps)
                {
                    obj = {...obj, ...d.value};
                }
                else
                {
                    obj[options.nameOfValue] = d.value;
                }

                rv.push(obj);
            });
        }
        else
        {
            this.db.data.forEach(dataObj =>
            {
                if (dataObj === null)
                {
                    return;
                }

                let d = $Utils.clone(dataObj);
                let obj = {};

                if (!options.hideId)
                {
                    obj[options.nameOfId] = d.id;
                }

                if (options.extractValueProps)
                {
                    obj = {...obj, ...d.value};
                }
                else
                {
                    obj[options.nameOfValue] = d.value;
                }

                rv.push(obj);
            });
        }

        return rv;
    }

    getList(ids)
    {
		if ($Utils.isString(ids))
        {
            ids = $Utils.commaSepListToArray(ids);
        }

		let objs = [];
		
		ids.forEach(id =>
		{
			if (this.hasId(id))
			{
                objs.push($Utils.clone(this.db.data[this.db.index[id]]));
			}
		});

        return objs;
    }

    get(id)
    {
        if (!$Utils.isset(this.db.index[id]))
        {
            return null;
        }

        return $Utils.clone(this.db.data[this.db.index[id]].value);
    }

    hasId(id)
    {
        return $Utils.isset(this.db.index[id]);
    }

    hasValue(value)
    {
        let has = false;

        this.db.data.every(dataObj =>
        {
            if (dataObj === null)
            {
                return true;
            }

            if (dataObj.value == value)
            {
                has = true;
                return false;
            }

            return true;
        });

        return has;
    }

    hasValueProp(prop, value)
    {
        let has = false;

        this.db.data.every(dataObj =>
        {
            if (dataObj === null)
            {
                return true;
            }

            if (dataObj.value[prop] == value)
            {
                has = true;
                return false;
            }

            return true;
        });

        return has;
    }

    getByValue(value)
    {
        let id = null;

        this.db.data.every(dataObj =>
        {
            if (dataObj === null)
            {
                return true;
            }

            if (dataObj.value == value)
            {
                id = dataObj.id;
                return false;
            }

            return true;
        });

        return id;
    }

    getByValueProp(prop, value)
    {
        let id = null;

        this.db.data.every(dataObj =>
        {
            if (dataObj === null)
            {
                return true;
            }

            if (dataObj.value[prop] == value)
            {
                id = dataObj.id;
                return false;
            }

            return true;
        });

        return id;
    }

    set(id, value)
    {
        if (this.isAutoInc)
        {
            if (!this._isNumeric(id))
            {
                return false;
            }

            id = parseInt(id);

            if (id >= this.db.next_id)
            {
                this.db.next_id = id + 1;
            }
        }

        if ($Utils.isset(this.db.index[id]))
        {
            this.db.data[this.db.index[id]].value = value;
        }
        else
        {
            this.db.index[id] = this.db.data.length;
            this.db.data.push({id, value});
        }

        return true;
    }

    insert(value)
    {
        if (!this.isAutoInc)
        {
            return false;
        }

        let id = this.db.next_id;
        this.db.next_id++;

        this.db.index[id] = this.db.data.length;
        this.db.data.push({id, value});

        return id;
    }

    delete(id)
    {
        if (!$Utils.isset(this.db.index[id]))
        {
            return;
        }

        delete this.db.data[this.db.index[id]];
        delete this.db.index[id];
    }

    reorder(idsList)
    {
        let vals = {};
        let rc = $ERRS.ERR_SUCCESS;

        idsList = this.validateList(idsList);
        if (idsList === false)
        {
            return $ERRS.ERR_JSONDB_INVALID_ID;
        }
        let idsArr = $Utils.commaSepListToArray(idsList);

        if (this.count() != idsArr.length)
        {
            return $ERRS.ERR_JSONDB_MISMATCH_IDS_COUNT;
        }

        let newDb = new $JsonDb({
            isAutoIncrement:    this.isAutoInc,
            firstId:            this.db.next_id,
        });

        idsArr.forEach(item =>
        {
            newDb.set(item, this.get(item));
        }, this);

        this.db = newDb.db;
        this.isAutoInc = newDb.isAutoInc;

        return {...rc, ...vals};
    }

    moveItem(itemId, toIndex)
    {
        let ids = this.getAllIds();

        let currentIndex = ids.indexOf(itemId);
        if (currentIndex === -1)
        {
            return $ERRS.ERR_JSONDB_INVALID_ID;
        }

        if (toIndex != Number(toIndex) || toIndex < 0 || toIndex >= this.count())
        if (currentIndex === -1)
        {
            return $ERRS.ERR_JSONDB_INVALID_INDEX;
        }

        ids.splice(currentIndex, 1);
        ids.splice(toIndex, 0, itemId);

        return this.reorder(ids.join(","));
    }

    count()
    {
        return Object.keys(this.db.index).length;
    }

    validateList(idsList)
    {
        let ids = $Utils.commaSepListToArray(idsList, true);
		let idsArray = [];
		
		let isValid = ids.every(function(id)
		{
			if (!this.hasId(id))
			{
				return false;
			}
			
			idsArray.push(id);
            return true;
		}, this);

        if (!isValid)
        {
            return false;
        }
		
		idsList = idsArray.join(",");
		return idsList;
    }


    _isNumeric(value)
    {
        return /^\d+$/.test(value);
    }    
};
