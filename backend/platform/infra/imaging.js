const sharp = require('sharp');

module.exports = class
{
    constructor(filenameOrContent = null, width = 0, height = 0, channels = 0, background = null, imageType = null)
	{
		this._isValid = false;
		this._imageType = imageType;
	
		if (filenameOrContent != null && filenameOrContent != "")
		{
			this._createFromData(filenameOrContent);
			return;
		}

		if (width <= 0)
		{
			width = 1;
		}
		if (height <= 0)
		{
			height = 1;
		}
		if (channels == 0)
		{
		    channels = 4;
		}
		if (background == null)
		{
		    background = { r: 0, g: 0, b: 0, alpha: 0 };
		}

		this._isValid = true;
		this._width = width;
		this._height = height;
		this._image = sharp({
							create: {
									width: width,
									height: height,
									channels: channels,
									background: background
								}
							});
	}

	isValid()
	{
		return this._isValid;
	}

	getTypeExtension()
	{
		return this._imageType;
	}

	save(filename, permissions = null)
	{
		let asyncDone = false;
		let success;

		this._image
			.toFile(filename)
			.then(info =>
			{
				success = true;
				asyncDone = true;
			})
			.catch(err =>
			{
				$Logger.queueString($Const.LL_ERROR, "Image - Failed to save image: " + JSON.stringify(err));
				success = false;
				asyncDone = true;
			});

		require('deasync').loopWhile(function(){return !asyncDone;});

		$Logger.logQueue();

		return success;
	}

	getWidth()
	{
		return this._width;
	}

	getHeight()
	{
		return this._width;
	}
	
	getRawData(imageType = null)
	{
		if (imageType == null)
		{
			imageType = (this._imageType == null ? "jpeg" : this._imageType);
		}

		let newImage = this._image.toFormat(imageType);
		let asyncDone = false;
		let success;

		newImage.toBuffer()
			.then((data, info) =>
			{
				success = data;
				asyncDone = true;
			})
			.catch(err =>
			{
				$Logger.queueString($Const.LL_ERROR, "Image - Failed to get raw data: " + JSON.stringify(err));
				success = null;
				asyncDone = true;
			});

		require('deasync').loopWhile(function(){return !asyncDone;});

		$Logger.logQueue();

		return success;
	}
	
	getBase64(imageType = null)
	{
		return this.getRawData(imageType).toString('base64');
	}

	copy(imaging, x, y)
	{
		let success = this._recreate(this._image.composite([
			{
				input: imaging.getRawData(),
				top: Math.round(y),
				left: Math.round(x),
			},
		]));

		return success;
	}

	setPixelsToColor(color, xyPairs = null, xyLines = null)
	{
		let asyncDone = false;
		let success;
		let buffer;
		let info;
		const imageWidth = this._width;
		const imageHeight = this._height;
		const { r, g, b} = this._hexToRgb(color);
		const a = 255;

		this._image.raw().toBuffer({ resolveWithObject: true })
		.then((data) =>
		{
			buffer = data.data;
			info = data.info;
			success = true;
			asyncDone = true;
		})
		.catch(err =>
		{
			success = false;
			asyncDone = true;
		});

		require('deasync').loopWhile(function(){return !asyncDone;});

		if (!success)
		{
			return false;
		}

		function setPixel(x, y)
		{
			const offset = (y * imageWidth + x) * info.channels;
			buffer[offset]     = r;
			buffer[offset + 1] = g;
			buffer[offset + 2] = b;

			if (info.channels == 4)
			{
				buffer[offset + 3] = a;
			}
		}

		if (xyPairs)
		{
			xyPairs.forEach(pair =>
			{
				const [ x, y ] = pair;
				setPixel(x, y);
			});
		}

		if (xyLines)
		{
			for (let y = 0; y < xyLines.length; y++)
			{
				xyLines[y].forEach(x =>
				{
					setPixel(x, y);
				});
			}
		}

		const img = sharp(buffer, {
			raw: {
				width: imageWidth,
				height: imageHeight,
				channels: info.channels
			}
		});


		const imaging = new $Imaging(null, imageWidth, imageHeight, info.channels, null, this._imageType);
		imaging._image = img;

		this._createFromData(imaging.getRawData());
		success = this._isValid;

		return success;
	}

	resizeToHeight(height)
	{
		let ratio = height / this._height;
		let width = Math.round(this._width * ratio);
		return this.resize(width, height);
	}

	resizeToWidth(width)
	{
		let ratio = width / this._width;
		let height = Math.round(this._height * ratio);
		return this.resize(width, height);
	}

	scale(scale)
	{
		let width = Math.round(this._width * scale);
		let height = Math.round(this._height * scale);
		return this.resize(width, height);
	}

	resize(width, height)
	{
		let success = this._recreate(this._image.resize(width, height, {
								kernel: sharp.kernel.cubic,
								fit: 'fill',
								position: 'center',
								background: { r: 0, g: 0, b: 0, alpha: 0 }
							}));

		return success;
	}
	
	fitToBox(width, height, onlyScaleDown)
	{
		let w = this._width;
		let h = this._height;
		
		let scaleW = width / w;
		let scaleH = height / h;
		let newW;
		let newH;
		
		if ((onlyScaleDown && scaleW > 1 && scaleH > 1) || (scaleW == 1 && scaleH == 1))
		{
			return;
		}
		
		if (scaleW < scaleH)
		{
			newW = w * scaleW;
			newH = h * scaleW;
		}
		else
		{
			newW = w * scaleH;
			newH = h * scaleH;
		}
		
		this.resize(Math.round(newW), Math.round(newH));
	}

	crop(x, y, width, height)
	{
		let success = this._recreate(this._image.extract({ left: x, top: y, width: width, height: height }));
		return success;
	}

	createDefaultAvatarForName(fileOwner, name, width, height, accessLevel = null)
	{
		let parts = name.toUpperCase().split(/\s+/);
		let text = parts[0].substring(0, 1);
		if (parts.length > 1)
		{
			text += parts[parts.length - 1].substring(0, 1);
		}
		
		let fileName = $Config.get("media_path") + "/no_avatar.png";
		
		this._createFromData(fileName);
		this.resize(width, height);
		
		let fontFile = $Config.get("media_path") + "/" + $Config.get("avatar", "default_font_file");
		let fontName = $Config.get("media_path") + "/" + $Config.get("avatar", "default_font_name");

		let textImg = this._createText(text, 100, fontFile, fontName, $Config.get("avatar", "default_color"));
		let twidth  = textImg._width; 
		let theight = textImg._height;
		
		let textX = (width - twidth) / 2;
		let textY = (height - theight) / 2;

		this.copy(textImg, textX, textY);
		
		return $Files.saveImageFromBase64(fileOwner, this.getBase64(), "no-avatar", "png", accessLevel, width, height);
	}

	autofitTextInBox(text, x = 0, y = 0, maxWidth = 0, maxHeight = 0, startingFontSize = 60, fontFile = false, fontName = "", fontColor = false,
								textAlign = "left", verticalAlign = "top", lineHeightRatio = 1)
	{
		let fontSize = startingFontSize;
		let totalHeight = 0;
		let fontPath;

		if (fontColor === false)
		{
			fontColor = "#000000";
		}

		maxWidth = (maxWidth == 0 ? this._width : maxWidth);
		maxHeight = (maxWidth == 0 ? this._height : maxHeight);
		
		// Run until we find a font size that 		maxWidth = (maxWidth == 0 ? this._width : maxWidth);
		maxHeight = (maxWidth == 0 ? this._height : maxHeight);
		
		// Run until we find a font size that doesn't exceed maxHeight in pixels
		while (totalHeight == 0 || totalHeight > maxHeight)
		{
			if (totalHeight > 0)
			{
				fontSize--; // we're still over height, decrement font size and try again
			}
			
			// Calculate number of lines / line height
			let words = text.split(/\s*?/);
			let lines = [];
			let i = 0;
			let lineHeight = 0;
			let boxWidth = 0;

			while (boxWidth == 0 || boxWidth > maxWidth)
			{
				for (let w = 0; w < words.length; w++)
				{
					let textImg = this._createText(words[w], fontSize, fontFile, fontName, fontColor);
					boxWidth = textImg._width;

					if (boxWidth > maxWidth)
					{
						fontSize--;
						break;
					}
				}
			}
		
			while (words.length > 0)
			{ 
				let txt = words.slice(0, ++i).join(' ');
				let textImg = this._createText(txt, fontSize, fontFile, fontName, fontColor);
				boxWidth = textImg._width;
				let boxHeight = textImg._height;

				lineHeight = Math.max(boxHeight, lineHeight);
				
				if (boxWidth > maxWidth || words.length < i)
				{
					let txt = words.slice(0, --i).join(' ');
					lines.push(txt);
					words = words.slice(i);
					i = 0;
				}
			}
			
			totalHeight = lines.length * lineHeight * lineHeightRatio;
			
			if (totalHeight === 0)
			{
				return false; // don't run endlessly if something goes wrong
			}
		}

		// Writes text to image
		for (i = 0; i < lines.length; i++)
		{
			let outX = x;
			let outY = y;
			let textImg = this._createText(lines[i], fontSize, fontFile, fontName, fontColor);
			boxWidth = textImg._width;
			
			if (textAlign == "right")
			{
				outX = x + maxWidth - boxWidth;
			}
			else if (textAlign == "center")
			{
				outX = x + (maxWidth - boxWidth) / 2;
			}

			if (verticalAlign == "bottom")
			{
				outY = y + maxHeight - lines.length * lineHeight * lineHeightRatio;
			}
			else if (verticalAlign == "center")
			{
				outY = y + (maxHeight - lines.length * lineHeight * lineHeightRatio) / 2;
			}

			this.copy(textImg, outX, outY + ((i + 1) * lineHeight * lineHeightRatio));
		}
		
		return true;
	}

	// drawThikLine($x1, $y1, $x2, $y2, $color, $width)
	// {
	// 	$lineLen = round(sqrt(pow($x2 - $x1, 2) + pow($y2 - $y1, 2)));
	
	// 	for ($i = 0; $i < $lineLen; $i += 0.5)
	// 	{
	// 		$dx = ($i / $lineLen) * ($x2 - $x1);
	// 		$dy = ($i / $lineLen) * ($y2 - $y1);
	// 		imagefilledellipse(this.image, $x1 + $dx, $y1 + $dy, $width, $width, $color);
	// 	}
	// }


	_createFromData(filenameOrContent)
	{
		let asyncDone = false;
		let thiz = this;
		this._image = sharp(filenameOrContent);

		this._image.metadata().then(metadata =>
		{
			thiz._isValid = true;
			thiz._error = "";

			thiz._imageType = metadata.format;
			thiz._width = metadata.width;
			thiz._height = metadata.height;

			asyncDone = true;
		})
		.catch(alert =>
		{
			thiz._isValid = false;
			thiz._error = alert;

			asyncDone = true;
		});

		require('deasync').loopWhile(function(){return !asyncDone;});
	}

	_recreate(sharpImg, returnBuffer = false)
	{
		let asyncDone = false;
		let success;
		let buffer;
		let imageType = (this._imageType == null ? "jpeg" : this._imageType);

		sharpImg.toFormat(imageType).toBuffer()
		.then((data) =>
		{
			buffer = data;
			success = true;
			asyncDone = true;
		})
		.catch(err =>
		{
			success = false;
			asyncDone = true;
		});

		require('deasync').loopWhile(function(){return !asyncDone;});

		if (returnBuffer)
		{
			return (success ? buffer : false);
		}

		if (success)
		{
			this._createFromData(buffer);
			success = this._isValid;
		}

		return success;
	}

	_trim(returnBuffer = false)
	{
		let newSharp = this._image.trim(0.1).toFormat("png");
		this._imageType = "png";
		let success = this._recreate(newSharp, returnBuffer);
		return success;
	}

	_createText(text, fontSize, fontFile, fontName, fontColor)
	{
		let textedSVG = `<svg>`;

		if (fontFile === false)
		{
			fontName = "Arial";
		}
		else
		{
			textedSVG += 
			`<defs>
				<style type="text/css">
					@font-face {font-family: '${fontName}'; src: url('${fontFile}');}
				</style>
			</defs>`
		}
		
		textedSVG += 
		`	<rect x="0" y="0" width="5000" height="1000" fill="#00000000" />
			<text x="100" y="200" font-size="${fontSize}" fill="${fontColor}" style="font-family: '${fontName}'">${text}</text>
		</svg>`;
		
		let textImg = new $Imaging(Buffer.from(textedSVG));
		textImg._trim();
		return textImg;
	}

	_hexToRgb(hex)
	{
		// Remove # if present
		hex = hex.replace(/^#/, '');

		// Handle shorthand (e.g. "03F" -> "0033FF")
		if (hex.length === 3)
		{
			hex = hex.split('').map(char => char + char).join('');
		}

		const num = parseInt(hex, 16);

		return {
			r: (num >> 16) & 255,
			g: (num >> 8) & 255,
			b: num & 255
		};
	}
}
