const access_level = ($Config.get("file_access_level", "enabled") ? {"access_level": `o:s:${$Config.get("file_access_level", "default")}***<br/>&#34;public&#34; = public access<br/>&#34;protected&#34; = authed users<br/>&#34;limited&#34; = authed users with timeout<br/>&#34;private&#34; = only owner with timeout`} : {});

module.exports =
{
			"upload_file_base64"				: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"@truncated_request"			: "file_data",
													"#token"						: "s",
													"file_name"						: "s",
													"file_data"						: "s***base64 string of the file",
													...access_level,
												},


			"begin_multipart_file_upload"		: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"#token"						: "s",
													"file_name"						: "s",
													"upload_to_temp_folder"			: "o:b:false",
													...access_level,
												},

			"upload_file_part"					: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"@truncated_request"			: "part_data",
													"#token"						: "s",
													"upload_id"						: "s",
													"part_number"					: "i***Index of the part being uploaded, starting with 1",
													"part_data"						: "s***base64 string of the file part",
												},

			"get_multipart_upload_status"		: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"#token"						: "s",
													"upload_id"						: "s",
												},

			"end_multipart_file_upload"			: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"#token"						: "s",
													"upload_id"						: "s",
													"num_of_parts"					: "i***Number of total parts uploaded",
												},

			"abort_multipart_upload"			: {
													"@acl"							: $Utils.allAuthedUserTypes(),
													"#token"						: "s",
													"upload_id"						: "s",
												},
};
