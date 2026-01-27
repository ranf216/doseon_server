const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');

module.exports = class
{
    constructor()
    {
        this.s3 = new S3({accessKeyId: $Config.get("aws", "access_key"),
                        secretAccessKey: $Config.get("aws", "access_secret"),
                        region: $Config.get("aws", "region"),
                        apiVersion: $Config.get("aws", "version")});
	}

	saveFile(filePath, s3Path, contentType = null)
	{
        let fileContent;

        try
        {
            fileContent = fs.readFileSync(filePath);
        }
        catch (err)
        {
            return $ERRS.ERR_FILE_NOT_FOUND;
        }

		return this.saveFileFromString(fileContent, s3Path, contentType)
	}

	saveFileFromString(fileContent, s3Path, contentType = null)
	{
		let vals = [];
		let rc = $ERRS.ERR_SUCCESS;

		let params = {
				"Bucket"		: $Config.get("aws", "bucket_name"),
				"Key"			: s3Path,
				"Body"	        : fileContent,
				"ACL"			: 'public-read'
        };

		if (!$Utils.empty(contentType))
		{
			params.ContentType = contentType;
			params.ContentDisposition = 'inline';
		}


        let asyncDone = false;

        this.s3.putObject(params, function(err, data)
        {
            if (err)
            {
                rc = $Err.errWithInfo("ERR_S3_FAILED_TO_SAVE_FILE", err);
            }
            else
            {
                vals.file_url = "https://s3." + $Config.get("aws", "region") + ".amazonaws.com/" + $Config.get("aws", "bucket_name") + "/" + s3Path;
            }

            asyncDone = true;
        });

        require('deasync').loopWhile(function(){return !asyncDone;});
		
		return {...rc, ...vals};
	}

	getFile(s3Path)
	{
		let vals = [];
		let rc = $ERRS.ERR_SUCCESS;

		let params = {
				"Bucket"		: $Config.get("aws", "bucket_name"),
				"Key"			: s3Path
        };

        let asyncDone = false;

        this.s3.getObject(params, function(err, data)
        {
            if (err)
            {
                rc = $Err.errWithInfo("ERR_S3_FAILED_TO_GET_FILE", err);
            }
            else
            {
                vals.file_body = data.Body;
                vals.content_type = ($Utils.isset(data.ContentType) ? data.ContentType : "");
            }

            asyncDone = true;
        });

        require('deasync').loopWhile(function(){return !asyncDone;});

		return {...rc, ...vals};
	}

	doesFileExist(s3Path)
	{
		let vals = [];
		let rc = $ERRS.ERR_SUCCESS;

		let params = {
				"Bucket"		: $Config.get("aws", "bucket_name"),
				"Key"			: s3Path
        };

        let asyncDone = false;

        this.s3.headObject(params, function(err, data)
        {
            if (err)
            {
                vals.file_exists = false;
            }
            else
            {
                vals.file_exists = true;
            }

            asyncDone = true;
        });

        require('deasync').loopWhile(function(){return !asyncDone;});

		return {...rc, ...vals};
	}

	copyFile(s3PathSrc, s3PathDst)
	{
        let rc = this.getFile(s3PathSrc);
        if ($Err.isERR(rc))
        {
            return rc;
        }

        return this.saveFileFromString(rc.file_body, s3PathDst, rc.content_type);
	}

	copyFile_(s3PathSrc, s3PathDst)
	{
		let vals = [];
		let rc = $ERRS.ERR_SUCCESS;

		let params = {
				"Bucket"		: $Config.get("aws", "bucket_name"),
				"Key"			: s3PathDst,
				"CopySource"	: s3PathSrc
        };

        let asyncDone = false;

        this.s3.copyObject(params, function(err, data)
        {
            if (err)
            {
                rc = $Err.errWithInfo("ERR_S3_FAILED_TO_GET_FILE", err);
            }
            else
            {
                vals = data;
            }

            asyncDone = true;
        });

        require('deasync').loopWhile(function(){return !asyncDone;});

		return {...rc, ...vals};
	}

	renameFile(s3PathSrc, s3PathDst)
	{
        let rc = this.copyFile(s3PathSrc, s3PathDst);
        if ($Err.isERR(rc))
        {
            return rc;
        }

        return this.deleteFile(s3PathSrc);
	}

	renameFile_(s3PathSrc, s3PathDst)
	{
		let vals = [];
		let rc = $ERRS.ERR_SUCCESS;

		let params = {
				"Bucket"		        : $Config.get("aws", "bucket_name"),
				"Key"			        : s3PathDst,
				"CopySource"	        : s3PathSrc,
                "MetadataDirective"     : 'REPLACE'
            };

        let asyncDone = false;

        this.s3.copyObject(params, function(err, data)
        {
            if (err)
            {
                rc = $Err.errWithInfo("ERR_S3_FAILED_TO_GET_FILE", err);
            }
            else
            {
                vals = data;
            }

            asyncDone = true;
        });

        require('deasync').loopWhile(function(){return !asyncDone;});

		return {...rc, ...vals};
	}

	deleteFile(s3Path)
	{
		let vals = [];
		let rc = $ERRS.ERR_SUCCESS;

		let params = {
				"Bucket"		: $Config.get("aws", "bucket_name"),
				"Key"			: s3Path
        };

        let asyncDone = false;

        this.s3.deleteObject(params, function(err, data)
        {
            if (err)
            {
                rc = $Err.errWithInfo("ERR_S3_FAILED_TO_GET_FILE", err);
            }
            else
            {
                vals = data;
            }

            asyncDone = true;
        });

        require('deasync').loopWhile(function(){return !asyncDone;});

		return {...rc, ...vals};
	}

	// public function createMultipartUpload($s3Path)
	// {
	// 	global $ERRS;

	// 	$vals = array();
	// 	$rc = $ERRS.ERR_SUCCESS;

	// 	try
	// 	{
	// 		$result = $this->s3->createMultipartUpload([
	// 			'Bucket'		=> CONFIG("aws", "bucket_name"),
	// 			'Key'			=> $s3Path,
	// 			'StorageClass' => 'REDUCED_REDUNDANCY',
	// 			'ACL'          => 'public-read',
	// 		]);

	// 		$uploadId = $result['UploadId'];
	// 	}
	// 	catch (S3Exception $e)
	// 	{
	// 		return Err::errWithInfo("ERR_S3_FAILED_TO_CREATE_MULTIPART_UPLOAD", $e->getMessage());
	// 	}

	// 	$vals["upload_id"] = $uploadId;
	// 	$vals["metadata"] = json_encode(["Parts" => []]);

	// 	return array_merge($rc, $vals);
	// }

	// public function uploadPart($uploadId, $s3Path, $partNumber, $partData, $metadata)
	// {
	// 	global $ERRS;

	// 	$vals = array();
	// 	$rc = $ERRS.ERR_SUCCESS;

	// 	$parts = json_decode($metadata, true);

	// 	try
	// 	{
	// 		$result = $this->s3->uploadPart([
	// 			'Bucket'		=> CONFIG("aws", "bucket_name"),
	// 			'Key'			=> $s3Path,
	// 			'UploadId'		=> $uploadId,
	// 			'PartNumber'	=> $partNumber,
	// 			'Body'			=> $partData,
	// 		]);

	// 		$parts["Parts"][$partNumber] = [
	// 			'PartNumber' => $partNumber,
	// 			'ETag' => $result['ETag'],
	// 		];
	// 	}
	// 	catch (S3Exception $e)
	// 	{
	// 		$result = $this->s3->abortMultipartUpload([
	// 			'Bucket'		=> CONFIG("aws", "bucket_name"),
	// 			'Key'			=> $s3Path,
	// 			'UploadId'		=> $uploadId,
	// 		]);

	// 		return Err::errWithInfo("ERR_S3_FAILED_TO_SAVE_MULTIPART_ITEM", $e->getMessage());
	// 	}

	// 	$vals["metadata"] = json_encode($parts);
		
	// 	return array_merge($rc, $vals);
	// }

	// public function completeMultipartUpload($uploadId, $s3Path, $metadata)
	// {
	// 	global $ERRS;

	// 	$vals = array();
	// 	$rc = $ERRS.ERR_SUCCESS;

	// 	$parts = json_decode($metadata, true);

	// 	try
	// 	{
	// 		$result = $this->s3->completeMultipartUpload([
	// 			'Bucket'			=> CONFIG("aws", "bucket_name"),
	// 			'Key'				=> $s3Path,
	// 			'UploadId'			=> $uploadId,
	// 			'MultipartUpload'	=> $parts,
	// 		]);

	// 		$url = $result['Location'];
	// 	}
	// 	catch (S3Exception $e)
	// 	{
	// 		$result = $this->s3->abortMultipartUpload([
	// 			'Bucket'		=> CONFIG("aws", "bucket_name"),
	// 			'Key'			=> $s3Path,
	// 			'UploadId'		=> $uploadId,
	// 		]);

	// 		return Err::errWithInfo("ERR_S3_FAILED_TO_COMPLETE_MULTIPART_UPLOAD", $e->getMessage());
	// 	}

	// 	return array_merge($rc, $vals);
	// }

	// public function abortMultipartUpload($uploadId, $s3Path)
	// {
	// 	global $ERRS;

	// 	$vals = array();
	// 	$rc = $ERRS.ERR_SUCCESS;

	// 	try
	// 	{
	// 		$result = $this->s3->abortMultipartUpload([
	// 			'Bucket'		=> CONFIG("aws", "bucket_name"),
	// 			'Key'			=> $s3Path,
	// 			'UploadId'		=> $uploadId,
	// 		]);
	// 	}
	// 	catch (S3Exception $e)
	// 	{
	// 		return Err::errWithInfo("ERR_S3_FAILED_TO_COMPLETE_MULTIPART_UPLOAD", $e->getMessage());
	// 	}
		
	// 	return array_merge($rc, $vals);
	// }

	// public static function getBucketUrl()
	// {
	// 	return "https://s3." . CONFIG("aws", "region") . ".amazonaws.com/" . CONFIG("aws", "bucket_name") . "/";
	// }
}
