const fs = require('fs');
const ltrim = require('ltrim');

function PhoneNumber()
{
    return {
        dialingCode: null,
        phoneNumber: null,
        countryCode: null,
        countryName: null,
        intlFormat: null
    };
}

module.exports =
{
	makeIntlPhoneNumber: function(phone, countryCode)
	{
		let dc = this._getCountriesByDialingCode();
		if ($Utils.empty(dc[countryCode]))
		{
			let cc = this._getCountriesByCode();
			countryCode = countryCode.toUpperCase();
			
			if ($Utils.empty(cc[countryCode]))
			{
				return "";
			}
			
			countryCode = cc[countryCode].code;
		}
		
		
		countryCode = this._removeUnwantedCountryCodeChars(countryCode);
		phone = this._removeUnwantedPhoneChars(phone);
		phone = ltrim(phone, "0");
		
		if ($Utils.empty(phone))
		{
			phone = "";
		}
		else if (!phone.startsWith("+"))
		{
			phone = "+" + countryCode + phone; 
		}
		
		return phone;
	},

	formatIntlPhoneNumber: function(phone)
	{
		phone = this._removeUnwantedPhoneChars(phone);
		phone = ltrim(phone, "0");
		
		if ($Utils.empty(phone))
		{
			phone = "";
		}
		else if (!phone.startsWith("+"))
		{
			phone = "+" + phone; 
		}
		
		return phone;
	},

	parseIntlPhoneNumber: function(phone)
	{
		let dc = this._getCountriesByDialingCode();
		phone = ltrim(phone, "+");
		
		let code = phone.substring(0, 4);
		if (!$Utils.empty(dc[code]))
		{
			let pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(4), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		code = phone.substring(0, 3);
		if (!$Utils.empty(dc[code]))
		{
			let pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(3), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		code = phone.substring(0, 2);
		if (!$Utils.empty(dc[code]))
		{
			let pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(2), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		code = phone.substring(0, 1);
		if (!$Utils.empty(dc[code]))
		{
			let pn = new PhoneNumber();
			pn.dialingCode = code;
			pn.phoneNumber = ltrim(phone.substring(1), "0");
			pn.countryCode = dc[code].code;
			pn.countryName = dc[code].name;
			pn.intlFormat = "+" + code + pn.phoneNumber;
			return pn;
		}
		
		return null;
	},

	getIntlPhoneNumber: function(phoneNumber, countryCode)
	{
		let number;

		if ($Utils.empty(countryCode))
		{
			number = this.formatIntlPhoneNumber(phoneNumber);
		}
		else
		{
			number = this.makeIntlPhoneNumber(phoneNumber, countryCode);
		}
		
		if ($Utils.empty(number))
		{
			return null;
		}

		let phoneNumberObj = this.parseIntlPhoneNumber(number);
		if ($Utils.empty(phoneNumberObj))
		{
			return null;
		}

		if (!$Utils.empty(countryCode))
		{
			if (phoneNumberObj.countryCode != countryCode.toUpperCase())
			{
				phoneNumberObj.countryCode = countryCode.toUpperCase();
				phoneNumberObj.countryName = this.getCountryNameByCode(countryCode);
			}
		}

		return phoneNumberObj;
	},

	isValidCountryCode: function(countryCode)
	{
		let cc = this._getCountriesByCode();
		countryCode = countryCode.toUpperCase();
		
		return !$Utils.empty(cc[countryCode]);
	},

	getCountryNameByCode: function(countryCode)
	{
		let cc = this._getCountriesByCode();
		countryCode = countryCode.toUpperCase();
		
		if ($Utils.empty(cc[countryCode]))
		{
			return null;
		}

		return cc[countryCode].name;
	},

	getCountryByCode: function(countryCode)
	{
		let cc = this._getCountriesByCode();
		countryCode = countryCode.toUpperCase();
		
		if ($Utils.empty(cc[countryCode]))
		{
			return null;
		}

		return cc[countryCode];
	},

	getCountryNameByDialingCode: function(dialingCode)
	{
		let cc = this._getCountriesByDialingCode();
		
		if ($Utils.empty(cc[dialingCode]))
		{
			return null;
		}

		return cc[dialingCode].name;
	},

	getCountryByDialingCode: function(dialingCode)
	{
		let cc = this._getCountriesByDialingCode();
		
		if ($Utils.empty(cc[dialingCode]))
		{
			return null;
		}

		return cc[dialingCode];
	},

	getCountryCodesByName: function(lang = null)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

		if (this._countryNameArray == null)
		{
			this._countryNameArray = {};
		}

		if (!$Utils.isset(this._countryNameArray[lang]))
		{
			let file = $Const.INFRA_ROOT + "/platform/data/country_codes_by_name." + lang + ".json";
			if (!fs.existsSync(file))
			{
				file = $Const.INFRA_ROOT + "/platform/data/country_codes_by_name." + $Config.get("default_language") + ".json";
			}

			this._countryNameArray[lang] = fs.readFileSync(file, 'utf8');
		}
		
		return JSON.parse(this._countryNameArray[lang]);
	},

	getCountryNamesByCodes: function(lang = null)
	{
		let cc = this._getCountriesByCode();
		let retArr = {};

        Object.entries(cc).forEach(function(ccObj)
        {
            let code = ccObj[0];
            let data = ccObj[1];

			retArr[code] = data.name;
		});

		return retArr;
	},



	_countryCodeArray: null,
	_countryDialingCodeArray: null,
	_countryNameArray: null,
	
	_getCountriesByCode: function(lang = null)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

		if (this._countryCodeArray == null)
		{
			this._countryCodeArray = {};
		}

		if (!$Utils.isset(this._countryCodeArray[lang]))
		{
			let file = $Const.INFRA_ROOT + "/platform/data/countries_by_code." + lang + ".json";
			if (!fs.existsSync(file))
			{
				file = $Const.INFRA_ROOT + "/platform/data/countries_by_code." + $Config.get("default_language") + ".json";
			}

			this._countryCodeArray[lang] = fs.readFileSync(file, 'utf8');
		}

		return JSON.parse(this._countryCodeArray[lang]);
	},
	
	_getCountriesByDialingCode: function(lang = null)
	{
		if ($Utils.empty(lang)) lang = $Config.get("default_language");

		if (this._countryDialingCodeArray == null)
		{
			this._countryDialingCodeArray = {};
		}

		if (!$Utils.isset(this._countryDialingCodeArray[lang]))
		{
			let file = $Const.INFRA_ROOT + "/platform/data/countries_by_dialing_code." + lang + ".json";
			if (!fs.existsSync(file))
			{
				file = $Const.INFRA_ROOT + "/platform/data/countries_by_dialing_code." + $Config.get("default_language") + ".json";
			}

			this._countryDialingCodeArray[lang] = fs.readFileSync(file, 'utf8');
		}
		
		return JSON.parse(this._countryDialingCodeArray[lang]);
	},

	_removeUnwantedPhoneChars: function(phone)
	{
		return phone.replace(/ /g, "")
		            .replace(/\s+/g, ' ')
                    .replace(/\t+/g, '')
                    .trim()
		            .replace(/\-/g, "")
		            .replace(/\./g, "")
		            .replace(/\)/g, "")
		            .replace(/\(/g, "")
		            .replace(/[^0-9+,.]/g, "");
	},
	
	_removeUnwantedCountryCodeChars: function(phone)
    {
		return phone.replace(" ", "")
		            .replace(/\s+/g, ' ')
                    .replace(/\t+/g, '')
                    .trim()
		            .replace(/\-/g, "")
		            .replace(/\./g, "")
		            .replace(/\)/g, "")
		            .replace(/\(/g, "")
	},
}
