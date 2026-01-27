function _abortMultipartUpload(upload_id, userId)
{
	let vals = {};
	let rc = $ERRS.ERR_SUCCESS;

	const fmps = $Db.executeQuery(`SELECT FMP_PARTS FROM \`file_multipart\` WHERE FMP_ID=? AND FMP_USR_ID=?`, [upload_id, userId]);
	if (fmps.length == 0)
	{
		return $ERRS.ERR_INVALID_MULTIPART_UPLOAD_ID;
	}

	const fmp = fmps[0];

	let parts = [];
	if (!$Utils.empty(fmp.FMP_PARTS))
	{
		parts = fmp.FMP_PARTS.split(",");
	}

	parts.forEach(part =>
	{
		const dataFile = `${upload_id}.part.${part}`;
		$Files.deleteFileInContainer(dataFile, $Const.FILE_TYPE_PATH_MULTIPART_TEMP);
	});

	$Db.executeQuery(`DELETE FROM \`file_multipart\` WHERE FMP_ID=?`, [upload_id]);

	return {...rc, ...vals};
}


module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

	upload_file_base64()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if ($Utils.empty(this.$file_name))
		{
			return $ERRS.ERR_INVALID_FILE_NAME;
		}

		const rv = $Files.saveFileFromBase64(this.$Session.userId, this.$file_data, this.$file_name, null, this.$access_level);
		if ($Err.isERR(rv))
		{
			return rv;
		}

		vals.file_id = rv.file_id;

		return {...rc, ...vals};
	}

	begin_multipart_file_upload()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		if ($Utils.empty(this.$file_name))
		{
			return $ERRS.ERR_INVALID_FILE_NAME;
		}

		if ($Config.get("file_access_level", "enabled"))
		{
			this.$access_level = this.$access_level.toLowerCase();
			if (![$Const.FILE_ACCESS_LEVEL_PUBLIC, $Const.FILE_ACCESS_LEVEL_PROTECTED, $Const.FILE_ACCESS_LEVEL_LIMITED, $Const.FILE_ACCESS_LEVEL_PRIVATE].includes(this.$access_level))
			{
				this.$access_level = $Config.get("file_access_level", "default");
			}
		}
		else
		{
			this.$access_level = $Const.FILE_ACCESS_LEVEL_PUBLIC;
		}

		const extension = $Files.getFileExt(this.$file_name);
		const fileId = $Utils.uniqueHash();
		const fileName = fileId + extension;
		const mimeType = $Files.getMimeTypeByExt(extension);
		const flags = (this.$upload_to_temp_folder ? $Const.UPLOAD_FILE_FLAG_SAVE_TO_TEMP_FOLDER : $Const.UPLOAD_FILE_FLAG_NONE);
		const metadata = {"mime_type": mimeType, "flags": flags, "access_level": this.$access_level};

		$Db.executeQuery(`INSERT INTO \`file_multipart\` (FMP_ID, FMP_USR_ID, FMP_PARTS, FMP_METADATA, FMP_FILE_NAME, FMP_ORIG_FILE_NAME, FMP_CREATED_ON)
													VALUES (?, ?, ?, ?, ?, ?, ?)`,
								[fileId, this.$Session.userId, "", JSON.stringify(metadata), fileName, this.$file_name, $Utils.now()]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}

		vals.upload_id = fileId;

		return {...rc, ...vals};
	}

	upload_file_part()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;


		const partNum = parseInt(this.$part_number);
		if ($Utils.empty(partNum) || partNum <= 0)
		{
			return $ERRS.ERR_INVALID_MULTIPART_UPLOAD_PART_NUM;
		}


		const fmps = $Db.executeQuery(`SELECT FMP_PARTS FROM \`file_multipart\` WHERE FMP_ID=? AND FMP_USR_ID=?`, [this.$upload_id, this.$Session.userId]);
		if (fmps.length == 0)
		{
			return $ERRS.ERR_INVALID_MULTIPART_UPLOAD_ID;
		}

		let parts = [];
		const fmp = fmps[0];
		if (!$Utils.empty(fmp.FMP_PARTS))
		{
			parts = fmp.FMP_PARTS.split(",");
		}

		if (parts.includes(`${partNum}`))
		{
			return $ERRS.ERR_MULTIPART_UPLOAD_PART_NUM_ALREADY_EXIST;
		}


		const pos = this.$part_data.indexOf(",");
		if (pos == -1)
		{
			this.$part_data = this.$part_data.substring(pos + 1);
		}

		const data = $Utils.base64Decode(this.$part_data);
		if ($Utils.empty(data))
		{
			return $ERRS.ERR_INVALID_FILE_DATA;
		}

		const dstFile = `${this.$upload_id}.part.${partNum}`;
		const rv = $Files.saveFileInContainer(data, dstFile, null, $Const.FILE_TYPE_PATH_MULTIPART_TEMP);
		if ($Err.isERR(rv))
		{
			return rv;
		}


		parts.push(partNum);
		parts.sort(function(a, b){return a - b});
		const partNums = parts.join(",");

		$Db.executeQuery(`UPDATE \`file_multipart\` SET FMP_PARTS=? WHERE FMP_ID=?`, [partNums, this.$upload_id]);
		if ($Db.isError())
		{
			_abortMultipartUpload(this.$upload_id, this.$Session.userId);
			return $Err.DBError("ERR_DB_UPDATE_ERROR", $Db.lastErrorMsg());
		}

		return {...rc, ...vals};
	}

	get_multipart_upload_status()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const fmps = $Db.executeQuery(`SELECT FMP_PARTS FROM \`file_multipart\` WHERE FMP_ID=? AND FMP_USR_ID=?`, [this.$upload_id, this.$Session.userId]);
		if (fmps.length == 0)
		{
			return $ERRS.ERR_INVALID_MULTIPART_UPLOAD_ID;
		}


		let parts = [];
		if (!$Utils.empty(fmps[0].FMP_PARTS))
		{
			parts = fmps[0].FMP_PARTS.split(",");
			parts.sort(function(a, b){return a - b});
		}

		vals.uploaded_parts = parts;

		return {...rc, ...vals};
	}

	end_multipart_file_upload()
	{
		let vals = {};
		let rc = $ERRS.ERR_SUCCESS;

		const fmps = $Db.executeQuery(`SELECT FMP_PARTS, FMP_METADATA, FMP_FILE_NAME, FMP_ORIG_FILE_NAME FROM \`file_multipart\` WHERE FMP_ID=? AND FMP_USR_ID=?`,
											[this.$upload_id, this.$Session.userId]);
		if (fmps.length == 0)
		{
			return $ERRS.ERR_INVALID_MULTIPART_UPLOAD_ID;
		}

		const fmp = fmps[0];
		const fileName = fmp.FMP_FILE_NAME;
		const origFileName = fmp.FMP_ORIG_FILE_NAME;
		const metadata = JSON.parse(fmp.FMP_METADATA);
		const mimeType = metadata.mime_type;
		const flags = metadata.flags;
		const accessLevel = metadata.access_level;
		const dstFile = $Config.get("temp_path") + `/${fileName}`;


		let parts = [];
		if (!$Utils.empty(fmp.FMP_PARTS))
		{
			parts = fmp.FMP_PARTS.split(",");
			parts.sort(function(a, b){return a - b});
		}

		if (parts.length == 0 || parts.length != this.$num_of_parts || parts.length != parseInt(parts[parts.length - 1]))
		{
			return $ERRS.ERR_MISSING_MULTIPART_PARTS;
		}

		for (let i = 0; i < this.$num_of_parts; i++)
		{
			if (parts[i] != i + 1)
			{
				return $ERRS.ERR_INCONSISTENT_MULTIPART_PARTS;
			}
		}


		$Db.executeQuery(`DELETE FROM \`file_multipart\` WHERE FMP_ID=?`, [this.$upload_id]);


		let isActive = true;

		for (let i = 0; i < this.$num_of_parts; i++)
		{
			const dataFile = `${this.$upload_id}.part.${parts[i]}`;

			if (isActive)
			{
				const partData = $Files.getFileFromContainer(dataFile, $Const.FILE_TYPE_PATH_MULTIPART_TEMP);

				if (partData === null)
				{
					$Utils.unlink(dstFile);
					isActive = false;
				}
				else
				{
					const rv = $Files.saveFile(dstFile, partData, $Config.get("standard_file_access"), true);
					if ($Err.isERR(rv))
					{
						$Utils.unlink(dstFile);
						isActive = false;
					}
				}
			}

			$Files.deleteFileInContainer(dataFile, $Const.FILE_TYPE_PATH_MULTIPART_TEMP);
		}

		if (!isActive)
		{
			return $ERRS.ERR_FAILED_TO_WRITE_FILE;
		}


		const fileSize = $Files.getFilesize(dstFile);

		if (flags & $Const.UPLOAD_FILE_FLAG_SAVE_TO_TEMP_FOLDER)
		{
		}
		else
		{
			const rv = $Files.moveTempFileToContainer(dstFile, fileName, mimeType);
			if ($Err.isERR(rv))
			{
				return rv;
			}
		}

		$Db.executeQuery(`INSERT INTO \`file\` (FIL_ID, FIL_USR_ID, FIL_CREATED_ON, FIL_FILE_NAME, FIL_ORIG_FILE_NAME, FIL_FILE_SIZE, FIL_MIME_TYPE, FIL_ACCESS_LEVEL)
												VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
											[this.$upload_id, this.$Session.userId, $Utils.now(), fileName, origFileName, fileSize, mimeType, accessLevel]);
		if ($Db.isError())
		{
			return $Err.DBError("ERR_DB_INSERT_ERROR", $Db.lastErrorMsg());
		}			

		vals.file_id = this.$upload_id;

		return {...rc, ...vals};
	}

	abort_multipart_upload()
	{
		return _abortMultipartUpload(this.$upload_id, this.$Session.userId);
	}
}
