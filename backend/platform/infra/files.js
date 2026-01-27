const fs = require('fs');
const path = require('path');
const exec = require("child_process").exec;
let _aws = null;
let mimeTypes = null;

function aws()
{
	if (!_aws)
	{
		_aws = new $Aws();
	}

	return _aws;
}


const SQL = class
{
	constructor(refFieldName)
	{
		if ($Utils.empty(refFieldName))
		{
			this.refFieldName = "";
			this.prefix = "";
			this.alias = "";
			return;
		}

		this.refFieldName = refFieldName;
		this.prefix = `_${refFieldName.replace(/\./g, "_").replace(/["'`]/g, "").toLowerCase()}_`;
		this.alias = `${this.prefix}file`;
	}

	fileQueryWhere(where)
	{
		return `SELECT ${this.select()} FROM \`file\` WHERE ${where}`;
	}

	select()
	{
		if (this.alias == "")
		{
			return `FIL_ID file_id, FIL_USR_ID owner_id, FIL_FILE_NAME file_name, FIL_ACCESS_LEVEL access_level`;
		}

		return `${this.alias}.FIL_ID ${this.prefix}file_id, ${this.alias}.FIL_USR_ID ${this.prefix}owner_id, ${this.alias}.FIL_FILE_NAME ${this.prefix}file_name, ${this.alias}.FIL_ACCESS_LEVEL ${this.prefix}access_level`;
	}

	join(isLeftOuter = true)
	{
		return `${isLeftOuter ? "LEFT OUTER JOIN" : "JOIN"} \`file\` ${this.alias} ON (${this.refFieldName}=${this.alias}.FIL_ID OR ${this.refFieldName}=${this.alias}.FIL_FILE_NAME)`;
	}

	get(record, removeFileFields = true)
	{
		const obj = {
						file_id: record[`${this.prefix}file_id`],
						owner_id: record[`${this.prefix}owner_id`],
						file_name: record[`${this.prefix}file_name`],
						access_level: record[`${this.prefix}access_level`],
					};

		if (removeFileFields)
		{
			delete record[`${this.prefix}file_id`];
			delete record[`${this.prefix}owner_id`];
			delete record[`${this.prefix}file_name`];
			delete record[`${this.prefix}access_level`];
		}

		return obj;
	}
}


const Server =
{
	nFileHandler(req, res)
	{
		const fileName = req.params.filename;
		const content = $Files.getFileFromContainer(fileName);
		if ($Utils.empty(content))
		{
			$Logger.logString($Const.LL_INFO, `'N' File not found: ${fileName}`);
			res.status(404).send("File not found");
			return;
		}

		const stream = require('stream');
		const readStream = new stream.PassThrough();
		readStream.end(content);

		const contentType = $Files.getMimeTypeByName(fileName);

		res.set('Content-Type', contentType);
	
		readStream.pipe(res);  
	},

	aFileHandler(req, res)
	{
		const session = $HttpContext.get("session");

		const fileName = $Files.getFileNameFromUrl("a/" + req.params.filedata.trim());
		if ($Utils.empty(fileName))
		{
			$Logger.logString($Const.LL_INFO, `'A' File failed to parse data: ${req.params.filedata.trim()}`);
			res.status(404).send("File not found");
			if (session) session.closeDb();
			return;
		}

		const content = $Files.getFileFromContainer(fileName);
		if ($Utils.empty(content))
		{
			$Logger.logString($Const.LL_INFO, `'A' File not found: ${fileName}`);
			res.status(404).send("File not found");
			if (session) session.closeDb();
			return;
		}

		const stream = require('stream');
		const readStream = new stream.PassThrough();
		readStream.end(content);

		const contentType = $Files.getMimeTypeByName(fileName);

		res.set('Content-Type', contentType);
	
		readStream.pipe(res);  
		if (session) session.closeDb();
	},

	downloadHandler(req, res)
	{
		const session = $HttpContext.get("session");

		function _downloadError(rcError)
		{
			$Logger.logRequest(rcError, false);
			res.send("Failed request");
			if (session) session.closeDb();
			return 0;
		}

		const data = req.params.filedata.trim();
		$Logger.logRequest({"#request": "download", "data": data}, true);

		if (data == "")
		{
			return _downloadError($Err.errWithInfo("ERR_DOWNLOAD_ERROR", "No data"));
		}

		const rv = $Files.getDownloadContentFromUrl(data);
		if ($Err.isERR(rv))
		{
			return _downloadError(rv);
		}

		const fileName = rv.file_name;
		const stream = require('stream');
		const readStream = new stream.PassThrough();
		readStream.end(rv.file_contents);

		const contentType = $Files.getMimeTypeByExt($Files.getFileExt(fileName));

		res.set('Content-disposition', 'attachment; filename=' + fileName);
		res.set('Content-Type', contentType);
	
		readStream.pipe(res);  

		$Logger.logRequest($ERRS.ERR_SUCCESS, false);
		if (session) session.closeDb();
	}
}



module.exports =
{
	SQL,
	Server,

	getFilesize(filename)
	{
		var stats = fs.statSync(filename);
		return stats.size;
	},

	getFileExt(fileName)
	{
		return path.extname(fileName);
	},

	getMimeTypeByExt(ext)
	{
		ext = ext.toLowerCase();
		if (!ext.startsWith("."))
		{
			ext = "." + ext;
		}

		if (mimeTypes === null)
		{
			let file = $Const.INFRA_ROOT + "/platform/data/mime_types.json";
			mimeTypes = JSON.parse(fs.readFileSync(file, 'utf8'));
		}

		if (!mimeTypes[ext])
		{
			return mimeTypes["general"];
		}

		return mimeTypes[ext];
	},

	getMimeTypeByName(filename)
	{
		return this.getMimeTypeByExt(this.getFileExt(filename));
	},

	getFullFileName(fileName, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let path = $Config.get(`${fileTypePath}_path`);
		if (!$Utils.empty(path))
		{
			path += "/";
		}

		return `${path}${fileName}`;
	},

	saveFileFromBase64(fileOwner, fileData, origFileName, contentType = null, accessLevel = null, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let pos = fileData.indexOf(",");
		if (pos !== -1)
		{
			fileData = fileData.substring(pos + 1);
		}

		let data = $Utils.base64Decode(fileData);
		if ($Utils.empty(data))
		{
			return $ERRS.ERR_INVALID_FILE_DATA;
		}

		return this.saveFileFromString(fileOwner, data, origFileName, contentType, accessLevel, fileTypePath);
	},

	saveFileFromString(fileOwner, fileData, origFileName, contentType = null, accessLevel = null, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const extension = this.getFileExt(origFileName);
		const fileId = $Utils.uniqueHash();
		const fileName = fileId + extension;

		if ($Config.get("file_access_level", "enabled"))
		{
			if (accessLevel)
			{
				accessLevel = accessLevel.toLowerCase();
			}
			if (!accessLevel || ![$Const.FILE_ACCESS_LEVEL_PUBLIC, $Const.FILE_ACCESS_LEVEL_PROTECTED, $Const.FILE_ACCESS_LEVEL_LIMITED, $Const.FILE_ACCESS_LEVEL_PRIVATE].includes(accessLevel))
			{
				accessLevel = $Config.get("file_access_level", "default");
			}
		}
		else
		{
			accessLevel = $Const.FILE_ACCESS_LEVEL_PUBLIC;
		}

		if (contentType === null)
		{
			contentType = this.getMimeTypeByExt(extension);
		}

		let rv = this.saveFileInContainer(fileData, fileName, contentType, fileTypePath);
		if ($Err.isERR(rv))
		{
			return rv;
		}

		$Db.executeQuery(`INSERT INTO \`file\` (FIL_ID, FIL_USR_ID, FIL_CREATED_ON, FIL_FILE_NAME, FIL_ORIG_FILE_NAME, FIL_FILE_SIZE, FIL_MIME_TYPE, FIL_ACCESS_LEVEL)
													VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
							[fileId, fileOwner, $Utils.now(), fileName, origFileName, fileData.length, contentType, accessLevel]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		vals.file_id = fileId;
		vals.file_name = fileName;
		vals.file_size = fileData.length;

		return {...rc, ...vals};
	},

	saveImageFromBase64(fileOwner, imageData, imageName, fileType = null, accessLevel = null, maxWidth = null, maxHeight = null, returnBase64 = false)
	{
		let pos = imageData.indexOf(",");
		if (pos !== -1)
		{
			imageData = imageData.substring(pos + 1);
		}

		let data = $Utils.base64Decode(imageData);
		if ($Utils.empty(data))
		{
			return $ERRS.ERR_INVALID_IMAGE_DATA;
		}

		return this.saveImageFromString(fileOwner, data, imageName, fileType, accessLevel, maxWidth, maxHeight, returnBase64);
	},

	saveImageFromString(fileOwner, imageData, imageName, fileType = null, accessLevel = null, maxWidth = null, maxHeight = null, returnBase64 = false)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const img = new $Imaging(imageData);
		if (!img.isValid())
		{
			return $ERRS.ERR_INVALID_IMAGE_DATA;
		}
	
		if ($Utils.empty(fileType))
		{
			fileType = img.getTypeExtension();
		}


		if (maxWidth === null && $Config.get("reduce_image_on_upload"))
		{
			maxWidth = $Config.get("reduce_image_params", "max_width");
		}
		if (maxHeight === null && $Config.get("reduce_image_on_upload"))
		{
			maxHeight = $Config.get("reduce_image_params", "max_height");
		}
	

		if (!$Utils.empty(maxWidth) && !$Utils.empty(maxHeight))
		{
			img.fitToBox(maxWidth, maxHeight, true);
		}
	
		if (returnBase64)
		{
			vals.image_base64 = img.getBase64(fileType);
		}

		const rawData = img.getRawData();
		if (!rawData)
		{
			return $ERRS.ERR_INVALID_IMAGE_DATA;
		}


		if ($Utils.empty(this.getFileExt(imageName)))
		{
			imageName = `${imageName}.${fileType}`;
		}


		const rv = this.saveFileFromString(fileOwner, rawData, imageName, this.getMimeTypeByExt(fileType), accessLevel);
		if ($Err.isERR(rv))
		{
			return rv;
		}

		vals.image_id = rv.file_id;
		vals.image_type = fileType;
		vals.image_name = rv.file_name;
		
		return {...rc, ...vals};
	},

	saveFileInContainer(fileData, fileName, contentType = null, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const fullFileName = this.getFullFileName(fileName, fileTypePath);

		if ($Config.get("using_s3"))
		{
			rc = aws().saveFileFromString(fileData, fullFileName, contentType);
		}
		else
		{
			rc = this.saveFile(fullFileName, fileData, $Config.get("standard_file_access"));
		}

		return {...rc, ...vals};
	},

	deleteFileInContainer(fileName, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		const fullFileName = this.getFullFileName(fileName, fileTypePath);

		if ($Config.get("using_s3"))
		{
			aws().deleteFile(fullFileName);
		}
		else
		{
			$Utils.unlink(fullFileName);
		}
	},

	getFileFromContainer(fileName, fileTypePath = $Const.FILE_TYPE_PATH_FILE)
	{
		let content = null;
		const fullFileName = this.getFullFileName(fileName, fileTypePath);

		if ($Config.get("using_s3"))
		{
			let rv = aws().getFile(fullFileName);
			if ($Err.isERR(rv))
			{
				$Logger.logString($Const.LL_ERROR, `Failed to read AWS file (${fileName}): ${JSON.stringify(rv)}`);
			}
			else
			{
				content = rv.file_body;
			}
		}
		else
		{
			content = $Utils.fileGetContents(fullFileName, true);
		}

		return content;
	},

	moveTempFileToContainer(tempFileName, fileName, mimeType)
	{
		const fullFileName = this.getFullFileName(fileName);

		if ($Config.get("using_s3"))
		{
			let rv = aws().saveFile(tempFileName, fullFileName, mimeType);
			$Utils.unlink(tempFileName);

			if ($Err.isERR(rv))
			{
				return rv;
			}
		}
		else
		{
			fs.renameSync(tempFileName, fullFileName);
		}

		return $ERRS.ERR_SUCCESS;
	},

	copyFile(srcFileName, dstFileName)
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;
	
		if ($Config.get("using_s3"))
		{
			rc = aws().copyFile(srcFileName, dstFileName);
		}
		else
		{
			fs.copyFileSync(srcFileName, dstFileName);
		}
	
		return {...rc, ...vals};
	},

    /**
     * saveFile: saves a file with options
     * 
     * options may have the following members:
     * 
     * user - name of owning user
     * group - name of owning group
     * mode - octal value for chmod
     **/
    saveFile(fileName, content, optionsArr = null, isAppend = false)
    {
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

        try
        {
            let fd = fs.openSync(fileName, isAppend ? "as" : "w");
            fs.writeSync(fd, content);
            fs.closeSync(fd);

            if (!$Utils.empty(optionsArr) && $Config.get("enable_set_file_access"))
            {
                if (!$Utils.empty(optionsArr.group))
                {
					exec(`sudo chgrp ${optionsArr.group} ${fileName}`);
                }

                if ($Utils.isset(optionsArr.user) && !$Utils.empty(optionsArr.user))
                {
					exec(`sudo chown ${optionsArr.user}: ${fileName}`);
                }

                if ($Utils.isset(optionsArr.mode) && !$Utils.empty(optionsArr.mode))
                {
					exec(`sudo chmod ${optionsArr.mode} ${fileName}`);
                }
            }
        }
        catch (error)
        {
			$Logger.logStringToDbOnly($Const.LL_ERROR, `Failed to write file '${fileName}', content '${content.substring(0, 50)}', optionsArr ${JSON.stringify(optionsArr)}, isAppend=${isAppend}: ${JSON.stringify(error.message)}`);
			rc = $ERRS.ERR_FAILED_TO_WRITE_FILE;
        }

		return {...rc, ...vals};
    },

	getUrl(fileNameOrIdOrObject) // {owner_id, file_name, access_level}
	{
		if ($Utils.empty(fileNameOrIdOrObject))
		{
			return "";
		}

		const accessLevelEnabled = $Config.get("file_access_level", "enabled");

		if ($Utils.isString(fileNameOrIdOrObject))
		{
			if (!accessLevelEnabled)
			{
				return `${$Config.get("files_url")}n/${file_name}`;
			}

			const fils = $Db.executeQuery(`SELECT FIL_ID file_id, FIL_USR_ID owner_id, FIL_FILE_NAME file_name, FIL_ACCESS_LEVEL access_level
											FROM \`file\`
											WHERE FIL_ID=? OR FIL_FILE_NAME=?`, [fileNameOrIdOrObject, fileNameOrIdOrObject]);
			if (fils.length == 0)
			{
				return "";
			}

			fileNameOrIdOrObject = fils[0];
		}
		else if (!$Utils.isObject(fileNameOrIdOrObject))
		{
			return "";
		}

		const {owner_id, file_name, access_level} = fileNameOrIdOrObject;
		if ($Utils.empty(file_name))
		{
			return "";
		}

		if (!accessLevelEnabled || $Utils.empty(access_level) || access_level == $Const.FILE_ACCESS_LEVEL_PUBLIC)
		{
			return `${$Config.get("files_url")}n/${file_name}`;
		}

	    const session = $HttpContext.get("session");

		// If private and current user is not the owner, or if not authed
		if ((access_level == $Const.FILE_ACCESS_LEVEL_PRIVATE && session.userId !== owner_id) || $Utils.empty(session.token))
		{
			return "";
		}

		const ip = session.getRemoteAddress();
		const params = {fn: file_name, tk: session.token, ts: null, ip: ip, salt: $Utils.simpleUniqueHash()};

		if (access_level == $Const.FILE_ACCESS_LEVEL_PRIVATE || access_level == $Const.FILE_ACCESS_LEVEL_LIMITED)
		{
			params.ts = new $Date().addSeconds($Config.get("file_access_level", "timeout_secs")).getTimestamp();
		}

		params.hash = $Utils.hash(`${params.fn}${params.tk}${params.ts}${params.ip}${params.salt}`);

		return `${$Config.get("files_url")}a/${$Cipher.encryptData(JSON.stringify(params))}`;
	},

    createDownloadUrl(module, method, params, accessLevel = null)
    {
		const accessLevelEnabled = $Config.get("file_access_level", "enabled");
	    const session = $HttpContext.get("session");
		const ip = session.getRemoteAddress();
		const data = {module, method, params, tk: null, ts: null, ip: null, salt: $Utils.simpleUniqueHash()};

		if (accessLevelEnabled && !$Utils.empty(accessLevel) && accessLevel != $Const.FILE_ACCESS_LEVEL_PUBLIC)
		{
			data.tk = session.token;
			data.ip = ip;
		}

		if (accessLevel == $Const.FILE_ACCESS_LEVEL_PRIVATE || accessLevel == $Const.FILE_ACCESS_LEVEL_LIMITED)
		{
			data.ts = new $Date().addSeconds($Config.get("file_access_level", "download_timeout_secs")).getTimestamp();
		}

		data.hash = $Utils.hash(`${data.module}${data.method}${JSON.stringify(data.params)}${data.tk}${data.ts}${data.ip}${data.salt}`);

		return `${$Config.get("download_url")}${$Cipher.encryptData(JSON.stringify(data))}`;
    },

	getFileNameFromUrl(urlOrPath)
	{
		const index = urlOrPath.lastIndexOf("/");
		if (index >= 2)
		{
			urlOrPath = urlOrPath.substring(index - 1);
		}

		if (urlOrPath.startsWith("n/"))
		{
			return urlOrPath.substring(2);
		}

		if (urlOrPath.startsWith("a/"))
		{
			const params = JSON.parse($Cipher.decryptData(urlOrPath.substring(2)));
			if ($Utils.empty(params))
			{
				return null;
			}

			const hash = $Utils.hash(`${params.fn}${params.tk}${params.ts}${params.ip}${params.salt}`);
			if (hash != params.hash)
			{
				return null;
			}

		    const session = $HttpContext.get("session");
			if ($Utils.empty(session))
			{
				return null;
			}

			if ($Utils.empty(session.token))
			{
				if (!session.tokenValidator.isValidToken(params.tk))
				{
					return null;
				}

				session.token = params.tk;
			}
			else if (session.token !== params.tk)
			{
				return null;
			}

			if (params.ts && new $Date().getTimestamp() > params.ts)
			{
				return null;
			}

			const ip = session.getRemoteAddress();
			if (ip != params.ip)
			{
				return null;
			}

			return params.fn;
		}

		return null;
	},

	getDownloadContentFromUrl(data)
	{
		const deData = $Cipher.decryptData(data);
		if (deData == "")
		{
			return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", "Data decoding error");
		}

		const info = JSON.parse(deData);
		if ($Utils.empty(info))
		{
			return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", "Invalid JSON data");
		}

		const hash = $Utils.hash(`${info.module}${info.method}${JSON.stringify(info.params)}${info.tk}${info.ts}${info.ip}${info.salt}`);
		if (hash != info.hash)
		{
			return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", "Invalid data - hash error");
		}


		const session = $HttpContext.get("session");

		if (info.ts && new $Date().getTimestamp() > info.ts)
		{
			return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", "Request timeout expired");
		}

		if (info.ip)
		{
			const ip = session.getRemoteAddress();
			if (ip != info.ip)
			{
				return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", "Wrong IP adderess");
			}
		}

		if ($Utils.empty(session.token))
		{
			if (info.tk && !session.tokenValidator.isValidToken(info.tk))
			{
				return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", "Invalid token");
			}

			session.token = info.tk;
		}
		else if (session.token !== info.tk)
		{
			return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", "Different token");
		}


		if (!$Utils.isset(global[info.module]) || !$Utils.isset(global[info.module][info.method]))
		{
			return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", `Unknown module or method: ${info.module}.${info.method}`);
		}

		const rv = global[info.module][info.method](info.params);
		if ($Err.isERR(rv))
		{
			return $Err.errWithInfo("ERR_DOWNLOAD_ERROR", `Failed ${info.module}.${info.method}(${JSON.stringify(info.params)}): ${JSON.stringify(rv)}`);
		}

		return rv;
	},
}
