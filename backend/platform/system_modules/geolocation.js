// Time and distance: https://developers.google.com/maps/documentation/distance-matrix/distance-matrix#maps_http_distancematrix_latlng-txt

module.exports = class
{
    constructor(lat = null, lon = null)
    {
		this.apiKey = $Config.get("google_api_key");
		this.apiProtocol = $Config.get("google_api_protocol");
		this.apiLang = $Config.get("google_api_lang");
		
		if (!$Utils.empty(lat) && !$Utils.empty(lon))
		{
			this.setLocation(lat, lon);
		}
	}
	
	setLocation(lat, lon)
	{
		let url = `${this.apiProtocol}://maps.googleapis.com/maps/api/geocode/json?` +
										($Utils.empty(this.apiKey) ? "" : "key=" + this.apiKey + "&") +
										`sensor=false&language=${this.apiLang}` + 
										`&latlng=${lat},${lon}`;

		let data = $Utils.urlGet(url);
		
		this.jsondata = JSON.parse(data);

		this._checkStatus();
		return this.isStatusOK();
	}
	
	setLocationName(name)
	{
		let url = `${this.apiProtocol}://maps.googleapis.com/maps/api/geocode/json?` +
										($Utils.empty(this.apiKey) ? "" : "key=" + this.apiKey + "&") +
										`sensor=false&language=${this.apiLang}` + 
										"&address=" + encodeURIComponent(name);
		
		let data = $Utils.urlGet(url);
		
		this.jsondata = JSON.parse(data);

		this._checkStatus();
		return this.isStatusOK();
	}

	getTimeAndDistanceToDestination(lat, lon)
	{
		let url = `${this.apiProtocol}://maps.googleapis.com/maps/api/distancematrix/json?` +
										($Utils.empty(this.apiKey) ? "" : "key=" + this.apiKey + "&") +
										`language=${this.apiLang}` + 
										`&destinations=${lat},${lon}&origins=${this.getLat()},${this.getLon()}`;
		
		let data = $Utils.urlGet(url);
		return this._parseDistancematrix(data);
	}

	getTimeAndDistanceToDestinationName(name)
	{
		let url = `${this.apiProtocol}://maps.googleapis.com/maps/api/distancematrix/json?` +
										($Utils.empty(this.apiKey) ? "" : "key=" + this.apiKey + "&") +
										`language=${this.apiLang}` + 
										`&destinations=${encodeURIComponent(name)}&origins=${this.getLat()},${this.getLon()}`;
		
		let data = $Utils.urlGet(url);
		return this._parseDistancematrix(data);
	}

	isStatusOK()
	{
		return this.status;
	}
	
	getAllInfo()
	{
		if (!this.status)
		{
			return [];
		}
		
		return {
			"country": this.getCountry(),
			"province": this.getProvince(),
			"city": this.getCity(),
			"street": this.getStreet(),
			"street_number": this.getStreetNumber(),
			"postal_code": this.getPostalCode(),
			"country_code": this.getCountryCode(),
			"formatted_address": this.getAddress(),
		};
	}

	getCountry()
	{
		return this._findLongNameGivenType("country", this.jsondata.results[0].address_components);
	}
	
	getProvince()
	{
		return this._findLongNameGivenType("administrative_area_level_1", this.jsondata.results[0].address_components, true);
	}
	
	getCity()
	{
		return this._findLongNameGivenType("locality", this.jsondata.results[0].address_components);
	}
	
	getStreet()
	{
		return this._findLongNameGivenType("route", this.jsondata.results[0].address_components);
	}
	
	getStreetNumber()
	{
		return this._findLongNameGivenType("street_number", this.jsondata.results[0].address_components);
	}
	
	getPostalCode()
	{
		return this._findLongNameGivenType("postal_code", this.jsondata.results[0].address_components);
	}
	
	getCountryCode()
	{
		return this._findLongNameGivenType("country", this.jsondata.results[0].address_components, true);
	}
	
	getAddress()
	{
		return this.jsondata.results[0].formatted_address;
	}
	
	getLat()
	{
		return this.jsondata.results[0].geometry.location.lat;
	}
	
	getLon()
	{
		return this.jsondata.results[0].geometry.location.lng;
	}

	getTimeZone()
	{
		let url = `${this.apiProtocol}://maps.googleapis.com/maps/api/timezone/json?` +
										($Utils.empty(this.apiKey) ? "" : "key=" + this.apiKey + "&") +
										`location=${this.getLat()},${this.getLon()}&timestamp=${new $Date().getTimestamp()}`;

		let data = $Utils.urlGet(url);
		
		let jsondata = JSON.parse(data);

		if ($Utils.empty(jsondata) || !$Utils.isset(jsondata.status) || jsondata.status != "OK")
		{
			return false;
		}

		return jsondata.timeZoneId;
	}

	getDistanceFromLocationInKm(lat, lon)
	{
		return this.getLocationDistanceFromLocationInKm(this.getLat(), this.getLon(), lat, lon);
	}

	getDistanceFromGeoLocationInKm(geoLocation)
	{
		return this.getLocationDistanceFromLocationInKm(this.getLat(), this.getLon(), geoLocation.getLat(), geoLocation.getLon());
	}

	getBoundingCoords(km)
	{
		return this.getBoundingCoordsFromLocation(this.getLat(), this.getLon(), km);
	}

	getLocationDistanceFromLocationInKm(lat1, lon1, lat2, lon2)
	{
		let R = 6371; // Radius of the earth in km
		let dLat = $Utils.deg2rad(lat2 - lat1);
		let dLon = $Utils.deg2rad(lon2 - lon1);
		
		let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos($Utils.deg2rad(lat1)) * Math.cos($Utils.deg2rad(lat2)) *  Math.sin(dLon / 2) * Math.sin(dLon / 2); 
		let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
		let d = R * c; // Distance in km
		
		return $Utils.round(d, 3);
	}

	getBoundingCoordsFromLocation(lat, lon, km)
	{
		let latN = lat + km / 110.574;
		let latS = lat - km / 110.574;
		
		let dLon = 111.320 * Math.cos($Utils.deg2rad(lat));
		
		let lonE = lon + km / dLon;
		let lonW = lon - km / dLon;
		
		return {"N": latN, "E": lonE, "S": latS, "W": lonW};
	}

	getDirectionAndDistance(prevLat, prevLon, currLat, currLon)
	{
		let dist = this.getLocationDistanceFromLocationInKm(prevLat, prevLon, currLat, currLon);
		if (dist <= 0)
		{
			return {"direction": -1, "distance": 0};
		}

		let dLat = (currLat - prevLat < 0 ? -1 : 1);
		let dLon = (currLon - prevLon < 0 ? -1 : 1);

		let meanLon = prevLon + (currLon - prevLon) / 2;
		let north = dLat * this.getLocationDistanceFromLocationInKm(prevLat, meanLon, currLat, meanLon);
		let dir = Math.rad2deg(Math.acos(north / dist));

		if (dLon < 0)
		{
			dir = -Math.rad2deg(Math.acos(north / dist)) + 360;
		}
		else
		{
			dir = Math.rad2deg(Math.acos(north / dist));
		}

		return {"direction": dir, "distance": dist};
	}


	_checkStatus()
	{
		this.status = (!$Utils.empty(this.jsondata) && $Utils.isset(this.jsondata.status) && this.jsondata.status == "OK" ? true : false);
	}

	_findLongNameGivenType(type, array, shortName = false)
	{
		let retVal = "";

		array.every(value =>
		{
			if (value.types.includes(type))
			{
				if (shortName)    
				{
					retVal = value.short_name;
					return false;
				}
				
				retVal = value.long_name;
				return false;
			}

			return true;
		});
		
		return retVal;
	}

	_parseDistancematrix(data)
	{
		if ($Utils.empty(data))
		{
			return null;
		}

		let jsondata = JSON.parse(data);
		if ($Utils.empty(jsondata) || !$Utils.isset(jsondata.status) || jsondata.status != "OK")
		{
			return null;
		}

		let obj = jsondata.rows[0].elements[0];
		if (obj.status != "OK")
		{
			return null;
		}

		return {
			origin_address: jsondata.origin_addresses[0],
			destination_address: jsondata.destination_addresses[0],
			distance_meters: obj.distance.value,
			distance_text: obj.distance.text,
			duration_seconds: obj.duration.value,
			duration_text: obj.duration.text,
		};
	}
}
