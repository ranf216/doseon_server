$(document).ready(function()
{
	RestControl.init();
	saveRoutesSelection();
});
		
function createRequest(reqParams)
{
	if (reqParams.doc != null)
	{
		$("#" + reqParams.docCnt).html(reqParams.doc);
		$("#" + reqParams.docCnt).show();
	}

	if (USES_GET || reqParams.getParams != null)
	{
		if (reqParams.getParams != null)
		{
			$("#getParams").show();
			
			var table = document.createElement("table");
			$("#" + reqParams.getParamsCnt).append(table);
			
			for (var param in reqParams.getParams)
			{
				var inp = document.createElement("input");
				inp.type = "text";
				inp.id = "get_" + validName(param) + "_" + reqParams.instId;
				inp.value = reqParams.getParams[param];
				inp.className = "inputParam";

				var tr = document.createElement("tr");
				var td1 = document.createElement("td");
				tr.appendChild(td1);
				td1.innerHTML = "<h3>" + param + "&nbsp;&nbsp;&nbsp;&nbsp;</h3>";
				
				var td2 = document.createElement("td");
				tr.appendChild(td2);
				
				if (reqParams.optionals.indexOf(param) != -1)
				{
					td1.className = "inputParamOptional";
					$(inp).prop('disabled', true);

					var chk = document.createElement("input");
					chk.type = "checkbox";
					chk.id = inp.id + "_chk";
					$(chk).click(function()
					{
						onClickOptionalCheckbox(this);
					});

					td2.appendChild(chk);
				}

				td2.appendChild(inp);
				$("#" + reqParams.getParamsCnt + " table").append(tr);
			}
		}
		else
		{
			$("#" + reqParams.getParamsCnt).append("<h3><i>- NONE -</i></h3>");
		}
	}
	
	var postParamsParent = $("#" + reqParams.postParamsCnt);

	if (reqParams.postParams != null)
	{
		var table = document.createElement("table");
		postParamsParent.append(table);
		addPostParams(reqParams.postParamsCnt, reqParams.postParams, reqParams.instId, reqParams.optionals, reqParams.docData);
	}
	else
	{
		$("#" + reqParams.postParamsCnt).append("<h3><i>- NONE -</i></h3>");
	}
}
	
function peformRequest(reqParams)
{
	var params = "";
	var postData = new Object();

	if (reqParams.getParams != null)
	{
		for (var param in reqParams.getParams)
		{
			var inpId = "get_" + validName(param) + "_" + reqParams.instId;
			if (reqParams.optionals.indexOf(param) != -1 && !$("#" + inpId + "_chk").is(':checked'))
			{
				continue;
			}
			
			var val = $("#" + inpId).val();
			val = evalIfNeeded(val);
		
			params += (params == "" ? "?" : "&");
			params += param + "=" + encodeURIComponent(val);
		}
	}

	if (reqParams.postParams != null)
	{
		createPostParams(reqParams.instId, reqParams.postParams, postData, reqParams.optionals, reqParams.paramTypes);
	}
	
	callAPI(reqParams, postData, params);
}


function callAPI(reqParams, postData, getParams)
{
	var url = reqParams.url + getParams;
	$("#" + reqParams.requestCnt).html("<span>" + reqParams.method + " " + url + "</span>");
	$("#" + reqParams.postDataCnt).html(syntaxHighlight(postData));
	
	customBeforeCallAPI(reqParams, postData, getParams);

	$.ajax({
			url: url,
			type: reqParams.method,
			data: JSON.stringify(postData),
			dataType: 'json',
			headers: { 'Content-Type': 'application/json' },
			success: function (json)
			{
				$("#" + reqParams.responseCnt).html(syntaxHighlight(json));
				
				if (reqParams.onSuccess != null)
				{
					reqParams.onSuccess(json);
				}
			},
			error: function()
			{
				$("#" + reqParams.responseCnt).html(syntaxHighlight(arguments[0].responseText));
				
				if (reqParams.onFail != null)
				{
					reqParams.onFail(arguments[0].responseText);
				}
			}
	});
}

function syntaxHighlight(json)
{
	if (typeof json == 'undefined' || json == null)
	{
		 return "";
	}
	
	if (typeof json != 'string')
	{
		 json = JSON.stringify(json, undefined, 4);
	}
	
	json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
		var cls = 'number';
		if (/^"/.test(match)) {
			if (/:$/.test(match)) {
				cls = 'key';
			} else {
				cls = 'string';
			}
		} else if (/true|false/.test(match)) {
			cls = 'boolean';
		} else if (/null/.test(match)) {
			cls = 'null';
		}
		return '<span class="' + cls + '">' + match + '</span>';
	});
}

function addPostParams(postParamsCnt, postParams, instId, optionals, docData, prefix, objName)
{
	if (prefix == null)
	{
		prefix = "";
		objName = "";
	}
	else
	{
		prefix += "_";
		objName += ".";
	}
	
	for (var param in postParams)
	{
		if (postParams[param] instanceof Object || postParams[param] instanceof Array)
		{
			addPostParams(postParamsCnt, postParams[param], instId, optionals, docData[param], prefix + validName(param), objName + validName(param));
			continue;
		}
	
		var inp = null;
		
		if (typeof postParams[param] == "boolean")
		{
			inp = document.createElement("select");
			inp.id = "post_" + prefix + validName(param) + "_" + instId;
			inp.name = param;
			inp.className = "inputParam";

			var opt = document.createElement("option");
			opt.innerHTML = "false";
			opt.value = "false";
			inp.appendChild(opt);
			
			var opt = document.createElement("option");
			opt.innerHTML = "true";
			opt.value = "true";
			inp.appendChild(opt);

			inp.value = "" + postParams[param];
		}
		else if (postParams[param] == "##FILE##")
		{
			inp = document.createElement("input");
			inp.id = "post_" + prefix + validName(param) + "_" + instId;
			inp.type = "file";
			inp.name = param;
			inp.className = "inputParam";
		}
		else
		{
			inp = document.createElement("input");
			inp.id = "post_" + prefix + validName(param) + "_" + instId;
			inp.name = param;
			inp.value = postParams[param];
			inp.type = "text";
			inp.className = "inputParam";
		}

		
		var tr = document.createElement("tr");
		var td1 = document.createElement("td");
		tr.appendChild(td1);
		td1.innerHTML = "<h3>" + objName + param + "&nbsp;&nbsp;&nbsp;&nbsp;</h3>";
		
		var td2 = document.createElement("td");
		tr.appendChild(td2);
		
		if (optionals.indexOf(param) != -1)
		{
			td1.className = "inputParamOptional";
			$(inp).prop('disabled', true);

			var chk = document.createElement("input");
			chk.type = "checkbox";
			chk.id = inp.id + "_chk";
			$(chk).click(function()
			{
				onClickOptionalCheckbox(this);
			});

			td2.appendChild(chk);
		}

		td2.appendChild(inp);

		var td3 = document.createElement("td");
		tr.appendChild(td3);
		td3.innerHTML = "<span class='documentation'>" + (docData[param] ? docData[param] : "") + "</span>";

		$("#" + postParamsCnt + " table").append(tr);
	}
}

function onClickOptionalCheckbox(chkObj)
{
	var chkId = $(chkObj).attr('id');
	var inpId = chkId.substr(0, chkId.length - 4);
	$("#" + inpId).prop('disabled', !chkObj.checked);
}

function createPostParams(instId, postParams, postData, optionals, paramTypes, prefix, arrName)
{
	var hasContent = false;

	if (prefix == null)
	{
		prefix = "";
	}
	else
	{
		prefix += "_";
	}

	if (arrName == null)
	{
		arrName = "";
	}

	for (var param in postParams)
	{
		var inpId = "post_" + prefix + validName(param) + "_" + instId;
		if (prefix == "" && optionals.indexOf(param) != -1 && !$("#" + inpId + "_chk").is(':checked'))
		{
			continue;
		}
		
		if (postParams[param] instanceof Array)
		{
			postData[param] = new Array();
			createPostParams(instId, postParams[param], postData[param], optionals, paramTypes, prefix + validName(param), param + "_");
			continue;
		}
	
		if (postParams[param] instanceof Object)
		{
			var innerObj = new Object();
			var innerHasContent = createPostParams(instId, postParams[param], innerObj, optionals, paramTypes, prefix + validName(param), arrName);
			
			if (innerHasContent)
			{
				postData[param] = innerObj;
				hasContent = true;
			}
			
			continue;
		}
	
		var val = $("#" + inpId).val();
		val = evalIfNeeded(val);

		if (paramTypes[arrName + param] == "narray")
		{
			hasContent = true;
			if (postData instanceof Array)
			{
				postData.push([Number(val)]);
			}
			else
			{
				postData[param] = [Number(val)];
			}
		}
		else if (paramTypes[arrName + param] == "sarray")
		{
			hasContent = true;
			if (postData instanceof Array)
			{
				postData.push(["" + val]);
			}
			else
			{
				postData[param] = ["" + val];
			}
		}
		else if (typeof postParams[param] == "boolean")
		{
			hasContent = true;
			if (postData instanceof Array)
			{
				postData.push(val == "true" ? true : false);
			}
			else
			{
				postData[param] = (val == "true" ? true : false);
			}
		}
		else if (typeof postParams[param] == "number")
		{
			hasContent = true;
			if (postData instanceof Array)
			{
				postData.push(Number(val));
			}
			else
			{
				postData[param] = Number(val);
			}
		}
		else if (typeof postParams[param] == "string")
		{
			if (val != "")
			{
				hasContent = true;
			}
			
			if (postData instanceof Array)
			{
				postData.push("" + val);
			}
			else
			{
				postData[param] = "" + val;
			}
		}
	}
	
	return hasContent;
}		

function validName(name)
{
	return name.replace(/\W/, "");
}

function evalIfNeeded(val)
{
	if (val.substr(0, 2) == "$$")
	{
		val = eval(val);
	}
	
	return val;
}

function updateQueryParamFromSelect(selectId)
{
	var selectElement = document.getElementById(selectId);

	// Check if the select element exists
	if (!selectElement)
	{
		console.log(`Select element with ID '${selectId}' not found.`);
		return;
	}

	// Add an event listener for the change event
	selectElement.addEventListener('change', function()
	{
		var selectedValue = this.value;
		var url = new URL(window.location.href);
		url.searchParams.set(selectId, selectedValue);

		// Update the URL without reloading the page
		window.history.pushState({}, '', url);

		console.log(`URL updated with ${selectId}=${selectedValue}`);
	});

	console.log(`Event listener added to select element with ID '${selectId}'`);
}

function updateSelectFromQueryParams()
{
	var queryParams = new URLSearchParams(window.location.search);

	queryParams.forEach(function(value, key)
	{
		var selectElement = document.getElementById(key);
		if (selectElement)
		{
			selectElement.value = value;
			console.log(`Set '${key}' select to '${value}' from URL parameter.`);
			var event = new Event('change', { bubbles: true });
			selectElement.dispatchEvent(event);
		}
		else
		{
			console.log(`Select element with ID '${key}' not found.`);
		}
	});
}

function saveRoutesSelection()
{
	['selectApiGroup', 'selectApi'].forEach(updateQueryParamFromSelect);
	setTimeout(updateSelectFromQueryParams, 300);
}