/**
 * Class Database
 *
 * beginTransaction - Begins a transaction and increases transactions count
 * commitTransaction - Decreases transactions count. If the count is 0, commits the transaction
 * rollbackTransaction - Aborts the transaction and reset the transaction count and closes the DB connection
 * executeQuery - Executes a query inside a transaction. Returns the query result
 * executeMdQuery - Executes a master-detail query inside a transaction. Returns the query result parsed
 *                    so each master row has an array of details.
 *                    Need to precede master fields aliases with M_ and details fields aliases with D_
 *
 * result - Returns the last query result
 * insertId - Returns the last insert id of the last query
 * lastError - Returns the last query error code. 0 for success
 * lastErrorMsg - Returns the last query error message
 * isError - Returns whether the last query resulted in error
 * isDuplicateEntryError - Returns whether the last query resulted in error due to duplicate insert
 * affectedRows - Returns the num of affected rows og last query
**/

async function getConnection()
{
    const time = Date.now();

    async function sleep(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function _getConnection()
    {
        let connObj = null;

        if (_mysqlPool != null)
        {
            let success = false;

            try
            {
                success = await _mysqlPool.getConnection();
            }
            catch (e)
            {
                success = false;
            }

            if (success !== false)
            {
                connObj = {
                            dbConn: success,
                            transCount: 0,
                            result: null,
                            insertId: null,
                            lastError: null,
                            lastErrorMsg: null,
                            affectedRows: null,
                        };
            }
        }

        return connObj;
    }

    while (true)
    {
        if (Date.now() - time > $Const.DB_CONNECTION_TIMEOUT_MS)
        {
            let conn = {
                            dbConn: null,
                            result: [],
                            insertId: null,
                            affectedRows: null,
                            lastError: 1040,
                            lastErrorMsg: "Too many connections",
                        };

            return conn;
        }

        let conn = await _getConnection();
        if (conn)
        {
            return conn;
        }

        await sleep(1);
    }
}


const mysql = require('mysql2/promise');
let _mysqlPool = null;


function _getConn()
{
    let session = $HttpContext.get("session");

    try
    {
        let asyncDone = false;

        let innerFn = async function()
        {
                session._dbConn = await getConnection();
                asyncDone = true;
        };

        if (!session._dbConn)
        {
            innerFn();
            require('deasync').loopWhile(function(){return !asyncDone;});
        }
    }
    catch (err)
    {
        session._dbConn = {
                            dbConn: null,
                            transCount: 0,
                            result: null,
                            insertId: null,
                            lastError: err.errno || -1,
                            lastErrorMsg: err.message,
                            affectedRows: null,
                        };
    }

    return session._dbConn;
}


module.exports = {

	init: function()
	{
        let success = true;
        let asyncDone = false;
        let innerFn = async function()
        {
            if (_mysqlPool == null)
            {
                _mysqlPool = await mysql.createPool({
                                                            connectionLimit: $Config.get("db_pool_size"),
                                                            host: $Config.get("db_instance"),
                                                            port: $Config.get("db_port"),
                                                            user: $Config.get("db_user"),
                                                            password: $Config.get("db_pwd"),
                                                            database: $Config.get("db_schema"),
                                                            waitForConnections: true,
                                                            queueLimit: 0,
                                                            dateStrings: true,
                                                            enableKeepAlive: true,
                                                            keepAliveInitialDelay: 0,
                                                            ssl: $Config.get("db_ignore_ssl") ? { rejectUnauthorized: false } : null,
                                                        });
            }

            asyncDone = true;
        };
        innerFn();
        require('deasync').loopWhile(function(){return !asyncDone;});

        return success;
	},

	releaseConnection: function(mysqlConn)
	{
        if (!mysqlConn || !mysqlConn.dbConn)
        {
            return;
        }

        let asyncDone = false;
        let innerFn = async function()
        {
            await mysqlConn.dbConn.release();
            mysqlConn.dbConn = null;
            asyncDone = true;
        };
        innerFn();
        require('deasync').loopWhile(function(){return !asyncDone;});
	},
	
	destroy: function()
	{
        let asyncDone = false;
        let innerFn = async function()
        {
            if (_mysqlPool != null)
            {
                await _mysqlPool.end()
                _mysqlPool = null;
            }
            else
            {
                console.log("DB not initialized");
            }
            asyncDone = true;
        };
        innerFn();
        require('deasync').loopWhile(function(){return !asyncDone;});
	},
	

	beginTransaction: function()
	{
        let sessConn = _getConn();
        if (sessConn.lastError)
        {
            return;
        }

        if (sessConn.transCount == 0)
		{
            let asyncDone = false;
            let innerFn = async function()
            {
                await sessConn.dbConn.beginTransaction()
                asyncDone = true;
            };
            innerFn();
            require('deasync').loopWhile(function(){return !asyncDone;});
        }

        sessConn.transCount++;
	},

	commitTransaction: function()
	{
        let sessConn = _getConn();

		if (sessConn.lastError || sessConn.transCount == 0)
		{
			return;
		}

		sessConn.transCount--;

		if (sessConn.transCount > 0)
		{
			return;
		}
		
        let asyncDone = false;
        let innerFn = async function()
        {
            await sessConn.dbConn.commit()
            asyncDone = true;
        };
        innerFn();
        require('deasync').loopWhile(function(){return !asyncDone;});
	},

	rollbackTransaction: function()
	{
        let sessConn = _getConn();
        if (sessConn.lastError)
        {
            return;
        }

		if (sessConn.transCount > 0)
		{
            let asyncDone = false;
            let innerFn = async function()
            {
                await sessConn.dbConn.rollback()
    			sessConn.transCount = 0;
                asyncDone = true;
            };
            innerFn();
            require('deasync').loopWhile(function(){return !asyncDone;});
        }
	},

	executeQuery: function(query, params, logQueryAndParams = false, forceQuery = false)
	{
		if (logQueryAndParams)
		{
            let trimmedQuery = query.replace(/[\r\n\t]+/g, " ");
			$Utils.debugLogQuery(trimmedQuery, params);
		}

        let sessConn = _getConn();
        if (sessConn.lastError)
        {
            return sessConn.result;
        }

        sessConn.result = null;
        sessConn.insertId = null;
        sessConn.lastError = null;
        sessConn.lastErrorMsg = null;
        sessConn.affectedRows = null;

        let asyncDone = false;
        let innerFn = async function()
        {
            try
            {
                let conn = sessConn.dbConn;
                const [rows, fields] = (forceQuery ? await conn.query(query) : await conn.execute(query, params));

                if (typeof rows.insertId !== 'undefined')
                {
                    sessConn.insertId = rows.insertId;
                    sessConn.affectedRows = rows.affectedRows;
                }
                else
                {
                    sessConn.result = rows;
                }
            }
            catch (e)
            {
                $Logger.queueString($Const.LL_ERROR, query + " " + JSON.stringify(params) + " Error: " + JSON.stringify(e));
                sessConn.lastError = e.errno;
                sessConn.lastErrorMsg = e.sqlMessage;

                if ($Config.get("db_log_exception_on_error"))
                {
                    $Logger.queueString($Const.LL_ERROR, sessConn.lastErrorMsg);
                }

                if ($Config.get("db_throw_exception_on_error"))
                {
                    throw e;
                }
            }

            asyncDone = true;
        };
        innerFn();
        require('deasync').loopWhile(function(){return !asyncDone;});

		$Logger.logQueue();

        return sessConn.result;
    },

	/*
		executeMdQuery - Executes a master-detail query inside a transaction. Returns the query result parsed so each master row has an array of details.
		
		query - select query with JOIN to details table
		params - query params
		pkFieldsArr - array of fields comprising a unique key for the master table
		detailsArrName - the name that will be given to the array of details in the result
		noDetailsIfNull - (optional) name of param that if is null, this means there are no details records (used for LEFT OUTER JOIN)
		
		Need to precede master fields aliases with M_ and details fields aliases with D_. These prefixes will be removed in the result set
	*/
	executeMdQuery: function(query, params, pkFieldsArr, detailsArrName, noDetailsIfNull = null)
	{
		let res = this.executeQuery(query, params);
		if (res === null)
		{
			return null;
		}

		if (res.length == 0)
		{
			return [];
		}

		rowset = {};

        res.forEach(row =>
        {
			let master = {};
			let details = {};
			let primaryKey = "";
			let hasDetials = true;
			
            Object.entries(row).forEach(function(item, index, arr)
			{
                let key = item[0];
                let val = item[1];

                if (pkFieldsArr.includes(key))
				{
					primaryKey += val + "/*\\";
				}
				
				let isMaster = (key.substring(0, 2) == "M_");
				let keyName = key.substring(2);
				
				if (isMaster)
				{
					master[keyName] = val;
				}
				else
				{
					if (key == noDetailsIfNull && val === null)
					{
						hasDetials = false;
					}

					details[keyName] = val;
				}
			});

			
			if ($Utils.isset(rowset[primaryKey]))
			{
				if (hasDetials)
				{
					rowset[primaryKey][detailsArrName].push(details);
				}
			}
			else
			{
				master[detailsArrName] = [];
				if (hasDetials)
				{
					master[detailsArrName].push(details);
				}
				rowset[primaryKey] = master;
			}
        });

		return $Utils.arrayValues(rowset);
	},

	result: function()
	{
		return _getConn().result;
	},

	insertId: function()
	{
		return _getConn().insertId;
	},

	lastError: function()
	{
		return _getConn().lastError;
	},

	lastErrorMsg: function()
	{
		return _getConn().lastErrorMsg;
	},

	isError: function()
	{
		return _getConn().lastError > 0;
	},
	
	isDuplicateEntryError: function()
	{
		return _getConn().lastError == 1062;
	},

	affectedRows: function()
	{
		return _getConn().affectedRows;
	},
};
