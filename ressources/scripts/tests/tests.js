//? CONTRAST SCRIPT

/**
 *TODO
 * text-shadow
 * image
 * positions (outside its parent)
 ** rgba bg on rgba parent
 */

/**
 ** Get the relative luminance of an RGB color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 * @param {string} color 
 * @returns 
 */
function getLuminance(color) {
	// table of red, green and blue values in 8bit
	var colorValues = color.substr(4, color.length - 1).split(',');

	// translate each color in sRGB
	var RsRGB = parseInt(colorValues[0].trim()) / 255;
	var GsRGB = parseInt(colorValues[1].trim()) / 255;
	var BsRGB = parseInt(colorValues[2].trim()) / 255;

	/**
	 ** define the RGB values to calculate the brightness
	 * @param {number} sRGB 
	 * @returns
	 */
	function getColor(sRGB) {
		return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow(((sRGB + 0.055) / 1.055), 2.4);
	}

	// calculation of the relative luminance
	return 0.2126 * getColor(RsRGB) + 0.7152 * getColor(GsRGB) + 0.0722 * getColor(BsRGB);
}

/**
 ** Get the contrast ratio
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 * @param {array} textColor
 * @param {array} bgColor
 * @returns
 */
function getRatio(textColor, bgColor) {

	if(textColor && bgColor) {
		var minRatio = 21;

		bgColor.forEach(bg => {
			textColor.forEach(fg => {
				let fgLum = getLuminance(fg);
				let bgLum = getLuminance(bg);
				// the lighter of the colors
				var lum1 = Math.max(fgLum, bgLum);
				// the darker of the colors
				var lum2 = Math.min(fgLum, bgLum);

				// current ratio
				var currentRatio = ((lum1 + 0.05) / (lum2 + 0.05));

				// change minRatio if the current ratio < previously min ratio
				minRatio = (currentRatio < minRatio) ? currentRatio : minRatio;
			})
		});
		
		// returns the contrast ratio rounded to 2 decimal
		return minRatio.toFixed(2);
	}

	return null;
}

/**
 ** Get ratio target and check if contrast is valid
 * @param {string} size
 * @param {number} weight
 * @param {number} ratio
 * @returns
 */
function validContrast(size, weight, ratio) {
	var valid = {
		target: null,
		status: 0 // 0: cant tell - 1: invalid - 2: valid
	}

	if(size && weight) {
		size = parseFloat(size.split('px')[0]);

		// bold text
		if(weight >= 700) {
			// font-size < 18.5px
			if(size < 18.5) {
				valid.target = 4.5;
				if(ratio) {
					valid.status = (ratio >= 4.5) ? 2 : 1;
				}
			// font-size >= 18.5px
			} else {
				valid.target = 3;
				if(ratio) {
					valid.status = (ratio >= 3) ? 2 : 1;
				}
			}
		// normal text
		} else {
			// font-size < 24px
			if(size < 24) {
				valid.target = 4.5;
				if(ratio) {
					valid.status = (ratio >= 4.5) ? 2 : 1;
				}
			// font-size >= 24px
			} else {
				valid.target = 3;
				if(ratio) {
					valid.status = (ratio >= 3) ? 2 : 1;
				}
			}
		}
	}

	return valid;
}

/**
 ** Get RGB values
 * @param {string} value
 * @returns 
 */
function getRGB(value) {
	// rgb(numbers, numbers, numbers) -> global
	var regex = /rgb\((?:\d+, ?\d+, ?\d+\))/g;
	return value.match(regex);
}

/**
 ** Translate RGBA values in RGB
 * @param {string} value 
 * @param {string} parent 
 * @returns 
 */
function getRGBA(value, parent, opacity) {
	// rgba(numbers, numbers, numbers, numbers) -> global
	var regex = /rgba\((?:\d+, ?\d+, ?\d+, ?\d?[,.]?\d*\))/g;
	var results = value.match(regex);
	var matches = [];

	results.forEach(result => {
		// table of red, green, blue and alpha values
		var colorValues = result.substr(5, result.length - 1).split(',');
		var R = parseInt(colorValues[0].trim());
		var G = parseInt(colorValues[1].trim());
		var B = parseInt(colorValues[2].trim());
		var a = parseFloat(colorValues[3].trim()) * opacity;

		// if opacity is 100%, its useless to translate
		if(a !== 1) {
			// for each color applied on the parent, calculate RGB values for the element's current RGBA color
			parent.forEach(el => {
				// table of red, green and blue values of the parent
				var parentValues = el.substr(4, el.length - 1).split(',');
				var Rp = parseInt(parentValues[0].trim());
				var Gp = parseInt(parentValues[1].trim());
				var Bp = parseInt(parentValues[2].trim());

				// translate RGBA to RGB
				var red = R === Rp ? R : Math.round(Rp * (1 - a) + R * a);
				var green = G === Gp ? G : Math.round(Gp * (1 - a) + G * a);
				var blue = B === Bp ? B : Math.round(Bp * (1 - a) + B * a);

				var rgbColor = 'rgb('+red+', '+green+', '+blue+')';
				matches.push(rgbColor);
			})
		} else {
			var rgbColor = 'rgb('+R+', '+G+', '+B+')';
			matches.push(rgbColor);
		}
	});

	return matches;
}

/**
 ** Get the background of the element
 * @param {node} element
 * @param {number} opacity
 * @param pbg
 * @returns 
 */
function getBgColor(element, opacity, pbg) {
	var bgColors = [];
	var bgImage = window.getComputedStyle(element, null).getPropertyValue('background-image');
	var bgColor = window.getComputedStyle(element, null).getPropertyValue('background-color');

	if(bgImage.match(/url\(/)) {
		return 'image';
	}

	if(bgImage.match(/rgba?\(/g) && bgColor.match(/rgba?\(/g)) {
		if(!pbg && (opacity < 1 || bgColor.match(/rgba\(/))) {
			return null;
		}

		pbg = [bgColor];
	}

	if(!pbg && (opacity < 1 || bgImage.match(/rgba\(/)|| bgColor.match(/rgba\(/))) {
		return null;
	} else if(bgImage.match(/rgba?\(/g)) {
		// if there are colors like linear-gradient, get it
		if(bgImage.match(/rgba\(/)) {
			getRGBA(bgImage, pbg, opacity).forEach(result => {
				bgColors.push(result);
			});
		}

		if(bgImage.match(/rgb\(/)) {
			getRGB(bgImage).forEach(result => {
				if(opacity < 1) {
					var colorValues = result.substr(4, result.length - 1).split(',');
					var R = parseInt(colorValues[0].trim());
					var G = parseInt(colorValues[1].trim());
					var B = parseInt(colorValues[2].trim());
					var RGBA = 'rgba('+R+','+G+','+B+','+1+')';

					getRGBA(RGBA, pbg, opacity).forEach(el => {
						bgColors.push(el);
					});
				} else {
					bgColors.push(result);
				}
			});
		}
	} else if(bgColor.match(/rgba?\(/g)) {
		if(bgColor.match(/rgba\(/)) {
			getRGBA(bgColor, pbg, opacity).forEach(result => {
				bgColors.push(result);
			});
		} else if(bgColor.match(/rgb\(/)) {
			getRGB(bgColor).forEach(result => {
				if(opacity < 1) {
					var colorValues = result.substr(4, result.length - 1).split(',');
					var R = parseInt(colorValues[0].trim());
					var G = parseInt(colorValues[1].trim());
					var B = parseInt(colorValues[2].trim());
					var RGBA = 'rgba('+R+','+G+','+B+','+1+')';

					getRGBA(RGBA, pbg, opacity).forEach(el => {
						bgColors.push(el);
					});
				} else {
					bgColors.push(result);
				}
			});
		}
	} else {
		return null;
	}

	return bgColors;
}

/**
 ** Get element's opacity
 * @param {node} element 
 * @returns 
 */
function getOpacity(element) {
	if(element.hasAttribute('data-tng-opacity')) {
		return element.getAttribute('data-tng-opacity');
	}
	
	var opacity = 1;
	var regexFilter = /opacity\( ?\d?.?\d+ ?\)/; // opacity(value)

	// we look for the lowest opacity value on the element & its parents
	while(element && element.tagName != 'HTML') {
		if(element.hasAttribute('data-tng-opacity')) {
			opacity = opacity * element.getAttribute('data-tng-opacity');
			break;
		}

		if(window.getComputedStyle(element, null).getPropertyValue('filter').match(regexFilter)) {
			var filterO = window.getComputedStyle(element, null).getPropertyValue('filter').match(regexFilter)[0];
			var value = filterO.substr(8, filterO.length - 9).trim();
			opacity = opacity * value;
		}

		if(window.getComputedStyle(element, null).getPropertyValue('opacity')) {
			opacity = opacity * window.getComputedStyle(element, null).getPropertyValue('opacity');
		}
		
		element = element.parentNode;
	}

	element.setAttribute('data-tng-opacity', opacity);
	return opacity;
}

/**
 ** Get element's visibility
 * @param {node} element 
 * @returns
 */
 function getVisibility(element) {
	var opacity = element.hasAttribute('data-tng-opacity') ? element.getAttribute('data-tng-opacity') : getOpacity(element);
	if(element.hasAttribute('data-tng-el-visible')) {
		return element.getAttribute('data-tng-el-visible') === 'true' ? true : false;
	}

	/**
	 ** checks if the element is hidden with :
	 * visibility: hidden
	 * opacity: 0
	 */
	if(window.getComputedStyle(element, null).getPropertyValue('visibility') === 'hidden' || opacity == 0) {
		element.setAttribute('data-tng-el-visible', 'false');
		return false;
	}

	// get DOMRect of element (size & position)
	var rect = element.getBoundingClientRect(),
	scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
	scrollTop = window.pageYOffset || document.documentElement.scrollTop;

	// x - y positions
	var pos = { top: rect.top + scrollTop, left: rect.left + scrollLeft };

	/**
	 ** Checks if the element has a null width & not overflow its container
	 * display: none
	 * hidden attribute
	 * transform: scale(0)
	 */
	if(rect.width === 0 && !(element.scrollWidth > element.offsetWidth)) {
		element.setAttribute('data-tng-el-visible', 'false');
		return false;
	}

	// element positioned offscreen
	if((pos.top + rect.height <= 0) || (pos.left + rect.width <= 0)) {
		element.setAttribute('data-tng-el-visible', 'false');
		return false;
	}

	var regexClipP = /.{6,7}\(0px|.{6,7}\(.+[, ]0px/g; // circle(0) || ellipse(0)
	var regexClip = /rect\([01]px,[01]px,[01]px,[01]px\)/; // rect(0) // rect(1)

	/**
	 ** checks if the element is hidden with :
	 * width: < 2 && overflow: hidden
	 * height: < 2 && overflow: hidden
	 */
	if((element.offsetWidth <= 1 && window.getComputedStyle(element, null).getPropertyValue('overflow').trim() === 'hidden')
	|| (element.offsetHeight <= 1 && window.getComputedStyle(element, null).getPropertyValue('overflow').trim() === 'hidden')) {
		element.setAttribute('data-tng-el-visible', 'false');
		return false;
	}
	
	/**
	 ** checks if the element is hidden with :
	 * display: none
	 * opacity: 0
	 * clip-path: circle(0) || ellipse(0)
	 * clip: (rect(0,0,0,0) || rect(1px,1px,1px,1px)) && position: absolute
	 */
	while(element && element.tagName != 'HTML') {
		var opacityZero = window.getComputedStyle(element, null).getPropertyValue('opacity').trim() == 0;

		if(
			window.getComputedStyle(element, null).getPropertyValue('display').trim() === 'none' || opacityZero
			|| window.getComputedStyle(element, null).getPropertyValue('clip-path').match(regexClipP)
			|| (window.getComputedStyle(element, null).getPropertyValue('clip').replace(/ /g, '').match(regexClip) && window.getComputedStyle(element, null).getPropertyValue('position').trim() === 'absolute')
		) {
			element.setAttribute('data-tng-el-visible', 'false');
			if(opacityZero) element.setAttribute('data-tng-opacity', 0);

			let elChildren = element.querySelectorAll('*');
			elChildren.forEach(e => {
				e.setAttribute('data-tng-el-visible', 'false');
				if(opacityZero) e.setAttribute('data-tng-opacity', 0);
			});

			return false;
		} else {
			element = element.parentNode;
		}
	}
	
	element.setAttribute('data-tng-el-visible', 'true');
	return true;
}

/**
 ** Checks if the element is fully positioned inside its closest parent with a bgcolor
 * @param {node} element 
 * @returns 
 */
 function checkStacking(element, parent) {
	if(getPosition(parent).top <= getPosition(element).top 
	&& getPosition(parent).left <= getPosition(element).left 
	&& getPosition(parent).bottom >= getPosition(element).bottom 
	&& getPosition(parent).right >= getPosition(element).right) {
			return true;
	}

	return false;
}

/**
 ** Get the closest node with a bg propertie
 * @param {node} element 
 * @returns 
 */
function getBg(element) {
	while(element && element.tagName != 'HTML') {
		if(window.getComputedStyle(element, null).getPropertyValue('background-image') !== 'none' 
		|| window.getComputedStyle(element, null).getPropertyValue('background-color') !== 'rgba(0, 0, 0, 0)') {
			return element;
		}

		element = element.parentNode;
	}

	return null;
}

/**
 ** Get element's position
 * @param {node} element 
 * @returns 
 */
function getPosition(element) {
	// get DOMRect of element (size & position)
	var rect = element.getBoundingClientRect(),
	scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
	scrollTop = window.pageYOffset || document.documentElement.scrollTop;

	return {
		top: Math.round(rect.top + scrollTop),
		left: Math.round(rect.left + scrollLeft),
		bottom: Math.round(rect.top + scrollTop + rect.height),
		right: Math.round(rect.left + scrollLeft + rect.width)
	};
}

function isPositioned(element) {
	let elPos = window.getComputedStyle(element, null).getPropertyValue('position');
	if(elPos != 'static' && elPos != 'relative') return true;
	else {
		var parent = element.parentNode;
		var positionned = false;
		while(parent && parent.tagName != 'HTML' && !positionned) {
			let parentPos = window.getComputedStyle(parent, null).getPropertyValue('position');
			if(parentPos != 'static' && parentPos != 'relative') positionned = true
			else parent = parent.parentNode;
		}
		return positionned;
	}
}

/**
 ** Get final results (foreground, background, ratio, visibility)
 * @param {node} element 
 * @returns 
 */
function getResults(element, opacity) {
	var bg = getBg(element);
	var position = bg ? checkStacking(element, bg) : null;
	var bgOpacity = bg ? (bg.hasAttribute('data-tng-opacity') ? bg.getAttribute('data-tng-opacity') : getOpacity(bg)) : null;

	if(isPositioned(element)) {
		return {
			background: null,
			ratio: null,
			visible: element.getAttribute('data-tng-el-visible') === 'true' ? true : false
		}
	}
	// if the bg isn't opaque
	if(position && (bgOpacity < 1 || window.getComputedStyle(bg, null).getPropertyValue('background-image').match(/rgba\(/) || window.getComputedStyle(bg, null).getPropertyValue('background-color').match(/rgba\(/))) {
		var parent = getBg(bg.parentNode);

		// get its parent to calculate its RGB color
		if(parent) {
			var pPosition = checkStacking(bg, parent);
			var pOpacity = parent.hasAttribute('data-tng-opacity') ? parent.getAttribute('data-tng-opacity') : getOpacity(parent);
	
			// if the parent's bg is opaque, calculate the color
			if(pPosition && pOpacity == 1 && !window.getComputedStyle(parent, null).getPropertyValue('background-image').match(/rgba\(/) && !window.getComputedStyle(parent, null).getPropertyValue('background-color').match(/rgba\(/)) {
				var pbg = getBgColor(parent, 1, null);
				pbg = (pbg === 'image') ? null : pbg;
				var bgColors = getBgColor(bg, bgOpacity, pbg);
			} else {
				var bgColors = null;
			}
		} else {
			var bgColors = null;
		}
		
	} else if(position) {
		var bgColors = getBgColor(bg, bgOpacity, null);
	}

	if(bgColors) {
		if(bgColors !== 'image') {
			var textColor = window.getComputedStyle(element, null).getPropertyValue('color');
			if(window.getComputedStyle(element, null).getPropertyValue('-webkit-text-stroke-width') !== '0px') {
				if(window.getComputedStyle(element, null).getPropertyValue('-webkit-text-stroke-color') !== 'rgba(0, 0, 0, 0)') {
					textColor = window.getComputedStyle(element, null).getPropertyValue('-webkit-text-stroke-color');
				}
			}
			var colors = null;
	
			if(window.getComputedStyle(element, null).getPropertyValue('text-shadow') === 'none') {
				// get RGB text color
				if(textColor.match(/rgb\(/)) {
					if(opacity < 1) {
						var colorValues = textColor.substr(4, textColor.length - 1).split(',');
						var R = parseInt(colorValues[0].trim());
						var G = parseInt(colorValues[1].trim());
						var B = parseInt(colorValues[2].trim());
						textColor = 'rgba('+R+','+G+','+B+','+1+')';
						colors = getRGBA(textColor, bgColors, opacity);
					} else {
						colors = getRGB(textColor);
					}
				} else if(textColor.match(/rgba\(/)) {
					colors = getRGBA(textColor, bgColors, opacity);
				} else {
					return null;
				}
	
				var ratio = getRatio(colors, bgColors);
	
				return {
					color: colors,
					background: bgColors,
					ratio: ratio,
					visible: (element.getAttribute('data-tng-el-visible') === 'true' ? true : false && ratio > 1) ? true : false
				}
			} else {
				return {
					color: window.getComputedStyle(element, null).getPropertyValue('text-shadow').match(/rgba?\([^)]+\)/g),
					background: bgColors,
					ratio: null,
					visible: element.getAttribute('data-tng-el-visible') === 'true' ? true : false
				}
			}
		} else {
			return {
				background: bgColors,
				ratio: null,
				visible: element.getAttribute('data-tng-el-visible') === 'true' ? true : false
			}
		}
		
		
	} else {
		return {
			background: null,
			ratio: null,
			visible: element.getAttribute('data-tng-el-visible') === 'true' ? true : false
		}
	}
}

function getTextNodeContrast() {
	var bgBody = true;

	if((!window.getComputedStyle(document.body, null).getPropertyValue('background-color') && !window.getComputedStyle(document.body, null).getPropertyValue('background') || window.getComputedStyle(document.body, null).getPropertyValue('background-color').match(/rgba\(0, 0, 0, 0\)/))) {
		document.body.style.backgroundColor = '#fff';
		bgBody = false;
	}
	
	var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	
	var textNodeList = {
		//? 'invalid', 'valid', 'cantTell' = contrast ratio status
		//? '45' = minimum contrast ratio : 4.5:1
		//? '3' = minimum contrast ratio : 3:1
		//? 'V' = non visible elements
		//? 'G' = font weight >= 700
		// 3.2.1
		invalid_45: [],
		invalid_45V: [],
		valid_45: [],
		valid_45V: [],
		cantTell_45: [],
		cantTell_45V: [],
	
		// 3.2.2
		invalid_45G: [],
		invalid_45GV: [],
		valid_45G: [],
		valid_45GV: [],
		cantTell_45G: [],
		cantTell_45GV: [],
	
		// 3.2.3
		invalid_3: [],
		invalid_3V: [],
		valid_3: [],
		valid_3V: [],
		cantTell_3: [],
		cantTell_3V: [],
	
		// 3.2.4
		invalid_3G: [],
		invalid_3GV: [],
		valid_3G: [],
		valid_3GV: [],
		cantTell_3G: [],
		cantTell_3GV: []
	};

	var colorsList = ["bleu", "bleus", "bleue", "bleues", "gris", "grise", "grises", "marron", "marrons", "orange", "oranges", "rouge", "rouges", "violet", "violets", "violette", "violettes", "blanc", "blancs", "blanche", "blanches", "jaune", "jaunes", "noir", "noirs", "noire", "noires", "rose", "roses", "vert", "verts", "verte", "vertes"];

	// get datas for each text node
	while(tw.nextNode()) {
		var cn = tw.currentNode;
		var element = cn.parentNode;

		// we don't process empty strings, nor script/noscript/style tags.
		if(cn.nodeValue.trim().length > 0 && ['noscript', 'script', 'style'].indexOf(element.tagName.toLowerCase()) == -1) {
			var computedTextColor = window.getComputedStyle(element, null).getPropertyValue('color');
			if(computedTextColor != window.getComputedStyle(element.parentElement, null).getPropertyValue('color')) {
				//to colors test 3.1.1
				element.setAttribute('data-tng-colorization', 'true');
			}

			//to colors test 3.1.2
			for(let i = 0; i < colorsList.length; i++) {
				if(cn.nodeValue.trim().split(" ").includes(colorsList[i])) {
					element.setAttribute('data-tng-colorindication', 'true');
					break;
				}
			}

			var disabledElements = ['button', 'fieldset', 'input', 'optgroup', 'option', 'select', 'textarea'];
			var size = window.getComputedStyle(element, null).getPropertyValue('font-size');
			var weight = window.getComputedStyle(element, null).getPropertyValue('font-weight');
			var opacity = element.hasAttribute('data-tng-opacity') ? element.getAttribute('data-tng-opacity') : getOpacity(element);
			var results = getResults(element, opacity);
			var isDisabled = (disabledElements.includes(element.tagName.toLowerCase()) && element.hasAttribute('disabled')) ? true : false;

			var o = {
				node: element,
				tag: element.tagName.toLowerCase(),
				text: cn.nodeValue,
				size: size,
				weight: weight,
				foreground: (results && results.color) ? results.color : [window.getComputedStyle(element, null).getPropertyValue('color')],
				background: results ? results.background : null,
				ratio: results ? results.ratio : null,
				xpath: getXPath(element),
				valid: validContrast(size, weight, results ? results.ratio : null),
				isVisible: results ? results.visible : null
			};

			if(o.valid.target == 4.5) {
				if(o.isVisible && !isDisabled && o.weight < 700) {
					if(o.valid.status == 2) {
						textNodeList.valid_45.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_45.push(o);
					} else {
						textNodeList.cantTell_45.push(o);
					}
				} else if(o.isVisible && !isDisabled) {
					if(o.valid.status == 2) {
						textNodeList.valid_45G.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_45G.push(o);
					} else {
						textNodeList.cantTell_45G.push(o);
					}
				} else if(o.weight < 700) {
					if(o.valid.status == 2) {
						textNodeList.valid_45V.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_45V.push(o);
					} else {
						textNodeList.cantTell_45V.push(o);
					}
				} else {
					if(o.valid.status == 2) {
						textNodeList.valid_45GV.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_45GV.push(o);
					} else {
						textNodeList.cantTell_45GV.push(o);
					}
				}
			} else {
				if(o.isVisible && !isDisabled && o.weight < 700) {
					if(o.valid.status == 2) {
						textNodeList.valid_3.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_3.push(o);
					} else {
						textNodeList.cantTell_3.push(o);
					}
				} else if(o.isVisible && !isDisabled) {
					if(o.valid.status == 2) {
						textNodeList.valid_3G.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_3G.push(o);
					} else {
						textNodeList.cantTell_3G.push(o);
					}
				} else if(o.weight < 700) {
					if(o.valid.status == 2) {
						textNodeList.valid_3V.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_3V.push(o);
					} else {
						textNodeList.cantTell_3V.push(o);
					}
				} else {
					if(o.valid.status == 2) {
						textNodeList.valid_3GV.push(o);
					} else if(o.valid.status == 1 && o.ratio != 1) {
						textNodeList.invalid_3GV.push(o);
					} else {
						textNodeList.cantTell_3GV.push(o);
					}
				}
			}
		}
	}

	if(!bgBody) document.body.style.backgroundColor = 'unset';

	return textNodeList;
}
var ariaroles = {
    'alert': { type: ['live region', 'standalone ui widget'] },
    'alertdialog': { type: 'standalone ui widget' },
    'application': { type: 'document structure' },
    'article': { type: 'document structure' },
    'banner': { type: 'landmark' },
    'button': { type: 'standalone ui widget', supportNameFromContents: true, supportedStatesProperties: ['aria-expanded', 'aria-pressed'] },
    'checkbox': { type: 'standalone ui widget', supportNameFromContents: true },
    'cell': { type: 'document structure', supportNameFromContents: true },
    'columnheader': { type: 'document structure', supportNameFromContents: true },
    'combobox': { type: 'composite ui widget' },
    'command': { type: 'abstract' },
    'complementary': { type: 'landmark' },
    'composite': { type: 'abstract' },
    'contentinfo': { type: 'landmark' },
    'definition': { type: 'document structure' },
    'dialog': { type: 'standalone ui widget' },
    'directory': { type: 'document structure' },
    'document': { type: 'document structure' },
    'feed': { type: 'document structure' },
    'figure': { type: 'document structure' },
    'form': { type: 'landmark' },
    'grid': { type: 'composite ui widget' },
    'gridcell': { type: 'standalone ui widget', supportNameFromContents: true },
    'group': { type: 'document structure' },
    'heading': { type: 'document structure', supportNameFromContents: true, requiredStatesProperties: 'aria-level', supportedStatesProperties: 'aria-expanded' },
    'img': { type: 'document structure' },
    'input': { type: 'abstract' },
    'landmark': { type: 'abstract' },
    'link': { type: 'standalone ui widget', supportNameFromContents: true },
    'list': { type: 'document structure' },
    'listbox': { type: 'composite ui widget' },
    'listitem': { type: 'document structure' },
    'log': { type: ['live region', 'standalone ui widget'] },
    'main': { type: 'landmark' },
    'marquee': { type: ['live region', 'standalone ui widget'] },
    'math': { type: 'document structure' },
    'menu': { type: 'composite ui widget' },
    'menubar': { type: 'composite ui widget' },
    'menuitem': { type: 'standalone ui widget', supportNameFromContents: true },
    'menuitemcheckbox': { type: 'standalone ui widget', supportNameFromContents: true },
    'menuitemradio': { type: 'standalone ui widget', supportNameFromContents: true },
    'navigation': { type: 'landmark' },
    'none': { type: 'document structure', supportNameFromAuthors: false },
    'note': { type: 'document structure' },
    'option': { type: 'standalone ui widget', supportNameFromContents: true },
    'presentation': { type: 'document structure', supportNameFromAuthors: false },
    'progressbar': { type: 'standalone ui widget' },
    'radio': { type: 'standalone ui widget', supportNameFromContents: true },
    'radiogroup': { type: 'composite ui widget' },
    'range': { type: 'abstract' },
    'region': { type: ['landmark', 'document structure'] },
    'roletype': { type: 'abstract' },
    'row': { type: 'document structure', supportNameFromContents: true },
    'rowgroup': { type: 'document structure', supportNameFromContents: true },
    'rowheader': { type: 'document structure', supportNameFromContents: true },
    'scrollbar': { type: 'standalone ui widget' },
    'search': { type: 'landmark' },
    'searchbox': { type: 'standalone ui widget' },
    'section': { type: 'abstract' },
    'sectionhead': { type: 'abstract' },
    'select': { type: 'abstract' },
    'separator': { type: 'document structure' },
    'slider': { type: 'standalone ui widget' },
    'spinbutton': { type: 'standalone ui widget' },
    'status': { type: ['live region', 'standalone ui widget'] },
    'structure': { type: 'abstract' },
    'switch': { type: 'standalone ui widget', supportNameFromContents: true },
    'tab': { type: 'standalone ui widget', supportNameFromContents: true },
    'table': { type: 'document structure' },
    'tablist': { type: 'composite ui widget' },
    'tabpanel': { type: 'standalone ui widget' },
    'term': { type: 'document structure' },
    'textbox': { type: 'standalone ui widget' },
    'timer': { type: ['live region', 'standalone ui widget'] },
    'toolbar': { type: 'document structure' },
    'tooltip': { type: 'standalone ui widget', supportNameFromContents: true },
    'tree': { type: 'composite ui widget', supportNameFromContents: true },
    'treegrid': { type: 'composite ui widget' },
    'treeitem': { type: 'standalone ui widget', supportNameFromContents: true },
    'widget': { type: 'abstract' },
    'window': { type: 'abstract' }
};

var ariastatesproperties = {
    'aria-activedescendant': { type: 'relationship' }, // id reference
    'aria-atomic': { type: 'live region', global: true, default: 'false', values: ['false', 'true'] },
    'aria-autocomplete': { type: 'widget', default: 'none', values: ['both', 'inline', 'list', 'none'] },
    'aria-busy': { type: 'live region', global: true, default: 'false', values: ['false', 'true'] },
    'aria-checked': { type: 'widget', default: 'undefined', values: ['false', 'mixed', 'true', 'undefined'] },
    'aria-colcount': { type: 'relationship' }, // integer
    'aria-colindex': { type: 'relationship' }, // integer
    'aria-colspan': { type: 'relationship' }, // integer
    'aria-controls': { type: 'relationship', global: true }, // id reference list
    'aria-current': { global: true, default: 'false', values: ['date', 'false', 'location', 'page', 'step', 'time', 'true'] },
    'aria-describedby': { type: 'relationship', global: true }, // id reference list
    'aria-details': { type: 'relationship', global: true }, // id reference
    'aria-disabled': { type: 'widget', global: true, default: 'false', values: ['false', 'true'] },
    'aria-dropeffect': { type: 'drag-and-drop', global: true, default: 'none', values: ['copy', 'execute', 'link', 'move', 'none', 'popup'] },
    'aria-errormessage': { type: ['relationship', 'widget'], global: true }, // id reference
    'aria-expanded': { type: 'widget', default: 'undefined', values: ['false', 'true', 'undefined'] },
    'aria-flowto': { type: 'relationship', global: true }, // id reference list
    'aria-grabbed': { type: 'drag-and-drop', global: true, default: 'undefined', values: ['false', 'true', 'undefined'], deprecated: true },
    'aria-haspopup': { type: 'widget', global: true, default: 'false', values: ['dialog', 'false', 'grid', 'listbox', 'menu', 'tree', 'true'] },
    'aria-hidden': { type: 'widget', global: true, default: 'undefined', values: ['false', 'true', 'undefined'] },
    'aria-invalid': { type: 'widget', global: true, default: 'false', values: ['false', 'grammar', 'spelling', 'true'] },
    'aria-keyshortcuts': { global: true }, // string
    'aria-label': { type: 'widget', global: true }, // string
    'aria-labelledby': { type: 'relationship', global: true }, // id reference list
    'aria-level': { type: 'widget' }, // integer (1 or +)
    'aria-live': { type: 'live region', global: true, default: 'off', values: ['assertive', 'off', 'polite'] },
    'aria-modal': { type: 'widget', default: 'false', values: ['false', 'true'] },
    'aria-multiline': { type: 'widget', default: 'false', values: ['false', 'true'] },
    'aria-multiselectable': { type: 'widget', default: 'false', values: ['false', 'true'] },
    'aria-orientation': { type: 'widget', default: 'undefined', values: ['horizontal', 'undefined', 'vertical'] },
    'aria-owns': { type: 'relationship', global: true }, // id reference list
    'aria-placeholder': { type: 'widget' }, // string
    'aria-posinset': { type: 'relationship' }, // integer
    'aria-pressed': { type: 'widget', default: 'undefined', values: ['false', 'mixed', 'true', 'undefined'] },
    'aria-readonly': { type: 'widget', default: 'false', values: ['false', 'true'] },
    'aria-relevant': { type: 'live region', global: true, values: ['additions', 'all', 'removals', 'text'], tokenlist: true },
    'aria-required': { type: 'widget', default: 'false', values: ['false', 'true'] },
    'aria-roledescription': { global: true }, // string
    'aria-rowcount': { type: 'relationship' }, // integer
    'aria-rowindex': { type: 'relationship' }, // integer
    'aria-rowspan': { type: 'relationship' }, // integer
    'aria-selected': { type: 'widget', default: 'undefined', values: ['false', 'true', 'undefined'] },
    'aria-setsize': { type: 'relationship' }, // integer
    'aria-sort': { type: 'widget', default: 'none', values: ['ascending', 'descending', 'other', 'none'] },
    'aria-valuemax': { type: 'widget' }, // number
    'aria-valuemin': { type: 'widget' }, // number
    'aria-valuenow': { type: 'widget' }, // number
    'aria-valuetext': { type: 'widget' } // string
};

var ariaData = {
    version: 1.2,
    status: 'Working Draft (WD)',
    date: 20191218,
    url: {
        rolesCategorization: 'https://www.w3.org/TR/wai-aria-1.2/#{{category}}',
        attributesCategorization: 'https://www.w3.org/TR/wai-aria-1.2/#{{category}}',
        roles: 'https://www.w3.org/TR/wai-aria-1.2/#{{role}}',
        properties: 'https://www.w3.org/TR/wai-aria-1.2/#{{property}}',
        states: 'https://www.w3.org/TR/wai-aria-1.2/#{{state}}'
    },
    rolesCategorization: {
        'abstract roles': { id: 'abstract_roles', name: 'Abstract Roles' },
        'widget roles': { id: 'widget_roles', name: 'Widget Roles' },
        'document structure roles': { id: 'document_structure_roles', name: 'Document Structure Roles' },
        'landmark roles': { id: 'landmark_roles', name: 'Landmark Roles' },
        'live region roles': { id: 'live_region_roles', name: 'Live Region Roles' },
        'window roles': { id: 'window_roles', name: 'Window Roles' }
    },
    attributesCategorization: {
        'widget attributes': { id: 'attrs_widgets', name: 'Widget Attributes' },
        'live region attributes': { id: 'attrs_liveregions', name: 'Live Region Attributes' },
        'drag-and-drop attributes': { id: 'attrs_dragdrop', name: 'Drag-and-Drop Attributes' },
        'relationship attributes': { id: 'attrs_relationships', name: 'Relationship Attributes' }
    },
    roles: {
        'alert': {
            category: 'live region roles',
            description: 'A type of live region with important, and usually time-sensitive, information. See related alertdialog and status.',
            superclassRoles: 'section',
            subclassRoles: 'alertdialog',
            nameFrom: 'author',
            implicitValueForRole: [{ 'aria-live': 'assertive', 'aria-atomic': 'true' }]
        },
        'alertdialog': {
            category: 'window roles',
            description: 'A type of dialog that contains an alert message, where initial focus goes to an element within the dialog. See related alert and dialog.',
            superclassRoles: ['alert', 'dialog'],
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'application': {
            category: 'document structure roles',
            description: 'A structure containing one or more focusable elements requiring user input, such as keyboard or gesture events, that do not follow a standard interaction pattern supported by a widget role.',
            superclassRoles: 'structure',
            supportedStatesProperties: ['aria-activedescendant', 'aria-disabled', 'aria-errormessage', 'aria-expanded', 'aria-haspopup', 'aria-invalid'],
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'article': {
            category: 'document structure roles',
            description: 'A section of a page that consists of a composition that forms an independent part of a document, page, or site.',
            superclassRoles: 'document',
            relatedHTMLConcepts: '<article>',
            suportedStatesProperties: ['aria-posinset', 'aria-setsize'],
            nameFrom: 'author'
        },
        'banner': {
            category: 'landmark roles',
            description: 'A landmark that contains mostly site-oriented content, rather than page-specific content.',
            superclassRoles: 'landmark',
            nameFrom: 'author'
        },
        'blockquote': {
            category: 'document structure roles',
            description: 'A section of content that is quoted from another source.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<blockquote>',
            nameFrom: 'author'
        },
        'button': {
            category: 'widget roles',
            description: 'An input that allows for user-triggered actions when clicked or pressed. See related link.',
            superclassRoles: 'command',
            baseHTMLConcept: '<button>',
            relatedConcepts: 'link',
            supportedStatesProperties: ['aria-disabled', 'aria-haspopup', 'aria-expanded', 'aria-pressed'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'caption': {
            category: 'document structure roles',
            description: 'Visible content that names, and may also describe, a figure, table, or grid.',
            superclassRoles: 'section',
            relatedHTMLConcepts: ['<caption>', '<figcaption>'],
            requiredContextRole: ['figure', 'grid', 'table'],
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'cell': {
            category: 'document structure roles',
            description: 'A cell in a tabular container. See related gridcell.',
            superclassRoles: 'section',
            subclassRoles: ['columnheader', 'gridcell', 'rowheader'],
            baseHTMLConcept: '<td>',
            requiredContextRole: 'row',
            supportedStatesProperties: ['aria-colindex', 'aria-colspan', 'aria-rowindex', 'aria-rowspan'],
            nameFrom: ['contents', 'author']
        },
        'checkbox': {
            category: 'widget roles',
            description: 'A checkable input that has three possible values: true, false, or mixed.',
            superclassRoles: 'input',
            subclassRoles: ['menuitemcheckbox', 'switch'],
            relatedHTMLConcepts: '<input type="checkbox">',
            relatedConcepts: 'option',
            requiredStatesProperties: ['aria-checked'],
            supportedStatesProperties: ['aria-errormessage', 'aria-expanded', 'aria-invalid', 'aria-readonly', 'aria-required'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'code': {
            category: 'document structure roles',
            description: 'A section whose content represents a fragment of computer code.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<code>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'columnheader': {
            category: 'document structure roles',
            description: 'A cell containing header information for a column.',
            superclassRoles: ['cell', 'gridcell', 'sectionhead'],
            baseHTMLConcept: '<th scope="col">',
            requiredContextRole: 'row',
            supportedStatesProperties: ['aria-sort'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true
        },
        'combobox': {
            category: 'widget roles',
            description: 'An input that controls another element, such as a listbox or grid, that can dynamically pop up to help the user set the value of the input.',
            superclassRoles: 'input',
            relatedHTMLConcepts: '<select>',
            requiredStatesProperties: ['aria-controls', 'aria-expanded'],
            supportedStatesProperties: ['aria-activedescendant', 'aria-autocomplete', 'aria-errormessage', 'aria-haspopup', 'aria-invalid', 'aria-readonly', 'aria-required'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            implicitValueForRole: [{ 'aria-expanded': 'false' }, { 'aria-haspopup': 'listbox' }]
        },
        'command': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A form of widget that performs an action but does not receive input data.',
            superclassRoles: 'widget',
            subclassRoles: ['button', 'link', 'menuitem'],
            relatedHTMLConcepts: '<menuitem>',
            nameFrom: 'author'
        },
        'complementary': {
            category: 'landmark roles',
            description: 'A landmark that is designed to be complementary to the main content at a similar level in the DOM hierarchy, but remaining meaningful when separated from the main content.',
            superclassRoles: 'landmark',
            nameFrom: 'author'
        },
        'composite': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A widget that may contain navigable descendants or owned children.',
            superclassRoles: 'widget',
            subclassRoles: ['grid', 'select', 'spinbutton', 'tablist'],
            supportedStatesProperties: ['aria-activedescendant', 'aria-disabled'],
            nameFrom: 'author'
        },
        'contentinfo': {
            category: 'landmark roles',
            description: 'A landmark that contains information about the parent document.',
            superclassRoles: 'landmark',
            nameFrom: 'author'
        },
        'definition': {
            category: 'document structure roles',
            description: 'A definition of a term or concept. See related term.',
            superclassRoles: 'section',
            nameFrom: 'author'
        },
        'deletion': {
            category: 'document structure',
            description: 'A deletion contains content that is marked as removed or content that is being suggested for removal. See related insertion.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<del>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'dialog': {
            category: 'live region roles',
            description: 'A dialog is a descendant window of the primary window of a web application. For HTML pages, the primary application window is the entire web document, i.e., the body element.',
            superclassRoles: 'window',
            subclassRoles: 'alertdialog',
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'directory': {
            isDeprecated: true,
            category: 'document structure roles',
            description: 'A list of references to members of a group, such as a static table of contents.',
            superclassRoles: 'list',
            nameFrom: 'author'
        },
        'document': {
            category: 'document structure roles',
            description: 'An element containing content that assistive technology users may want to browse in a reading mode.',
            superclassRoles: 'structure',
            subclassRoles: 'article',
            nameFrom: 'author',
            accessibleNameRequired: false
        },
        'emphasis': {
            category: 'document structure',
            description: 'One or more emphasized characters. See related strong.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<em>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'feed': {
            category: 'document structure roles',
            description: 'A scrollable list of articles where scrolling may cause articles to be added to or removed from either end of the list.',
            superclassRoles: 'list',
            requiredOwnedElements: 'article',
            nameFrom: 'author',
            accessibleNameRequired: false
        },
        'figure': {
            category: 'document structure roles',
            description: 'A perceivable section of content that typically contains a graphical document, images, code snippets, or example text. The parts of a figure MAY be user-navigable.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<figure>',
            nameFrom: 'author',
            accessibleNameRequired: false
        },
        'form': {
            category: 'landmark roles',
            description: 'A landmark region that contains a collection of items and objects that, as a whole, combine to create a form. See related search.',
            superclassRoles: 'landmark',
            baseHTMLConcept: '<form>',
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'generic': {
            category: 'document structure',
            description: 'A nameless container element that has no semantic meaning on its own.',
            superclassRoles: 'structure',
            relatedHTMLConcepts: ['<div>', '<span>'],
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'grid': {
            category: 'widget roles',
            description: 'A composite widget containing a collection of one or more rows with one or more cells where some or all cells in the grid are focusable by using methods of two-dimensional navigation, such as directional arrow keys.',
            superclassRoles: ['composite', 'table'],
            subclassRoles: 'treegrid',
            baseHTMLConcept: '<table>',
            requiredOwnedElements: ['row', 'rowgroup > row'],
            supportedStatesProperties: ['aria-multiselectable', 'aria-readonly'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            focusable: true
        },
        'gridcell': {
            category: 'widget roles',
            description: 'A cell in a grid or treegrid.',
            superclassRoles: ['cell', 'widget'],
            subclassRoles: ['columnheader', 'rowheader'],
            baseHTMLConcept: '<td>',
            requiredContextRole: 'row',
            supportedStatesProperties: ['aria-disabled', 'aria-errormessage', 'aria-expanded', 'aria-haspopup', 'aria-invalid', 'aria-readonly', 'aria-required', 'aria-selected'],
            nameFrom: ['contents', 'author']
        },
        'group': {
            category: 'document structure roles',
            description: 'A set of user interface objects that is not intended to be included in a page summary or table of contents by assistive technologies.',
            superclassRoles: 'section',
            subclassRoles: ['row', 'select', 'toolbar'],
            relatedHTMLConcepts: '<fieldset>',
            supportedStatesProperties: ['aria-activedescendant', 'aria-disabled'],
            nameFrom: 'author'
        },
        'heading': {
            category: 'document structure roles',
            description: 'A heading for a section of the page.',
            superclassRoles: 'sectionhead',
            relatedHTMLConcepts: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            requiredStatesProperties: ['aria-level'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            implicitValueForRole: [{ 'aria-level': '2' }]
        },
        'img': {
            category: 'document structure roles',
            description: 'A container for a collection of elements that form an image.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<img>',
            nameFrom: 'author',
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'input': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A generic type of widget that allows user input.',
            superclassRoles: 'widget',
            subclassRoles: ['checkbox', 'combobox', 'option', 'radio', 'slider', 'spinbutton', 'textbox'],
            supportedStatesProperties: 'aria-disabled',
            nameFrom: 'author'
        },
        'insertion': {
            category: 'document structure',
            description: 'An insertion contains content that is marked as added or content that is being suggested for addition. See related deletion.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<ins>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'landmark': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A perceivable section containing content that is relevant to a specific, author-specified purpose and sufficiently important that users will likely want to be able to navigate to the section easily and to have it listed in a summary of the page. Such a page summary could be generated dynamically by a user agent or assistive technology.',
            superclassRoles: 'section',
            subclassRoles: ['banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'region', 'search'],
            nameFrom: 'author',
            accessibleNameRequired: false
        },
        'link': {
            category: 'widget roles',
            description: 'An interactive reference to an internal or external resource that, when activated, causes the user agent to navigate to that resource. See related button.',
            superclassRoles: 'command',
            relatedHTMLConcepts: ['<a>', '<link>'],
            supportedStatesProperties: ['aria-disabled', 'aria-expanded'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true
        },
        'list': {
            category: 'document structure roles',
            description: 'A section containing listitem elements. See related listbox.',
            superclassRoles: 'section',
            subclassRoles: ['directory', 'feed'],
            baseHTMLConcept: ['<ol>', '<ul>'],
            requiredOwnedElements: 'listitem',
            nameFrom: 'author'
        },
        'listbox': {
            category: 'widget roles',
            description: 'A widget that allows the user to select one or more items from a list of choices. See related combobox and list.',
            superclassRoles: 'select',
            relatedHTMLConcepts: '<select>',
            relatedConcepts: 'list',
            requiredOwnedElements: ['group > option', 'option'],
            supportedStatesProperties: ['aria-errormessage', 'aria-expanded', 'aria-invalid', 'aria-multiselectable', 'aria-readonly', 'aria-required'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            implicitValueForRole: [{ 'aria-orientation': 'vertical' }],
            focusable: true
        },
        'listitem': {
            category: 'document structure roles',
            description: 'A single item in a list or directory.',
            superclassRoles: 'section',
            subclassRoles: 'treeitem',
            baseHTMLConcept: '<li>',
            requiredContextRole: ['directory', 'list'],
            supportedStatesProperties: ['aria-level', 'aria-posinset', 'aria-setsize'],
            nameFrom: 'author'
        },
        'log': {
            category: 'live region roles',
            description: 'A type of live region where new information is added in meaningful order and old information may disappear. See related marquee.',
            superclassRoles: 'section',
            nameFrom: 'author',
            implicitValueForRole: [{ 'aria-live': 'polite' }]
        },
        'main': {
            category: 'landmark roles',
            description: 'A landmark containing the main content of a document.',
            superclassRoles: 'landmark',
            nameFrom: 'author'
        },
        'marquee': {
            category: 'live region roles',
            description: 'A type of live region where non-essential information changes frequently. See related log.',
            superclassRoles: 'section',
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'math': {
            category: 'document structure roles',
            description: 'Content that represents a mathematical expression.',
            superclassRoles: 'section',
            nameFrom: 'author',
            childrenPresentational: false
        },
        'menu': {
            category: 'widget roles',
            description: 'A type of widget that offers a list of choices to the user.',
            superclassRoles: 'select',
            subclassRoles: 'menubar',
            relatedConcepts: 'list',
            requiredOwnedElements: ['group > menuitem', 'group > menuitemradio', 'group > menuitemcheckbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio'],
            nameFrom: 'author',
            implicitValueForRole: [{ 'aria-orientation': 'vertical' }],
            focusable: true
        },
        'menubar': {
            category: 'widget roles',
            description: 'A presentation of menu that usually remains visible and is usually presented horizontally.',
            superclassRoles: 'menu',
            subclassRoles: 'toolbar',
            requiredOwnedElements: ['group > menuitem', 'group > menuitemradio', 'group > menuitemcheckbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio'],
            nameFrom: 'author',
            implicitValueForRole: [{ 'aria-orientation': 'horizontal' }],
            focusable: true
        },
        'menuitem': {
            category: 'widget roles',
            description: 'An option in a set of choices contained by a menu or menubar.',
            superclassRoles: 'command',
            subclassRoles: 'menuitemcheckbox',
            relatedHTMLConcepts: '<menuitem>',
            relatedConcepts: ['listitem', 'option'],
            requiredContextRole: ['group', 'menu', 'menubar'],
            supportedStatesProperties: ['aria-disabled', 'aria-expanded', 'aria-haspopup', 'aria-posinset', 'aria-setsize'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true
        },
        'menuitemcheckbox': {
            category: 'widget roles',
            description: 'A menuitem with a checkable state whose possible values are true, false, or mixed.',
            superclassRoles: ['checkbox', 'menuitem'],
            subclassRoles: 'menuitemradio',
            relatedConcepts: 'menuitem',
            requiredContextRole: ['group', 'menu', 'menubar'],
            requiredStatesProperties: ['aria-checked'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'menuitemradio': {
            category: 'widget roles',
            description: 'A checkable menuitem in a set of elements with the same role, only one of which can be checked at a time.',
            superclassRoles: ['menuitemcheckbox', 'radio'],
            relatedConcepts: 'menuitem',
            requiredContextRole: ['group', 'menu', 'menubar'],
            requiredStatesProperties: ['aria-checked'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'meter': {
            category: 'document structure',
            description: 'An element that represents a scalar measurement within a known range, or a fractional value. See related progressbar.',
            superclassRoles: 'range',
            relatedHTMLConcepts: '<meter>',
            requiredStatesProperties: ['aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'navigation': {
            category: 'landmark roles',
            description: 'A landmark containing a collection of navigational elements (usually links) for navigating the document or related documents.',
            superclassRoles: 'landmark',
            relatedHTMLConcepts: '<nav>',
            nameFrom: 'author'
        },
        'none': {
            category: 'document structure roles',
            description: 'An element whose implicit native role semantics will not be mapped to the accessibility API. See synonym presentation.',
            superclassRoles: 'structure',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited',
            synonym: 'presentation'
        },
        'note': {
            category: 'document structure roles',
            description: 'A section whose content is parenthetic or ancillary to the main content of the resource.',
            superclassRoles: 'section',
            nameFrom: 'author'
        },
        'option': {
            category: 'widget roles',
            description: 'A selectable item in a listbox.',
            superclassRoles: 'input',
            subclassRoles: 'treeitem',
            baseHTMLConcept: '<option>',
            relatedConcepts: 'listitem',
            requiredContextRole: ['group', 'listbox'],
            requiredStatesProperties: ['aria-selected'],
            supportedStatesProperties: ['aria-checked', 'aria-posinset', 'aria-setsize'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            childrenPresentational: true,
            implicitValueForRole: [{ 'aria-selected': 'false' }]
        },
        'paragraph': {
            category: 'document structure roles',
            description: 'A paragraph of content.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<p>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'presentation': {
            category: 'document structure roles',
            description: 'An element whose implicit native role semantics will not be mapped to the accessibility API. See synonym none.',
            superclassRoles: 'structure',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited',
            synonym: 'none'
        },
        'progressbar': {
            category: 'widget roles',
            description: 'An element that displays the progress status for tasks that take a long time.',
            superclassRoles: ['range', 'widget'],
            relatedConcepts: 'status',
            nameFrom: 'author',
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'radio': {
            category: 'widget roles',
            description: 'A checkable input in a group of elements with the same role, only one of which can be checked at a time.',
            superclassRoles: 'input',
            subclassRoles: 'menuitemradio',
            relatedHTMLConcepts: '<input type="radio">',
            requiredStatesProperties: ['aria-checked'],
            supportedStatesProperties: ['aria-posinset', 'aria-setsize'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'radiogroup': {
            category: 'widget roles',
            description: 'A group of radio buttons.',
            superclassRoles: 'select',
            relatedConcepts: 'list',
            requiredOwnedElements: 'radio',
            supportedStatesProperties: ['aria-errormessage', 'aria-invalid', 'aria-readonly', 'aria-required'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            focusable: true
        },
        'range': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'An element representing a range of values.',
            superclassRoles: 'structure',
            subclassRoles: ['meter', 'progressbar', 'scrollbar', 'slider', 'spinbutton'],
            supportedStatesProperties: ['aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext'],
            nameFrom: 'author',
            comment: 'Seems incorrectly categorized as structure in ARIA 1.2. See Class Diagram (range is associated with widget).'
        },
        'region': {
            category: 'landmark roles',
            description: 'A landmark containing content that is relevant to a specific, author-specified purpose and sufficiently important that users will likely want to be able to navigate to the section easily and to have it listed in a summary of the page. Such a page summary could be generated dynamically by a user agent or assistive technology.',
            superclassRoles: 'landmark',
            relatedConcepts: 'section',
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'roletype': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'The base role from which all other roles inherit.',
            subclassRoles: ['structure', 'widget', 'window'],
            supportedStatesProperties: ['aria-atomic', 'aria-busy', 'aria-controls', 'aria-current', 'aria-describedby', 'aria-details', 'aria-dropeffect', 'aria-flowto', 'aria-grabbed', 'aria-hidden', 'aria-keyshortcuts', 'aria-label', 'aria-labelledby', 'aria-live', 'aria-owns', 'aria-relevant', 'aria-roledescription']
        },
        'row': {
            category: 'document structure roles',
            description: 'A row of cells in a tabular container.',
            superclassRoles: ['group', 'widget'],
            baseHTMLConcept: '<tr>',
            requiredContextRole: ['grid', 'rowgroup', 'table', 'treegrid'],
            requiredOwnedElements: ['cell', 'columnheader', 'gridcell', 'rowheader'],
            supportedStatesProperties: ['aria-colindex', 'aria-expanded', 'aria-level', 'aria-posinset', 'aria-rowindex', 'aria-setsize', 'aria-selected'],
            nameFrom: ['contents', 'author']
        },
        'rowgroup': {
            category: 'document structure roles',
            description: 'A structure containing one or more row elements in a tabular container.',
            superclassRoles: 'structure',
            baseHTMLConcept: ['<tbody>', '<tfoot>', '<thead>'],
            requiredContextRole: ['grid', 'table', 'treegrid'],
            requiredOwnedElements: 'row',
            nameFrom: ['contents', 'author']
        },
        'rowheader': {
            category: 'document structure roles',
            description: 'A cell containing header information for a row.',
            superclassRoles: ['cell', 'gridcell', 'sectionhead'],
            baseHTMLConcept: '<th scope="row">',
            requiredContextRole: 'row',
            supportedStatesProperties: ['aria-expanded', 'aria-sort'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true
        },
        'scrollbar': {
            category: 'widget roles',
            description: 'A graphical object that controls the scrolling of content within a viewing area, regardless of whether the content is fully displayed within the viewing area.',
            superclassRoles: ['range', 'widget'],
            requiredStatesProperties: ['aria-controls', 'aria-valuenow'],
            supportedStatesProperties: ['aria-disabled', 'aria-orientation', 'aria-valuemax', 'aria-valuemin'],
            nameFrom: 'author',
            accessibleNameRequired: false,
            childrenPresentational: true,
            implicitValueForRole: [{ 'aria-orientation': 'vertical' }, { 'aria-valuemin': '0' }, { 'aria-valuemax': '100' }]
        },
        'search': {
            category: 'landmark roles',
            description: 'A landmark region that contains a collection of items and objects that, as a whole, combine to create a search facility. See related form and searchbox.',
            superclassRoles: 'landmark',
            nameFrom: 'author'
        },
        'searchbox': {
            category: 'widget roles',
            description: 'A type of textbox intended for specifying search criteria. See related textbox and search.',
            superclassRoles: 'textbox',
            baseHTMLConcept: '<input type="search">',
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'section': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A renderable structural containment unit in a document or application.',
            superclassRoles: 'structure',
            subclassRoles: ['alert', 'blockquote', 'caption', 'cell', 'code', 'definition', 'deletion', 'emphasis', 'figure', 'group', 'img', 'insertion', 'landmark', 'list', 'listitem', 'log', 'marquee', 'math', 'note', 'paragraph', 'status', 'strong', 'subscript', 'superscript', 'table', 'tabpanel', 'term', 'time', 'tooltip']
        },
        'sectionhead': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A structure that labels or summarizes the topic of its related section.',
            superclassRoles: 'structure',
            subclassRoles: ['columnheader', 'heading', 'rowheader', 'tab'],
            nameFrom: ['contents', 'author']
        },
        'select': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A form widget that allows the user to make selections from a set of choices.',
            superclassRoles: ['composite', 'group'],
            subclassRoles: ['listbox', 'menu', 'radiogroup', 'tree'],
            supportedStatesProperties: 'aria-orientation',
            nameFrom: 'author'
        },
        'separator': {
            description: 'A divider that separates and distinguishes sections of content or groups of menuitems.',
            focusable: [
                {
                    category: 'document structure roles',
                    superclassRoles: 'structure',
                    relatedHTMLConcepts: '<hr>',
                    supportedStatesProperties: 'aria-orientation',
                    nameFrom: 'author',
                    childrenPresentational: true,
                    implicitValueForRole: [{ 'aria-orientation': 'horizontal' }]
                }, {
                    category: 'widget roles',
                    superclassRoles: 'widget',
                    requiredStatesProperties: ['aria-valuenow'],
                    supportedStatesProperties: ['aria-disabled', 'aria-orientation', 'aria-valuemax', 'aria-valuemin', 'aria-valuetext'],
                    nameFrom: 'author',
                    childrenPresentational: true,
                    implicitValueForRole: [{ 'aria-orientation': 'horizontal' }, { 'aria-valuemin': '0' }, { 'aria-valuemax': '100' }]
                }
            ]
        },
        'slider': {
            category: 'widget roles',
            description: 'An input where the user selects a value from within a given range.',
            superclassRoles: ['input', 'range'],
            requiredStatesProperties: ['aria-valuenow'],
            supportedStatesProperties: ['aria-errormessage', 'aria-haspopup', 'aria-invalid', 'aria-orientation', 'aria-readonly', 'aria-valuemax', 'aria-valuemin'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            childrenPresentational: true,
            implicitValueForRole: [{ 'aria-orientation': 'horizontal' }, { 'aria-valuemin': '0' }, { 'aria-valuemax': '100' }]
        },
        'spinbutton': {
            category: 'widget roles',
            description: 'A form of range that expects the user to select from among discrete choices.',
            superclassRoles: ['composite', 'input', 'range'],
            supportedStatesProperties: ['aria-errormessage', 'aria-invalid', 'aria-readonly', 'aria-required', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            implicitValueForRole: [{ 'aria-valuenow': '0' }]
        },
        'status': {
            category: 'live region roles',
            description: 'A type of live region whose content is advisory information for the user but is not important enough to justify an alert, often but not necessarily presented as a status bar.',
            superclassRoles: 'section',
            subclassRoles: ['progressbar', 'timer'],
            nameFrom: 'author',
            implicitValueForRole: [{ 'aria-live': 'polite' }, { 'aria-atomic': 'true' }]
        },
        'strong': {
            category: 'document structure',
            description: 'Content which is important, serious, or urgent. See related emphasis.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<strong>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'structure': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A document structural element.',
            superclassRoles: 'roletype',
            subclassRoles: ['application', 'document', 'generic', 'presentation', 'range', 'rowgroup', 'section', 'sectionhead', 'separator']
        },
        'subscript': {
            category: 'document structure',
            description: 'One or more subscripted characters. See related superscript.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<sub>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'superscript': {
            category: 'document structure',
            description: 'One or more superscripted characters. See related subscript.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<sup>',
            prohibitedStatesProperties: ['aria-label', 'aria-labelledby'],
            nameFrom: 'prohibited'
        },
        'switch': {
            category: 'widget roles',
            description: 'A type of checkbox that represents on/off values, as opposed to checked/unchecked values. See related checkbox.',
            superclassRoles: 'checkbox',
            relatedConcepts: 'button',
            requiredStatesProperties: ['aria-checked'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true,
            childrenPresentational: true
        },
        'tab': {
            category: 'widget roles',
            description: 'A grouping label providing a mechanism for selecting the tab content that is to be rendered to the user.',
            superclassRoles: ['sectionhead', 'widget'],
            requiredContextRole: 'tablist',
            supportedStatesProperties: ['aria-disabled', 'aria-expanded', 'aria-haspopup', 'aria-posinset', 'aria-selected', 'aria-setsize'],
            nameFrom: ['contents', 'author'],
            childrenPresentational: true,
            implicitValueForRole: [{ 'aria-selected': 'false' }]
        },
        'table': {
            category: 'document structure roles',
            description: 'A section containing data arranged in rows and columns. See related grid.',
            superclassRoles: 'section',
            subclassRoles: 'grid',
            baseHTMLConcept: '<table>',
            requiredOwnedElements: ['row', 'rowgroup > row'],
            supportedStatesProperties: ['aria-colcount', 'aria-rowcount'],
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'tablist': {
            category: 'widget roles',
            description: 'A list of tab elements, which are references to tabpanel elements.',
            superclassRoles: 'composite',
            requiredOwnedElements: 'tab',
            supportedStatesProperties: ['aria-level', 'aria-multiselectable', 'aria-orientation'],
            nameFrom: 'author',
            implicitValueForRole: [{ 'aria-orientation': 'horizontal' }],
            focusable: true
        },
        'tabpanel': {
            category: 'widget roles',
            description: 'A container for the resources associated with a tab, where each tab is contained in a tablist.',
            superclassRoles: 'section',
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'term': {
            category: 'document structure roles',
            description: 'A word or phrase with a corresponding definition. See related definition.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<dfn>',
            nameFrom: 'author'
        },
        'textbox': {
            category: 'widget roles',
            description: 'A type of input that allows free-form text as its value.',
            superclassRoles: 'input',
            subclassRoles: 'searchbox',
            relatedHTMLConcepts: ['<textarea>', '<input type="text">'],
            supportedStatesProperties: ['aria-activedescendant', 'aria-autocomplete', 'aria-errormessage', 'aria-haspopup', 'aria-invalid', 'aria-multiline', 'aria-placeholder', 'aria-readonly', 'aria-required'],
            nameFrom: 'author',
            accessibleNameRequired: true
        },
        'time': {
            category: 'document structure',
            description: 'An element that represents a specific point in time.',
            superclassRoles: 'section',
            relatedHTMLConcepts: '<time>',
            nameFrom: 'author'
        },
        'timer': {
            category: 'live region roles',
            description: 'A type of live region containing a numerical counter which indicates an amount of elapsed time from a start point, or the time remaining until an end point.',
            superclassRoles: 'status',
            nameFrom: 'author'
        },
        'toolbar': {
            category: 'document structure roles',
            description: 'A collection of commonly used function buttons or controls represented in compact visual form.',
            superclassRoles: 'group',
            relatedConcepts: 'menubar',
            supportedStatesProperties: 'aria-orientation',
            nameFrom: 'author',
            implicitValueForRole: [{ 'aria-orientation': 'horizontal' }]
        },
        'tooltip': {
            category: 'document structure roles',
            description: 'A contextual popup that displays a description for an element.',
            superclassRoles: 'section',
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true
        },
        'tree': {
            category: 'widget roles',
            description: 'A widget that allows the user to select one or more items from a hierarchically organized collection.',
            superclassRoles: 'select',
            subclassRoles: 'treegrid',
            requiredOwnedElements: ['group > treeitem', 'treeitem'],
            supportedStatesProperties: ['aria-errormessage', 'aria-invalid', 'aria-multiselectable', 'aria-required'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            implicitValueForRole: [{ 'aria-orientation': 'vertical' }],
            focusable: true
        },
        'treegrid': {
            category: 'widget roles',
            description: 'A grid whose rows can be expanded and collapsed in the same manner as for a tree.',
            superclassRoles: ['grid', 'tree'],
            requiredOwnedElements: ['row', 'rowgroup > row'],
            nameFrom: 'author',
            accessibleNameRequired: true,
            focusable: true
        },
        'treeitem': {
            category: 'widget roles',
            description: 'An option item of a tree. This is an element within a tree that may be expanded or collapsed if it contains a sub-level group of tree item elements.',
            superclassRoles: ['listitem', 'option'],
            requiredContextRole: ['group', 'tree'],
            requiredStatesProperties: ['aria-selected'],
            supportedStatesProperties: ['aria-expanded', 'aria-haspopup'],
            nameFrom: ['contents', 'author'],
            accessibleNameRequired: true
        },
        'widget': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'An interactive component of a graphical user interface (GUI).',
            superclassRoles: 'roletype',
            subclassRoles: ['command', 'composite', 'gridcell', 'input', 'progressbar', 'row', 'scrollbar', 'separator', 'tab']
        },
        'window': {
            isAbstract: true,
            category: 'abstract roles',
            description: 'A browser or application window.',
            superclassRoles: 'roletype',
            subclassRoles: 'dialog',
            supportedStatesProperties: 'aria-modal',
            nameFrom: 'author'
        }
    },
    properties: {
        'aria-activedescendant': {
            category: 'relationship attributes',
            description: 'Identifies the currently active element when DOM focus is on a composite widget, combobox, textbox, group, or application.',
            usedInRoles: ['application', 'combobox', 'composite', 'group', 'textbox'],
            inheritsIntoRoles: ['grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'row', 'searchbox', 'select', 'spinbutton', 'tablist', 'toolbar', 'tree', 'treegrid'],
            value: { attribute: 'id' }
        },
        'aria-atomic': {
            global: true,
            category: 'live region attributes',
            description: 'Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute.',
            usedInRoles: '*',
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-autocomplete': {
            category: 'widget attributes',
            description: "Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for a combobox, searchbox, or textbox and specifies how predictions would be presented if they were made.",
            usedInRoles: ['combobox', 'textbox'],
            inheritsIntoRoles: 'searchbox',
            defaultValue: 'none',
            value: ['inline', 'list', 'both', 'none']
        },
        'aria-colcount': {
            category: 'relationship attributes',
            description: 'Defines the total number of columns in a table, grid, or treegrid. See related aria-colindex.',
            usedInRoles: ['table'],
            inheritsIntoRoles: ['grid', 'treegrid'],
            value: { type: 'integer' }
        },
        'aria-colindex': {
            category: 'relationship attributes',
            description: "Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid. See related aria-colcount and aria-colspan.",
            usedInRoles: ['cell', 'row'],
            inheritsIntoRoles: ['columnheader', 'gridcell', 'rowheader'],
            value: { type: 'integer' }
        },
        'aria-colspan': {
            category: 'relationship attributes',
            description: 'Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid. See related aria-colindex and aria-rowspan.',
            usedInRoles: ['cell'],
            inheritsIntoRoles: ['columnheader', 'gridcell', 'rowheader'],
            value: { type: 'integer' }
        },
        'aria-controls': {
            global: true,
            category: 'relationship attributes',
            description: 'Identifies the element (or elements) whose contents or presence are controlled by the current element. See related aria-owns.',
            usedInRoles: '*',
            value: { attribute: 'id', multiple: true }
        },
        'aria-describedby': {
            global: true,
            category: 'relationship attributes',
            description: 'Identifies the element (or elements) that describes the object. See related aria-labelledby.',
            relatedHTMLConcepts: ['<label>', '<th headers="id">', '<th scope="col">', '<th scope="row">', '<td headers="id">'],
            usedInRoles: '*',
            value: { attribute: 'id', multiple: true }
        },
        'aria-details': {
            global: true,
            category: 'relationship attributes',
            description: 'Identifies the element that provides a detailed, extended description for the object. See related aria-describedby.',
            usedInRoles: '*',
            value: { attribute: 'id' }
        },
        'aria-dropeffect': {
            isDeprecated: true,
            global: true,
            category: 'drag-an-drop attributes',
            description: 'Indicates what functions can be performed when a dragged object is released on the drop target.',
            usedInRoles: '*',
            defaultValue: 'none',
            multipleValues: true,
            value: ['copy', 'execute', 'link', 'move', 'none', 'popup']
        },
        'aria-errormessage': {
            category: ['widget attributes', 'relationship attributes'],
            description: 'Identifies the element that provides an error message for an object. See related aria-invalid and aria-describedby.',
            usedInRoles: ['application', 'checkbox', 'combobox', 'gridcell', 'listbox', 'radiogroup', 'slider', 'spinbutton', 'textbox', 'tree'],
            inheritsIntoRoles: ['columnheader', 'menuitemcheckbox', 'menuitemradio', 'rowheader', 'searchbox', 'switch', 'treegrid'],
            value: { attribute: 'id' }
        },
        'aria-flowto': {
            global: true,
            category: 'relationship attributes',
            description: "Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion, allows assistive technology to override the general default of reading in document source order.",
            usedInRoles: '*',
            value: { attribute: 'id', multiple: true }
        },
        'aria-haspopup': {
            category: 'widget attributes',
            description: 'Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element.',
            relatedConcepts: 'aria-controls',
            usedInRoles: ['application', 'button', 'combobox', 'gridcell', 'link', 'menuitem', 'slider', 'tab', 'textbox', 'treeitem'],
            inheritsIntoRoles: ['columnheader', 'menuitemcheckbox', 'menuitemradio', 'rowheader', 'searchbox'],
            defaultValue: 'false',
            value: ['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog']
        },
        'aria-keyshortcuts': {
            global: true,
            description: 'Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element.',
            usedInRoles: '*',
            value: { type: 'string' }
        },
        'aria-label': {
            global: true,
            translatable: true,
            category: 'widget attributes',
            description: 'Defines a string value that labels the current element. See related aria-labelledby.',
            relatedHTMLConcepts: '@title',
            usedInRoles: '*',
            value: { type: 'string' }
        },
        'aria-labelledby': {
            global: true,
            category: 'relationship attributes',
            description: 'Identifies the element (or elements) that labels the current element. See related aria-describedby.',
            relatedHTMLConcepts: '<label>',
            usedInRoles: '*',
            value: { attribute: 'id', multiple: true }
        },
        'aria-level': {
            category: 'widget attributes',
            description: 'Defines the hierarchical level of an element within a structure.',
            usedInRoles: ['heading', 'listitem', 'row', 'tablist'],
            inheritsIntoRoles: 'treeitem',
            value: { type: 'integer', min: 1 }
        },
        'aria-live': {
            global: true,
            category: 'live region attributes',
            description: 'Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region.',
            usedInRoles: '*',
            defaultValue: 'off',
            value: ['assertive', 'polite', 'off']
        },
        'aria-modal': {
            category: 'widget attributes',
            description: 'Indicates whether an element is modal when displayed.',
            usedInRoles: ['window'],
            inheritsIntoRoles: ['alertdialog', 'dialog'],
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-multiline': {
            category: 'widget attributes',
            description: 'Indicates whether a text box accepts multiple lines of input or only a single line.',
            usedInRoles: ['textbox'],
            inheritsIntoRoles: 'searchbox',
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-multiselectable': {
            category: 'widget attributes',
            description: 'Indicates that the user may select more than one item from the current selectable descendants.',
            usedInRoles: ['grid', 'listbox', 'tablist', 'tree'],
            inheritsIntoRoles: 'treegrid',
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-orientation': {
            category: 'widget attributes',
            description: "Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous.",
            usedInRoles: ['scrollbar', 'select', 'separator', 'slider', 'tablist', 'toolbar'],
            inheritsIntoRoles: ['listbox', 'menu', 'menubar', 'radiogroup', 'tree', 'treegrid'],
            defaultValue: 'undefined',
            value: ['horizontal', 'vertical', 'undefined']
        },
        'aria-owns': {
            global: true,
            category: 'relationship attributes',
            usedInRoles: '*',
            value: { attribute: 'id', multiple: true }
        },
        'aria-placeholder': {
            translatable: true,
            category: 'widget attributes',
            description: 'Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value. A hint could be a sample value or a brief description of the expected format.',
            relatedHTMLConcepts: '@placeholder',
            usedInRoles: ['textbox'],
            inheritsIntoRoles: 'searchbox',
            value: { type: 'string' }
        },
        'aria-posinset': {
            category: 'relationship attributes',
            description: "Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-setsize.",
            usedInRoles: ['article', 'listitem', 'menuitem', 'option', 'radio', 'row', 'tab'],
            inheritsIntoRoles: ['menuitemcheckbox', 'menuitemradio', 'treeitem'],
            value: { type: 'integer', min: 1, max: 'aria-setsize' }
        },
        'aria-readonly': {
            category: 'widget attributes',
            description: 'Indicates that the element is not editable, but is otherwise operable. See related aria-disabled.',
            relatedHTMLConcepts: '@readonly',
            usedInRoles: ['checkbox', 'combobox', 'grid', 'gridcell', 'listbox', 'radiogroup', 'slider', 'spinbutton', 'textbox'],
            inheritsIntoRoles: ['columnheader', 'menuitemcheckbox', 'menuitemradio', 'rowheader', 'searchbox', 'switch', 'treegrid'],
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-relevant': {
            global: true,
            category: 'live region attributes',
            description: 'Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified. See related aria-atomic.',
            usedInRoles: '*',
            multipleValues: true,
            defaultValue: 'aditions text',
            value: ['all', 'additions', 'removals', 'text']
        },
        'aria-required': {
            category: 'widget attributes',
            description: 'Indicates that user input is required on the element before a form may be submitted.',
            relatedHTMLConcepts: '@required',
            usedInRoles: ['checkbox', 'combobox', 'gridcell', 'listbox', 'radiogroup', 'spinbutton', 'textbox', 'tree'],
            inheritsIntoRoles: ['columnheader', 'menuitemcheckbox', 'menuitemradio', 'rowheader', 'searchbox', 'switch', 'treegrid'],
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-roledescription': {
            global: true,
            translatable: true,
            description: 'Defines a human-readable, author-localized description for the role of an element.',
            usedInRoles: '*',
            value: { type: 'string' }
        },
        'aria-rowcount': {
            category: 'relationship attributes',
            description: 'Defines the total number of rows in a table, grid, or treegrid. See related aria-rowindex.',
            usedInRoles: ['table'],
            inheritsIntoRoles: ['grid', 'treegrid'],
            value: { type: 'integer', unknown: -1 }
        },
        'aria-rowindex': {
            category: 'relationship attributes',
            description: "Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid. See related aria-rowcount and aria-rowspan.",
            usedInRoles: ['cell', 'row'],
            inheritsIntoRoles: ['columnheader', 'gridcell', 'rowheader'],
            value: { type: 'integer', min: 1 }
        },
        'aria-rowspan': {
            category: 'relationship attributes',
            description: 'Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid. See related aria-rowindex and aria-colspan.',
            usedInRoles: ['cell'],
            inheritsIntoRoles: ['columnheader', 'gridcell', 'rowheader'],
            value: { type: 'integer', min: 0 }
        },
        'aria-setsize': {
            category: 'relationship attributes',
            description: 'Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM. See related aria-posinset.',
            usedInRoles: ['article', 'listitem', 'menuitem', 'option', 'radio', 'row', 'tab'],
            inheritsIntoRoles: ['menuitemcheckbox', 'menuitemradio', 'treeitem'],
            value: { type: 'integer', unknown: -1 }
        },
        'aria-sort': {
            category: 'widget attributes',
            description: 'Indicates if items in a table or grid are sorted in ascending or descending order.',
            usedInRoles: ['columnheader', 'rowheader'],
            defaultValue: 'none',
            value: ['ascending', 'descending', 'other', 'none']
        },
        'aria-valuemax': {
            category: 'widget attributes',
            description: 'Defines the maximum allowed value for a range widget.',
            relatedHTMLConcepts: '<input type="range" max="number">',
            usedInRoles: ['meter', 'range', 'scrollbar', 'separator', 'slider', 'spinbutton'],
            inheritsIntoRoles: 'progressbar',
            value: { type: 'number' }
        },
        'aria-valuemin': {
            category: 'widget attributes',
            description: 'Defines the minimum allowed value for a range widget.',
            relatedHTMLConcepts: '<input type="range" min="number">',
            usedInRoles: ['meter', 'range', 'scrollbar', 'separator', 'slider', 'spinbutton'],
            inheritsIntoRoles: 'progressbar',
            value: { type: 'number' }
        },
        'aria-valuenow': {
            category: 'widget attributes',
            description: 'Defines the current value for a range widget. See related aria-valuetext.',
            relatedHTMLConcepts: '<input type="range" value="number">',
            usedInRoles: ['meter', 'range', 'scrollbar', 'separator', 'slider', 'spinbutton'],
            inheritsIntoRoles: 'progressbar',
            value: { type: 'number', min: 'aria-valuemin', max: 'aria-valuemax' }
        },
        'aria-valuetext': {
            translatable: true,
            category: 'widget attributes',
            description: 'Defines the human readable text alternative of aria-valuenow for a range widget.',
            usedInRoles: ['range', 'separator', 'spinbutton'],
            inheritsIntoRoles: ['meter', 'progressbar', 'scrollbar', 'slider'],
            value: { type: 'string' }
        }
    },
    states: {
        'aria-busy': {
            global: true,
            category: 'live region attributes',
            description: 'Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user.',
            usedInRoles: '*',
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-checked': {
            category: 'widget attributes',
            description: 'Indicates the current "checked" state of checkboxes, radio buttons, and other widgets. See related aria-pressed and aria-selected.',
            usedInRoles: ['checkbox', 'option', 'radio', 'switch'],
            inheritsIntoRoles: ['menuitemcheckbox', 'menuitemradio', 'treeitem'],
            defaultValue: 'undefined',
            value: ['true', 'mixed', 'false', 'undefined']
        },
        'aria-current': {
            global: true,
            description: 'Indicates the element that represents the current item within a container or set of related elements.',
            usedInRoles: '*',
            defaultValue: 'false',
            value: ['page', 'step', 'location', 'date', 'time', 'true', 'false']
        },
        'aria-disabled': {
            category: 'widget attributes',
            description: 'Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable. See related aria-hidden and aria-readonly.',
            usedInRoles: ['application', 'button', 'composite', 'gridcell', 'group', 'input', 'link', 'menuitem', 'scrollbar', 'separator', 'tab'],
            inheritsIntoRoles: ['checkbox', 'columnheader', 'combobox', 'grid', 'listbox', 'menu', 'menubar', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'radiogroup', 'row', 'rowheader', 'searchbox', 'select', 'slider', 'spinbutton', 'switch', 'tablist', 'textbox', 'toolbar', 'tree', 'treegrid', 'treeitem'],
            defaultValue: 'false',
            value: ['true', 'false']
        },
        'aria-expanded': {
            category: 'widget attributes',
            description: 'Indicates whether a grouping element owned or controlled by this element is expanded or collapsed.',
            usedInRoles: ['application', 'button', 'checkbox', 'combobox', 'gridcell', 'link', 'listbox', 'menuitem', 'row', 'rowheader', 'tab', 'treeitem'],
            inheritsIntoRoles: ['columnheader', 'menuitemcheckbox', 'menuitemradio', 'switch'],
            defaultValue: 'undefined',
            value: ['true', 'false', 'undefined']
        },
        'aria-grabbed': {
            isDeprecated: true,
            global: true,
            category: 'drag-an-drop attributes',
            description: 'Indicates an element\'s "grabbed" state in a drag-and-drop operation.',
            usedInRoles: '*',
            defaultValue: 'undefined',
            value: ['true', 'false', 'undefined']
        },
        'aria-hidden': {
            global: true,
            category: 'widget attributes',
            description: 'Indicates whether the element is exposed to an accessibility API. See related aria-disabled.',
            usedInRoles: '*',
            defaultValue: 'undefined',
            value: ['true', 'false', 'undefined']
        },
        'aria-invalid': {
            category: 'widget attributes',
            description: 'Indicates the entered value does not conform to the format expected by the application. See related aria-errormessage.',
            usedInRoles: ['application', 'checkbox', 'combobox', 'gridcell', 'listbox', 'radiogroup', 'slider', 'spinbutton', 'textbox', 'tree'],
            inheritsIntoRoles: ['columnheader', 'menuitemcheckbox', 'menuitemradio', 'rowheader', 'searchbox', 'switch', 'treegrid'],
            defaultValue: 'false',
            value: ['true', 'false', 'grammar', 'spelling']
        },
        'aria-pressed': {
            category: 'widget attributes',
            description: 'Indicates the current "pressed" state of toggle buttons. See related aria-checked and aria-selected.',
            usedInRoles: ['button'],
            defaultValue: 'undefined',
            value: ['true', 'mixed', 'false', 'undefined']
        },
        'aria-selected': {
            category: 'widget attributes',
            description: 'Indicates the current "selected" state of various widgets. See related aria-checked and aria-pressed.',
            usedInRoles: ['gridcell', 'option', 'row', 'tab'],
            inheritsIntoRoles: ['columnheader', 'rowheader', 'treeitem'],
            defaultValue: 'undefined',
            value: ['true', 'false', 'undefined']
        }
    }
};

var ARIA = {
    Errors: {
        EmptyValueNotAllowed: "La valeur de l'attribut {{attribute}} ne peut être vide.",
        InvalidStateProperty: "L'attribut {{attribute}} n'est pas défini dans WAI-ARIA.",
        IsNaN: "La valeur de l'attribut {{attribute}} n'est pas un nombre.",
        IsNotAnInteger: "La valeur de l'attribut {{attribute}} n'est pas un entier.",
        SingleValueSyntax: "La valeur de l'attribut {{attribute}} doit correspondre à une des valeurs définies ({{values}}).",
        SingleIdValueElement: "L'identifiant indiqué dans l'attribut {{attribute}} doit correspondre à un élément présent dans la page.",
        SingleIdValueSyntax: "La valeur de l'attribut {{attribute}} doit correspondre à un identifiant (sans aucun espace).",
        TokensValueSyntax: "La valeur de l'attribut {{attribute}} doit correspondre à une ou plusieurs des valeurs définies ({{values}}) séparées par des espaces.",
        TokensIdValueElements: "Au moins un identifiant indiqué dans l'attribut {{attribute}} ne correspond pas à un élément présent dans la page.",
        TokensIdValueSyntax: "La valeur de l'attribut {{attribute}} doit correspondre à une liste d'identifiants séparés par des espaces.",
        UnknownSingleValue: "La valeur de l'attribut {{attribute}} doit correspondre à une des valeurs définies ({{values}}).",
        UnknownTokensValue: "Au moins une composante de la valeur de l'attribut {{attribute}} ne correspond pas à une des valeurs définies ({{values}}).",
        ValueGreaterThanMax: "La valeur de l'attribut {{attribute}} ne peut être supérieure à {{max}}.",
        ValueLowerThanMin: "La valeur de l'attribut {{attribute}} ne peut être inférieure à {{min}}."
    },
    Role: function (role) {
        this.role = role;
        this.isAbstract = null;
        this.isValidResult = null;
        this.focusable = null;
        this.requiredContextRoles = null;
        this.statesProperties = null;
        this.prohibitedStatesProperties = null;
        this.isValid = function () {
            if (this.isValidResult == null) {
                this.isValidResult = ariaData.roles.hasOwnProperty(this.role);
                if (this.isValidResult) {
                    this.isAbstract = ariaData.roles[this.role].hasOwnProperty('isAbstract');
                }
            }
            var manageAbstract = null;
            if (arguments.length == 2 && arguments[1].constructor == Object) {
                manageAbstract = arguments[1].hasOwnProperty('ignoreAbstract');
                if (manageAbstract) {
                    manageAbstract = arguments[1].ignoreAbstract;
                }
            }
            if (manageAbstract == null) {
                manageAbstract = this.isAbstract ? false : true;
            }
            return this.isValidResult && manageAbstract;
        };
        this.setRequiredContextRoles = function () {
            if (this.requiredContextRoles == null) {
                this.requiredContextRoles = [];
                var roleData = ariaData.roles[this.role];
                if (roleData.hasOwnProperty('focusable') && roleData.focusable.constructor == Array) {
                    roleData = roleData.focusable[this.focusable == true ? 1 : 0];
                }
                if (roleData.hasOwnProperty('requiredContextRole')) {
                    for (var i = 0; i < roleData.requiredContextRole.length; i++) {
                        this.requiredContextRoles.push(new ARIA.Role(roleData.requiredContextRole[i], { getData: true }));
                    }
                }
            }
        };
        this.getRequiredContextRoles = function () {
            if (this.isValid({ ignoreAbstract: true })) {
                this.setRequiredContextRoles();
                return this.requiredContextRoles;
            }
            else {
                return undefined;
            }
        };
        this.setRequiredStatesProperties = function () {
            if (this.statesProperties == null) {
                this.statesProperties = [];
                var roleData = ariaData.roles[this.role];
                if (roleData.hasOwnProperty('focusable') && roleData.focusable.constructor == Array) {
                    roleData = roleData.focusable[this.focusable == true ? 1 : 0];
                }
                if (roleData.hasOwnProperty('requiredStatesProperties')) {
                    for (var i = 0; i < roleData.requiredStatesProperties.length; i++) {
                        this.statesProperties.push(new ARIA.StateProperty(roleData.requiredStatesProperties[i], { getData: true }));
                    }
                }
            }
        };
        this.getRequiredStatesProperties = function () {
            if (this.isValid({ ignoreAbstract: true })) {
                this.setRequiredStatesProperties();
                return this.statesProperties;
            }
            else {
                return undefined;
            }
        };
        this.setProhibitedStatesProperties = function () {
            if (this.prohibitedStatesProperties == null) {
                this.prohibitedStatesProperties = [];
                var roleData = ariaData.roles[this.role];
                if (roleData.hasOwnProperty('focusable') && roleData.focusable.constructor == Array) {
                    roleData = roleData.focusable[this.focusable == true ? 1 : 0];
                }
                if (roleData.hasOwnProperty('prohibitedStatesProperties')) {
                    for (var i = 0; i < roleData.prohibitedStatesProperties.length; i++) {
                        this.prohibitedStatesProperties.push(new ARIA.StateProperty(roleData.prohibitedStatesProperties[i], { getData: true }));
                    }
                }
            }
        };
        this.getProhibitedStatesProperties = function () {
            if (this.isValid({ ignoreAbstract: true })) {
                this.setProhibitedStatesProperties();
                return this.prohibitedStatesProperties;
            }
            else {
                return undefined;
            }
        };
        if (arguments.length == 2 && arguments[1].constructor == Object) {
            if (arguments[1].hasOwnProperty('focusable') && arguments[1].focusable) {
                this.focusable = arguments[1].focusable;
            }
            if (arguments[1].hasOwnProperty('getData') && this.isValid({ ignoreAbstract: true })) {
                this.setRequiredContextRoles();
                this.setRequiredStatesProperties();
                this.setProhibitedStatesProperties();
            }
        }
    },
    StateProperty: function (stateProperty) {
        this.stateProperty = stateProperty;
        this.usedInRoles = null;
        this.values = null;
        this.multipleValues = null;
        this.isValidResult = null;
        this.isValid = function () {
            if (this.isValidResult == null) {
                this.isValidResult = ariaData.properties.hasOwnProperty(this.stateProperty) || ariaData.states.hasOwnProperty(this.stateProperty);
            }
            return this.isValidResult;
        };
        this.isAllowedInRole = function (role) {
            if (this.isValid()) {
                var role = new ARIA.Role(role, { getData: true });
                var prohibitedStatesProperties = role.getProhibitedStatesProperties();
                return this.canBeUsedInRole(role.role) || (prohibitedStatesProperties && prohibitedStatesProperties.indexOf(this.stateProperty) > -1);
            }
            else {
                return undefined;
            }
        },
        this.setUsedInRoles = function () {
            if (this.usedInRoles == null) {
                var statePropertyData = ariaData.properties[this.stateProperty] || ariaData.states[this.stateProperty];
                this.usedInRoles = statePropertyData.usedInRoles;
            }
        };
        this.canBeUsedInRole = function (role) {
            if (this.isValid()) {
                this.setUsedInRoles();
                return this.usedInRoles == '*' || this.usedInRoles.includes(role);
            }
            else {
                return undefined;
            }
        };
        this.setValues = function () {
            if (this.values == null) {
                var statePropertyData = ariaData.properties[this.stateProperty] || ariaData.states[this.stateProperty];
                this.values = statePropertyData.value;
                this.multipleValues = statePropertyData.multipleValues;
            }
        };
        this.getValues = function () {
            if (this.values == null) {
                this.setValues();
            }
            return this.values;
        };
        this.isValidValue = function (value) {
            if (this.isValid()) {
                this.setValues();
                var result = false;
                var errors = [];
                if (value.trim().length > 0) {
                    if (this.values.constructor == Array) {
                        if (this.multipleValues) {
                            result = /^[a-z]+(\s[a-z]+)*$/.test(value);
                            if (result) {
                                value = value.split(' ');
                                value = value.filter(function (currentvalue) {
                                    return !this.values.includes(currentvalue);
                                }.bind(this));
                                result = value.length == 0;
                                if (!result) {
                                    var error = ARIA.Errors.UnknownTokensValue;
                                    error = error.replace('{{attribute}}', this.stateProperty);
                                    error = error.replace('{{values}}', this.values.join(' / '));
                                    errors.push(error);
                                }
                            }
                            else {
                                var error = ARIA.Errors.TokensValueSyntax;
                                error = error.replace('{{attribute}}', this.stateProperty);
                                error = error.replace('{{values}}', this.values.join(' / '));
                                errors.push(error);
                            }
                        }
                        else {
                            result = /^[a-z]+$/.test(value);
                            if (result) {
                                result = this.values.includes(value);
                                if (!result) {
                                    var error = ARIA.Errors.UnknownSingleValue;
                                    error = error.replace('{{attribute}}', this.stateProperty);
                                    error = error.replace('{{values}}', this.values.join(' / '));
                                    errors.push(error);
                                }
                            }
                            else {
                                var error = ARIA.Errors.SingleValueSyntax;
                                error = error.replace('{{attribute}}', this.stateProperty);
                                error = error.replace('{{values}}', this.values.join(' / '));
                                errors.push(error);
                            }
                        }
                    }
                    else if (this.values.hasOwnProperty('attribute') && this.values.attribute == 'id') {
                        if (this.values.multiple) {
                            result = /^\S+(\s\S+)*$/.test(value);
                            if (!result) {
                                var error = ARIA.Errors.TokensIdValueSyntax;
                                error = error.replace('{{attribute}}', this.stateProperty);
                                errors.push(error);
                            }
                        }
                        else {
                            result = /^\S+$/.test(value);
                            if (!result) {
                                var error = ARIA.Errors.SingleIdValueSyntax;
                                error = error.replace('{{attribute}}', this.stateProperty);
                                errors.push(error);
                            }
                        }
                    }
                    else {
                        switch (this.values.type) {
                            case 'integer':
                                if (/^(-|\+)?(0|[1-9]\d*)$/.test(value)) {
                                    result = true;
                                    var integerValue = Number.parseInt(value);
                                    if (this.values.hasOwnProperty('min') && /^(-|\+)?(0|[1-9]\d*)$/.test(this.values.min)) {
                                        result = this.values.min <= integerValue;
                                        if (!result) {
                                            var error = ARIA.Errors.ValueLowerThanMin;
                                            error = error.replace('{{attribute}}', this.stateProperty);
                                            error = error.replace('{{min}}', this.values.min);
                                            errors.push(error);
                                        }
                                    }
                                    if (this.values.hasOwnProperty('max') && /^(-|\+)?(0|[1-9]\d*)$/.test(this.values.max)) {
                                        if (result) {
                                            result = this.values.max >= integerValue;
                                            if (!result) {
                                                var error = ARIA.Errors.ValueGreaterThanMax;
                                                error = error.replace('{{attribute}}', this.stateProperty);
                                                error = error.replace('{{max}}', this.values.max);
                                                errors.push(error);
                                            }
                                        }
                                    }
                                }
                                else {
                                    var error = ARIA.Errors.IsNotAnInteger;
                                    error = error.replace('{{attribute}}', this.stateProperty);
                                    errors.push(error);
                                }
                                break;
                            case 'number':
                                if (/^(-|\+)?\d+(\.(\d+))*$/.test(value)) {
                                    result = true;
                                    var numberValue = Number.parseFloat(value);
                                    if (this.values.hasOwnProperty('min') && /^(-|\+)?\d+(\.(\d+))*$/.test(this.values.min)) {
                                        result = this.values.min <= numberValue;
                                        if (!result) {
                                            var error = ARIA.Errors.ValueLowerThanMin;
                                            error = error.replace('{{attribute}}', this.stateProperty);
                                            error = error.replace('{{min}}', this.values.min);
                                            errors.push(error);
                                        }
                                    }
                                    if (this.values.hasOwnProperty('max') && /^(-|\+)?\d+(\.(\d+))*$/.test(this.values.max)) {
                                        if (result) {
                                            result = this.values.max >= numberValue;
                                            if (!result) {
                                                var error = ARIA.Errors.ValueGreaterThanMax;
                                                error = error.replace('{{attribute}}', this.stateProperty);
                                                error = error.replace('{{max}}', this.values.max);
                                                errors.push(error);
                                            }
                                        }
                                    }
                                }
                                else {
                                    var error = ARIA.Errors.IsNaN;
                                    error = error.replace('{{attribute}}', this.stateProperty);
                                    errors.push(error);
                                }
                                break;
                            case 'string':
                                result = true;
                                break;
                        }
                    }
                }
                else {
                    errors.push(ARIA.Errors.EmptyValueNotAllowed.replace('{{attribute}}', this.stateProperty));
                }
                if (errors.length > 0) {
                    // console.log('Méthode ARIA : ' + errors);
                }
                return result;
            }
            else {
                return undefined;
            }
        };
        this.getComputedValue = function (value) {
            // empty or unspecified : return default value.
        };
        if (arguments.length == 2 && arguments[1].constructor == Object) {
            if (arguments[1].hasOwnProperty('getData')) {
                if (this.isValid()) {
                    this.setUsedInRoles();
                    this.setValues();
                }
            }
        }
    },
    getAllStatesProperties: function (format) {
        var statesData = ariaData.states;
        var propertiesData = ariaData.properties;
        var statesProperties = null;
        switch (format) {
            case 'js':
                statesProperties = [];
                for (var state in statesData) {
                    statesProperties.push(state);
                }
                for (var property in propertiesData) {
                    statesProperties.push(property);
                }
                break;
        }
        return statesProperties;
    }
};
// TODO: début HTML.

/*
HTML 5.3
W3C Working Draft, 18 October 2018
https://www.w3.org/TR/html53/

ARIA in HTML
W3C Working Draft 20 May 2020
https://www.w3.org/TR/html-aria/

Note, file updated with :
- ARIA 1.2, new roles :
* paragraph (p);
* blockquote (blockquote);
* caption (figcaption);
* generic (div and span);
* emphasis (em);
* strong (strong);
* term (dfn);
* time (time);
* code (code);
* subscript (sub);
* superscript (sup);
* insertion (ins);
* deletion (del);
* caption (caption).
- ARIA 1.2, current associations :
* term is not associated with dt (removed here);
* definition is not associated with dd (removed here);
* link is not associated with area[href] (ignored here - href not involved in HTML spec);
* grid is associated with table (ignored here);
* gridcell is associated with td (ignored here);
* columnheader is associated with th[scope="col"] (added here);
* rowheader is associated with th[scope="row"] (added here).
- ARIA in HTML :
* spinbutton is not associated with input[type="text|search"] (removed here).
* textarea is associated with textbox & no mention of aria-multiline (aria-multiline ignored here too).
* button is associated with summary (added here).
* area is associated with link (added here).
*/
//TODO mettre à jour les catégories et intégrer les types de contenus autorisés
var htmlData = {
    version: 5.3,
    status: 'Working Draft (WD)',
    date: 20181018,
    url: 'https://www.w3.org/TR/html53/',
    elementsCategorization: {
        'the document element': { id: 'the-root-element', url: 'https://www.w3.org/TR/html53/semantics.html' },
        'document metadata': { id: 'document-metadata', url: 'https://www.w3.org/TR/html53/document-metadata.html' },
        'sections': { id: 'sections', url: 'https://www.w3.org/TR/html53/sections.html' },
        'grouping content': { id:'grouping-content', url: 'https://www.w3.org/TR/html53/grouping-content.html' },
        'text-level semantics': { id: 'textlevel-semantics', url: 'https://www.w3.org/TR/html53/textlevel-semantics.html' },
        'edits': { id: 'edits', url: 'https://www.w3.org/TR/html53/edits.html' },
        'embedded content': { id: 'semantics-embedded-content', url: 'https://www.w3.org/TR/html53/semantics-embedded-content.html' },
        'tabular data': { id: 'tabular-data', url: 'https://www.w3.org/TR/html53/tabular-data.html' },
        'forms': { id: 'sec-forms', url: 'https://www.w3.org/TR/html53/sec-forms.html' },
        'interactive elements': { id: 'interactive-elements', url: 'https://www.w3.org/TR/html53/interactive-elements.html' },
        'scripting': { id: 'semantics-scripting', url: 'https://www.w3.org/TR/html53/semantics-scripting.html' }
    },
    elements: {
        'html': { id: 'the-html-element', category: 'the document element', DOMInterface: 'HTMLHtmlElement' },
        'head': { id: 'the-head-element', category: 'document metadata', DOMInterface: 'HTMLHeadElement' },
        'title': { id: 'the-title-element', category: 'document metadata', DOMInterface: 'HTMLTitleElement' },
        'base': { id: 'the-base-element', category: 'document metadata', DOMInterface: 'HTMLBaseElement' },
        'link': { id: 'the-link-element', category: 'document metadata', implicitAriaRole: 'link', DOMInterface: 'HTMLLinkElement' },
        'meta': { id: 'the-meta-element', category: 'document metadata', DOMInterface: 'HTMLMetaElement' },
        'style': { id: 'the-style-element', category: 'document metadata', DOMInterface: 'HTMLStyleElement' },
        'body': { id: 'the-body-element', category: 'sections', implicitAriaRole: 'document', DOMInterface: 'HTMLBodyElement' },
        'article': { id: 'the-article-element', category: 'sections', implicitAriaRole: 'article', DOMInterface: 'HTMLElement' },
        'section': { id: 'the-section-element', category: 'sections', implicitAriaRole: 'region', DOMInterface: 'HTMLElement' },
        'nav': { id: 'the-nav-element', category: 'sections', implicitAriaRole: 'navigation', DOMInterface: 'HTMLElement' },
        'aside': { id: 'the-aside-element', category: 'sections', implicitAriaRole: 'complementary', DOMInterface: 'HTMLElement' },
        'h1': { id: 'the-h1-h2-h3-h4-h5-and-h6-elements', category: 'sections', implicitAriaRole: 'heading', DOMInterface: 'HTMLHeadingElement' },
        'h2': { id: 'the-h1-h2-h3-h4-h5-and-h6-elements', category: 'sections', implicitAriaRole: 'heading', DOMInterface: 'HTMLHeadingElement' },
        'h3': { id: 'the-h1-h2-h3-h4-h5-and-h6-elements', category: 'sections', implicitAriaRole: 'heading', DOMInterface: 'HTMLHeadingElement' },
        'h4': { id: 'the-h1-h2-h3-h4-h5-and-h6-elements', category: 'sections', implicitAriaRole: 'heading', DOMInterface: 'HTMLHeadingElement' },
        'h5': { id: 'the-h1-h2-h3-h4-h5-and-h6-elements', category: 'sections', implicitAriaRole: 'heading', DOMInterface: 'HTMLHeadingElement' },
        'h6': { id: 'the-h1-h2-h3-h4-h5-and-h6-elements', category: 'sections', implicitAriaRole: 'heading', DOMInterface: 'HTMLHeadingElement' },
        'header': { id: 'the-header-element', category: 'sections', implicitAriaRole: 'banner', DOMInterface: 'HTMLElement' },
        'footer': { id: 'the-footer-element', category: 'sections', implicitAriaRole: 'contentinfo', DOMInterface: 'HTMLElement' },
        'p': { id: 'the-p-element', category: 'grouping content', implicitAriaRole: 'paragraph', DOMInterface: 'HTMLParagraphElement' },
        'address': { id: 'the-address-element', category: 'grouping content', DOMInterface: 'HTMLElement' },
        'hr': { id: 'the-hr-element', category: 'grouping content', implicitAriaRole: 'separator', DOMInterface: 'HTMLHRElement' },
        'pre': { id: 'the-pre-element', category: 'grouping content', DOMInterface: 'HTMLPreElement' },
        'blockquote': { id: 'the-blockquote-element', category: 'grouping content', implicitAriaRole: 'blockquote', DOMInterface: 'HTMLQuoteElement' },
        'ol': { id: 'the-ol-element', category: 'grouping content', implicitAriaRole: 'list', DOMInterface: 'HTMLOListElement' },
        'ul': { id: 'the-ul-element', category: 'grouping content', implicitAriaRole: 'list', DOMInterface: 'HTMLUListElement' },
        'li': { id: 'the-li-element', category: 'grouping content', implicitAriaRole: 'listitem', DOMInterface: 'HTMLLIElement' },
        'dl': { id: 'the-dl-element', category: 'grouping content', DOMInterface: 'HTMLDListElement' },
        'dt': { id: 'the-dt-element', category: 'grouping content', DOMInterface: 'HTMLElement' },
        'dd': { id: 'the-dd-element', category: 'grouping content', DOMInterface: 'HTMLElement' },
        'figure': { id: 'the-figure-element', category: 'grouping content', implicitAriaRole: 'figure', DOMInterface: 'HTMLElement' },
        'figcaption': { id: 'the-figcaption-element', category: 'grouping content', implicitAriaRole: 'caption', DOMInterface: 'HTMLElement' },
        'main': { id: 'the-main-element', category: 'grouping content', implicitAriaRole: 'main', DOMInterface: 'HTMLElement' },
        'div': { id: 'the-div-element', category: 'grouping content', implicitAriaRole: 'generic', DOMInterface: 'HTMLDivElement' },
        'a': { id: 'the-a-element', category: 'text-level semantics', focusable: 'a[href]', implicitAriaRole: { '[href]': 'link' }, DOMInterface: 'HTMLAnchorElement' },
        'em': { id: 'the-em-element', category: 'text-level semantics', implicitAriaRole: 'emphasis', DOMInterface: 'HTMLElement' },
        'strong': { id: 'the-strong-element', category: 'text-level semantics', implicitAriaRole: 'strong', DOMInterface: 'HTMLElement' },
        'small': { id: 'the-small-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        's': { id: 'the-s-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'cite': { id: 'the-cite-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'q': { id: 'the-q-element', category: 'text-level semantics', DOMInterface: 'HTMLQuoteElement' },
        'dfn': { id: 'the-dfn-element', category: 'text-level semantics', implicitAriaRole: 'term', DOMInterface: 'HTMLElement' },
        'abbr': { id: 'the-abbr-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'ruby': { id: 'the-ruby-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'rb': { id: 'the-rb-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'rt': { id: 'the-rt-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'rtc': { id: 'the-rtc-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'rp': { id: 'the-rp-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'data': { id: 'the-data-element', category: 'text-level semantics', DOMInterface: 'HTMLDataElement' },
        'time': { id: 'the-time-element', category: 'text-level semantics', implicitAriaRole: 'time', DOMInterface: 'HTMLTimeElement' },
        'code': { id: 'the-code-element', category: 'text-level semantics', implicitAriaRole: 'code', DOMInterface: 'HTMLElement' },
        'var': { id: 'the-var-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'samp': { id: 'the-samp-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'kbd': { id: 'the-kbd-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'sub': { id: 'the-sub-and-sup-elements', category: 'text-level semantics', implicitAriaRole: 'subscript', DOMInterface: 'HTMLElement' },
        'sup': { id: 'the-sub-and-sup-elements', category: 'text-level semantics', implicitAriaRole: 'superscript', DOMInterface: 'HTMLElement' },
        'i': { id: 'the-i-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'b': { id: 'the-b-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'u': { id: 'the-u-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'mark': { id: 'the-mark-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'bdi': { id: 'the-bdi-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'bdo': { id: 'the-bdo-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'span': { id: 'the-span-element', category: 'text-level semantics', implicitAriaRole: 'generic', DOMInterface: 'HTMLSpanElement' },
        'br': { id: 'the-br-element', category: 'text-level semantics', DOMInterface: 'HTMLBRElement' },
        'wbr': { id: 'the-wbr-element', category: 'text-level semantics', DOMInterface: 'HTMLElement' },
        'ins': { id: 'the-ins-element', category: 'edits', implicitAriaRole: 'insertion', DOMInterface: 'HTMLModElement' },
        'del': { id: 'the-del-element', category: 'edits', implicitAriaRole: 'deletion', DOMInterface: 'HTMLModElement' },
        'picture': { id: 'the-picture-element', category: 'embedded content', DOMInterface: 'HTMLPictureElement' },
        'source': { id: 'the-source-element', category: 'embedded content', DOMInterface: 'HTMLSourceElement' },
        'img': { id: 'the-img-element', category: 'embedded content', implicitAriaRole: { '[alt=""]': ['none', 'presentation'], '[alt]:not([alt=""])': 'img' }, DOMInterface: 'HTMLImageElement' },
        'iframe': { id: 'the-iframe-element', category: 'embedded content', focusable: true, DOMInterface: 'HTMLIFrameElement' },
        'embed': { id: 'the-embed-element', category: 'embedded content', focusable: true, DOMInterface: 'HTMLEmbedElement' },
        'object': { id: 'the-object-element', category: 'embedded content', focusable: true, DOMInterface: 'HTMLObjectElement' },
        'param': { id: 'the-param-element', category: 'embedded content', DOMInterface: 'HTMLParamElement' },
        'video': { id: 'the-video-element', category: 'embedded content', focusable: true, DOMInterface: 'HTMLVideoElement' },
        'audio': { id: 'the-audio-element', category: 'embedded content', focusable: true, DOMInterface: 'HTMLAudioElement' },
        'track': { id: 'the-track-element', category: 'embedded content', DOMInterface: 'HTMLTrackElement' },
        'map': { id: 'the-map-element', category: 'embedded content', DOMInterface: 'HTMLMapElement' },
        'area': { id: 'the-area-element', category: 'embedded content', focusable: 'area[href]', implicitAriaRole: { 'href': 'link' }, DOMInterface: 'HTMLAreaElement' },
        'table': { id: 'the-table-element', category: 'tabular data', implicitAriaRole: 'table', DOMInterface: 'HTMLTableElement' },
        'caption': { id: 'the-caption-element', category: 'tabular data', implicitAriaRole: 'caption', DOMInterface: 'HTMLTableCaptionElement' },
        'colgroup': { id: 'the-colgroup-element', category: 'tabular data', DOMInterface: 'HTMLTableColElement' },
        'col': { id: 'the-col-element', category: 'tabular data', DOMInterface: 'HTMLTableColElement' },
        'tbody': { id: 'the-tbody-element', category: 'tabular data', implicitAriaRole: 'rowgroup', DOMInterface: 'HTMLTableSectionElement' },
        'thead': { id: 'the-thead-element', category: 'tabular data', implicitAriaRole: 'rowgroup', DOMInterface: 'HTMLTableSectionElement' },
        'tfoot': { id: 'the-tfoot-element', category: 'tabular data', implicitAriaRole: 'rowgroup', DOMInterface: 'HTMLTableSectionElement' },
        'tr': { id: 'the-tr-element', category: 'tabular data', implicitAriaRole: 'row', DOMInterface: 'HTMLTableRowElement' },
        'td': { id: 'the-td-element', category: 'tabular data', implicitAriaRole: 'cell', DOMInterface: 'HTMLTableDataCellElement' },
        'th': { id: 'the-th-element', category: 'tabular data', implicitAriaRole: { '[scope="col"]': 'columnheader', '[scope="row"]': 'rowheader', 'th:not([scope])': ['columnheader', 'rowheader'] }, DOMInterface: 'HTMLTableHeaderCellElement' },
        'form': { id: 'the-form-element', category: 'forms', implicitAriaRole: 'form', DOMInterface: 'HTMLFormElement' },
        'label': { id: 'the-label-element', category: 'forms', DOMInterface: 'HTMLLabelElement' },
        'input': { id: 'the-input-element', category: 'forms', focusable: 'input:not([disabled])', implicitAriaRole: {
                'input:not([type]):not([list])': 'textbox',
                '[type="text"]:not([list])': 'textbox',
                'input[list]:not([type])': 'combobox',
                '[type="text"][list]': 'combobox',
                '[type="search"]:not([list])': 'searchbox',
                '[type="search"][list]': 'combobox',
                '[type="tel"]:not([list])': 'textbox',
                '[type="tel"][list]': 'combobox',
                '[type="url"]:not([list])': 'textbox',
                '[type="url"][list]': 'combobox',
                '[type="email"]:not([list])': 'textbox',
                '[type="email"][list]': 'combobox',
                '[type="number"]': 'spinbutton',
                '[type="range"]': 'slider',
                '[type="checkbox"]': 'checkbox',
                '[type="radio"]': 'radio',
                '[type="submit"]': 'button',
                '[type="image"]': 'button',
                '[type="reset"]': 'button',
                '[type="button"]': 'button'
            }, DOMInterface: 'HTMLInputElement' },
        'button': { id: 'the-button-element', category: 'forms', focusable: 'button:not([disabled])', implicitAriaRole: 'button', DOMInterface: 'HTMLButtonElement' },
        'select': { id: 'the-select-element', category: 'forms', focusable: 'select:not([disabled])', implicitAriaRole: {
                'select:not([multiple]):not([size])': 'combobox',
                'select[multiple]': 'listbox',
                'select[size]:not([multiple])': { type: 'integer', attribute: 'size', greaterthan: 1, role: ['combobox', 'listbox'] }
            }, DOMInterface: 'HTMLSelectElement' },
        'datalist': { id: 'the-datalist-element', category: 'forms', implicitAriaRole: 'listbox', DOMInterface: 'HTMLDataListElement' },
        'optgroup': { id: 'the-optgroup-element', category: 'forms', implicitAriaRole: 'group', DOMInterface: 'HTMLOptGroupElement' },
        'option': { id: 'the-option-element', category: 'forms', implicitAriaRole: 'option', DOMInterface: 'HTMLOptionElement' },
        'textarea': { id: 'the-textarea-element', category: 'forms', focusable: 'textarea:not([disabled])', implicitAriaRole: 'textbox', DOMInterface: 'HTMLTextAreaElement' },
        'output': { id: 'the-output-element', category: 'forms', implicitAriaRole: 'status', DOMInterface: 'HTMLOutputElement' },
        'progress': { id: 'the-progress-element', category: 'forms', implicitAriaRole: 'progressbar', DOMInterface: 'HTMLProgressElement' },
        'meter': { id: 'the-meter-element', category: 'forms', DOMInterface: 'HTMLMeterElement' },
        'fieldset': { id: 'the-fieldset-element', category: 'forms', implicitAriaRole: 'group', DOMInterface: 'HTMLFieldSetElement' },
        'legend': { id: 'the-legend-element', category: 'forms', DOMInterface: 'HTMLLegendElement' },
        'details': { id: 'the-details-element', category: 'interactive elements', implicitAriaRole: 'group', DOMInterface: 'HTMLDetailsElement' },
        'summary': { id: 'the-summary-element', category: 'interactive elements', implicitAriaRole: 'button', DOMInterface: 'HTMLElement' },
        'dialog': { id: 'the-dialog-element', category: 'interactive elements', implicitAriaRole: 'dialog', DOMInterface: 'HTMLDialogElement' },
        'script': { id: 'the-script-element', category: 'scripting', DOMInterface: 'HTMLScriptElement' },
        'noscript': { id: 'the-noscript-element', category: 'scripting', DOMInterface: 'HTMLElement' },
        'template': { id: 'the-template-element', category: 'scripting', DOMInterface: 'HTMLTemplateElement' },
        'canvas': { id: 'the-canvas-element', category: 'scripting', DOMInterface: 'HTMLCanvasElement' }
    }
};

var HTML = {
    getFocusableElementsSelector: function () {
        var elements = [];
        let htmlDataElLength = htmlData.elements.length;
        for(var i = 0; i < htmlDataElLength; i++) {
            let element = htmlData.elements[i];
            if (htmlData.elements[element].hasOwnProperty('focusable')) {
                var focusable = htmlData.elements[element].focusable;
                elements.push((focusable.constructor == String ? focusable : element) + ':not([tabindex="-1"])');
            }
        }
        elements.push('[contenteditable="true"]', '[tabindex="0"]');
        return elements.join(', ');
    }
};
/*
    IANA Language Subtag Registry
    https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
    Note : only the 30 main languages in the world.
*/
var languages = {
    fileDate: '2020-05-12',
    data: {
        'en': { description: 'English', added:'2005-10-16', suppressScript: 'Latn' },
        'cmn': { description: 'Mandarin Chinese', added:'2009-07-29', macrolanguage: 'zh' },
        'hi': { description: 'Hindi', added:'2005-10-16', suppressScript: 'Deva' },
        'es': { description: ['Spanish', 'Castilian'], added:'2005-10-16', suppressScript: 'Latn' },
        'fr': { description: 'French', added:'2005-10-16', suppressScript: 'Latn' },
        'ar': { description: 'Arabic', added:'2005-10-16', suppressScript: 'Arab', scope: 'macrolanguage' },
        'bn': { description: ['Bengali', 'Bangla'], added:'2005-10-16', suppressScript: 'Beng' },
        'ru': { description: 'Russian', added:'2005-10-16', suppressScript: 'Cyrl' },
        'pt': { description: 'Portuguese', added:'2005-10-16', suppressScript: 'Latn' },
        'id': { description: 'Indonesian', added:'2005-10-16', suppressScript: 'Latn', macrolanguage: 'ms' },
        'ur': { description: 'Urdu', added:'2005-10-16', suppressScript: 'Arab' },
        'de': { description: 'German', added:'2005-10-16', suppressScript: 'Latn' },
        'ja': { description: 'Japanese', added:'2005-10-16', suppressScript: 'Jpan' },
        'sw': { description: 'Swahili (macrolanguage)', added:'2005-10-16', suppressScript: 'Latn', scope: 'macrolanguage' },
        'mr': { description: 'Marathi', added:'2005-10-16', suppressScript: 'Deva' },
        'te': { description: 'Telugu', added:'2005-10-16', suppressScript: 'Telu' },
        'tr': { description: 'Turkish', added:'2005-10-16', suppressScript: 'Latn' },
        'yue': { description: ['Yue Chinese', 'Cantonese'], added:'2009-07-29', macrolanguage: 'zh' },
        'ta': { description: 'Tamil', added:'2005-10-16', suppressScript: 'Taml' },
        'pa': { description: ['Panjabi', 'Punjabi'], added:'2005-10-16', suppressScript: 'Guru' },
        'wuu': { description: 'Wu Chinese', added:'2009-07-29', macrolanguage: 'zh' },
        'ko': { description: 'Korean', added:'2005-10-16', suppressScript: 'Kore' },
        'vi': { description: 'Vietnamese', added:'2005-10-16', suppressScript: 'Latn' },
        'ha': { description: 'Hausa', added:'2005-10-16' },
        'jv': { description: 'Javanese', added:'2005-10-16' },
        'arz': { description: 'Egyptian Arabic', added:'2009-07-29', preferredValue: 'arz', prefix: 'ar', macrolanguage: 'ar' },
        'it': { description: 'Italian', added:'2005-10-16', suppressScript: 'Latn' },
        'th': { description: 'Thai', added:'2005-10-16', suppressScript: 'Thai' },
        'gu': { description: 'Gujarati', added:'2005-10-16', suppressScript: 'Gujr' },
        'kn': { description: 'Kannada', added:'2005-10-16', suppressScript: 'Knda' }
    }
};
/*
Accessible Name and Description Computation 1.1
W3C Recommendation 18 December 2018
https://www.w3.org/TR/accname-1.1/
*/

/*
Current Missing Implementations :
* CSS Visibility Property.
* Multiple-Selection Listboxes.
Current Imperfect Implementations :
* Replaced Elements (+ CSS Content).
* Control Embedded in Label (+ Checkboxes & Radios Embedded in Label).
* Checkbox & Radio in Native Textboxes...
* SVG (multiple titles & use elements).
* Output (in native "textboxes").
* Native Password Controls (i.e. (Incorrectly) Used as Custom Checkbox Controls).
* Labels for Native Controls (Multiple Labels + Labels for Some Controls like Buttons).
* Aria-owns Property (Partially Supported - Only for Custom Listboxes).
* Data (Separated Files).
*/

// accessibleName.
var getAccessibleName = function () {
    var directlyReferenced = false;
    if(this.hasAttribute('data-tng-labelbytraversal') || this.hasAttribute('data-tng-controlembeddedinlabel')) {
        directlyReferenced = true;
    } else {
        if(this.hasAttribute('data-tng-anobject')) return JSON.parse(this.getAttribute('data-tng-anobject'));
    }
// Data.
    var ARIA = {
        nameFromContentSupported: '[role="button"], [role="cell"], [role="checkbox"], [role="columnheader"], [role="gridcell"], [role="heading"], [role="link"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="radio"], [role="row"], [role="rowgroup"], [role="rowheader"], [role="switch"], [role="tab"], [role="tooltip"], [role="treeitem"]'
    };
    var controls = {
        nativetextboxes: 'input:not([type]), input[type="checkbox"], input[type="email"], input[type="password"], input[type="radio"], input[type="date"], input[type="search"], input[type="text"], input[type="tel"], input[type="url"], output, textarea',
        customtextboxes: '[contenteditable="true"], [role="textbox"]',
        nativebuttons: 'button, input[type="button"], input[type="image"], input[type="reset"], input[type="submit"]',
        custombuttons: '[role="button"]',
        customcomboboxes: '[role="combobox"]',
        nativelistboxes: 'select',
        customlistboxes: '[role="listbox"]',
        nativeranges: 'input[type="number"], input[type="range"], meter, progress',
        customranges: '[role="progressbar"], [role="scrollbar"], [role="slider"], [role="spinbutton"]'
    };
    var replacedElements = ['audio', 'canvas', 'embed', 'iframe', 'img', 'input', 'object', 'video'];
// Step 1 : Initialize - Set the total accumulated text to the empty string ("").
    var totalAccumulatedText = '';
    var result = [];
// Step 2 : Compute the text alternative for the current node.
    var accessibleNameWithAriaLabelledBy = false;

    if (this.hasAttribute('data-tng-labelbytraversal') || this.getAttribute('data-tng-el-exposed') === "true") {
        // 2-A (condition failed) : The current node is not hidden or is directly referenced by aria-labelledby.
        if (this.hasAttribute('aria-labelledby') && !this.hasAttribute('data-tng-labelbytraversal') && !this.hasAttribute('data-tng-controlembeddedinlabel')) {
            /*
			2-B :
			* The current node has an aria-labelledby attribute that contains at least one valid IDREF.
			* The current node is not already part of an aria-labelledby traversal.
		*/
            var labelledby = this.getAttribute('aria-labelledby');
            if (labelledby.trim().length > 0) {
                labelledby = labelledby.split(' ');
                var nodes = [];
                for (var l = 0; l < labelledby.length; l++) {
                    var labelledbyitem = document.getElementById(labelledby[l]);
                    if (labelledbyitem) {
                        nodes.push(labelledbyitem);
                    }
                }
                if (nodes.length > 0) {
                    accessibleNameWithAriaLabelledBy = true;
                    var controlsselectors = [];
                    for (var specificcontrols in controls) {
                        controlsselectors.push(controls[specificcontrols]);
                    }
                    controlsselectors = controlsselectors.join(',');
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i].matches(controlsselectors)) {
                            nodes[i].setAttribute('data-tng-controlembeddedinlabel', 'true');
                        }
                        nodes[i].setAttribute('data-tng-labelbytraversal', 'true');
                        let an = nodes[i].fullAccessibleName;
                        result.push({"aria-labelledby": an});
                        totalAccumulatedText = totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(an[0].split('')[0]) ? totalAccumulatedText.trim()+an[0] : totalAccumulatedText.trim()+' '+an[0];
                    }
                }
            }
        }
    }
    if ((totalAccumulatedText == '' || accessibleNameWithAriaLabelledBy == false) && this.getAttribute('data-tng-el-exposed') === "true" || this.hasAttribute('data-tng-labelbytraversal')) {
        var accessibleNameWithAriaLabel = false;
        if (!this.hasAttribute('data-tng-controlembeddedinlabel')) {
            if (this.hasAttribute('aria-label')) {
                /*
				2-C (condition success) :
				* The current node has an aria-label attribute whose value is not the empty string (when trimmed of white space or not).
				* If traversal of the current node is due to recursion and the current node is an embedded control as defined in step 2E, ignore aria-label and skip to rule 2E.
			*/
                var label = this.getAttribute('aria-label');
                if (label.trim() != '') {
                    accessibleNameWithAriaLabel = true;
                    result = [{"aria-label": label}];
                    totalAccumulatedText = label;
                }
            }
        }
        if (accessibleNameWithAriaLabel == false) {
            if (this.hasAttribute('data-tng-controlembeddedinlabel')) {
                /*
				2-C (condition failed) : The traversal of the current node is due to recursion and the current node is an embedded control.
				2-E : The current node is a control embedded within the label (e.g. the label element in HTML or any element directly referenced by aria-labelledby) for another widget.
			*/
                this.removeAttribute('data-tng-controlembeddedinlabel');
                if (this.matches(controls.nativetextboxes)) {
                    // If the embedded control has role textbox, return its value.
                    if (this.matches('input[type="password"]')) {
                        var value = this.value;
                        var resulttmp = [];
                        for (var i = 0; i < value.length; i++) {
                            resulttmp.push('\u2022');
                        }
                        result = [{"value": resulttmp.join('\u00AD')}];
                        totalAccumulatedText = resulttmp.join('\u00AD');
                    }
                    else {
                        result = [{"value": this.value}];
                        totalAccumulatedText = this.value;
                    }
                }
                else if (this.matches(controls.customtextboxes)) {
                    // If the embedded control has role textbox, return its value.
                    result = [{"textContent": this.textContent}];
                    totalAccumulatedText = this.textContent;
                }
                else if (this.matches(controls.nativebuttons + ',' + controls.custombuttons)) {
                    // If the embedded control has role menu button, return the text alternative of the button.
                    result = this.fullAccessibleName;
                    totalAccumulatedText = result.shift();
                }
                else if (this.matches(controls.customcomboboxes)) {
                    // If the embedded control has role combobox or listbox, return the text alternative of the chosen option.
                    if (this.matches(controls.nativetextboxes)) {
                        if (this.matches('input[type="password"]')) {
                            var value = this.value;
                            var resulttmp = [];
                            for (var i = 0; i < value.length; i++) {
                                resulttmp.push('\u2022');
                            }
                            result = [{"value": resulttmp.join('\u00AD')}];
                            totalAccumulatedText = resulttmp.join('\u00AD');
                        }
                        else {
                            result = [{"value": this.value}];
                            totalAccumulatedText = this.value;
                        }
                    }
                    else {
                        result = [{"textContent": this.textContent}];
                        totalAccumulatedText = this.textContent;
                    }
                }
                else if (this.matches(controls.nativelistboxes)) {
                    // If the embedded control has role combobox or listbox, return the text alternative of the chosen option.
                    if (this.hasAttribute('multiple')) {

                    }
                    else {
                        if (this.selectedIndex > -1) {
                            let an = this.options[this.selectedIndex].fullAccessibleName;
                            result = [{"chosen-option": an}];
                            totalAccumulatedText = an[0];
                        }
                    }
                }
                else if (this.matches(controls.customlistboxes)) {
                    // If the embedded control has role combobox or listbox, return the text alternative of the chosen option.
                    if (this.getAttribute('aria-multiselectable') == 'true') {

                    }
                    else {
                        var option = this.querySelector('[role="option"][aria-selected]');
                        if (!option && this.hasAttribute('aria-owns')) {
                            var owns = this.getAttribute('aria-owns');
                            if (owns.trim().length > 0) {
                                owns = owns.split(' ');
                                var nodes = [];
                                for (var o = 0; o < owns.length; o++) {
                                    var ownsitem = document.getElementById(owns[o]);
                                    if (ownsitem) {
                                        nodes.push(ownsitem);
                                    }
                                }
                                if (nodes.length > 0) {
                                    for (var i = 0; i < nodes.length; i++) {
                                        if (nodes[i].matches('[role="option"][aria-selected]')) {
                                            option = nodes[i];
                                        }
                                        else {
                                            option = nodes[i].querySelector('[role="option"][aria-selected]');
                                        }
                                        if (option) {
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (option) {
                            let an = option.fullAccessibleName;
                            result = [{"chosen-option": an}];
                            totalAccumulatedText = an[0];
                        }
                    }
                }
                else if (this.matches(controls.nativeranges + ',' + controls.customranges)) {
                    // If the embedded control has role range (e.g., a spinbutton or slider).
                    if (this.hasAttribute('aria-valuetext')) {
                        result = [{"aria-valuetext": this.getAttribute('aria-valuetext')}];
                        totalAccumulatedText = this.getAttribute('aria-valuetext');
                    }
                    else if (this.hasAttribute('aria-valuenow')) {
                        result = [{"aria-valuenow": this.getAttribute('aria-valuenow')}];
                        totalAccumulatedText = this.getAttribute('aria-valuenow');
                    }
                    else if (this.matches(controls.nativeranges)) {
                        if (this.value) {
                            result = [{"value": this.value}];
                            totalAccumulatedText = this.value;
                        }
                        else {
                            result = [];
                            totalAccumulatedText = '';
                        }
                    }
                }
            }
            else {
                /*
				D : Otherwise, if the current node's native markup provides an attribute (e.g. title) or element (e.g. HTML label)
				that defines a text alternative, return that alternative in the form of a flat string as defined by the host language,
				unless the element is marked as presentational (role="presentation" or role="none").
				Comment: For example, in HTML, the img element's alt attribute defines a text alternative string, and the label element provides text for the referenced form element. In SVG2, the desc and title elements provide a description of their parent element.
			*/
                if (this.matches('area, img')) {
                    if (!this.matches('[role="none"], [role="presentation"]')) { // COMMENT : Not allowed on area & img with alt="text".
                        if (this.hasAttribute('alt')) {
                            result = [{"alt": this.getAttribute('alt')}];
                            totalAccumulatedText = this.getAttribute('alt');
                        }
                        else if (this.hasAttribute('title')) {
                            /* 2-I : Otherwise, if the current node has a Tooltip attribute, return its value. */
                            result = [{"title": this.getAttribute('title')}];
                            totalAccumulatedText = this.getAttribute('title');
                        }
                    }
                }
                else if (this.matches('svg') && !this.matches('[role="none"], [role="presentation"]')) {
                    var title = this.querySelector('title');
                    if (title && title.parentNode == this) {
                        result = [{"titleTag-textContent": title.textContent}];
                        totalAccumulatedText = title.textContent;
                    }
                }
                else if(this.matches('object[type], embed[type]') && !this.matches('[role="none"], [role="presentation"]')) {
                    if(this.getAttribute('type').startsWith('image/') && this.hasAttribute('title')) {
                        result = [{"title": this.getAttribute('title')}];
                        totalAccumulatedText = this.getAttribute('title');
                    }
                }
                else if (this.matches(controls.nativebuttons) && !this.matches('[role="none"], [role="presentation"]')) { // COMMENT : Not allowed on button, input[type="button"], input[type="image"], input[type="reset"], input[type="submit"].
                    if (this.matches('input[type="image"]')) {
                        if (this.hasAttribute('alt')) {
                            result = [{"alt": this.getAttribute('alt')}];
                            totalAccumulatedText = this.getAttribute('alt');
                        }
                        else if (this.hasAttribute('title')) {
                            /* 2-I : Otherwise, if the current node has a Tooltip attribute, return its value. */
                            result = [{"title": this.getAttribute('title')}];
                            totalAccumulatedText = this.getAttribute('title');
                        }
                    }
                    else {
                        var parentcssbeforecontent = '';
                        var parentcssaftercontent = '';
                        if (replacedElements.indexOf(this.tagName.toLowerCase()) == -1) {
                            parentcssbeforecontent = window.getComputedStyle(this, '::before').getPropertyValue('content');
                            if (!(/^url\(/.test(parentcssbeforecontent))) {
                                parentcssbeforecontent = parentcssbeforecontent == 'none' ? '' : parentcssbeforecontent.substring(1, parentcssbeforecontent.length - 1);
                            }
                            else {
                                parentcssbeforecontent = '';
                            }
                            parentcssaftercontent = window.getComputedStyle(this, '::after').getPropertyValue('content');
                            if (!(/^url\(/.test(parentcssaftercontent))) {
                                parentcssaftercontent = parentcssaftercontent == 'none' ? '' : parentcssaftercontent.substring(1, parentcssaftercontent.length - 1);
                            }
                            else {
                                parentcssaftercontent = '';
                            }
                        }

                        result = [{"parentcssbeforecontent": parentcssbeforecontent}];
                        totalAccumulatedText = parentcssbeforecontent;
                        if (this.matches('button')) {
                            var nodes = this.childNodes;

                            for (var i = 0; i < nodes.length; i++) {
                                if (nodes[i].nodeType === 3) {
                                    // 2-G : The current node is a Text node, return its textual contents.
                                    result.push({"textual-contents": nodes[i].textContent});
                                    totalAccumulatedText = (totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(nodes[i].textContent.split('')[0])) ? totalAccumulatedText.trim()+nodes[i].textContent : (totalAccumulatedText.trim()+' ' + nodes[i].textContent);
                                }
                                else if (nodes[i].nodeType === 1 && nodes[i].getAttribute('data-tng-el-exposed') === "true") {
                                    // 2-H : The current node is a descendant of an element whose Accessible Name is being computed, and contains descendants, proceed to 2F.i.
                                    var cssbeforecontent = '';
                                    var cssaftercontent = '';
                                    if (replacedElements.indexOf(nodes[i].tagName.toLowerCase()) == -1) {
                                        cssbeforecontent = window.getComputedStyle(nodes[i], '::before').getPropertyValue('content');
                                        if (!(/^url\(/.test(cssbeforecontent))) {
                                            cssbeforecontent = cssbeforecontent == 'none' ? '' : cssbeforecontent.substring(1, cssbeforecontent.length - 1);
                                        }

                                        cssaftercontent = window.getComputedStyle(nodes[i], '::after').getPropertyValue('content');
                                        if (!(/^url\(/.test(cssaftercontent))) {
                                            cssaftercontent = cssaftercontent == 'none' ? '' : cssaftercontent.substring(1, cssaftercontent.length - 1);
                                        }
                                    }
                                    if (this.matches('[data-tng-labelbytraversal="true"]')) {
                                        nodes[i].setAttribute('data-tng-labelbytraversal', 'true');
                                    }

                                    let tagName2h = nodes[i].tagName;
                                    let tagName2hAN = nodes[i].fullAccessibleName;

                                    result.push(
                                        {"cssbeforecontent": cssbeforecontent},
                                        {[tagName2h]: tagName2hAN},
                                        {"cssaftercontent": cssaftercontent}
                                    );
                                    totalAccumulatedText = (totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(cssbeforecontent.split('')[0]) || (cssbeforecontent.length === 0 && /[,.\s]/.test(tagName2hAN[0].split('')[0]))) ? (totalAccumulatedText.trim()+cssbeforecontent + tagName2hAN[0] + cssaftercontent) : (totalAccumulatedText.trim()+' '+cssbeforecontent + tagName2hAN[0] + cssaftercontent);
                                }
                            }
                        }
                        else {
                            result.push({"value": this.value});
                            totalAccumulatedText = totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(this.value.split('')[0]) ? totalAccumulatedText.trim()+this.value : totalAccumulatedText.trim()+' '+this.value;
                        }
                        result.push({"parentcssaftercontent": parentcssaftercontent});
                        totalAccumulatedText = totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(parentcssaftercontent.split('')[0]) ? totalAccumulatedText.trim()+parentcssaftercontent : totalAccumulatedText.trim()+' '+parentcssaftercontent;

                        if (totalAccumulatedText.trim() == '' && this.hasAttribute('title')) {
                            /* 2-I : Otherwise, if the current node has a Tooltip attribute, return its value. */
                            result = [{"title": this.getAttribute('title')}];
                            totalAccumulatedText = this.getAttribute('title');
                        }
                    }
                }
                else if (this.matches(controls.nativelistboxes + ',' + controls.nativeranges + ',' + controls.nativetextboxes) && !this.matches('[role="none"], [role="presentation"]')) { // COMMENT : Not allowed on...
                    var labels = this.labels;
                    for (var i = 0; i < labels.length; i++) {
                        if (!labels[i].matches('[role="none"], [role="presentation"]')) {
                            let an = labels[i].fullAccessibleName;
                            result.push({"label": an});
                            totalAccumulatedText = totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(an[0].split('')[0]) ? totalAccumulatedText.trim()+an[0] : totalAccumulatedText.trim()+' '+an[0];
                        }
                    }

                    if(labels.length === 0 && this.hasAttribute('title')) {
                        result = [{"title": this.getAttribute('title')}];
                        totalAccumulatedText = this.getAttribute('title');
                    }
                }
                else if (this.matches('fieldset, table') && !this.matches('[role="none"], [role="presentation"]')) {
                    var elementname = this.firstElementChild;
                    if (elementname && !elementname.matches('[role="none"], [role="presentation"]')) {
                        if (elementname.matches('fieldset legend, table caption')) {
                            let an = elementname.fullAccessibleName;
                            result = [{"firstChild-caption": an}];
                            totalAccumulatedText = an[0];
                        }
                    }

                    if (totalAccumulatedText.trim() == '' && this.hasAttribute('title')) {
                        /* 2-I : Otherwise, if the current node has a Tooltip attribute, return its value. */
                        result = [{"title": this.getAttribute('title')}];
                        totalAccumulatedText = this.getAttribute('title');
                    }
                }
                else if (this.matches('iframe[title]') && !this.matches('[role="none"], [role="presentation"]')) {
                    result = [{"title": this.getAttribute('title')}];
                    totalAccumulatedText = this.getAttribute('title');
                }
                else if ((!this.hasAttribute('role') || this.matches('[role="none"], [role="presentation"]')) || this.matches(ARIA.nameFromContentSupported)) { // Name from Content (TODO : implement it in ARIA).
                    var controlsselectors = [];
                    for (var specificcontrols in controls) {
                        controlsselectors.push(controls[specificcontrols]);
                    }
                    controlsselectors = controlsselectors.join(',');
                    var nodes = this.childNodes;
                    var parentcssbeforecontent = '';
                    var parentcssaftercontent = '';
                    if (replacedElements.indexOf(this.tagName.toLowerCase()) == -1) {
                        parentcssbeforecontent = window.getComputedStyle(this, '::before').getPropertyValue('content');
                        if (!(/^url\(/.test(parentcssbeforecontent))) {
                            parentcssbeforecontent = parentcssbeforecontent == 'none' ? '' : parentcssbeforecontent.substring(1, parentcssbeforecontent.length - 1);
                        }
                        else {
                            parentcssbeforecontent = '';
                        }
                        parentcssaftercontent = window.getComputedStyle(this, '::after').getPropertyValue('content');
                        if (!(/^url\(/.test(parentcssaftercontent))) {
                            parentcssaftercontent = parentcssaftercontent == 'none' ? '' : parentcssaftercontent.substring(1, parentcssaftercontent.length - 1);
                        }
                        else {
                            parentcssaftercontent = '';
                        }
                    }

                    result = [{"parentcssbeforecontent": parentcssbeforecontent}];
                    totalAccumulatedText = parentcssbeforecontent;
                    for (var i = 0; i < nodes.length; i++) {
                        if (nodes[i].nodeType == Node.TEXT_NODE) {
                            // 2-G : The current node is a Text node, return its textual contents.
                            result.push({"textual-contents": nodes[i].textContent});
                            totalAccumulatedText = (totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(nodes[i].textContent.split('')[0])) ? totalAccumulatedText.trim()+nodes[i].textContent : totalAccumulatedText.trim()+' '+ nodes[i].textContent;
                        }
                        else if (nodes[i].nodeType == Node.ELEMENT_NODE && nodes[i].getAttribute('data-tng-el-exposed') === "true") {
                            // 2-H : The current node is a descendant of an element whose Accessible Name is being computed, and contains descendants, proceed to 2F.i.
                            var cssbeforecontent = '';
                            var cssaftercontent = '';
                            if (replacedElements.indexOf(nodes[i].tagName.toLowerCase()) == -1) {
                                cssbeforecontent = window.getComputedStyle(nodes[i], '::before').getPropertyValue('content');
                                if (!(/^url\(/.test(cssbeforecontent))) {
                                    cssbeforecontent = cssbeforecontent == 'none' ? '' : cssbeforecontent.substring(1, cssbeforecontent.length - 1);
                                }
                                else {
                                    cssbeforecontent = '';
                                }
                                cssaftercontent = window.getComputedStyle(nodes[i], '::after').getPropertyValue('content');
                                if (!(/^url\(/.test(cssaftercontent))) {
                                    cssaftercontent = cssaftercontent == 'none' ? '' : cssaftercontent.substring(1, cssaftercontent.length - 1);
                                }
                                else {
                                    cssaftercontent = '';
                                }
                            }
                            if (nodes[i].matches(controlsselectors)) {
                                nodes[i].setAttribute('data-tng-controlembeddedinlabel', 'true');
                            }
                            if (this.matches('[data-tng-labelbytraversal="true"]')) {
                                nodes[i].setAttribute('data-tng-labelbytraversal', 'true');
                            }
                            var tagName2h2 = nodes[i].tagName;
                            let tagName2h2AN = nodes[i].fullAccessibleName;
                            result.push(
                                {"cssbeforecontent": cssbeforecontent},
                                {[tagName2h2]: tagName2h2AN},
                                {"cssaftercontent": cssaftercontent}
                            );

                            totalAccumulatedText = (totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(cssbeforecontent.split('')[0]) || (cssbeforecontent.length === 0 && /[,.\s]/.test(tagName2h2AN[0].split('')[0]))) ? (totalAccumulatedText.trim()+cssbeforecontent + tagName2h2AN[0] + cssaftercontent) : (totalAccumulatedText.trim()+' '+cssbeforecontent + tagName2h2AN[0] + cssaftercontent);
                        }
                    }
                    result.push({"parentcssaftercontent": parentcssaftercontent});
                    totalAccumulatedText = totalAccumulatedText.trim().length === 0 || /[,.\s]/.test(parentcssaftercontent.split('')[0]) ? totalAccumulatedText.trim()+parentcssaftercontent : totalAccumulatedText.trim()+' '+parentcssaftercontent;

                    if (totalAccumulatedText.trim() == '' && this.matches('a[href][title]')) {
                        /* 2-I : Otherwise, if the current node has a Tooltip attribute, return its value. */
                        result = [{"title": this.getAttribute('title')}];
                        totalAccumulatedText = this.getAttribute('title');
                    }
                }
            }
        }
    }
    this.removeAttribute('data-tng-labelbytraversal');
    this.removeAttribute('data-tng-controlembeddedinlabel');
    // 2-A (condition success) : The current node is hidden and is not directly referenced by aria-labelledby.
    // 2-B, 2-C, 2-D, 2-E, 2-F, 2-G, 2-H and 2-I : Otherwise...
    
    result.unshift(totalAccumulatedText.trim());
    if(!directlyReferenced) this.setAttribute('data-tng-anobject', JSON.stringify(result));
    return result;
};
/**
 ** use [ariaDatas.js, ariaRoles.js]
 */
var hasInvalidAriaAttributes = function () {
    var result = false;
    for (var i = 0; i < this.attributes.length; i++) {
        var name = this.attributes[i].name;
        if (name.match(/^aria-/)) {
            var sp = new ARIA.StateProperty(name);
            if (!sp.isValid()) {
                result = true;
                break;
            }
        }
    }
    return result;
};

var hasAriaAttributesWithInvalidValues = function () {
    var errors = [];
    var result = false;
    for (var i = 0; i < this.attributes.length; i++) {
        var attribute = this.attributes[i];
        var name = attribute.name;
        if (name.match(/^aria-.*$/)) {
            var sp = new ARIA.StateProperty(name);
            var isValidValue = sp.isValidValue(attribute.value);
            if (isValidValue) {
                var values = sp.getValues();
                if (values.constructor == Object) {
                    if (values.hasOwnProperty('type')) {
                        if (values.type == 'integer' || values.type == 'number') {
                            var isOk = values.type == 'integer' ? /^(-|\+)?(0|[1-9]\d*)$/ : /^(-|\+)?\d+(\.(\d+))*$/;
                            if (values.hasOwnProperty('min') && values.min.constructor == String) {
                                if (this.hasAttribute(values.min)) {
                                    var min = this.getAttribute(values.min);
                                    if (isOk.test(min)) {
                                        min = values.type == 'integer' ? parseInt(min) : parseFloat(min);
                                        var value = values.type == 'integer' ? parseInt(attribute.value) : parseFloat(attribute.value);
                                        var minResult = !(min <= value);
                                        if (minResult) {
                                            var error = ARIA.Errors.ValueLowerThanMin;
                                            error = error.replace('{{attribute}}', attribute.name);
                                            error = error.replace('{{min}}', values.min);
                                            errors.push(error);
                                        }
                                    }
                                }
                            }
                            if (values.hasOwnProperty('max') && values.max.constructor == String) {
                                if (this.hasAttribute(values.max)) {
                                    var max = this.getAttribute(values.max);
                                    if (isOk.test(max)) {
                                        max = values.type == 'integer' ? parseInt(max) : parseFloat(max);
                                        var value = values.type == 'integer' ? parseInt(attribute.value) : parseFloat(attribute.value);
                                        var maxResult = !(max >= value);
                                        if (maxResult) {
                                            var error = ARIA.Errors.ValueGreaterThanMax;
                                            error = error.replace('{{attribute}}', attribute.name);
                                            error = error.replace('{{max}}', values.max);
                                            errors.push(error);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else if (values.hasOwnProperty('attribute')) {
                        if (values.attribute == 'id') {
                            if (values.multiple) {
                                var mode = 'strict';
                                if (arguments.length == 1 && arguments[0].constructor == Object) {
                                    if (arguments[0].permissive) {
                                        mode = 'permissive';
                                    }
                                }
                                var ids = attribute.value.split(' ');
                                if (mode == 'strict') {
                                    var notFoundElements = [];
                                    for (var j = 0; j < ids.length; j++) {
                                        if (!document.getElementById(ids[j])) {
                                            notFoundElements.push(ids[j]);
                                        }
                                    }
                                    if (notFoundElements.length > 0) {
                                        errors.push(ARIA.Errors.TokensIdValueElements.replace('{{attribute}}', attribute.name));
                                    }
                                }
                                else {
                                    var foundElement = false;
                                    for (var j = 0; j < ids.length; j++) {
                                        if (document.getElementById(ids[j])) {
                                            foundElement = true;
                                            break;
                                        }
                                    }
                                    if (!foundElement) {
                                        errors.push(ARIA.Errors.TokensIdValueElements.replace('{{attribute}}', attribute.name));
                                    }
                                }
                            }
                            else {
                                if (!document.getElementById(attribute.value)) {
                                    errors.push(ARIA.Errors.SingleIdValueElement.replace('{{attribute}}', attribute.name));
                                }
                            }
                        }
                    }
                }
            }
            else if (isValidValue == undefined) {
                errors.push(ARIA.Errors.InvalidStateProperty.replace('{{attribute}}', attribute.name));
            }
            else {
                result = true;
            }
        }
    }
    if (!result && errors.length > 0) {
        result = true;
    }
    return result;
};

var hasProhibitedAriaAttributes = function () {
    var result = false;
    for (var i = 0; i < this.attributes.length; i++) {
        var attribute = this.attributes[i];
        var name = attribute.name;
        if (name.match(/^aria-/)) {
            var sp = new ARIA.StateProperty(name);
            result = sp.isAllowedInRole(this.getComputedAriaRole());
            result = result == undefined ? false : !result;
            if (result) {
                break;
            }
        }
    }
    return result;
};
/**
 ** use [htmlDatas.js, ariaDatas.js, implicitAriaRoles.js]
 */
var getComputedAriaRole = function () {
    if (this.hasAttribute('role')) {
        var role = this.getAttribute('role');
        if (role.trim().length > 0) {
            var roles = role.split(' ');
            var computedRole = null;
            if (roles.length > 1) {
                for (var i = 0; i < roles.length; i++) {
                    role = new ARIA.Role(roles[i]);
                    if (role.isValid()) {
                        computedRole = role.role;
                        break;
                    }
                }
                if (computedRole) {
                    if (computedRole == 'presentation' || computedRole == 'none') {
                        if (this.matches(HTML.getFocusableElementsSelector())) {
                            return this.getImplicitAriaRole();
                        }
                    }
                    return computedRole;
                }
                else {
                    return this.getImplicitAriaRole();
                }
            }
            else {
                role = new ARIA.Role(role);
                if (role.isValid()) {
                    if (role.role == 'presentation' || role.role == 'none') {
                        if (this.matches(HTML.getFocusableElementsSelector())) {
                            return this.getImplicitAriaRole();
                        }
                    }
                    return role.role;
                }
                else {
                    return this.getImplicitAriaRole();
                }
            }
        }
        else {
            return this.getImplicitAriaRole();
        }
    }
    else {
        return this.getImplicitAriaRole();
    }
};

var hasValidRole = function () {
    var role = this.getAttribute('role');
    if (role.trim().length > 0) {
        role = role.split(' ');
        if (role.length > 1) {
            var result = false;
            for (var i = 0; i < role.length; i++) {
                var token = new ARIA.Role(role[i]);
                if (token.isValid()) {
                    result = true;
                    break;
                }
            }
            return result;
        }
        else {
            role = new ARIA.Role(role);
            return role.isValid();
        }
    }
    else {
        return false;
    }
};
var getAvailableARIASemantics = function () {
    var selectors = [];
    switch (this.tagName.toLowerCase()) {
        case 'a':
            if (this.hasAttribute('href')) {
                selectors.push('[role="button"]', '[role="checkbox"]', '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="option"]', '[role="radio"]', '[role="switch"]', '[role="tab"]', '[role="treeitem"]');
            }
            else {

                for(let i = 0; i < ariaroles.length; i++) {
                    selectors.push('[role="' + ariaroles[i] + '"]');
                }
            }
            break;
        case 'abbr':
        case 'address':
        case 'b':
        case 'bdi':
        case 'bdo':
        case 'blockquote':
        case 'br':
        case 'canvas':
        case 'cite':
        case 'code':
        case 'del':
        case 'dfn':
        case 'div':
        case 'em':
        case 'i':
        case 'ins':
        case 'kbd':
        case 'mark':
        case 'output':
        case 'p':
        case 'pre':
        case 'q':
        case 'rp':
        case 'rt':
        case 'ruby':
        case 's':
        case 'samp':
        case 'small':
        case 'span':
        case 'strong':
        case 'sub':
        case 'sup':
        case 'table':
        case 'tbody':
        case 'td':
        case 'tfoot':
        case 'th':
        case 'thead':
        case 'time':
        case 'tr':
        case 'u':
        case 'var':
        case 'wbr':
            for(let i = 0; i < ariaroles.length; i++) {
                selectors.push('[role="' + ariaroles[i] + '"]');
            }
            break;
        case 'article':
            selectors.push('[role="application"]', '[role="document"]', '[role="feed"]', '[role="main"]', '[role="presentation"]', '[role="region"]');
            break;
        case 'aside':
            selectors.push('[role="feed"]', '[role="note"]', '[role="presentation"]', '[role="region"]', '[role="search"]');
            break;
        case 'audio':
        case 'video':
            selectors.push('[role="application"]');
            break;
        case 'button':
            if (this.getAttribute('type') == 'menu') { // Invalid Type.
                selectors.push('[role="link"]', '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="radio"]');
            }
            else {
                selectors.push('[role="checkbox"]', '[role="link"]', '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="radio"]', '[role="switch"]', '[role="tab"]');
            }
            break;
        case 'dialog':
            selectors.push('[role="alertdialog"]');
            break;
        case 'dl':
        case 'figcaption':
        case 'fieldset':
        case 'figure':
        case 'footer':
        case 'header':
            selectors.push('[role="group"]', '[role="presentation"]');
        case 'embed':
            selectors.push('[role="application"]', '[role="document"]', '[role="img"]', '[role="presentation"]');
            break;
        case 'form':
            selectors.push('[role="search"]', '[role="presentation"]');
            break;
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            selectors.push('[role="presentation"]', '[role="tab"]');
            break;
        case 'iframe':
        case 'object':
        case 'svg':
            selectors.push('[role="application"]', '[role="document"]', '[role="img"]');
            break;
        case 'hr':
            selectors.push('[role="presentation"]');
            break;
        case 'img':
            if (this.getAttribute('alt') == '') {
                selectors.push('[role="none"]', '[role="presentation"]');
            }
            else {
                for(let i = 0; i < ariaroles.length; i++) {
                    selectors.push('[role="' + ariaroles[i] + '"]');
                }
            }
            break;
        case 'input':
            switch (this.getAttribute('type')) {
                case 'button':
                    selectors.push('[role="link"]', '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="radio"]', '[role="switch"]', '[role="tab"]');
                    break;
                case 'checkbox':
                    selectors.push('[role="button"][aria-pressed="' + (this.checked ? 'true' : 'false') + '"]', '[role="menuitemcheckbox"]', '[role="option"]', '[role="switch"]');
                    break;
                case 'image':
                    selectors.push('[role="link"]', '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="radio"]', '[role="switch"]');
                    break;
                case 'radio':
                    selectors.push('[role="menuitemradio"]');
                    break;
            }
            break;
        case 'li':
            if (['ol', 'ul'].indexOf(this.parentNode.tagName.toLowerCase()) > -1) {
                selectors.push('[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="option"]', '[role="presentation"]', '[role="radio"]', '[role="separator"]', '[role="tab"]', '[role="treeitem"]');
            }
            break;
        case 'ol':
        case 'ul':
            selectors.push('[role="directory"]', '[role="group"]', '[role="listbox"]', '[role="menu"]', '[role="menubar"]', '[role="presentation"]', '[role="radiogroup"]', '[role="tablist"]', '[role="toolbar"]', '[role="tree"]');
            break;
        case 'section':
            selectors.push('[role="alert"]', '[role="alertdialog"]', '[role="application"]', '[role="banner"]', '[role="complementary"]', '[role="contentinfo"]', '[role="dialog"]', '[role="document"]', '[role="feed"]', '[role="log"]', '[role="main"]', '[role="marquee"]', '[role="navigation"]', '[role="search"]', '[role="status"]', '[role="tabpanel"]');
            break;
        case 'select':
            selectors.push('[role="menu"]');
            break;
        case 'summary':
            var parent = this.parentNode;
            if (parent.tagName.toLowerCase() == 'details') {
                selectors.push('[role="button"][aria-expanded="' + (parent.open ? 'true' : 'false') + '"]');
            }
            break;
    }
    return selectors;
}

var getHTMLElementImplicitARIASemantic = function () {
    var selector = undefined;
    switch (this.tagName.toLowerCase()) {
        case 'a':
        case 'area':
            selector = this.hasAttribute('href') ? '[role="link"]' : undefined; // Tester la bonne implémentation (map ok) ???
            break;
        case 'article':
            selector = '[role="article"]';
            break;
        case 'aside':
            selector = '[role="complementary"]';
            break;
        case 'body':
            selector = '[role="document"]';
            break;
        case 'button':
            selector = '[role="button"]';
            break;
        case 'datalist':
            selector = '[role="listbox"]';
            break;
        case 'dd':
            selector = '[role="definition"]';
            break;
        case 'details':
            selector = '[role="group"]';
            break;
        case 'dialog':
            selector = '[role="dialog"]';
            break;
        case 'dl':
            selector = '[role="list"]';
            break;
        case 'dt':
            selector = '[role="listitem"]';
            break;
        case 'figure':
            selector = '[role="figure"]';
            break;
        case 'footer':
        case 'header':
            selector = this.tagName.toLowerCase() == 'footer' ? '[role="contentinfo"]' : '[role="banner"]';
            var deleteid = false;
            if (!this.hasAttribute('id')) {
                this.setAttribute('id', 'is-contentinfo_or_banner');
                deleteid = true;
            }
            var elementref = this.tagName.toLowerCase() + '#' + this.getAttribute('id');
            var hasparent = ['article', 'aside', 'main', 'nav', 'section'];
            if (this == document.querySelector(hasparent.join(' ' + elementref + ', ') + ' ' + elementref)) {
                selector = undefined;
            }
            if (deleteid) {
                this.removeAttribute('id');
            }
            break;
        case 'form':
            selector = '[role="form"]';
            break;
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            selector = '[role="heading"][aria-level="' + this.tagName.substr(1) + '"]';
            break;
        case 'hr':
            selector = '[role="separator"]';
            break;
        case 'img':
            selector = this.getAttribute('alt') == '' ? undefined : '[role="img"]';
            break;
        case 'input':
            var inputtype = this.hasAttribute('type') ? (['button', 'checkbox', 'color', 'date', 'datetime', 'email', 'file', 'hidden', 'image', 'month', 'number', 'password', 'radio', 'range', 'reset', 'search', 'submit', 'tel', 'text', 'time', 'url', 'week'].indexOf(this.getAttribute('type')) > -1 ? this.getAttribute('type') : 'text') : 'text';
            if (['button', 'image', 'reset', 'submit'].indexOf(inputtype) > -1) {
                selector = '[role="button"]';
            }
            else if (inputtype == 'checkbox') {
                selector = '[role="checkbox"]';
            }
            else if (['email', 'tel', 'text', 'url'].indexOf(inputtype) > -1) {
                if (!this.hasAttribute('list')) {
                    selector = '[role="textbox"]';
                }
                else {
                    selector = '[role="combobox"]';
                }
            }
            else if (inputtype == 'number') {
                selector = '[role="spinbutton"]';
            }
            else if (inputtype == 'radio') {
                selector = '[role="radio"]';
            }
            else if (inputtype == 'range') {
                selector = '[role="slider"]';
            }
            else if (inputtype == 'search') {
                if (!this.hasAttribute('list')) {
                    selector = '[role="searchbox"]';
                }
                else {
                    selector = '[role="combobox"]';
                }
            }
            break;
        case 'li':
            if (['ol', 'ul'].indexOf(this.parentNode.tagName.toLowerCase()) > -1) {
                selector = '[role="listitem"]';
            }
            break;
        case 'link':
            if (this.hasAttribute('href')) {
                selector = '[role="link"]';
            }
            break;
        case 'main':
            selector = '[role="main"]';
            break;
        case 'menu':
            if (this.getAttribute('type') == 'context') {
                selector = '[role="menu"]';
            }
            break;
        case 'menuitem':
            switch (this.getAttribute('type')) {
                case 'checkbox':
                    selector = '[role="menuitemcheckbox"]';
                    break;
                case 'command':
                    selector = '[role="menuitem"]';
                    break;
                case 'radio':
                    selector = '[role="menuitemradio"]';
                    break;
            }
            break;
        case 'nav':
            selector = '[role="navigation"]';
            break;
        case 'ol':
        case 'ul':
            selector = '[role="list"]';
            break;
        case 'optgroup':
            selector = '[role="group"]';
            break;
        case 'option':
            if (['datalist', 'select'].indexOf(this.parentNode.tagName.toLowerCase()) > -1) {
                selector = '[role="option"]';
            }
            break;
        case 'output':
            selector = '[role="status"]';
            break;
        case 'progress':
            selector = '[role="progressbar"]';
            break;
        case 'section':
            selector = '[role="region"]';
            break;
        case 'select':
            selector = '[role="listbox"]';
            break;
        case 'summary':
            var parent = this.parentNode;
            if (parent.tagName.toLowerCase() == 'details') {
                selector = '[role="button"][aria-expanded="' + (parent.hasAttribute('open') ? 'true' : 'false') + '"]';
            }
            break;
        case 'table':
            selector = '[role="table"]';
            break;
        case 'textarea':
            selector = '[role="textbox"]';
            break;
        case 'tbody':
        case 'thead':
        case 'tfoot':
            selector = '[role="rowgroup"]';
            break;
        case 'td':
            selector = '[role="cell"]';
            break;
        case 'th':
            if (this.getAttribute('scope') == 'col') {
                selector = '[role="columnheader"]';
            }
            else if (this.getAttribute('scope') == 'row') {
                selector = '[role="rowheader"];'
            }
            else if (this.hasAttribute('id')) { }
            break;
        case 'tr':
            selector = '[role="row"]';
            break;
    }
    return selector;
}

var getUnknowElementImplicitARIASemantic = function () {
    var selector = undefined;
    switch (this.tagName.toLowerCase()) {
        case 'bdi': /* Firefox */
            break;
        case 'datalist': /* Safari */
            selector = '[role="listbox"]';
            break;
        case 'dialog': /* Firefox & Safari */
            selector = '[role="dialog"]';
            break;
        case 'menuitem': /* Safari */
            switch (this.getAttribute('type')) {
                case 'checkbox':
                    selector = '[role="menuitemcheckbox"]';
                    break;
                case 'command':
                    selector = '[role="menuitem"]';
                    break;
                case 'radio':
                    selector = '[role="menuitemradio"]';
                    break;
            }
            break;
    }
    return selector;
}

var getElementImplicitARIASemantic = function () {
    var selector = undefined;
    switch (this.tagName.toLowerCase()) {
        case 'math':
            selector = '[role="math"]';
            break;
    }
    return selector;
}

var isString1MatchString2 = function(string1, string2) {
        string1 = string1.toLowerCase().trim();
        string1 = string1.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        string1 = string1.replace(/[^a-z0-9\-_\s]/g, " ");
        string1 = string1.replace(/\s{2,}/g, " ").trim();

        string2 = string2.toLowerCase().trim();
        string2 = string2.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        string2 = string2.replace(/[^a-z0-9\-_\s]/g, " ");
        string2 = string2.replace(/\s{2,}/g, " ").trim();

        if(string2.length === 0) return null
        else if(string1.match(string2)) return true
        else return false
}
function getDuplicateID() {
    var nodelist = document.querySelectorAll('[id]:not([id=""])');
    var ids = [];
    var query = null;
    nodelist.forEach(node => {
        if (node.getAttribute('id').trim().length > 0) {
            if(!node.getAttribute('id').match(/\s/)) {
                if(ids[node.getAttribute('id')] && ids[node.getAttribute('id')] < 2) {
                    var startDigit = /^\d/;
                    var id = node.getAttribute('id');

                    if(id.match(startDigit)) {
                        id = '\\3'+id.substring(0, 1)+' '+id.substring(1, id.length).replace(/[!"#$%&'()*+,-./:;<=>?@[\]^`{|}~]/g, "\\$&");
                    } else {
                        id = id.replace(/[!"#$%&'()*+,-./:;<=>?@[\]^`{|}~]/g, "\\$&");
                    }
    
                    query = query === null ? '' : query;
                    query += '[id='+id+'],'
                }
    
                if (!ids[node.getAttribute('id')]) {
                    ids[node.getAttribute('id')] = 0;
                }
    
                ids[node.getAttribute('id')]++;
            }
            
            else node.setAttribute('data-tng-invalid-id', 'true');
            
        }
    });

    query = query === null ? query : query.slice(0, -1);
    return document.querySelectorAll(query);
}
/**
 * get array of headings hierarchy
 * * use [manageTests.js]
 */
 function getHeadingsMap() {
    initTanaguru();
    var collection = document.querySelectorAll('h1[data-tng-el-exposed="true"]:not([role]), h2[data-tng-el-exposed="true"]:not([role]), h3[data-tng-el-exposed="true"]:not([role]), h4[data-tng-el-exposed="true"]:not([role]), h5[data-tng-el-exposed="true"]:not([role]), h6[data-tng-el-exposed="true"]:not([role]), [role="heading"][data-tng-el-exposed="true"][aria-level]');
    collection = Array.from(collection).sort((a,b) => {
        return a.getAttribute('data-tng-pos') - b.getAttribute('data-tng-pos');
    });

    // var structure = [];
    var structure = window.tanaguru.headings;
    var lastPost = null;
    var lastLvl = [];
    var index = 1;

    function getHeadingInfos(el, currentlevel, previousLevel) {
        let error = index > 2 && currentlevel - previousLevel > 1 ? true : false;

        el.setAttribute('sdata-tng-hindex', index);
        if(error) el.setAttribute('data-tng-herror', 'true');
        
        let result = {
            index: index,
            tag: el.tagName.toLowerCase(),
            level: currentlevel,
            an: el.innerText.trim(),
            xpath: getXPath(el),
            error: error
        };
        index++;
        return result;
    }

    for(let i = 0; i < collection.length; i++) {
        let previousLevel = collection[i-1] ? (!collection[i-1].hasAttribute('role') ? collection[i-1].tagName.toLowerCase().split('h')[1] : collection[i-1].getAttribute('aria-level')) : null;
        let currentlevel = !collection[i].hasAttribute('role') ? collection[i].tagName.toLowerCase().split('h')[1] : collection[i].getAttribute('aria-level');

        let element = getHeadingInfos(collection[i], currentlevel, previousLevel);

        if(previousLevel) {
            if(previousLevel == currentlevel) {
                lastPost.push(element);
            } else if(previousLevel < currentlevel) {
                lastPost.push([element]);
                lastLvl.push(lastPost.length-1);
                lastPost = lastPost[lastPost.length-1];
            } else {
                if(lastLvl.length > 1 && (previousLevel - currentlevel) < lastLvl.length) {
                    for(let x = 0; x < previousLevel - currentlevel; x++) {
                        lastLvl.pop();
                    }
                    let key = "["+lastLvl.join('][')+"]";
                    lastPost = eval("structure"+key);
                    lastPost.push(element);
                }
                else if(lastLvl.length > 1 && currentlevel > 1) {
                    var eureka = false;
                    for(let x = 0; x < lastLvl.length; x++) {
                        lastLvl.pop();
                        let key = "["+lastLvl.join('][')+"]";
                        lastPost = eval("structure"+key);

                        if(parseInt(lastPost[0].level) === parseInt(currentlevel)) {
                            lastPost.push(element);
                            eureka = true;
                            break;
                        }
                    }

                    if(!eureka) {
                        structure.push([element]);
                        lastPost = structure[structure.length-1];
                        lastLvl = [structure.length-1];
                    }
                }
                else {
                    structure.push([element]);
                    lastPost = structure[structure.length-1];
                    lastLvl = [structure.length-1];
                }
            }
        } else {
            structure.push([element]);
            lastPost = structure[0];
            lastLvl.push(0);
        }
    }
}

function cleanSDATA() {
    let datas = document.querySelectorAll('[sdata-tng-hindex]');
    datas.forEach(el => el.removeAttribute('sdata-tng-hindex'));
    if(window.tanaguru && window.tanaguru.headings) {
        delete window.tanaguru.headings;
    }
}
/**
 ** use [htmlDatas.js]
 */
var getImplicitAriaRole = function () {
    if (htmlData.elements.hasOwnProperty(this.tagName.toLowerCase())) {
        var elementData = htmlData.elements[this.tagName.toLowerCase()];
        if (elementData.hasOwnProperty('implicitAriaRole')) {
            var result = null;
            var implicitAriaRole = elementData.implicitAriaRole;
            switch (implicitAriaRole.constructor) {
                case String:
                    result = implicitAriaRole;
                    break;
                case Object:
                    for (var selector in implicitAriaRole) {
                        if (this.matches(selector)) {
                            if (implicitAriaRole[selector].constructor == Object) {
                                if (implicitAriaRole[selector].type == 'integer' && implicitAriaRole[selector].hasOwnProperty('greaterthan')) {
                                    var attributeValue = this.getAttribute(implicitAriaRole[selector].attribute);
                                    if (/^(0|[1-9]\d*)$/.test(attributeValue)) {
                                        result = parseInt(attributeValue) > implicitAriaRole[selector].greaterthan;
                                        result = implicitAriaRole[selector].role[result ? 1 : 0];
                                    }
                                    else {
                                        result = implicitAriaRole[selector].role[0];
                                    }
                                }
                            }
                            else {
                                result = implicitAriaRole[selector];
                            }
                            break;
                        }
                    }
                    break;
            }
            return result;
        }
        else {
            return null;
        }
    }
    else {
        return undefined;
    }
};

var getImplicitAriaRoleCategory = function () {
    if (htmlData.elements.hasOwnProperty(this.tagName.toLowerCase())) {
        var elementData = htmlData.elements[this.tagName.toLowerCase()];
        if (elementData.hasOwnProperty('category')) {
            return elementData.category;
        }
        else {
            return null;
        }
    }
    else {
        return undefined;
    }
};
var isNotExposedDueTo = function () {
    var result = [];
    if (this.getAttribute('aria-hidden') == 'true') {
        result.push('aria:hidden');
    }
    else {
        var pt = this.parentNode;
        while (pt && pt.nodeType == 1) {
            if (pt.getAttribute('aria-hidden') == 'true') {
                result.push('parent-aria:hidden');
                break;
            }
            pt = pt.parentNode;
        }
    }
    if (!this.matches('area')) {
        if (window.getComputedStyle(this, null).getPropertyValue('display') == 'none') {
            result.push('css:display');
        }
        else {
            var parent = this.parentNode;
            while (parent && parent.nodeType == 1) {
                if (window.getComputedStyle(parent, null).getPropertyValue('display') == 'none') {
                    result.push('css:display');
                    break;
                }
                parent = parent.parentNode;
            }
        }
    }
    
    if (window.getComputedStyle(this, null).getPropertyValue('visibility') == 'hidden') {
        result.push('css:visibility');
    }
    if (this.matches('area')) {
        var pt = this.parentNode;
        if (pt && pt.matches('map')) {
            if (pt.hasAttribute('name')) {
                var img = document.querySelector('img[usemap="#' + pt.getAttribute('name') + '"]');
                if (img) {
                    if (img.isNotExposedDueTo.length > 0) {
                        result.push('html:imagenotexposed');
                    }
                }
                else {
                    result.push('parent-html:noimage');
                }
            }
            else {
                result.push('parent-html:noname');
            }
        }
        else {
            result.push('parent-html:unknown');
        }
    }
    
    return result;
};
var canBeReachedUsingKeyboardWith = function () {
    var result = [];
    if(this instanceof HTMLElement) {
        if (!this.matches('[tabindex="-1"]')) {
            switch (this.tagName.toLowerCase()) {
                case 'a':
                case 'area':
                    if (this.hasAttribute('href')) {
                        result.push('html:' + this.tagName.toLowerCase());
                    }
                    break;
                case 'input':
                case 'select':
                case 'textarea':
                case 'summary': 
                case 'button':
                    if (!this.hasAttribute('disabled')) {
                        result.push('html:' + this.tagName.toLowerCase());
                    }
                    break;
                case 'iframe':
                    result.push('html:' + this.tagName.toLowerCase());
                    break;
            }
            if (this.hasAttribute('contenteditable') && this.getAttribute('contenteditable') == 'true') {
                result.push('html:contenteditable');
            }
            if (this.hasAttribute('tabindex') && parseInt(this.getAttribute('tabindex')) >= 0) {
                result.push('aria:tabindex');
            }
        }
    }
    else {
        if (this.hasAttribute('focusable')) {
            if (this.getAttribute('focusable') == 'true') {
                result.push('svg:focusable');
            }
        }
        if (!this.matches('[focusable="false"]') && this.hasAttribute('tabindex') && parseInt(this.getAttribute('tabindex')) >= 0) {
            result.push('aria:tabindex');
        }
    }
    
    return result;
}
// hasValidLanguageCode.
var hasValidLanguageCode = function () {
    var r = /^[a-z]{2,}(-[a-z]{2,})*$/i;
    var lang1 = this.hasAttribute('lang') ? this.getAttribute('lang') : null;
    var lang2 = this.hasAttribute('xml:lang') ? this.getAttribute('xml:lang') : null;

    if(lang1 !== null && lang2 !== null) {
        var langA = lang1.includes('-') ? lang1.split('-')[0] : lang1;
        var langB = lang2.includes('-') ? lang2.split('-')[0] : lang2;
        
        if(langA != langB) {
            return false;
        } else {
            var lang = lang1;
        }
    } else if(lang1) {
        var lang = lang1;
    } else if(lang2) {
        var lang = lang2;
    }

    if (lang && r.test(lang)) {
        var computedlang = lang;
        if (lang.includes('-')) {
            computedlang = lang.split('-');
            computedlang = computedlang[0];
        }
        return languages.data.hasOwnProperty(computedlang);
    }
    else {
        return false;
    }
};
//TODO recupérer les events appliqué via api
function listAllEventListeners() {
    var allElements = Array.from(document.body.querySelectorAll('*'));
    allElements.push(document.body);
    var types = [];
    for(let ev in window) {
      if(/^on/.test(ev)) types[types.length] = ev;
    //   console.log(ev);
    //   else if(/^jQuery/.test(ev) && ev.events.length > 0) types[types.length] = ev;
    }
  
    let elements = [];
    for(let i = 0; i < allElements.length; i++) {
      var currentElement = allElements[i];
      for(let j = 0; j < types.length; j++) {

        if(types[j] != 'onload' && typeof currentElement[types[j]] === 'function') {
          elements.push(currentElement);
        }
      }
    }
    return elements;
}

// listAllEventListeners();
/**
 *? Gestion des tests
 */
function getXPath(element) {
    var position = 0;
    if (element.parentNode && element.parentNode.nodeType == 1) {
        var children = element.parentNode.children;
        for (var i = 0; i < children.length; i++) {
            if (children[i].tagName.toLowerCase() == element.tagName.toLowerCase()) {
                position++;
            }
            if (children[i] == element) {
                break;
            }
        }
    }

    return (element.parentNode.nodeType == 1 ? getXPath(element.parentNode) : '') + '/' + element.tagName.toLowerCase() + '[' + (position ? position : '1') + ']' + (element.hasAttribute('id') && !element.getAttribute('id').match(/[\/\[\]]/g) && !element.id.match(/\s/) ? '[@id="' + element.getAttribute('id') + '"]' : '') + (element.hasAttribute('class') && !element.getAttribute('class').match(/[\/\[\]]/g) ? '[@class="' + element.getAttribute('class') + '"]' : '');
}

function initTanaguru() {
    if (!window.tanaguru) {
        window.tanaguru = {};
        window.tanaguru.tags = new Array();
        window.tanaguru.tests = new Array();
        window.tanaguru.headings = new Array();
    }
}

function addResultSet(name, data) {
    initTanaguru();
    window.tanaguru.tests.push(data);
}

function filterTestsByStatus(statuses) {
    if(window.tanaguru && window.tanaguru.tests) {
        if(statuses.length > 0) {
            function matchFilters(test) {
                return statuses.match(test.type);
            }
            window.tanaguru.tests = window.tanaguru.tests.filter(matchFilters);
        } else {
            window.tanaguru.tests = [];
        }
    }
}

function loadTanaguruTests() {
    initTanaguru();
    var tags = [];
    for (var tag in window.tanaguru.tags) {
        tags.push(window.tanaguru.tags[tag]);
    }

    var result = { tags: tags, tests: window.tanaguru.tests, headings: window.tanaguru.headings };

    window.tanaguru = undefined;
    return result;
}

function removeDataTNG(element) {
    let attr = element.attributes;
    let tngAttr = [];
    for(let i = 0; i < attr.length; i++) {
        if(attr[i].name.match(/^data-tng-.*$/)) {
            tngAttr.push(attr[i].name);
        }
    }
    tngAttr.forEach(data => {
        element.removeAttribute(data);
    });
}

function getFakeElement(clone) {
    removeDataTNG(clone);

    let fakeChildren = clone.querySelectorAll('*');
    for(let i = 0; i < fakeChildren.length; i++) {
        removeDataTNG(fakeChildren[i]);
    }

    var e = document.createElement(clone.tagName.toLowerCase());
    if (e && e.outerHTML.indexOf("/") != -1) {
        if (clone.innerHTML.length > 300) {
            clone.innerHTML =  '[...]';
        }
    }

    return clone;
}

function manageOutput(element, an, related) {
    var status = element.status ? element.status : 'cantTell';
    element.status = undefined;
    an = an ? element.fullAccessibleName : null;

    if(element.nodeType === 10) {
        var canBeReachedUsingKeyboardWith = [];
        var isVisible = false;
        var isNotExposedDueTo = '';

        var fakeelement = "<!DOCTYPE "+(element.name ? element.name : '')+(element.publicId ? ' PUBLIC "' + element.publicId + '"' : '')+(!element.publicId && element.systemId ? ' SYSTEM' : '')+(element.systemId ? ' "' + element.systemId + '"' : '')+'>';
        var e = null;
    } else {
        var canBeReachedUsingKeyboardWith = element.canBeReachedUsingKeyboardWith;
        var isVisible = element.getAttribute('data-tng-el-visible') === "true";
        var isNotExposedDueTo = element.hasAttribute('data-tng-notExposed') ? element.getAttribute('data-tng-notExposed') : '';

        var fakeelement = element.cloneNode(true);
        fakeelement = getFakeElement(fakeelement);

        var fakerelated = null;

        if(related) {
            var att_rgx = /(!!!)(?<att>.*)(!!!)/;
            var relatedHasVariable =  false;
            var relatedElement = null;

            if(related.match(att_rgx)) {
                relatedHasVariable = true;
                var att = related.match(att_rgx).groups.att;
                if(att && element.hasAttribute(att)) {
                    var selector = related.replace(att_rgx, element.getAttribute(att));
                    try {
                        relatedElement = document.querySelector(selector);
                    } catch(error) {
                        console.log(error);
                    }
                }
                
            } else {
                try {
                    relatedElement = document.querySelector(related);
                } catch(error) {
                    console.log(error);
                }
            }

            if(relatedElement) {
                fakerelated = relatedElement.cloneNode(true);
                fakerelated = getFakeElement(fakerelated);
            }
        }
    }

    return { 
        status: status,
        outer: element.nodeType !== 10 ? fakeelement.outerHTML : fakeelement,
        outerRelated: element.nodeType !== 10 && fakerelated ? fakerelated.outerHTML : null,
        anDetails: an,
        xpath: element.nodeType !== 10 ? getXPath(element) : null,
        canBeReachedUsingKeyboardWith: canBeReachedUsingKeyboardWith,
        isVisible: isVisible,
        isNotExposedDueTo: isNotExposedDueTo
    };
}

function createTanaguruTag(tag, status) {
    if (!window.tanaguru.tags[tag]) {
        window.tanaguru.tags[tag] = { id: tag, status: status, nbfailures: 0, isNA: 0 };
    }
}

function createTanaguruTest(test) {
    if (test.hasOwnProperty('status') && (test.status == 'untested' || test.status == 'inapplicable')) { // Non testés mais référencés.
        // Initialisation des tags.
        initTanaguru();
        if (test.hasOwnProperty('tags') && test.tags.constructor == Array) {
            for (var i = 0; i < test.tags.length; i++) {
                createTanaguruTag(test.tags[i], test.status);
                if(test.status == 'untested' && window.tanaguru.tags[test.tags[i]].status === 'inapplicable') {
                    window.tanaguru.tags[test.tags[i]].status = 'untested';
                }

                if(test.hasOwnProperty('na') && test.na === test.tags[i]) {
                    window.tanaguru.tags[test.na].isNA = 1;
                }
            }
        }
        else {
            createTanaguruTag('others', test.status);
            if(test.status == 'untested' && window.tanaguru.tags['others'].status === 'inapplicable') {
                window.tanaguru.tags['others'].status = 'untested';
            }
        }
        
        // Chargement du résultat.
        var result = {
            name: test.name,
            type: test.status,
            data: [],
            tags: []
        };
        if (test.hasOwnProperty('id')) {
            result.id = test.id;
        }
        if (test.hasOwnProperty('lang')) {
            result.lang = test.lang;
        }
        if (test.hasOwnProperty('description')) {
            result.description = test.description;
        }
        if (test.hasOwnProperty('explanations') && test.explanations.hasOwnProperty(test.status)) {
            result.explanation = test.explanations[test.status];
        }
        result.tags = test.hasOwnProperty('tags') ? test.tags : ['others'];
        if (test.hasOwnProperty('ressources')) {
            result.ressources = test.ressources;
        }
        addResultSet("Nouvelle syntaxe d'écriture des tests", result);
        // Intégrer chaque résultat dans window.tanaguru.tests.
    }
    else if ((test.hasOwnProperty('query') && test.query.constructor == String) || test.hasOwnProperty('contrast') || test.hasOwnProperty('code') || test.hasOwnProperty('node')) {
        // Sélection des éléments.
        if(test.hasOwnProperty('contrast')) {
            var elements = textNodeList[test.contrast];
        } else if(test.hasOwnProperty('code')) {
            var elements = getDuplicateID();
        } else if(test.hasOwnProperty('node')) {
            var elements = test.node ? [test.node] : [];
        } else {
            var elements = document.querySelectorAll(test.query);
        }

        // Traitement du test et ses résultats
        if (elements) {
            // Statut du test par défaut.
            var status = 'inapplicable';
            elements = Array.from(elements);

            // Initialisation des tags.
            initTanaguru();
            if (test.hasOwnProperty('tags') && test.tags.constructor == Array) {
                for (var i = 0; i < test.tags.length; i++) {
                    createTanaguruTag(test.tags[i], status);
                }
            }
            else createTanaguruTag('others', status);

            // Gestion du compteur d'éléments testés (avant filtre).
            var counter = null;
            if (test.hasOwnProperty('counter') && test.counter == 'beforefilter') {
                counter = elements.length;
            }

            // Filtre additionnel sur la sélection d'éléments.
            if (test.hasOwnProperty('filter')) {
                if (test.filter.constructor == Function) {
                    elements = elements.filter(test.filter);
                }
                else {
                    console.error("The value of the filter propertie must be a function.");
                }
            }

            // Gestion du compteur d'éléments testés (après filtre).
            if (test.hasOwnProperty('counter') && test.counter == 'afterfilter') {
                counter = elements.length;
            }

            // Calcul du statut du test.
            if (test.hasOwnProperty('expectedNbElements') && !test.hasOwnProperty('status')) {
                if (Number.isInteger(test.expectedNbElements)) {
                    status = elements.length == test.expectedNbElements ? 'passed' : 'failed';
                    for (var i = 0; i < elements.length; i++) {
                        elements[i].status = status;
                    }
                }
                else if (test.expectedNbElements.constructor == Object && (test.expectedNbElements.hasOwnProperty('min') || test.expectedNbElements.hasOwnProperty('max'))) {
                    var min = test.expectedNbElements.hasOwnProperty('min') && Number.isInteger(test.expectedNbElements.min) ? test.expectedNbElements.min : 0;
                    var max = test.expectedNbElements.hasOwnProperty('max') && Number.isInteger(test.expectedNbElements.max) ? test.expectedNbElements.max : null;
                    status = elements.length >= min && (max == null || elements.length <= max) ? 'passed' : 'failed';
                    for (var i = 0; i < elements.length; i++) {
                        elements[i].status = status;
                    }
                }
                else {
                    // Erreur : valeur de la propriété expectedNbElements.
                }
            }
            else {
                if(test.hasOwnProperty('testStatus') && typeof test.testStatus === 'string') {
                    let statusList = ['passed', 'cantTell', 'inapplicable', 'failed'];
                    if(statusList.includes(test.testStatus)) {
                        status = test.testStatus;
                        elements.map(e => e.status = status);
                    }
                }

                if (elements.length == 0) {
                    status = 'inapplicable'; // Voir si le statut "Non applicable" n'est possible que dans le cas d'un nombre d'éléments à vérifier.
                }
            }

            var statuspriority = {
                failed: 4,
                passed: 3,
                cantTell: 2,
                inapplicable: 1,
                untested: 0
            };

            // Traitement par collection.
            var failedincollection = 0;
            if (test.hasOwnProperty('analyzeElements') && !test.hasOwnProperty('status')) {
                if (test.analyzeElements.constructor == Function) {
                    test.analyzeElements(elements);
                    // On modifie le statut du test selon les statuts d'items.
                    for (var e = 0; e < elements.length; e++) {
                        if (elements[e].status == 'failed') {
                            // failedincollection = failedincollection == null ? 0 : failedincollection;
                            failedincollection += 1;
                        }
                        if (statuspriority[status] < statuspriority[elements[e].status]) {
                            status = elements[e].status;
                        }
                    }
                }
            } 

            // Mises à jour des tags (statut du tag et nombre de résultats en erreur).
            if (test.hasOwnProperty('tags') && test.tags.constructor == Array) {
                for (var i = 0; i < test.tags.length; i++) {
                    if(status === 'inapplicable' && window.tanaguru.tags[test.tags[i]].status === 'untested') continue;
                    if (statuspriority[window.tanaguru.tags[test.tags[i]].status] < statuspriority[status]) {
                        window.tanaguru.tags[test.tags[i]].status = status;
                    }
                    if (status == 'failed') {
                        window.tanaguru.tags[test.tags[i]].nbfailures += failedincollection ? failedincollection : (elements.length > 0 ? elements.length : 1);
                    }
                }
            }
            else {
                if(!(status === 'inapplicable' && window.tanaguru.tags['others'].status === 'untested')) {
                    if (statuspriority[window.tanaguru.tags['others'].status] < statuspriority[status]) {
                        window.tanaguru.tags['others'].status = status;
                    }
                    if (status == 'failed') {
                        window.tanaguru.tags['others'].nbfailures += failedincollection ? failedincollection : (elements.length > 0 ? elements.length : 1);
                    }
                }
            }

            let an = false;
            if(test.tags && test.tags.includes('accessiblename')) {
                an = true;
            }

            // Chargement du résultat.
            var outputelements = [];
            if(!test.hasOwnProperty('contrast')) {
                let related = null;
                if (test.hasOwnProperty('mark') && test.mark.constructor == Function) {
                    let mark = test.mark();
                    if(mark.hasOwnProperty('related') && mark.related.hasOwnProperty('element')) {
                        related = mark.related.element;
                    }
                }

                if(!an) {
                    outputelements = elements.map(e => manageOutput(e, false, related));
                } else {
                    outputelements = elements.map(e => manageOutput(e, true, related));
                }
            }
            
            if(test.hasOwnProperty('contrast')) {
                let contrastElLength = elements.length;
                for (var i = 0; i < contrastElLength; i++) {
                    var node = elements[i].node;

                    elements[i].canBeReachedUsingKeyboardWith = node.canBeReachedUsingKeyboardWith;
                    elements[i].isNotExposedDueTo = node.hasAttribute('data-tng-notExposed') ? node.getAttribute('data-tng-notExposed') : '';

                    delete elements[i].node;
                }
                
                outputelements = elements;
            }

            var result = {
                name: test.name,
                type: status,
                data: outputelements,
                tags: []
            };

            if(test.hasOwnProperty('id')) {
                result.id = test.id;
            }

            if(test.hasOwnProperty('lang')) {
                result.lang = test.lang;
            }

            if(test.hasOwnProperty('description')) {
                result.description = test.description;
            }

            if(test.hasOwnProperty('explanations') && test.explanations.hasOwnProperty(status)) {
                result.explanation = test.explanations[status];
            }

            if(test.hasOwnProperty('mark') && test.mark.constructor == Function) {
                result.mark = test.mark();
            }

            result.tags = test.hasOwnProperty('tags') ? test.tags : ['others'];

            if(test.hasOwnProperty('ressources')) {
                result.ressources = test.ressources;
            }

            if(test.hasOwnProperty('warning')) {
                result.warning = test.warning;
            }

            if(counter) {
                result.counter = counter;
            }

            if(failedincollection) {
                result.failedincollection = failedincollection;
            }
            
            addResultSet("Nouvelle syntaxe d'écriture des tests", result);
        }

        else console.log("Requête invalide, vérifier le sélecteur CSS: "+test.query);
    }
}
/**
 *? ariaSemantic.js
 */
if (!HTMLElement.prototype.hasOwnProperty('availableARIASemantics')) Object.defineProperty(HTMLElement.prototype, 'availableARIASemantics', { get: getAvailableARIASemantics });

var isARIARoleAllowedOnMe = function () { return this.availableARIASemantics.indexOf('[role="' + role + '"]') > -1; };
if (!('isARIARoleAllowedOnMe' in HTMLElement.prototype)) HTMLElement.prototype.isARIARoleAllowedOnMe = isARIARoleAllowedOnMe;

/**
 * ? accessibleName.js
 */
if (!SVGElement.prototype.hasOwnProperty('fullAccessibleName')) Object.defineProperty(SVGElement.prototype, 'fullAccessibleName', { get: getAccessibleName });
if (!HTMLElement.prototype.hasOwnProperty('fullAccessibleName')) Object.defineProperty(HTMLElement.prototype, 'fullAccessibleName', { get: getAccessibleName });

var accessibleName = function () { return this.fullAccessibleName[0]; };
if (!('accessibleName' in SVGElement.prototype)) SVGElement.prototype.accessibleName = accessibleName;
if (!('accessibleName' in HTMLElement.prototype)) HTMLElement.prototype.accessibleName = accessibleName;

var hasAccessibleName = function () { return this.fullAccessibleName[0].length > 0; };
if (!('hasAccessibleName' in SVGElement.prototype)) SVGElement.prototype.hasAccessibleName = hasAccessibleName;
if (!('hasAccessibleName' in HTMLElement.prototype)) HTMLElement.prototype.hasAccessibleName = hasAccessibleName;

/**
 * ? implicitAriaRole.js
 */
if (!('getImplicitAriaRole' in HTMLElement.prototype)) HTMLElement.prototype.getImplicitAriaRole = getImplicitAriaRole;
if (!('getImplicitAriaRole' in SVGElement.prototype)) SVGElement.prototype.getImplicitAriaRole = getImplicitAriaRole;

if (!('getImplicitAriaRoleCategory' in HTMLElement.prototype)) HTMLElement.prototype.getImplicitAriaRoleCategory = getImplicitAriaRoleCategory;
if (!('getImplicitAriaRoleCategory' in SVGElement.prototype)) SVGElement.prototype.getImplicitAriaRoleCategory = getImplicitAriaRoleCategory;

/**
 * ? ariaRoles.js
 */
if (!('getComputedAriaRole' in HTMLElement.prototype)) HTMLElement.prototype.getComputedAriaRole = getComputedAriaRole;
if (!('getComputedAriaRole' in SVGElement.prototype)) SVGElement.prototype.getComputedAriaRole = getComputedAriaRole;

if (!('hasValidRole' in HTMLElement.prototype)) HTMLElement.prototype.hasValidRole = hasValidRole;
if (!('hasValidRole' in SVGElement.prototype)) SVGElement.prototype.hasValidRole = hasValidRole;

/**
 * ? ariaAttributes.js
 */
if (!('hasInvalidAriaAttributes' in HTMLElement.prototype)) HTMLElement.prototype.hasInvalidAriaAttributes = hasInvalidAriaAttributes;
if (!('hasInvalidAriaAttributes' in SVGElement.prototype)) SVGElement.prototype.hasInvalidAriaAttributes = hasInvalidAriaAttributes;

if (!('hasAriaAttributesWithInvalidValues' in HTMLElement.prototype)) HTMLElement.prototype.hasAriaAttributesWithInvalidValues = hasAriaAttributesWithInvalidValues;
if (!('hasAriaAttributesWithInvalidValues' in SVGElement.prototype)) SVGElement.prototype.hasAriaAttributesWithInvalidValues = hasAriaAttributesWithInvalidValues;

if (!('hasProhibitedAriaAttributes' in HTMLElement.prototype)) HTMLElement.prototype.hasProhibitedAriaAttributes = hasProhibitedAriaAttributes;
if (!('hasProhibitedAriaAttributes' in SVGElement.prototype)) SVGElement.prototype.hasProhibitedAriaAttributes = hasProhibitedAriaAttributes;

/**
 * ? language.js
 */
 if (!('hasValidLanguageCode' in SVGElement.prototype)) SVGElement.prototype.hasValidLanguageCode = hasValidLanguageCode;
 if (!('hasValidLanguageCode' in HTMLElement.prototype)) HTMLElement.prototype.hasValidLanguageCode = hasValidLanguageCode;

/**
 * ? isNotExposedDueTo.js
 */
if (!HTMLElement.prototype.hasOwnProperty('isNotExposedDueTo')) Object.defineProperty(HTMLElement.prototype, 'isNotExposedDueTo', { get: isNotExposedDueTo });
if (!SVGElement.prototype.hasOwnProperty('isNotExposedDueTo')) Object.defineProperty(SVGElement.prototype, 'isNotExposedDueTo', { get: isNotExposedDueTo });

/**
 * ? contrast.js
 */
var isVisible = function () {
    return getVisibility(this);
};

if (!HTMLElement.prototype.hasOwnProperty('isVisible')) Object.defineProperty(HTMLElement.prototype, 'isVisible', { get: isVisible });
if (!SVGElement.prototype.hasOwnProperty('isVisible')) Object.defineProperty(SVGElement.prototype, 'isVisible', { get: isVisible });

/**
 * ? canBeReachedUsingKeyboardWith.js
 */
if (!SVGElement.prototype.hasOwnProperty('canBeReachedUsingKeyboardWith')) Object.defineProperty(SVGElement.prototype, 'canBeReachedUsingKeyboardWith', { get: canBeReachedUsingKeyboardWith });
if (!HTMLElement.prototype.hasOwnProperty('canBeReachedUsingKeyboardWith')) Object.defineProperty(HTMLElement.prototype, 'canBeReachedUsingKeyboardWith', { get: canBeReachedUsingKeyboardWith });

/**
 * ? compareStrings.js
 */
if (!('isString1MatchString2' in HTMLElement.prototype)) HTMLElement.prototype.isString1MatchString2 = isString1MatchString2;
if (!('isString1MatchString2' in SVGElement.prototype)) SVGElement.prototype.isString1MatchString2 = isString1MatchString2;
// TODO: début RGAA.
var tanaguruTestsList = [];
var webextVersion = "5.1.0";

/**
 *? COULEURS
 ** tous les tests sont répertoriés
 *! dépendance contrast.js sur tous les tests
 *TODO prendre en compte les attributs tel quel "value" ou "placeholder" dans les tests du critère 3.2
 *TODO 3.3.1 répertorier les indications de couleur & les propriétés CSS déterminant une couleur
 *TODO identifier les mécanismes de contraste
 *! voir si l'on peut traiter certains éléments graphique
 */

//* 3.1 Dans chaque page web, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
// 3.1.1 Pour chaque mot ou ensemble de mots dont la mise en couleur est porteuse d'information, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_0",
    description: "locale__colors_description_1",
    query: '[data-tng-colorization][data-tng-el-visible="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'colors'],
    ressources: {'rgaa': ['3.1.1']}
});

// 3.1.2 Pour chaque indication de couleur donnée par un texte, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_2",
    description: "locale__colors_description_3",
    query: '[data-tng-colorindication][data-tng-el-visible="true"], [data-tng-colorindication][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'colors'],
    ressources: {'rgaa': ['3.1.2']}
});

// 3.1.3 Pour chaque image véhiculant une information, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_4",
    status: 'untested',
    tags: ['a11y', 'colors'],
    ressources: {'rgaa': ['3.1.3']}
});

// 3.1.4 Pour chaque propriété CSS déterminant une couleur et véhiculant une information, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_5",
    status: 'untested',
    tags: ['a11y', 'colors'],
    ressources: {'rgaa': ['3.1.4']}
});

// 3.1.5 Pour chaque média temporel véhiculant une information, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_6",
    status: 'untested',
    tags: ['a11y', 'colors'],
    ressources: {'rgaa': ['3.1.5']}
});

// 3.1.6 Pour chaque média non temporel véhiculant une information, l'information ne doit pas être donnée uniquement par la couleur. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_7",
    status: 'untested',
    tags: ['a11y', 'colors'],
    ressources: {'rgaa': ['3.1.6']}
});

//* 3.2 Dans chaque page web, le contraste entre la couleur du texte et la couleur de son arrière-plan est-il suffisamment élevé (hors cas particuliers) ?
// 3.2.1 Dans chaque page web, le texte et le texte en image sans effet de graisse d'une taille restituée inférieure à 24px vérifient-ils une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
    contrast: 'invalid_45',
    lang: 'fr',
    name: "locale__colors_name_8",
    description: "locale__colors_description_9",
    tags: ['a11y', 'contrast', 'colors'],
    testStatus: "failed",
    ressources: {'rgaa': ['3.2.1']}
});

tanaguruTestsList.push({
    contrast: 'valid_45',
    lang: 'fr',
    name: "locale__colors_name_10",
    testStatus: "passed",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.1']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_45',
    lang: 'fr',
    name: "locale__colors_name_11",
    description: "locale__colors_description_9",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.1']}
});

tanaguruTestsList.push({
    contrast: 'invalid_45V',
    lang: 'fr',
    name: "locale__colors_name_13",
    description: "locale__colors_description_14",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.1']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_45V',
    lang: 'fr',
    name: "locale__colors_name_15",
    description: "locale__colors_description_16",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.1']}
});

tanaguruTestsList.push({
    contrast: 'valid_45V',
    lang: 'fr',
    name: "locale__colors_name_17",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.1']}
});

// 3.2.2 Dans chaque page web, le texte et le texte en image en gras d’une taille restituée inférieure à 18,5px vérifient-ils une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    contrast: 'invalid_45G',
    lang: 'fr',
    name: "locale__colors_name_18",
    description: "locale__colors_description_9",
    tags: ['a11y', 'contrast', 'colors'],
    testStatus: "failed",
    ressources: {'rgaa': ['3.2.2']}
});

tanaguruTestsList.push({
    contrast: 'valid_45G',
    lang: 'fr',
    name: "locale__colors_name_20",
    testStatus: "passed",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.2']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_45G',
    lang: 'fr',
    name: "locale__colors_name_21",
    description: "locale__colors_description_9",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.2']}
});

tanaguruTestsList.push({
    contrast: 'invalid_45GV',
    lang: 'fr',
    name: "locale__colors_name_23",
    description: "locale__colors_description_14",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.2']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_45GV',
    lang: 'fr',
    name: "locale__colors_name_25",
    description: "locale__colors_description_16",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.2']}
});

tanaguruTestsList.push({
    contrast: 'valid_45GV',
    lang: 'fr',
    name: "locale__colors_name_27",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.2']}
});

// 3.2.3 Dans chaque page web, le texte et le texte en image sans effet de graisse d’une taille restituée supérieure ou égale à 24px vérifient-ils une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
    contrast: 'invalid_3',
    lang: 'fr',
    name: "locale__colors_name_28",
    description: "locale__colors_description_9",
    tags: ['a11y', 'contrast', 'colors'],
    testStatus: "failed",
    ressources: {'rgaa': ['3.2.3']}
});

tanaguruTestsList.push({
    contrast: 'valid_3',
    lang: 'fr',
    name: "locale__colors_name_30",
    testStatus: "passed",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.3']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_3',
    lang: 'fr',
    name: "locale__colors_name_31",
    description: "locale__colors_description_9",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.3']}
});

tanaguruTestsList.push({
    contrast: 'invalid_3V',
    lang: 'fr',
    name: "locale__colors_name_33",
    description: "locale__colors_description_34",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.3']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_3V',
    lang: 'fr',
    name: "locale__colors_name_35",
    description: "locale__colors_description_36",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.3']}
});

tanaguruTestsList.push({
    contrast: 'valid_3V',
    lang: 'fr',
    name: "locale__colors_name_37",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.3']}
});

// 3.2.4 Dans chaque page web, le texte et le texte en image en gras d'une taille restituée supérieure ou égale à 18,5px vérifient-ils une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
    contrast: 'invalid_3G',
    lang: 'fr',
    name: "locale__colors_name_38",
    description: "locale__colors_description_9",
    tags: ['a11y', 'contrast', 'colors'],
    testStatus: "failed",
    ressources: {'rgaa': ['3.2.4']}
});

tanaguruTestsList.push({
    contrast: 'valid_3G',
    lang: 'fr',
    name: "locale__colors_name_40",
    testStatus: "passed",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.4']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_3G',
    lang: 'fr',
    name: "locale__colors_name_41",
    description: "locale__colors_description_9",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.4']}
});

tanaguruTestsList.push({
    contrast: 'invalid_3GV',
    lang: 'fr',
    name: "locale__colors_name_43",
    description: "locale__colors_description_34",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.4']}
});

tanaguruTestsList.push({
    contrast: 'cantTell_3GV',
    lang: 'fr',
    name: "locale__colors_name_45",
    description: "locale__colors_description_36",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.4']}
});

tanaguruTestsList.push({
    contrast: 'valid_3GV',
    lang: 'fr',
    name: "locale__colors_name_47",
    testStatus: "inapplicable",
    tags: ['a11y', 'contrast', 'colors'],
    ressources: {'rgaa': ['3.2.4']}
});

// 3.2.5 Dans le mécanisme qui permet d'afficher un rapport de contraste conforme, le rapport de contraste entre le texte et la couleur d’arrière-plan est-il suffisamment élevé ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_48",
    status: 'untested',
    tags: ['a11y', 'colors', 'contrast'],
    ressources: {'rgaa': ['3.2.5']}
});

//* 3.3 Dans chaque page web, les couleurs utilisées dans les composants d'interface ou les éléments graphiques porteurs d'informations sont-elles suffisamment contrastées (hors cas particuliers) ?
// 3.3.1 Dans chaque page web, le rapport de contraste entre les couleurs d'un composant d'interface dans ses différents états et la couleur d'arrière-plan contiguë vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_49",
    status: 'untested',
    tags: ['a11y', 'colors', 'contrast'],
    ressources: {'rgaa': ['3.3.1']}
});

// 3.3.2 Dans chaque page web, le rapport de contraste des différentes couleurs composant un élément graphique, lorsqu'elles sont nécessaires à sa compréhension, et la couleur d'arrière-plan contiguë, vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_50",
    status: 'untested',
    tags: ['a11y', 'colors', 'contrast'],
    ressources: {'rgaa': ['3.3.2']}
});

// 3.3.3 Dans chaque page web, le rapport de contraste des différentes couleurs contiguës entre elles d'un élément graphique, lorsqu'elles sont nécessaires à sa compréhension, vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_51",
    status: 'untested',
    tags: ['a11y', 'colors', 'contrast'],
    ressources: {'rgaa': ['3.3.3']}
});

// 3.3.4 Dans le mécanisme qui permet d'afficher un rapport de contraste conforme, les couleurs du composant ou des éléments graphiques porteurs d’informations qui le composent, sont-elles suffisamment contrastées ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__colors_name_52",
    status: 'untested',
    tags: ['a11y', 'colors', 'contrast'],
    ressources: {'rgaa': ['3.3.4']}
});

/**
 *? CONSULTATION
 ** tous les tests sont répertoriés
 ** dependances gérées
 *TODO reconnaissance des contenus cryptique
 *TODO analyse des scripts
 *TODO contenus en mouvement ou clignotant ?
 */

//* 13.1 Pour chaque page web, l'utilisateur a-t-il le contrôle de chaque limite de temps modifiant le contenu (hors cas particuliers) ?
// 13.1.1 Pour chaque page web, chaque procédé de rafraîchissement (balise <object>, balise <embed>, balise <svg>, balise <canvas>, balise <meta>) vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__consultation_name_53",
    query: 'meta[http-equiv="refresh"][content]',
    testStatus: "failed",
    filter: function (item) {
        var content = item.getAttribute('content').trim();

        if (content.length > 0) {
            let redirect = /; *url=.+/i;
            let refresh = /^(\s*\d+\s*){1}/i;

            if(redirect.test(content)) {
                item.setAttribute('data-tng-redirect', true);
                return;
            } else if(refresh.test(content)) {
                content = content.split(';')[0].trim();
                return content > 0 && content < 72000;
            }
        }
    },
    mark: function() {
        return {
            attrs: [{
                name: "http-equiv",
                value: "refresh",
                valueState: "egal" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "content",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'meta', 'consultation'],
    ressources: { 'rgaa': ['13.1.1']}
});

// 13.1.2  Pour chaque page web, chaque procédé de redirection effectué via une balise <meta> est-il immédiat (hors cas particuliers) ?
//! dependance 13.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__consultation_name_54",
    query: '[data-tng-redirect]',
    testStatus: "failed",
    filter: function (item) {
        var content = item.getAttribute('content').trim();
        let time = content.match(/^\d+/);
        if(time) return time[0] > 0;
    },
    mark: function() {
        return {
            attrs: [{
                name: "http-equiv",
                value: "refresh",
                valueState: "egal" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "content",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'meta', 'consultation'],
    ressources: { 'rgaa': ['13.1.2']}
});

// 13.1.3 Pour chaque page web, chaque procédé de redirection effectué via un script vérifie-t-il une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_55",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.1.3'] }
});

// 13.1.4 Pour chaque page web, chaque procédé limitant le temps d'une session vérifie-t-il une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_56",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.1.4'] }
});

//* 13.2 Dans chaque page web, l'ouverture d'une nouvelle fenêtre ne doit pas être déclenchée sans action de l'utilisateur. Cette règle est-elle respectée ?
// 13.2.1 Dans chaque page web, l'ouverture d'une nouvelle fenêtre ne doit pas être déclenchée sans action de l'utilisateur. Cette règle est-elle respectée ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_57",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.2.1'] }
});

//* 13.3 Dans chaque page web, chaque document bureautique en téléchargement possède-t-il, si nécessaire, une version accessible (hors cas particuliers) ?
// 13.3.1 Dans chaque page web, chaque fonctionnalité de téléchargement d'un document bureautique vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_58",
    query: '[href][download]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.3.1'] }
});

//* 13.4 Pour chaque document bureautique ayant une version accessible, cette version offre-t-elle la même information ?
// 13.4.1 Chaque document bureautique ayant une version accessible vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_59",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.4.1'] }
});

//* 13.5 Dans chaque page web, chaque contenu cryptique (art ASCII, émoticon, syntaxe cryptique) a-t-il une alternative ?
// 13.5.1 Dans chaque page web, chaque contenu cryptique (art ASCII, émoticon, syntaxe cryptique) vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_60",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.5.1'] }
});

//* 13.6 Dans chaque page web, pour chaque contenu cryptique (art ASCII, émoticon, syntaxe cryptique) ayant une alternative, cette alternative est-elle pertinente ?
// 13.6.1 Dans chaque page web, chaque contenu cryptique (art ASCII, émoticon, syntaxe cryptique) vérifie-t-il une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_61",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.6.1'] }
});

//* 13.7 Dans chaque page web, les changements brusques de luminosité ou les effets de flash sont-ils correctement utilisés ?
// 13.7.1 Dans chaque page web, chaque image ou élément multimédia (balise <video>, balise <img>, balise <svg>, balise <canvas>, balise <embed> ou balise <object>) qui provoque un changement brusque de luminosité ou un effet de flash vérifie-t-elle une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_62",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.7.1'] }
});

// 13.7.2 Dans chaque page web, chaque script qui provoque un changement brusque de luminosité ou un effet de flash vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_63",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.7.2'] }
});

// 13.7.3 Dans chaque page web, chaque mise en forme CSS qui provoque un changement brusque de luminosité ou un effet de flash vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_64",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.7.3'] }
});

//* 13.8 Dans chaque page web, chaque contenu en mouvement ou clignotant est-il contrôlable par l'utilisateur ?
// 13.8.1 Dans chaque page web, chaque contenu en mouvement, déclenché automatiquement, vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_65",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.8.1'] }
});

// 13.8.2 Dans chaque page web, chaque contenu clignotant, déclenché automatiquement, vérifie-t-il une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_66",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.8.2'] }
});

//* 13.9 Dans chaque page web, le contenu proposé est-il consultable quelle que soit l'orientation de l'écran (portrait ou paysage) (hors cas particuliers) ?
// 13.9.1 Dans chaque page web, chaque contenu vérifie-t-il ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_67",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.9.1'] }
});

//* 13.10 Dans chaque page web, les fonctionnalités utilisables ou disponibles au moyen d'un geste complexe peuvent-elles être également disponibles au moyen d'un geste simple (hors cas particuliers) ?
// 13.10.1 Dans chaque page web, chaque fonctionnalité utilisable ou disponible suite à un contact multipoint est-elle également utilisable ou disponible suite à un contact en un point unique de l’écran (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_68",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.10.1'] }
});

// 13.10.2 Dans chaque page web, chaque fonctionnalité utilisable ou disponible suite à un geste basé sur le suivi d'une trajectoire sur l'écran est-elle également utilisable ou disponible suite à un contact en un point unique de l'écran (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_69",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.10.2'] }
});

//* 13.11 Dans chaque page web, les actions déclenchées au moyen d'un dispositif de pointage sur un point unique de l'écran peuvent-elles faire l'objet d'une annulation (hors cas particuliers) ?
// 13.11.1 Dans chaque page web, les actions déclenchées au moyen d'un dispositif de pointage sur un point unique de l'écran vérifient-elles l'une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_70",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.11.1'] }
});

//* 13.12 Dans chaque page web, les fonctionnalités qui impliquent un mouvement de l'appareil ou vers l'appareil peuvent-elles être satisfaites de manière alternative (hors cas particuliers) ?
// 13.12.1 Dans chaque page web, les fonctionnalités disponibles en bougeant l'appareil peuvent-elles être accomplies avec des composants d'interface utilisateur (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_71",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.12.1'] }
});

// 13.12.2 Dans chaque page web, les fonctionnalités disponibles en faisant un geste en direction de l'appareil peuvent-elles être accomplies avec des composants d'interface utilisateur (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_72",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.12.2'] }
});

// 13.12.3 L'utilisateur a-t-il la possibilité de désactiver la détection du mouvement pour éviter un déclenchement accidentel de la fonctionnalité (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__consultation_name_73",
    status: 'untested',
    tags: ['a11y', 'consultation'],
    ressources: { 'rgaa': ['13.12.3'] }
});

/**
 *? FORMULAIRES
 ** Tous les tests sont répertoriés
 *? dependances gérées mais attention à la reference data-tng-altLong
 *TODO voir si l'on peut approfondir les tests 11.10.2 et 11.10.4
 *TODO traiter la proximité d'une étiquette avec son champ ?? (11.1.3, 11.4)
 *
 * data : data-tng-fieldsAN, data-tng-label-related, data-tng-has-label, data-tng-visible-label, data-tng-text-label, data-tng-ANinclude-visibleLabel, data-tng-fieldsgroup-legend, data-tng-optgroup-label, data-tng-button-namesMatch, data-tng-autocomplete-group, data-tng-autocomplete
 */

//* 11.1 Chaque champ de formulaire a-t-il une étiquette ?
// 11.1.1 Chaque champ de formulaire vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_74",
    query: 'input[type="text"]:not([role]), input[type="password"]:not([role]), input[type="search"]:not([role]), input[type="email"]:not([role]), input[type="number"]:not([role]), input[type="tel"]:not([role]), input[type="url"]:not([role]), textarea:not([role]), input[type="checkbox"]:not([role]), input[type="radio"]:not([role]), input[type="date"]:not([role]), input[type="range"]:not([role]), input[type="color"]:not([role]), input[type="time"]:not([role]), input[type="month"]:not([role]), input[type="week"]:not([role]), input[type="datetime-local"]:not([role]), select:not([role]), datalist:not([role]), input[type="file"]:not([role]), progress:not([role]), meter:not([role]), input:not([type]):not([role]), [role="progressbar"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="listbox"], [role="searchbox"], [role="combobox"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"], [contenteditable="true"]:not([role])',
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        item.setAttribute('data-tng-formField', 'true');
        if(item.getAttribute('data-tng-el-exposed') === 'true') {
            if(item.hasAccessibleName()) {
                item.setAttribute('data-tng-fieldsAN', 'true');
                return;
            } else {
                return true;
            }
        }
    },
    tags: ['a11y', 'forms', 'accessiblename'],
    ressources: { 'rgaa': ['11.1.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_75",
    query: '[data-tng-fieldsAN="true"]',
    testStatus: "passed",
    tags: ['a11y', 'forms', 'accessiblename'],
    ressources: { 'rgaa': ['11.1.1'] }
});

// 11.1.2 : Chaque champ de formulaire associé à une balise <label> ayant un attribut for, vérifie-t-il ces conditions ? 
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_76",
    query: 'label[for][data-tng-el-exposed="true"]',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        if(item.getAttribute('for').trim().length > 0) {
            var startDigit = /^\d/;
            var id = item.getAttribute('for');

            if(id.match(startDigit)) {
                id = '\\3'+id.substring(0, 1)+' '+id.substring(1, id.length).replace(/[!"#$%&'()*+,-./:;<=>?@[\]^`{|}~]/g, "\\$&");
            } else {
                id = id.replace(/[!"#$%&'()*+,-./:;<=>?@[\]^`{|}~]/g, "\\$&");
            }
            
            var fields = document.querySelectorAll('#'+id);

            if(fields.length === 0 || fields.length > 1) {
                return true;
            } else {
                let elCategory = fields[0].getImplicitAriaRoleCategory();
                if(elCategory && elCategory === 'forms') {
                    item.setAttribute('data-tng-label-related', 'true');
                }
                return;
            }
        }
    },
    mark: function() {
        return {
            attrs: [{
                name: "for",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.1.2'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_77",
    query: 'label[data-tng-label-related="true"]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "for",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.1.2'] }
});

// 11.1.3 Chaque champ de formulaire ayant une étiquette dont le contenu n'est pas visible ou à proximité (masqué, aria-label) ou qui n’est pas accolé au champ (aria-labelledby), vérifie-t-il une de ses conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_78",
    query: '[data-tng-fieldsAN]',
    testStatus: "failed",
    depStatus: ["cantTell", "passed"],
    filter: function (item) {
        if((item.getAttribute('data-tng-el-exposed') === 'false' && item.getAttribute('data-tng-el-visible', 'false')) || item.disabled) return;

        let hasLabel = false;

        if(item.hasAttribute('aria-labelledby') && item.getAttribute('aria-labelledby').trim().length > 0) {
            let ids = item.getAttribute('aria-labelledby').split(' ');
            let labelIsVisible = false;
            let visibleLabel = '';

            ids.forEach(id => {
                let el = document.getElementById(id);
                if(el) {
                    hasLabel = true;
                    item.setAttribute('data-tng-has-label', 'labelledby');
                    labelIsVisible = false;
                    if(el.getAttribute('data-tng-el-visible') === 'true' && el.textContent.trim().length > 0) {
                        el.childNodes.forEach(e => {
                            if(e.nodeType === 3) {
                                labelIsVisible = true;
                                visibleLabel += ' '+e.textContent;
                            }
            
                            if(e.nodeType === 1 && e.getAttribute('data-tng-el-visible') === 'true') {
                                e.childNodes.forEach(echild => {
                                    if(echild.nodeType === 3 || echild.nodeType === 1 && echild.getAttribute('data-tng-el-visible') === 'true') {
                                        labelIsVisible = true;
                                        visibleLabel += ' '+echild.textContent;
                                    }
                                });
                            }
                        });
                    }
                }
            });

            if(labelIsVisible) {
                item.setAttribute('data-tng-visible-label', 'labelledby');
                item.setAttribute('data-tng-text-label', visibleLabel.trim());
                return;
            }
        }

        if(item.id.trim().length > 0) {
            let labels = document.querySelectorAll('label[for]');
            let labelsLength = labels.length;
            
            for(let i = 0; i < labelsLength; i++) {
                let forAttr = labels[i].getAttribute('for').split(' ');
                if(forAttr.includes(item.id)) {
                    if(labels[i].textContent.trim().length > 0) {
                        if(labels[i].getAttribute('data-tng-el-visible') === 'true') {
                            let visibleText = '';
                            labels[i].childNodes.forEach(e => {
                                if(e.nodeType === 3) {
                                    visibleText += ' '+e.textContent;
                                }
                
                                if(e.nodeType === 1 && e.getAttribute('data-tng-el-visible') === 'true') {
                                    e.childNodes.forEach(echild => {
                                        if(echild.nodeType === 3 || (echild.nodeType === 1 && echild.getAttribute('data-tng-el-visible') === 'true')) {
                                            visibleText += ' '+echild.textContent;
                                        }
                                    });
                                }
                            });

                            if(visibleText.length > 0) {
                                item.setAttribute('data-tng-visible-label', 'label');
                                item.setAttribute('data-tng-text-label', visibleText.trim());
                                return;
                            }
                        }

                        hasLabel = true;
                        item.setAttribute('data-tng-has-label', 'label');
                    }
                    
                    break;
                } 
            }
        }

        if(item.hasAttribute('aria-label') && item.getAttribute('aria-label').trim().length > 0) {
            hasLabel = true;
            item.setAttribute('data-tng-has-label', 'arialabel');
        }

        if(item.hasAttribute('title') && item.getAttribute('title').trim().length > 0) {
            item.setAttribute('data-tng-has-label', 'title');
            return;
        }

        if(hasLabel) {
            item.setAttribute('data-tng-temp', 'focused');
            item = item.focus();
            item = document.querySelector('[data-tng-temp]');
            item.removeAttribute('data-tng-temp');
            if(item.hasAttribute('aria-describedby') && item.getAttribute('aria-describedby').trim().length > 0) {
                let ids = item.getAttribute('aria-describedby').split(' ');
                ids.forEach(id => {
                    let el = document.getElementById(id);
                    if(el && el.textContent.trim().length > 0) {
                        if(el.getAttribute('data-tng-el-visible') === 'true') {
                            item.setAttribute('data-tng-has-label', 'describedby');
                            return;
                        } 
                        // else {
                        //     item.focus();
                        //     let elFocus = document.getElementById(id);
                        //     if(elFocus.isVisible) {
                        //         item.setAttribute('data-tng-has-label', 'describedby-focus');
                        //         return;
                        //     }
                        // }
                    }
                })
            }
            return true;
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.1.3'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_79",
    description: "locale__forms_description_80",
    query: '[data-tng-has-label="title"]:not([data-tng-visible-label])',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.1.3'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_81",
    description: "locale__forms_description_82",
    query: '[data-tng-has-label="describedby"]:not([data-tng-visible-label])',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [],
            related: {
                title: "Passage de texte référencé par [aria-describedby].", // desc displayed above the element
                element: "#!!!aria-describedby!!!", //css selector
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.1.3'] }
});

// tanaguruTestsList.push({
//     lang: 'fr',
//     name: "locale__forms_name_83",
//     description: "locale__forms_description_82",
//     query: '[data-tng-has-label="describedby-focus"]:not([data-tng-visible-label])',
//     mark: {attrs: ['aria-describedby']},
//     tags: ['a11y', 'forms', 'accessiblename'],
//     ressources: { 'rgaa': ['11.1.3'] }
// });

//* 11.2 : Chaque étiquette associée à un champ de formulaire est-elle pertinente (hors cas particuliers) ?
// 11.2.1 : Chaque balise <label> permet-elle de connaître la fonction exacte du champ de formulaire auquel elle est associée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_85",
    query: 'label[data-tng-el-exposed="true"]',
    filter: function (item) {
        if(item.getAttribute('data-tng-label-related' === 'true')) return true;

        if(item.hasChildNodes()) {
            var children = item.childNodes;
            var childrenLength = children.length;

            for(var i = 0; i < childrenLength; i++) {
                if(children[i].tagName) {
                    let cat = children[i].getImplicitAriaRoleCategory();
                    if(cat && cat === 'forms') return true;
                }
            }
        }
    },
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [],
            related: {
                title: "Champ associé au <label>.",
                element: "#!!!for!!!",
                attrs: [],
                tag: false,
                content: false
            },
            tag: false,
            content: true
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.2.1'] }
});

// 11.2.2 : Chaque attribut title permet-il de connaître la fonction exacte du champ de formulaire auquel il est associé ?
//! dependance 11.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_86",
    query: '[data-tng-formField][title][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.2.2'] }
});

//! dependance 11.1.1
// 11.2.3 : Chaque étiquette implémentée via l'attribut WAI-ARIA aria-label permet-elle de connaître la fonction exacte du champ de formulaire auquel elle est associée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_87",
    query: '[data-tng-formField][aria-label][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.2.3'] }
});

//! dependance 11.1.1
// 11.2.4 : Chaque passage de texte associé via l'attribut WAI-ARIA aria-labelledby permet-il de connaître la fonction exacte du champ de formulaire auquel il est associé ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_88",
    query: '[data-tng-formField][aria-labelledby][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [],
            related: {
                title: "Passage de texte associé au champ.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.2.4'] }
});

// 11.2.5 Chaque champ de formulaire ayant un intitulé visible vérifie-t-il ces conditions (hors cas particuliers) ?
//! dependance 11.1.3
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_89",
    query: '[data-tng-visible-label]',
    filter: function (item) {
        let anMatch = isString1MatchString2(item.accessibleName(), item.getAttribute('data-tng-text-label'));
        if(anMatch === null) return
        else if(anMatch) return true
        else {
            item.setAttribute('data-tng-ANinclude-visibleLabel', 'false');
            return;
        }
    },
    testStatus: "passed",
    depStatus: ["failed"],
    tags: ['a11y', 'forms', 'accessiblename'],
    ressources: { 'rgaa': ['11.2.5'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_90",
    query: '[data-tng-ANinclude-visibleLabel]',
    testStatus: "failed",
    tags: ['a11y', 'forms', 'accessiblename'],
    ressources: { 'rgaa': ['11.2.5'] }
});
// 11.2.6 Chaque bouton adjacent au champ de formulaire qui fournit une étiquette visible permet-il de connaître la fonction exacte du champ de formulaire auquel il est associé ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_91",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.2.6'] }
});

//* 11.3 Dans chaque formulaire, chaque étiquette associée à un champ de formulaire ayant la même fonction et répétée plusieurs fois dans une même page ou dans un ensemble de pages est-elle cohérente ?
// 11.3.1 Chaque étiquette associée à un champ de formulaire ayant la même fonction et répétée plusieurs fois dans une même page est-elle cohérente ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_92",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.3.1'] }
});

// 11.3.2 Chaque étiquette associée à un champ de formulaire ayant la même fonction et répétée dans un ensemble de pages est-elle cohérente ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_93",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.3.2'] }
});

//* 11.4 Dans chaque formulaire, chaque étiquette de champ et son champ associé sont-ils accolés (hors cas particuliers) ?
// 11.4.1 Chaque étiquette de champ et son champ associé sont-ils accolés ?
// 11.4.2 Chaque étiquette accolée à un champ (à l'exception des case à cocher, bouton radio ou balise ayant un attribut WAI-ARIA role="checkbox", role="radio" ou role="switch"), vérifie-t-elle ces conditions (hors cas particuliers) ? 
// 11.4.3 Chaque étiquette accolée à un champ de type checkbox ou radio ou à une balise ayant un attribut WAI-ARIA role="checkbox", role="radio" ou role="switch", vérifie-t-elle ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_94",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.4.1', '11.4.2', '11.4.3'] }
});

//* 11.5 Dans chaque formulaire, les champs de même nature sont-ils regroupés, si nécessaire ?
//11.5.1 : Les champs de même nature vérifient-ils l'une de ces conditions, si nécessaire ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_95",
    query: 'fieldset[data-tng-el-exposed="true"], [role="group"][data-tng-el-exposed="true"], [role="radiogroup"][data-tng-el-exposed="true"]',
    filter: function(item) {
        let cat = item.getImplicitAriaRoleCategory();
        if(cat) return cat === 'forms';
    },
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.5.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_96",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.5.1'] }
});

//* 11.6 Dans chaque formulaire, chaque regroupement de champs de même nature a-t-il une légende ?
// 11.6.1 : Chaque regroupement de champs de même nature possède-t-il une légende ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_97",
    query: 'fieldset[data-tng-el-exposed="true"], [role="group"][data-tng-el-exposed="true"]',
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        let cat = item.getImplicitAriaRoleCategory();
        if(cat && cat === 'forms') {
            if(item.hasAccessibleName()) {
                item.setAttribute('data-tng-fieldsgroup-legend', 'true');
                return;
            } else {
                return true;
            }
        }
    },
    tags: ['a11y', 'forms', 'accessiblename'],
    ressources: { 'rgaa': ['11.6.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_98",
    query: '[data-tng-fieldsgroup-legend]',
    testStatus: "passed",
    tags: ['a11y', 'forms', 'accessiblename'],
    ressources: { 'rgaa': ['11.6.1'] }
});

//* 11.7 Dans chaque formulaire, chaque légende associée à un regroupement de champs de même nature est-elle pertinente ?
// 11.7.1 Chaque légende associée à un regroupement de champs de même nature est-elle pertinente ?
//! dependance 11.6.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_99",
    query: '[data-tng-fieldsgroup-legend]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte associé au champ.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms', 'accessiblename'],
    ressources: { 'rgaa': ['11.7.1'] }
});

//* 11.8 Dans chaque formulaire, les items de même nature d'une liste de choix sont-ils regroupés de manière pertinente ?
// 11.8.1 Pour chaque balise <select>, les items de même nature d'une liste de choix sont-ils regroupés avec une balise <optgroup>, si nécessaire ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_100",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.8.1'] }
});

// 11.8.2 Dans chaque balise <select>, chaque balise <optgroup> possède-t-elle un attribut label ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_101",
    query: 'select optgroup[data-tng-el-exposed="true"]:not([label])',
    testStatus: "failed",
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.8.2'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_102",
    query: 'select optgroup[label][data-tng-el-exposed="true"]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "label",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.8.2'] }
});

// 11.8.3 Pour chaque balise <optgroup> ayant un attribut label, le contenu de l'attribut label est-il pertinent ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_103",
    query: 'select optgroup[label][data-tng-el-exposed="true"]',
    testStatus: "failed",
    depStatus: ["cantTell"],
    filter: function (item) {
        if(item.getAttribute('label').trim().length > 0) {
            item.setAttribute('data-tng-optgroup-label', 'true');
            return;
        } else {
            return true;
        }
    },
    mark: function() {
        return {
            attrs: [{
                name: "label",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.8.3'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_104",
    query: '[data-tng-optgroup-label]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "label",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.8.3'] }
});

//* 11.9 Dans chaque formulaire, l'intitulé de chaque bouton est-il pertinent (hors cas particuliers) ?
// 11.9.1 L'intitulé de chaque bouton est-il pertinent ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_105",
    query: 'input[type="submit"][data-tng-el-exposed="true"], input[type="reset"][data-tng-el-exposed="true"], input[type="button"][data-tng-el-exposed="true"], button[data-tng-el-exposed="true"], input[type="image"][data-tng-el-exposed="true"], [role="button"][data-tng-el-exposed="true"]',
    filter: function(item) {
        if(item.closest('form') || item.closest('[role="form"]')) {
            item.setAttribute('data-tng-formButton', 'true');
            if(item.hasAccessibleName()) {
                if(item.hasAttribute('data-tng-ANObject')) {
                    let details = JSON.parse(item.getAttribute('data-tng-ANObject'));
                    details.shift();
                    for(let i = 0; i < details.length; i++) {
                        if(Object.keys(details[i]).includes("aria-labelledby") || Object.keys(details[i]).includes("aria-label")) {
                            item.setAttribute('data-tng-formButton-ANaria', "true");
                            break;
                        }
                    }
                }
                return true;
            } else {
                item.setAttribute('data-tng-formButton-an', 'false');
                return;
            }
        }
    },
    testStatus: 'cantTell',
    warning: false,
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "value",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte associé au champ.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms', 'buttons'],
    ressources: { 'rgaa': ['11.9.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_106",
    query: '[data-tng-formButton-an="false"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "any"
            },
            {
                name: "alt",
                value: "",
                valueState: "any"
            },
            {
                name: "value",
                value: "",
                valueState: "any"
            },
            {
                name: "title",
                value: "",
                valueState: "any"
            }],
            related: {
                title: "Passage de texte associé au champ.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms', 'buttons'],
    ressources: { 'rgaa': ['11.9.1'] }
});

// 11.9.2 Chaque bouton affichant un intitulé visible vérifie-t-il ces conditions (hors cas particuliers) ?
//! dependance 11.9.1
//! reference a data-tng-altLong, vérifier si nécessaire, si oui cet attribut est défini dans le script image donc il faudrait également le definir dans ce script
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_107",
    query: '[data-tng-formButton-ANaria]',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        if(item.innerText.trim().length > 0 || (item.value && item.value.trim().length > 0) || item.querySelector('[data-tng-altLong]')) {
            var visibleName = '';
            if(item.alt) visibleName += ' '+item.alt;
            if(item.value) visibleName += ' '+item.value;
            item.childNodes.forEach(e => {
                if(e.nodeType === 3) {
                    visibleName += ' '+e.textContent;
                }

                if(e.nodeType === 1 && e.getAttribute('data-tng-el-visible') === 'true') {
                    if(e.alt) visibleName += ' '+e.alt;

                    e.childNodes.forEach(echild => {
                        if(echild.nodeType === 3 || (echild.nodeType === 1 && echild.getAttribute('data-tng-el-visible') === 'true')) {
                            visibleName += ' '+echild.textContent;
                            if(echild.alt) visibleName += ' '+echild.alt;
                        }
                    });
                }
            });

            if(visibleName.length == 0) return;

            let anMatch = isString1MatchString2(item.accessibleName(), visibleName);
            if(anMatch === null) return
            else if(!anMatch) return true
            else {
                item.setAttribute('data-tng-button-namesMatch', 'true');
                return;
            }
        }
    },
    tags: ['a11y', 'accessiblename', 'buttons', 'forms'],
    ressources: {'rgaa': ['11.9.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_108",
    query: '[data-tng-button-namesMatch]',
    testStatus: "passed",
    tags: ['a11y', 'accessiblename', 'buttons', 'forms'],
    ressources: {'rgaa': ['11.9.2']}
});

//* 11.10 Dans chaque formulaire, le contrôle de saisie est-il utilisé de manière pertinente (hors cas particuliers) ?
// 11.10.1 Les indications du caractère obligatoire de la saisie des champs vérifient-elles une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_109",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.10.1'] }
});

// 11.10.2 Les champs obligatoires ayant l'attribut aria-required="true" ou required vérifient-ils une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_110",
    description: "locale__forms_description_111",
    query: '[aria-required="true"][data-tng-el-exposed="true"], [required][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.10.2']}
});

// 11.10.3 Les messages d'erreur indiquant l'absence de saisie d'un champ obligatoire vérifient-ils une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_112",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.10.3'] }
});

// 11.10.4 Les champs obligatoires ayant l'attribut aria-invalid="true" vérifient-ils une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_113",
    description: "locale__forms_description_114",
    query: '[aria-invalid="true"][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.10.4']}
});

// 11.10.5 Les instructions et indications du type de données et/ou de format obligatoires vérifient-elles une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_115",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.10.5'] }
});

// 11.10.6 Les messages d'erreurs fournissant une instruction ou une indication du type de données et/ou de format obligatoire des champs vérifient-ils une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_116",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: { 'rgaa': ['11.10.6'] }
});

// 11.10.7 Les champs ayant l'attribut aria-invalid="true" dont la saisie requiert un type de données et/ou de format obligatoire vérifient-ils une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_117",
    description: "locale__forms_description_118",
    query: '[aria-invalid="true"][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.10.7']}
});

//* 11.11 Dans chaque formulaire, le contrôle de saisie est-il accompagné, si nécessaire, de suggestions facilitant la correction des erreurs de saisie ?
// 11.11.1 Pour chaque erreur de saisie, les types et les formats de données sont-ils suggérés, si nécessaire ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_119",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.11.1']}
});

// 11.11.2 Pour chaque erreur de saisie, des exemples de valeurs attendues sont-ils suggérés, si nécessaire ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_120",
    status: 'untested',
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.11.2']}
});

//* 11.12 Pour chaque formulaire qui modifie ou supprime des données, ou qui transmet des réponses à un test ou à un examen, ou dont la validation a des conséquences financières ou juridiques, les données saisies peuvent-elles être modifiées, mises à jour ou récupérées par l’utilisateur ?
// 11.12.1 Pour chaque formulaire qui modifie ou supprime des données, ou qui transmet des réponses à un test ou un examen, ou dont la validation a des conséquences financières ou juridiques, la saisie des données vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_121",
    description: "locale__forms_description_122",
    query: 'form[data-tng-el-exposed="true"], [role="form"][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.12.1']}
});

// 11.12.2 Chaque formulaire dont la validation modifie ou supprime des données à caractère financier, juridique ou personnel vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_123",
    description: "locale__forms_description_124",
    query: 'form[data-tng-el-exposed="true"], [role="form"][data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.12.2']}
});

//* 11.13 La finalité d'un champ de saisie peut-elle être déduite pour faciliter le remplissage automatique des champs avec les données de l'utilisateur ?
// 11.13.1 Chaque champ de formulaire dont l'objet se rapporte à une information concernant l'utilisateur vérifie-t-il ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_125",
    query: 'input[type="text"][data-tng-el-exposed="true"], input[type="password"][data-tng-el-exposed="true"], input[type="email"][data-tng-el-exposed="true"], input[type="tel"][data-tng-el-exposed="true"], input[type="url"][data-tng-el-exposed="true"], textarea[data-tng-el-exposed="true"], input[type="date"][data-tng-el-exposed="true"], select[data-tng-el-exposed="true"], input[data-tng-el-exposed="true"]:not([type])',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "autocomplete",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.13.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_126",
    description: "locale__forms_description_127",
    query: 'input[autocomplete][data-tng-el-exposed="true"], textarea[autocomplete][data-tng-el-exposed="true"], select[autocomplete][data-tng-el-exposed="true"]',
    testStatus: "failed",
    filter: function (item) {
        //? if na, return
        if(item.disabled) return;
        if(item.hasAttribute('aria-disabled') && item.getAttribute('aria-disabled') === 'true') return;

        if(item.getAttribute('autocomplete') === 'on' || item.getAttribute('autocomplete') === 'off' || item.getAttribute('autocomplete').trim() === '') return;

        if(item.tagName.toLowerCase() === 'input' && item.hasAttribute('type')) {
            let notField = ['submit', 'reset', 'image', 'button'];
            if(notField.includes(item.getAttribute('type').toLowerCase())) {
                return;
            }
        }

        if(item.hasAttribute('role') && item.getAttribute('role') === 'button') return;

        //? else get autocomplete values
        let autocomplete = item.getAttribute('autocomplete').toLowerCase().split(' ');

        /**
         *? Token groups
         * order : 1.group, 2.Mode, 3.Hint, 4.Token
         ** https://html.spec.whatwg.org/#autofill-field
         */
        let group = new RegExp(/section-*/);
        let mode = ['shipping', 'billing'];
        let hint = ['home', 'work', 'mobile', 'fax', 'pager']; // contact token only

        let normalToken = ['name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'organization-title', 'username', 'new-password', 'current-password', 'one-time-code', 'organization', 'street-address', 'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency', 'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year', 'sex', 'url', 'photo'];
        let contactToken = ['tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-local-prefix', 'tel-local-suffix', 'tel-extension', 'email', 'impp'];

        //? Control groups
        let textGroup = ['name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'organization-title', 'organization', 'address-line1', 'address-line2', 'address-line3','address-level4', 'address-level3', 'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-csc', 'cc-type', 'transaction-currency', 'language', 'sex', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-local-prefix', 'tel-local-suffix', 'tel-extension'];
        let usernameGroup = ['username', 'email'];
        let passwordGroup = ['new-password', 'current-password', 'one-time-code'];
        let multilineGroup = ['street-address'];
        let monthGroup = ['cc-exp'];
        let numericGroup = ['cc-exp-month', 'cc-exp-year', 'transaction-amount', 'bday-day', 'bday-month', 'bday-year'];
        let dateGroup = ['bday'];
        let urlGroup = ['url', 'photo', 'impp'];
        let telGroup = ['tel'];

        let controlGroups = [
            ['text', textGroup],
            ['email', usernameGroup],
            ['password', passwordGroup],
            ['multiline', multilineGroup],
            ['month', monthGroup],
            ['number', numericGroup],
            ['date', dateGroup],
            ['url', urlGroup],
            ['tel', telGroup]
        ];

        /**
         *? Check validity
         */
        if(autocomplete.length === 1) {
            if(!normalToken.includes(autocomplete[0]) && !contactToken.includes(autocomplete[0])) return true;

            controlGroups.forEach(el => {
                if(el[1].includes(autocomplete[0])) {
                    item.setAttribute('data-tng-autocomplete-group', el[0]);
                    return;
                }
            });
        }

        if(autocomplete.length > 1) {
            let mainTokenIndex = autocomplete.length - 1;
            let mainToken = false;

            //? check main token
            if(normalToken.includes(autocomplete[mainTokenIndex])) {
                mainToken = 'normal';
            } else if(contactToken.includes(autocomplete[mainTokenIndex])) {
                mainToken = 'contact';
            } else {
                return true;
            }

            //? check order tokens
            if(mainToken === 'normal') {
                if(autocomplete.length < 4 && !hint.some(x => autocomplete.includes(x))) {
                    if(autocomplete.length === 2 && (!autocomplete[0].match(group) && !mode.includes(autocomplete[0]))) {
                        return true;
                    }

                    if(autocomplete.length === 3) {
                        if(!autocomplete[0].match(group) || !mode.includes(autocomplete[1])) {
                            return true;
                        }
                    }
                } else {
                    return true;
                }
            }

            if(mainToken === 'contact') {
                if(autocomplete.length < 5) {
                    if(autocomplete.length === 2 && (!autocomplete[0].match(group) && !mode.includes(autocomplete[0]) && !hint.includes(autocomplete[0]))) {
                        return true;
                    }

                    if(autocomplete.length === 3) {
                        if(autocomplete[0].match(group)) {
                            if(!mode.includes(autocomplete[1]) && !hint.includes(autocomplete[1])) {
                                return true;
                            }
                        } else if(mode.includes(autocomplete[0]) && !hint.includes(autocomplete[1])) {
                            return true;
                        } else if(hint.includes(autocomplete[0])) {
                            return true;
                        }
                    }

                    if(autocomplete.length === 4) {
                        if(!autocomplete[0].match(group) || !mode.includes(autocomplete[1]) || !hint.includes(autocomplete[2])) {
                            return true;
                        }
                    }
                } else {
                    return true;
                }
            }

            controlGroups.forEach(el => {
                if(el[1].includes(autocomplete[mainTokenIndex])) {
                    item.setAttribute('data-tng-autocomplete-group', el[0]);
                    return;
                }
            });
        }
    },
    mark: function() {
        return {
            attrs: [{
                name: "autocomplete",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.13.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_128",
    query: '[data-tng-autocomplete-group]',
    testStatus: "failed",
    depStatus: ["cantTell"],
    filter: function(item) {
        if(item.tagName.toLowerCase() === 'textarea' || item.tagName.toLowerCase() === 'select') {
            item.setAttribute('data-tng-autocomplete', true);
            return;
        }

        let group = item.getAttribute('data-tng-autocomplete-group');
        let type = '';

        if(item.hasAttribute('type')) {
            type = item.getAttribute('type').toLowerCase();
        } else {
            type = 'text';
        }

        if(group === 'multiline') return true;

        if(type === 'text' || type === 'search') {
            item.setAttribute('data-tng-autocomplete', true);
            return;
        }

        if(type === group) {
            item.setAttribute('data-tng-autocomplete', true);
            return;
        }

        return true;
    },
    mark: function() {
        return {
            attrs: [{
                name: "autocomplete",
                value: "",
                valueState: "any"
            },
            {
                name: "type",
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.13.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__forms_name_129",
    query: '[data-tng-autocomplete]',
    description: "locale__forms_description_130",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "autocomplete",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'forms'],
    ressources: {'rgaa': ['11.13.1']}
});

/**
 *? CADRES (terminé)
 ** dependances gérées
 * data : data-tng-frameAlt
 */

//* 2.1 Chaque cadre a-t-il un titre de cadre ?
// 2.1.1 Chaque cadre (balise <iframe> ou <frame>) a-t-il un attribut title ?

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__frames_name_131",
    query: 'iframe[data-tng-el-exposed="true"][title]:not([role="presentation"]), frame[data-tng-el-exposed="true"][title]:not([role="presentation"])',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "any" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'frames'],
    ressources: {'rgaa': ['2.1.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__frames_name_132",
    query: 'iframe[data-tng-el-exposed="true"]:not([role="presentation"]):not([title]), frame[data-tng-el-exposed="true"]:not([role="presentation"]):not([title])',
    testStatus: "failed",
    tags: ['a11y', 'frames'],
    ressources: {'rgaa': ['2.1.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__frames_name_133",
    query: 'iframe[data-tng-el-exposed="false"]:not([role="presentation"]), frame[data-tng-el-exposed="false"]:not([role="presentation"])',
    testStatus: "inapplicable",
    tags: ['a11y', 'frames'],
    ressources: {'rgaa': ['2.1.1']}
});

//* 2.2 Pour chaque cadre ayant un titre de cadre, ce titre de cadre est-il pertinent ?
// 2.2.1 Pour chaque cadre (balise <iframe> ou <frame>) ayant un attribut title, le contenu de cet attribut est-il pertinent ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__frames_name_134",
    query: 'iframe[data-tng-el-exposed="true"][title]:not([role="presentation"]), frame[data-tng-el-exposed="true"][title]:not([role="presentation"])',
    filter: function (item) {
        if(item.getAttribute('title').trim().length === 0) {
            item.setAttribute('data-tng-frameAlt', 'false');
            return;
        }

        return true;
    },
    testStatus: 'cantTell',
    warning: false,
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'frames'],
    ressources: {'rgaa': ['2.2.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__frames_name_135",
    query: '[data-tng-frameAlt]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "any" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'frames'],
    ressources: {'rgaa': ['2.2.1']}
});

/**
 *? IMAGES
 ** tous les tests sont répertoriés, mais les critères 1.2/1.4 et 1.5 sont améliorables
 ** dependances gérées
 *TODO pas possible de tester si un élément a un aria-hidden="true" ET un nom accessible car hasAccessibleName() renvoie false quand isNotExposedDueTo.length === 0
 *! 1.4/1.5 comment identifier les images test / captcha ?
 *
 * datas : data-tng-img-roleImg, data-tng-informative-img, data-tng-altLong, data-tng-image-link, data-tng-ismap-linked, data-tng-img-ignored, data-tng-altnotexposed, data-tng-accessibleCaption
 */

//* 1.1 Chaque image porteuse d'information a-t-elle une alternative textuelle ?
// 1.1.1 - Chaque image (balise <img> ou balise possédant l'attribut WAI-ARIA role="img") porteuse d'information a-t-elle une alternative textuelle ? // ne pas traiter les images liens
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_136",
    query: 'img[data-tng-el-exposed="true"]:not([role]), [role="img"][data-tng-el-exposed="true"]',
    description: "locale__images_description_137",
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.closest('a')) {
            item.setAttribute('data-tng-image-link', true);
            return;
        }

        let IName = item.tagName.toLowerCase();
        if (IName != 'svg' && IName != 'object' && IName != 'embed' && IName != 'canvas') {
            item.setAttribute('data-tng-img-roleImg', true);
            if (IName == 'img') {
                if ((!item.hasAttribute('alt') || item.getAttribute('alt').trim().length === 0) && (!item.hasAttribute('aria-label') || item.getAttribute('aria-label').trim().length === 0) && (!item.hasAttribute('aria-labelledby') || item.getAttribute('aria-labelledby').trim().length === 0)){
                    if(item.hasAttribute('alt') && item.getAttribute('alt').length === 0) return false;
                    else return true;
                }
            }

            item.setAttribute('data-tng-informative-img', true);

            if(item.accessibleName() == '') {
                return true;
            } else if(item.accessibleName().length > 80) {
                item.setAttribute('data-tng-altLong','true');
            } else {
                item.setAttribute('data-tng-altLong','false');
            }
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_138",
    query: 'img[data-tng-altLong], [role="img"][data-tng-altLong]',
    description: "locale__images_description_139",
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.1'] }
});

// 1.1.2 - Chaque zone d'une image réactive (balise <area>) porteuse d'information a-t-elle une alternative textuelle ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_140",
    query: 'area[data-tng-el-exposed="true"]:not([role])',
    description: "locale__images_description_137",
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function(item) {
        if(!item.hasAttribute('href')) {
            if(item.hasAttribute('aria-hidden')) {
                if(item.getAttribute('aria-hidden') === true) return;
            }
    
            if((!item.hasAttribute('alt') || item.getAttribute('alt').trim().length === 0) && !item.getAttribute('aria-label')) return;
        }

        item.setAttribute('data-tng-informative-img', true);

        if(item.accessibleName() == '') {
            return true;
        } else if(item.accessibleName().length > 80) {
            item.setAttribute('data-tng-altLong','true');
        } else {
            item.setAttribute('data-tng-altLong','false');
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.2'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_142",
    query: 'area[data-tng-altLong]',
    description: "locale__images_description_139",
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.2'] }
});

// 1.1.3 - Chaque bouton de type image (balise <input> avec l'attribut type="image") a-t-il une alternative textuelle ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_144",
    query: 'input[type="image"][data-tng-el-exposed="true"]:not([role])',
    description: "locale__images_description_137",
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.accessibleName() == '') {
            return true;
        } else {
            item.setAttribute('data-tng-informative-img', true);
            if(item.accessibleName().length > 80) {
                item.setAttribute('data-tng-altLong','true');
            } else {
                item.setAttribute('data-tng-altLong','false');
            }
        }
    },
    tags: ['a11y', 'buttons', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.3'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_146",
    query: 'input[type="image"][data-tng-altLong]',
    description: "locale__images_description_139",
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'buttons', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.3'] }
});

// 1.1.4 - Chaque zone cliquable d'une image réactive côté serveur est-elle doublée d'un lien dans la page ? // à tester
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_148",
    query: 'a[href] img[ismap][data-tng-el-exposed="true"]:not([role])',
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        let ismapLink = item.closest('a');

        if (ismapLink.getAttribute('href').trim().length > 0) {
            var hrefValue = ismapLink.getAttribute('href');
            var linkPage = document.querySelectorAll('a[href="'+hrefValue+'"]');

            if(linkPage.length < 2) {
                return true;
            } else {
                item.setAttribute('data-tng-ismap-linked', true);
            }
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.1.4'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_149",
    query: '[data-tng-ismap-linked]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "href",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.1.4'] }
});

// 1.1.5 - Chaque image vectorielle (balise <svg>) porteuse d'information, vérifie-t-elle ces conditions ? // à testers
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_150",
    query: 'svg[data-tng-el-exposed="true"]:not([role="presentation"]):not([data-tng-image-link])',
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.closest('a')) {
            item.setAttribute('data-tng-image-link', true);
            return;
        }

        if(item.hasAttribute('role')) {
            return item.getAttribute('role') !== 'img' && !item.hasValidRole();
        }
        return true;
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.1.5'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_151",
    query: 'svg[role="img"][data-tng-el-exposed="true"]:not([data-tng-image-link])',
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    description: "locale__images_description_137",
    filter: function (item) {
        if(item.accessibleName() == '') {
            return true;
        } else {
            item.setAttribute('data-tng-informative-img', true);
            if(item.accessibleName().length > 80) {
                item.setAttribute('data-tng-altLong','true');
            } else {
                item.setAttribute('data-tng-altLong','false');
            }
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.5'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_153",
    query: 'svg[role="img"][data-tng-altLong]',
    description: "locale__images_description_139",
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.5'] }
});

// 1.1.6 - Chaque image objet (balise <object> avec l'attribut type="image/…") porteuse d'information, vérifie-t-elle une de ces conditions ? // semble KO sur l'accessible name //gère que le 1er cas dans le RGAA4
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_155",
    query: 'object[type^="image/"][data-tng-el-exposed="true"]:not([data-tng-image-link])',
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.closest('a')) {
            item.setAttribute('data-tng-image-link', true);
            return;
        }

        if(item.hasAttribute('role')) {
            return item.getAttribute('role') !== 'img' && !item.hasValidRole();
        }
        return true;
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.1.6'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_156",
    query: 'object[role="img"][type^="image/"][data-tng-el-exposed="true"]:not([data-tng-image-link])',
    description: "locale__images_description_137",
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.accessibleName() == '') {
            return true;
        } else {
            item.setAttribute('data-tng-informative-img', true);
            if(item.accessibleName().length > 80) {
                item.setAttribute('data-tng-altLong','true');
            } else {
                item.setAttribute('data-tng-altLong','false');
            }
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.6'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_158",
    query: 'object[type^="image/"][data-tng-altLong]',
    description: "locale__images_description_139",
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.6'] }
});

// 1.1.7 - Chaque image embarquée (balise <embed> avec l'attribut type="image/…") porteuse d'information, vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_160",
    query: 'embed[type^="image/"][data-tng-el-exposed="true"]',
    testStatus: "failed",
    filter: function (item) {
        if(item.hasAttribute('role')) {
            return item.getAttribute('role') !== 'img' && !item.hasValidRole();
        }
        return true;
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.1.7'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_161",
    query: 'embed[type^="image/"][role="img"][data-tng-el-exposed="true"]',
    description: "locale__images_description_137",
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.accessibleName() == '') {
            return true;
        } else {
            item.setAttribute('data-tng-informative-img', true);
            if(item.accessibleName().length > 80) {
                item.setAttribute('data-tng-altLong','true');
            } else {
                item.setAttribute('data-tng-altLong','false');
            }
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.7'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_163",
    query: 'embed[type^="image/"][data-tng-altLong]',
    description: "locale__images_description_139",
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.7'] }
});

// 1.1.8 - Chaque image bitmap (balise <canvas>) porteuse d'information, vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_165",
    query: 'canvas[data-tng-el-exposed="true"]:not([data-tng-image-link])',
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.closest('a')) {
            item.setAttribute('data-tng-image-link', true);
            return;
        }

        if(item.hasAttribute('role')) {
            return item.getAttribute('role') !== 'img' && !item.hasValidRole();
        }
        return true;
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.1.8'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_166",
    query: 'canvas[role="img"][data-tng-el-exposed="true"]:not([data-tng-image-link])',
    description: "locale__images_description_137",
    testStatus: "failed",
    depStatus: ["passed", "cantTell"],
    filter: function (item) {
        if(item.accessibleName() == '') {
            return true;
        } else {
            item.setAttribute('data-tng-informative-img', true);
            if(item.accessibleName().length > 80) {
                item.setAttribute('data-tng-altLong','true');
            } else {
                item.setAttribute('data-tng-altLong','false');
            }
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.8'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_168",
    query: 'canvas[data-tng-altLong]',
    description: "locale__images_description_139",
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.1.8'] }
});

//* 1.2 Chaque image de décoration est-elle correctement ignorée par les technologies d'assistance ?
// 1.2.1 Chaque image (balise <img>) de décoration, sans légende, vérifie-t-elle une de ces conditions ?
//! dependance 1.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_170",
    query: 'img:not([data-tng-informative-img]):not([data-tng-image-link])',
    filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') === 'false' && item.getAttribute('data-tng-el-visible') === 'false') return;
        var parent = item.parentNode;

        if(parent) {
            var parentTag = parent.tagName.toLowerCase();

            if(parentTag === 'figure' && parent.querySelector('figcaption')) {
                if(parent.querySelector('figcaption').textContent.trim().length > 0) {
                    item.setAttribute('data-tng-informative-img', true);
                    return;
                }
            }
        }
        
        if (item.hasAttribute('aria-hidden')) {
            if (item.getAttribute('aria-hidden') == "true") {
                item.setAttribute('data-tng-img-ignored', true);
                return true;
            }
        }

        if (item.hasAttribute('role')){
            if (item.getAttribute('role') == "presentation" && (!item.hasAttribute('tabindex') || item.getAttribute('tabindex') < 0)) {
                item.setAttribute('data-tng-img-ignored', true);
                return true;
            }
        }

        if (item.hasAttribute('alt')){
            if(item.getAttribute('alt') == '') {
                item.setAttribute('data-tng-img-ignored', true);
                return true;
            }
        }

        item.setAttribute('data-tng-img-ignored', false);
        return;
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "egal" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-hidden",
                value: "true",
                valueState: "egal"
            },
            {
                name: "role",
                value: "presentation",
                valueState: "egal"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_171",
    query: 'img[data-tng-img-ignored="false"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "tabindex",
                value: "-",
                valueState: "startBy"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.1'] }
});

// 1.2.2 Chaque zone non cliquable (balise <area> sans attribut href) de décoration, vérifie-t-elle une de ces conditions ?
//! dependance 1.1.2
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_172",
    query: 'area:not([role]):not([data-tng-informative-img]):not([href]), area[role="presentation"]:not([href]):not([data-tng-informative-img])',
    filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') === 'false') return;

        if(item.hasAttribute('role')) {
            if(!item.hasAttribute('tabindex') || item.getAttribute('tabindex') < 0) {
                item.setAttribute('data-tng-img-ignored', true);
                return true;
            };
        };

        if (item.hasAttribute('aria-hidden')){
            if (item.getAttribute('aria-hidden') == "true") {
                item.setAttribute('data-tng-img-ignored', true);
                return true;
            }
        }

        if (item.hasAttribute('alt') && item.getAttribute('alt') == ''){
            item.setAttribute('data-tng-img-ignored', true);
            return true;
        }

        item.setAttribute('data-tng-img-ignored', false);
        return;
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "egal" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "aria-hidden",
                value: "true",
                valueState: "egal"
            },
            {
                name: "role",
                value: "presentation",
                valueState: "egal"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.2'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_173",
    query: 'area[data-tng-img-ignored="false"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty" //startBy || endBy, || contains || egal || notEmpty || any
            },
            {
                name: "tabindex",
                value: "-",
                valueState: "startBy"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.2'] }
});

// 1.2.3 Chaque image objet (balise object avec l'attribut type="image/…") de décoration, sans légende, vérifie-t-elle ces conditions ? // pourquoi pas de gestion de role presentation dans le RGAA // à tester
//! dependance 1.1.6
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_174",
    query: 'object[type^="image/"]:not([role]):not([data-tng-informative-img]):not([data-tng-image-link]), object[type^="image/"][role="img"]:not([data-tng-image-link]):not([data-tng-informative-img])',
    filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') === 'false' && item.getAttribute('data-tng-el-visible') === 'false') return;
        var parent = item.parentNode;

        if(parent) {
            var parentTag = parent.tagName.toLowerCase();

            if(parentTag === 'figure' && parent.querySelector('figcaption')) {
                if(parent.querySelector('figcaption').textContent.trim().length > 0) {
                    item.setAttribute('data-tng-informative-img', true);
                    return false;
                }
            }
        }

        if (item.hasAttribute('aria-hidden')){
            if (item.getAttribute('aria-hidden') == "true") {
                if (item.textContent.trim().length === 0) {
                    if(!item.hasAttribute('aria-label') || item.getAttribute('aria-label').length === 0) {
                        if(!item.hasAttribute('title') || item.getAttribute('title').length === 0) {
                            item.setAttribute('data-tng-img-ignored', true);
                            return true;
                        }
                    }
                }
            }
        }

        item.setAttribute('data-tng-img-ignored', false);
        return;
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "aria-hidden",
                value: "true",
                valueState: "egal" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.3'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_175",
    query: 'object[type^="image/"][data-tng-img-ignored="false"]',
    testStatus: "failed",
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.3'] }
});

// 1.2.4 Chaque image vectorielle (balise svg) de décoration, sans légende, vérifie-t-elle ces conditions ? // à tester
//! dependance 1.1.5
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_176",
    query: 'svg:not([data-tng-informative-img]):not([data-tng-image-link])',
    filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') === 'false' && item.getAttribute('data-tng-el-visible') === 'false') return;
        var parent = item.parentNode;

        if(parent) {
            var parentTag = parent.tagName.toLowerCase();

            if(parentTag === 'figure' && parent.querySelector('figcaption')) {
                if(parent.querySelector('figcaption').textContent.trim().length > 0) {
                    item.setAttribute('data-tng-informative-img', true);
                    return;
                }
            }
        }

        if (item.hasAttribute('aria-hidden')) {
            if (item.getAttribute('aria-hidden') == "true") {
                if(!item.hasAttribute('aria-label') || item.getAttribute('aria-label').length === 0) {
                    var titleTag = item.querySelector("title");
                    var descTag = item.querySelector('desc');
                    var titleAtt = item.querySelectorAll('[title]');

                    if(!titleTag && !descTag) {
                        if(titleAtt.length === 0 && !item.hasAttribute('title')) {
                            item.setAttribute('data-tng-img-ignored', true);
                            return true;
                        }
                    }
                }
            }
        }

        item.setAttribute('data-tng-img-ignored', false);
        return;
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "aria-hidden",
                value: "true",
                valueState: "egal" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.4'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_177",
    query: 'svg[data-tng-img-ignored="false"]',
    testStatus: "failed",
    mark: function() {
        //todo permettre de marquer les balises enfants <title> et <desc>
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "any" //startBy || endBy, || contains || egal || notEmpty || any
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.4'] }
});

// 1.2.5  Chaque image bitmap (balise <canvas>) de décoration, sans légende, vérifie-t-elle ces conditions ? // à tester
//! dependance 1.1.8
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_178",
    query: 'canvas:not([data-tng-informative-img]):not([data-tng-image-link])',
    filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') === 'false' && item.getAttribute('data-tng-el-visible') === 'false') return;
        var parent = item.parentNode;

        if(parent) {
            var parentTag = parent.tagName.toLowerCase();

            if(parentTag === 'figure' && parent.querySelector('figcaption')) {
                if(parent.querySelector('figcaption').textContent.trim().length > 0) {
                    item.setAttribute('data-tng-informative-img', true);
                    return;
                }
            }
        }

        if (item.hasAttribute('aria-hidden')) {
            if (item.getAttribute('aria-hidden') == "true") {
                if(!item.hasAttribute('aria-label') || item.getAttribute('aria-label').length === 0) {
                    if (item.textContent.trim().length === 0) {
                        item.setAttribute('data-tng-img-ignored', true);
                        return true;
                    }
                }
            }
        }

        item.setAttribute('data-tng-img-ignored', false);
        return;        
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "aria-hidden",
                value: "true",
                valueState: "egal"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.5'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_179",
    query: 'canvas[data-tng-img-ignored="false"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "aria-hidden",
                value: "false",
                valueState: "egal"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.5'] }
});

// 1.2.6 Chaque image embarquée (balise <embed> avec l'attribut type="image/…") de décoration, sans légende, vérifie-t-elle ces conditions ? // à tester
//! dependance 1.1.7
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_180",
    query: 'embed[type^="image/"]:not([role]):not([data-tng-informative-img]), embed[type^="image/"][role="img"]:not([data-tng-informative-img])',
    filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') === 'false' && item.getAttribute('data-tng-el-visible') === 'false') return;
        var parent = item.parentNode;

        if(parent) {
            var parentTag = parent.tagName.toLowerCase();

            if(parentTag === 'figure' && parent.querySelector('figcaption')) {
                if(parent.querySelector('figcaption').textContent.trim().length > 0) {
                    item.setAttribute('data-tng-informative-img', true);
                    return false;
                }
            }
        }

        if (item.hasAttribute('aria-hidden')) {
            if (item.getAttribute('aria-hidden') == "true") {
                if(!item.hasAttribute('aria-label') || item.getAttribute('aria-label').length === 0) {
                    if(!item.hasAttribute('title') || item.getAttribute('title').length === 0) {
                        item.setAttribute('data-tng-img-ignored', true);
                        return true;
                    }
                }
            }
        }

        item.setAttribute('data-tng-img-ignored', false);
        return;
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "aria-hidden",
                value: "true",
                valueState: "egal"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.6'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_181",
    query: 'embed[type^="image/"][data-tng-img-ignored="false"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "aria-hidden",
                value: "false",
                valueState: "egal"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.2.6'] }
});

//* 1.3 Pour chaque image porteuse d'information ayant une alternative textuelle, cette alternative est-elle pertinente (hors cas particuliers) ?
//* 1.4 Pour chaque image utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle, cette alternative permet-elle d'identifier la nature et la fonction de l'image ?
// 1.3.1 Pour chaque image (balise <img> ou balise possédant l'attribut WAI-ARIA role="img") porteuse d'information, ayant une alternative textuelle, cette alternative est-elle pertinente (hors cas particuliers) ?
// 1.4.1 Pour chaque image (balise <img>) utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle, cette alternative est-elle pertinente ?
//! dependance 1.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_182",
    query: '[data-tng-img-roleImg][data-tng-altLong]',
    description: "locale__images_description_183",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.1', '1.4.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_184",
    query: 'img[data-tng-altLong][src]',
    testStatus: "failed",
    filter: function (item) {
        let an = item.getAttribute('data-tng-anobject');
        if(an && an[0] && item.src.length > 0) return an.includes(item.src);;
    },
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.1'] }
});

// 1.3.2 - Pour chaque zone (balise <area>) d'une image réactive porteuse d'information, ayant une alternative textuelle, cette alternative est-elle pertinente (hors cas particuliers) ?
// 1.4.2 Pour chaque zone (balise <area>) d'une image réactive utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle, cette alternative est-elle pertinente ?
//! dependance 1.1.2
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_185",
    description: "locale__images_description_183",
    query: 'area[data-tng-altLong]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.2', '1.4.2'] }
});

// 1.3.3 Pour chaque bouton de type image (balise <input> avec l'attribut type="image"), ayant une alternative textuelle, cette alternative est-elle pertinente (hors cas particuliers) ?
// 1.4.3 Pour chaque bouton de type image (balise <input> avec l'attribut type="image") utilisé comme CAPTCHA ou comme image-test, ayant une alternative textuelle, cette alternative est-elle pertinente ?
//! dependance 1.1.3
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_187",
    description: "locale__images_description_183",
    query: 'input[type="image"][data-tng-altLong]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.3', '1.4.3'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_189",
    query: 'input[type="image"][data-tng-altLong][src]',
    testStatus: "failed",
    filter: function (item) {
        let an = item.getAttribute('data-tng-anobject');
        if(an && an[0] && item.src.length > 0) return an.includes(item.src);;
    },
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.3'] }
});

// 1.3.4 Pour chaque image objet (balise <object> avec l'attribut type="image/…") porteuse d'information, ayant une alternative textuelle ou un contenu alternatif, cette alternative est-elle pertinente (hors cas particuliers) ?
// 1.4.4 Pour chaque image objet (balise <object> avec l'attribut type="image/…") utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle ou un contenu alternatif, cette alternative est-elle pertinente ?
//! dependance 1.1.6
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_190",
    description: "locale__images_description_183",
    query: 'object[data-tng-altLong]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.4', '1.4.4'] }
});

// 1.3.5 Pour chaque image embarquée (balise <embed> avec l'attribut type="image/…") porteuse d'information, ayant une alternative textuelle ou un contenu alternatif, cette alternative est-elle pertinente (hors cas particuliers) ?
// 1.4.5 Pour chaque image embarquée (balise <embed> avec l'attribut type="image/…") utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle ou un contenu alternatif, cette alternative est-elle pertinente ?
//! dependance 1.1.7
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_192",
    description: "locale__images_description_183",
    query: 'embed[data-tng-altLong]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.5', '1.4.5'] }
});

// 1.3.6 Pour chaque image vectorielle (balise <svg>) porteuse d'information, ayant une alternative textuelle, cette alternative est-elle pertinente (hors cas particuliers) ?
// 1.4.6 Pour chaque image vectorielle (balise <svg>) utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle, cette alternative est-elle pertinente ?
//! dependance 1.1.5
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_194",
    description: "locale__images_description_183",
    query: 'svg[data-tng-altLong]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.6', '1.4.6'] }
});

// 1.3.7 Pour chaque image bitmap (balise <canvas>) porteuse d'information, ayant une alternative textuelle ou un contenu alternatif, cette alternative est-elle pertinente (hors cas particuliers) ? // traiter le cas particulier
// 1.4.7 Pour chaque image bitmap (balise <canvas>) utilisée comme CAPTCHA ou comme image-test, ayant une alternative textuelle ou un contenu alternatif, cette alternative est-elle pertinente ?
//! dependance 1.1.8
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_196",
    description: "locale__images_description_183",
    query: 'canvas[data-tng-altLong]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.7', '1.4.7'] }
});

// 1.3.8 Pour chaque image bitmap (balise <canvas>) porteuse d'information et ayant un contenu alternatif entre <canvas> et </canvas>, ce contenu alternatif est-il correctement restitué par les technologies d'assistance ? //traiter le cas particulier
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_198",
    query: 'canvas[role="img"][data-tng-el-exposed="true"]',
    filter: function (item) {
        let texts = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
        let alt = 0;
        let altExposed = 0;
        while(texts.nextNode() && !alt && !altExposed) {
            let cnt = texts.currentNode;
            let parent = cnt.parentNode;
            if(cnt.nodeValue.trim().length > 0) {
                alt++;

                if(parent.getAttribute('data-tng-el-exposed') === 'true') {
                    altExposed++;
                }
            }
        }
        
        if(alt > 0) {
            if(alt === altExposed) return true;
            else item.setAttribute('data-tng-altnotexposed', 'true');
        }
    },
    testStatus: 'cantTell',
    warning: false,
    depStatus: ["failed"],
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.3.8'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_199",
    query: 'canvas[data-tng-altnotexposed]',
    testStatus: "failed",
    tags: ['a11y', 'images'],
    ressources: { 'rgaa': ['1.3.8'] }
});

// 1.3.9 Pour chaque image porteuse d'information et ayant une alternative textuelle, l'alternative textuelle est-elle courte et concise (hors cas particuliers) ?
//! dependances 1.1.*
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_200",
    description: "locale__images_description_201",
    query: '[data-tng-altLong="true"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.9'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_202",
    query: '[data-tng-altLong="false"]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "alt",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-labelledby",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.3.9'] }
});

//* 1.5 Pour chaque image utilisée comme CAPTCHA, une solution d'accès alternatif au contenu ou à la fonction du CAPTCHA est-elle présente ?
// 1.5.1 Chaque image (balises <img>, <area>, <object>, <embed>, <svg>, <canvas> ou possédant un attribut WAI-ARIA role="img") utilisée comme CAPTCHA vérifie-t-elle une de ces conditions ? 
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_203",
    query: 'img:not([data-tng-image-link]), area:not([data-tng-image-link]), object:not([data-tng-image-link]), embed:not([data-tng-image-link]), svg:not([data-tng-image-link]), canvas:not([data-tng-image-link]), [role="img"]:not([data-tng-image-link])',
    description: "locale__images_description_204",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.5.1']}
});

// 1.5.2 Chaque bouton associé à une image (balise <input> avec l'attribut type="image") utilisée comme CAPTCHA vérifie-t-il une de ces conditions ? 
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_205",
    query: 'input[type="image"]',
    description: "locale__images_description_206",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.5.2']}
});

//* 1.6 Chaque image porteuse d'information a-t-elle, si nécessaire, une description détaillée ?
//* 1.7 Pour chaque image porteuse d'information ayant une description détaillée, cette description est-elle pertinente ?
// 1.6.1 Chaque image (balise <img>) porteuse d'information, qui nécessite une description détaillée, vérifie-t-elle une de ces conditions ?
// 1.7.1 Chaque image (balise <img>) porteuse d'information, ayant une description détaillée, vérifie-t-elle ces conditions ?
//! dependance 1.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_207",
    query: 'img[data-tng-informative-img]',
    description: "locale__images_description_208",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.1', '1.7.1']}
});

// 1.6.2 Chaque image objet (balise <object> avec l'attribut type="image/…") porteuse d'information, qui nécessite une description détaillée, vérifie-t-elle une de ces conditions ?
// 1.7.3 Chaque image objet (balise <object> avec l'attribut type="image/…") porteuse d'information, ayant une description détaillée, vérifie-t-elle ces conditions ?
//! dependance 1.1.6
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_209",
    query: 'object[type^="image/"][data-tng-informative-img]',
    description: "locale__images_description_208",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.2', '1.7.3']}
});

//1.6.3 Chaque image embarquée (balise <embed>) porteuse d'information, qui nécessite une description détaillée, vérifie-t-elle une de ces conditions ?
// 1.7.4 Chaque image embarquée (balise <embed> avec l'attribut type="image/…") porteuse d'information, ayant une description détaillée, vérifie-t-elle ces conditions ? 
//! dependance 1.1.7
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_211",
    query: 'embed[type^="image/"][data-tng-informative-img]',
    description: "locale__images_description_208",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.3', '1.7.4']}
});

//1.6.4 Chaque bouton de type image (balise <input> avec l'attribut type="image") porteur d'information, qui nécessite une description détaillée, vérifie-t-elle une de ces conditions ?
// 1.7.2 Chaque bouton de type image (balise <input> avec l'attribut type="image") porteur d'information, ayant une description détaillée, vérifie-t-elle ces conditions ?
//! dependance 1.1.3
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_213",
    query: 'input[type="image"][data-tng-informative-img]',
    description: "locale__images_description_208",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.4', '1.7.2']}
});

// 1.6.5 Chaque image vectorielle (balise <svg>) porteuse d'information, qui nécessite une description détaillée, vérifie-t-elle une de ces conditions ?
// 1.6.6 Pour chaque image vectorielle (balise <svg>) porteuse d'information, ayant une description détaillée, la référence éventuelle à la description détaillée dans l'attribut WAI-ARIA aria-label et la description détaillée associée par l'attribut WAI-ARIA aria-labelledby ou aria-describedby sont-elles correctement restituées par les technologies d'assistance ?
// 1.7.5 Chaque image vectorielle (balise <svg>) porteuse d'information, ayant une description détaillée, vérifie-t-elle ces conditions ?
//! dependance 1.1.5
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_215",
    query: 'svg[data-tng-informative-img]',
    description: "locale__images_description_216",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.5', '1.6.6', '1.7.5']}
});

// 1.6.7 Chaque image bitmap (balise <canvas>), porteuse d'information, qui nécessite une description détaillée, vérifie-t-elle une de ces conditions ? 
// 1.6.8 Pour chaque image bitmap (balise <canvas>) porteuse d'information, qui implémente une référence à une description détaillée adjacente, cette référence est-elle correctement restituée par les technologies d'assistance ?
// 1.7.6 Chaque image bitmap (balise <canvas>) porteuse d'information, ayant une description détaillée, vérifie-t-elle ces conditions ?
//! dependance 1.1.8
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_217",
    query: 'canvas[data-tng-informative-img]',
    description: "locale__images_description_216",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.7', '1.6.8', '1.7.6']}
});

// 1.6.9 Pour chaque image (balise <img>, <input> avec l'attribut type="image", <area>, <object>, <embed>, <svg>, <canvas>, ou possédant un attribut WAI-ARIA role="img") porteuse d'information, qui est accompagnée d'une description détaillée et qui utilise un attribut WAI-ARIA aria-describedby, l'attribut WAI-ARIA aria-describedby associe-t-il la description détaillée ?
//! dependances 1.1.*
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_219",
    query: '[data-tng-informative-img][aria-describedby]',
    description: "locale__images_description_220",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "aria-describedby",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte identifié par l'attribut aria-describedby",
                element: "#!!!aria-describedby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.9']}
});

// 1.6.10 Chaque balise possédant un attribut WAI-ARIA role="img" porteuse d'information, qui nécessite une description détaillée, vérifie-t-elle une de ces conditions ?
//! dependances 1.1.1 & 1.1.5
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_221",
    query: '[role="img"][data-tng-informative-img]',
    description: "locale__images_description_222",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.6.10']}
});

//* 1.8 Chaque image texte porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
// 1.8.1 Chaque image texte (balise <img> ou possédant un attribut WAI-ARIA role="img") porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
//! dependance 1.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_223",
    query: '[data-tng-img-roleImg][data-tng-altLong]',
    description: "locale__images_description_224",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.8.1']}
});

// 1.8.2 Chaque bouton « image texte » (balise <input> avec l'attribut type="image") porteur d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacé par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
//! dependance 1.1.3
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_213",
    query: 'input[data-tng-altLong]',
    description: "locale__images_description_224",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.8.2']}
});

// 1.8.3 Chaque image texte objet (balise <object> avec l'attribut type="image/…") porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
//! dependance 1.1.6
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_209",
    query: 'object[data-tng-altLong]',
    description: "locale__images_description_224",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.8.3']}
});

// 1.8.4 Chaque image texte embarquée (balise <embed> avec l'attribut type="image/…") porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
//! dependance 1.1.7
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_211",
    query: 'embed[data-tng-altLong]',
    description: "locale__images_description_224",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.8.4']}
});

// 1.8.5 Chaque image texte bitmap (balise <canvas>) porteuse d'information, en l'absence d'un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
//! dependance 1.1.8
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_217",
    query: 'canvas[data-tng-altLong]',
    description: "locale__images_description_224",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.8.5']}
});

// 1.8.6 Chaque image texte SVG (balise <svg>) porteuse d'information et dont le texte n’est pas complètement structuré au moyen d’éléments <text>, en l’absence d’un mécanisme de remplacement, doit si possible être remplacée par du texte stylé. Cette règle est-elle respectée (hors cas particuliers) ?
//! dependance 1.1.5
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_215",
    query: 'svg[data-tng-altLong]',
    description: "locale__images_description_224",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'images'],
    ressources: {'rgaa': ['1.8.6']}
});

//* 1.9 Chaque légende d'image est-elle, si nécessaire, correctement reliée à l'image correspondante ?
// 1.9.1 Chaque image pourvue d'une légende (balise <img>, <input> avec l'attribut type="image" ou balise possédant un attribut WAI-ARIA role="img" associée à une légende adjacente), vérifie-t-elle, si nécessaire, ces conditions ?
//! dependance 1.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_235",
    query: 'figure [data-tng-img-roleImg], figure input[type="image"]',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        var parentFigure = item.closest('figure');
        var figcaption = parentFigure.querySelector('figcaption');

        if(figcaption && figcaption.textContent.length > 0) {
            if (parentFigure.hasAttribute('role')) {
                var parentRole = parentFigure.getAttribute('role');

                if ((parentRole == 'figure') || (parentRole == 'group')) {
                    if (parentFigure.hasAttribute('aria-label')) {
                        var parentFigureLabel = parentFigure.getAttribute('aria-label').trim().toLowerCase();
                        var figcaptionValue = figcaption.accessibleName().trim().toLowerCase();

                        if(figcaptionValue == parentFigureLabel) {
                            item.setAttribute('data-tng-accessibleCaption', 'true');
                            return;
                        }
                    }
                }
            }
            return true;
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_236",
    query: 'figure [data-tng-img-roleImg][data-tng-accessibleCaption], figure input[type="image"][data-tng-accessibleCaption]',
    testStatus: "passed",
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.1'] }
});

// 1.9.2 Chaque image objet pourvue d'une légende (balise object avec l'attribut type="image/…" associée à une légende adjacente), vérifie-t-elle, si nécessaire, ces conditions ? xxx
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_237",
    query: 'figure object[type^="image/"]',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        var parentFigure = item.closest('figure');
        var figcaption = parentFigure.querySelector('figcaption');

        if(figcaption && figcaption.textContent.length > 0) {
            if (parentFigure.hasAttribute('role')) {
                var parentRole = parentFigure.getAttribute('role');

                if ((parentRole == 'figure') || (parentRole == 'group')) {
                    if (parentFigure.hasAttribute('aria-label')) {
                        var parentFigureLabel = parentFigure.getAttribute('aria-label').trim().toLowerCase();
                        var figcaptionValue = figcaption.accessibleName().trim().toLowerCase();

                        if(figcaptionValue == parentFigureLabel) {
                            item.setAttribute('data-tng-accessibleCaption', 'true');
                            return;
                        }
                    }
                }
            }
            return true;
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.2'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_238",
    query: 'figure object[type^="image/"][data-tng-accessibleCaption]',
    testStatus: "passed",
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.2'] }
});

//1.9.3 Chaque image embarquée pourvue d'une légende (balise <embed> associée à une légende adjacente), vérifie-t-elle, si nécessaire, ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_239",
    query: 'figure embed',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        var parentFigure = item.closest('figure');
        var figcaption = parentFigure.querySelector('figcaption');

        if(figcaption && figcaption.textContent.length > 0) {
            if (parentFigure.hasAttribute('role')) {
                var parentRole = parentFigure.getAttribute('role');

                if ((parentRole == 'figure') || (parentRole == 'group')) {
                    if (parentFigure.hasAttribute('aria-label')) {
                        var parentFigureLabel = parentFigure.getAttribute('aria-label').trim().toLowerCase();
                        var figcaptionValue = figcaption.accessibleName().trim().toLowerCase();

                        if(figcaptionValue == parentFigureLabel) {
                            item.setAttribute('data-tng-accessibleCaption', 'true');
                            return;
                        }
                    }
                }
            }
            return true;
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.3'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_240",
    query: 'figure embed[data-tng-accessibleCaption]',
    testStatus: "passed",
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.3'] }
});

//1.9.4 Chaque image vectorielle pourvue d'une légende (balise <svg> associée à une légende adjacente), vérifie-t-elle, si nécessaire, ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_241",
    query: 'figure svg',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        var parentFigure = item.closest('figure');
        var figcaption = parentFigure.querySelector('figcaption');

        if(figcaption && figcaption.textContent.length > 0) {
            if (parentFigure.hasAttribute('role')) {
                var parentRole = parentFigure.getAttribute('role');

                if ((parentRole == 'figure') || (parentRole == 'group')) {
                    if (parentFigure.hasAttribute('aria-label')) {
                        var parentFigureLabel = parentFigure.getAttribute('aria-label').trim().toLowerCase();
                        var figcaptionValue = figcaption.accessibleName().trim().toLowerCase();

                        if(figcaptionValue == parentFigureLabel) {
                            item.setAttribute('data-tng-accessibleCaption', 'true');
                            return;
                        }
                    }
                }
            }
            return true;
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.4'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_242",
    query: 'figure svg[data-tng-accessibleCaption]',
    testStatus: "passed",
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.4'] }
});

// 1.9.5 Chaque image bitmap pourvue d'une légende (balise canvas associée à une légende adjacente), vérifie-t-elle, si nécessaire, ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_243",
    query: 'figure canvas',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        var parentFigure = item.closest('figure');
        var figcaption = parentFigure.querySelector('figcaption');

        if(figcaption && figcaption.textContent.length > 0) {
            if (parentFigure.hasAttribute('role')) {
                var parentRole = parentFigure.getAttribute('role');

                if ((parentRole == 'figure') || (parentRole == 'group')) {
                    if (parentFigure.hasAttribute('aria-label')) {
                        var parentFigureLabel = parentFigure.getAttribute('aria-label').trim().toLowerCase();
                        var figcaptionValue = figcaption.accessibleName().trim().toLowerCase();

                        if(figcaptionValue == parentFigureLabel) {
                            item.setAttribute('data-tng-accessibleCaption', 'true');
                            return;
                        }
                    }
                }
            }
            return true;
        }
    },
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.5'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__images_name_244",
    query: 'figure canvas[data-tng-accessibleCaption]',
    testStatus: "passed",
    tags: ['a11y', 'images', 'accessiblename'],
    ressources: { 'rgaa': ['1.9.5'] }
});
/**
 *? LIENS
 *
 * * dependances gérées
 * data : data-tng-svgLink, data-tng-textlink, data-tng-textlink-accessiblename, data-tng-cplink, data-tng-imglink, data-tng-imglink-hasContent, data-tng-imglink-accessiblename, data-tng-cplink-hasContent, data-tng-cplink-accessiblename, data-tng-svglink-accessiblename, data-tng-link-names-match, data-tng-link-hasname
 */

//* 6.1 Chaque lien est-il explicite (hors cas particuliers) ?
// 6.1.1 Pour chaque lien texte l'intitulé de lien seul permet-il d'en comprendre la fonction et la destination ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_245",
    query: 'a[href], [role="link"]',
    testStatus: "failed",
    depStatus: ["inapplicable", "cantTell", "passed"],
    filter: function (item) {
        if(item.closest('svg')) {
            item.setAttribute('data-tng-svgLink', 'true');
            return;
        }

        if(item.querySelector('img, [role="img"], svg, object, canvas') == null) {
            item.setAttribute('data-tng-textlink', 'true');

            if(item.getAttribute('data-tng-el-exposed') === 'true') {
                if(!item.hasAccessibleName()) {
                    return true;
                } else {
                    item.setAttribute('data-tng-textlink-accessiblename', 'true');

                    if(item.hasAttribute('data-tng-ANObject')) {
                        let details = JSON.parse(item.getAttribute('data-tng-ANObject'));
                        details.shift();
                        for(let i = 0; i < details.length; i++) {
                            if(Object.keys(details[i]).includes("aria-labelledby") || Object.keys(details[i]).includes("aria-label")) {
                                item.setAttribute('data-tng-link-ANaria', "true");
                                break;
                            }
                        }
                    }
                    return;
                }
            }
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_246",
    query: '[data-tng-textlink="true"][data-tng-el-exposed="false"][data-tng-el-visible="true"]',
    testStatus: "failed",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_247",
    query: '[data-tng-textlink="true"][data-tng-el-exposed="false"][data-tng-el-visible="false"]',
    testStatus: "inapplicable",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_248",
    query: '[data-tng-textlink-accessiblename]',
    description: "locale__links_description_249",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-label",
                value: "",
                valueState: "any"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte référencé par l'attribut aria-labelledby.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: true
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_250",
    query: '[data-tng-textlink-accessiblename][title]',
    testStatus: "failed",
    description: "locale__links_description_251",
    filter: function(item) {
        let anMatch = isString1MatchString2(item.getAttribute('title'), item.accessibleName());
        if(anMatch === null) return;
        return !anMatch;
    },
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: true
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.1']}
});

// 6.1.2 Pour chaque lien image l'intitulé de lien seul permet-il d'en comprendre la fonction et la destination ?
//! dependance 6.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_252",
    query: 'a[href]:not([data-tng-svgLink]):not([data-tng-textlink]), [role="link"]:not([data-tng-svgLink]):not([data-tng-textlink])',
    testStatus: "failed",
    depStatus: ["inapplicable", "cantTell", "passed"],
    filter: function (item) {
        let linkTextContent = item.textContent.replace(/\s+/g, "");
        if(linkTextContent.length > 0) {
            item.setAttribute('data-tng-cplink', 'true');
            return;
        }
        else item.setAttribute('data-tng-imglink', 'true');
        
        var images = item.querySelectorAll('img, [role="img"], svg, object[type^="image/"], canvas');
        var linkName = false;
        var imagesLength = images.length;
        for(let i = 0; i < imagesLength; i++) {
            if(images[i].hasAccessibleName()) {
                item.setAttribute('data-tng-imglink-hasContent', 'true');
                linkName = true;
                break;
            }
        }

        if(item.getAttribute('data-tng-el-exposed') === 'true') {
            if(linkName || item.hasAccessibleName()) {
                item.setAttribute('data-tng-imglink-accessiblename', 'true');

                if(item.hasAttribute('data-tng-ANObject')) {
                    let details = JSON.parse(item.getAttribute('data-tng-ANObject'));
                    details.shift();
                    for(let i = 0; i < details.length; i++) {
                        if(Object.keys(details[i]).includes("aria-labelledby") || Object.keys(details[i]).includes("aria-label")) {
                            item.setAttribute('data-tng-link-ANaria', "true");
                            break;
                        }
                    }
                }
                return;
            } else {
                return true;
            }
            
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_253",
    query: '[data-tng-imglink][data-tng-el-visible="true"][data-tng-el-exposed="false"]',
    testStatus: "failed",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_254",
    query: '[data-tng-imglink][data-tng-el-visible="false"][data-tng-el-exposed="false"]',
    testStatus: "inapplicable",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_255",
    query: '[data-tng-imglink-accessiblename]',
    description: "locale__links_description_256",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_257",
    query: '[data-tng-imglink-accessiblename][title]',
    testStatus: "failed",
    description: "locale__links_description_258",
    filter: function(item) {
        let anMatch = isString1MatchString2(item.getAttribute('title'), item.accessibleName());
        if(anMatch === null) return;
        return !anMatch;
    },
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.2']}
});

// 6.1.3 Pour chaque lien composite l'intitulé de lien seul permet-il d'en comprendre la fonction et la destination ?
//! dependance 6.1.2
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_259",
    query: '[data-tng-cplink]',
    testStatus: "failed",
    depStatus: ["cantTell", "passed"],
    filter: function (item) {
        var images = item.querySelectorAll('img, [role="img"], svg, object[type^="image/"], canvas');
        var linkName = false;
        var imagesLength = images.length;
        for(let i = 0; i < imagesLength; i++) {
            if(images[i].hasAccessibleName()) {
                item.setAttribute('data-tng-cplink-hasContent', 'true');
                linkName = true;
                break;
            }
        }

        if(item.getAttribute('data-tng-el-exposed') === 'true') {
            if(linkName || item.hasAccessibleName()) {
                item.setAttribute('data-tng-cplink-accessiblename', 'true');

                if(item.hasAttribute('data-tng-ANObject')) {
                    let details = JSON.parse(item.getAttribute('data-tng-ANObject'));
                    details.shift();
                    for(let i = 0; i < details.length; i++) {
                        if(Object.keys(details[i]).includes("aria-labelledby") || Object.keys(details[i]).includes("aria-label")) {
                            item.setAttribute('data-tng-link-ANaria', "true");
                            break;
                        }
                    }
                }
                return;
            } else {
                return true;
            }
            
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.3']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_260",
    query: '[data-tng-cplink][data-tng-el-visible="true"][data-tng-el-exposed="false"]',
    testStatus: "failed",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.3']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_261",
    query: '[data-tng-cplink][data-tng-el-visible="false"][data-tng-el-exposed="false"]',
    testStatus: "inapplicable",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.3']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_262",
    query: '[data-tng-cplink-accessiblename]',
    description: "locale__links_description_263",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.3']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_264",
    query: '[data-tng-cplink-accessiblename][title]',
    testStatus: "failed",
    description: "locale__links_description_265",
    filter: function(item) {
        let anMatch = isString1MatchString2(item.getAttribute('title'), item.accessibleName());
        if(anMatch === null) return;
        return !anMatch;
    },
    mark: function() {
        return {
            attrs: [{
                name: "title",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: true
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.3']}
});

// 6.1.4 Pour chaque lien SVG l'intitulé de lien seul permet-il d'en comprendre la fonction et la destination ?
//! dependance 6.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_266",
    query: '[data-tng-svgLink][data-tng-el-exposed="true"]',
    testStatus: "failed",
    depStatus: ["cantTell"],
    filter: function (item) {
        if(!item.hasAccessibleName()) {
            return true;
        } else {
            item.setAttribute('data-tng-svglink-accessiblename', 'true');
            return;
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.4']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_267",
    query: '[data-tng-svgLink][data-tng-el-visible="true"][data-tng-el-exposed="false"]',
    testStatus: "failed",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.4']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_268",
    query: '[data-tng-svgLink][data-tng-el-visible="false"][data-tng-el-exposed="false"]',
    testStatus: "inapplicable",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.1.4']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_269",
    query: '[data-tng-svglink-accessiblename]',
    description: "locale__links_description_263",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.4']}
});

// 6.1.5 Pour chaque lien ayant un intitulé visible, le nom accessible du lien contient-il au moins l'intitulé visible (hors cas particuliers) ?
//! dependance 6.1.*
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_271",
    query: '[data-tng-link-ANaria][data-tng-el-visible="true"]',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        if(item.innerText.trim().length > 0 || item.hasAttribute('data-tng-imglink-accessiblename')) {
            var visibleName = '';
            item.childNodes.forEach(e => {
                if(e.nodeType === 3) {
                    visibleName += ' '+e.textContent;
                }

                if(e.nodeType === 1 && e.getAttribute('data-tng-el-visible') === 'true') {
                    if(e.alt) visibleName += ' '+e.alt;
                    e.childNodes.forEach(echild => {
                        if(echild.nodeType === 3 || (echild.nodeType === 1 && echild.getAttribute('data-tng-el-visible') === 'true')) {
                            visibleName += ' '+echild.textContent;
                            if(echild.alt) visibleName += ' '+echild.alt;
                        }
                    });
                }
            });

            if(visibleName.length == 0) return;

            let anMatch = isString1MatchString2(item.accessibleName(), visibleName);
            if(anMatch === null) return
            else if(!anMatch) return true
            else {
                item.setAttribute('data-tng-link-names-match', 'true');
                return;
            }
        }
    },
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.5']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_272",
    query: '[data-tng-link-names-match]',
    testStatus: "passed",
    tags: ['a11y', 'links', 'accessiblename'],
    ressources: {'rgaa': ['6.1.5']}
});

//* 6.2 Dans chaque page web, chaque lien a-t-il un intitulé ?
// 6.2.1 Dans chaque page web, chaque lien a-t-il un intitulé entre <a> et </a> ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_273",
    query: 'a[href][data-tng-el-visible="true"]',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        if(item.textContent.length > 0) {
            item.setAttribute('data-tng-link-hasname', 'true');
            return;
        }

        if(item.hasAttribute('data-tng-imglink-hasContent') || item.hasAttribute('data-tng-cplink-hasContent')) {
            item.setAttribute('data-tng-link-hasname', 'true');
            return;
        }

        if(item.querySelector('img[data-tng-el-visible="true"], svg[data-tng-el-visible="true"]')) {
            item.setAttribute('data-tng-link-hasname', 'true');
            return;
        }

        return true;
    },
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.2.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__links_name_274",
    query: '[data-tng-link-hasname]',
    testStatus: "passed",
    tags: ['a11y', 'links'],
    ressources: {'rgaa': ['6.2.1']}
});

/**
 *? ELEMENTS OBLIGATOIRES
 ** tous les tests sont répertoriés
 ** dependances géréss
 ** 8.3 si l'élément <html> n'a pas d'attribut lang, vérifier que la langue est renseignée pour chaque noeud texte et attribut dont le contenu est affiché ou lu par les lecteurs d'écran
 ** 8.9.1 voir si l'on peut étoffer
 *TODO 8.2 implémenter spec HTML dans le script content.js
 *
 * data : data-tng-validRole, data-tng-validAria, data-tng-haslang, data-tng-lang, data-tng-emptylang, data-tng-samelangs, data-tng-validlang, data-tng-pageTitle, data-tng-el-notemptylang, data-tng-el-validlang, data-tng-dirValid
 */

//* 8.1 Chaque page web est-elle définie par un type de document ?
// 8.1.1 Pour chaque page web, le type de document (balise doctype) est-il présent ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_275",
    node: document.doctype,
    expectedNbElements: 1,
    explanations: {
        passed: 'locale__mandatory_passed_276',
		failed: 'locale__mandatory_failed_277'
    },
    tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.1.1']}
});

// 8.1.2 Pour chaque page web, le type de document (balise doctype) est-il valide ?
// https://www.w3.org/QA/2002/04/valid-dtd-list.html
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_278",
    node: document.doctype,
    analyzeElements: function(collection) {
        let collectionLength = collection.length;
        for (var i = 0; i < collectionLength; i++) {
            var item = collection[i];
            var nameList = ['html', 'math', 'svg:svg', 'svg'];
            var htmlList = [
                '-//W3C//DTD HTML 4.01//ENhttp://www.w3.org/TR/html4/strict.dtd',
                '-//W3C//DTD HTML 4.01 Transitional//ENhttp://www.w3.org/TR/html4/loose.dtd',
                '-//W3C//DTD HTML 4.01 Frameset//ENhttp://www.w3.org/TR/html4/frameset.dtd',
                '-//W3C//DTD XHTML 1.0 Strict//ENhttp://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd',
                '-//W3C//DTD XHTML 1.0 Transitional//ENhttp://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd',
                '-//W3C//DTD XHTML 1.0 Frameset//ENhttp://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd',
                '-//W3C//DTD XHTML 1.1//ENhttp://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd',
                '-//W3C//DTD XHTML Basic 1.1//ENhttp://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd',
                '-//W3C//DTD XHTML 1.1 plus MathML 2.0 plus SVG 1.1//ENhttp://www.w3.org/2002/04/xhtml-math-svg/xhtml-math-svg.dtd',
                '-//IETF//DTD HTML 2.0//EN',
                '-//W3C//DTD HTML 3.2 Final//EN',
                '-//W3C//DTD XHTML Basic 1.0//ENhttp://www.w3.org/TR/xhtml-basic/xhtml-basic10.dtd'
            ];
            var mathList = [
                '-//W3C//DTD MathML 2.0//ENhttp://www.w3.org/Math/DTD/mathml2/mathml2.dtd',
                'http://www.w3.org/Math/DTD/mathml1/mathml.dtd'
            ];
            var svgList = [
                '-//W3C//DTD SVG 1.1//ENhttp://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd',
                '-//W3C//DTD SVG 1.0//ENhttp://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd',
                '-//W3C//DTD SVG 1.1 Basic//ENhttp://www.w3.org/Graphics/SVG/1.1/DTD/svg11-basic.dtd',
                '-//W3C//DTD SVG 1.1 Tiny//ENhttp://www.w3.org/Graphics/SVG/1.1/DTD/svg11-tiny.dtd'
            ];
            var svgSvg = '-//W3C//DTD XHTML 1.1 plus MathML 2.0 plus SVG 1.1//ENhttp://www.w3.org/2002/04/xhtml-math-svg/xhtml-math-svg.dtd';

            var name = item.name.toLowerCase();

            if(nameList.includes(name)) {
                if(name === 'html' && !item.publicId && !item.systemId) {
                    item.status = 'passed';
                }

                else if(name === 'html' && htmlList.includes(item.publicId+item.systemId)) {
                    item.status = 'passed';
                }

                else if(name === 'math' && mathList.includes(item.publicId+item.systemId)) {
                    item.status = 'passed';
                }

                else if(name === 'svg' && svgList.includes(item.publicId+item.systemId)) {
                    item.status = 'passed';
                }

                else if(name === 'svg:svg' && item.publicId+item.systemId === svgSvg) {
                    item.status = 'passed';
                }

                else item.status = 'failed';
            }

            else item.status = 'failed';
		}
    },
    tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.1.2']}
});

// 8.1.3 Pour chaque page web possédant une déclaration de type de document, celle-ci est-elle située avant la balise <html> dans le code source ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_279",
    node: document.doctype,
    analyzeElements: function(collection) {
        let collectionLength = collection.length;
        for (var i = 0; i < collectionLength; i++) {
            var sibling = null;
            if(collection[i].nextSibling) {
                sibling = collection[i].nextSibling.nodeType === 1 ? collection[i].nextSibling : collection[i].nextSibling.nextElementSibling;
            }

			if(sibling && sibling.tagName && sibling.tagName.toLowerCase() === 'html') {
                collection[i].status = 'passed';
            } else {
                collection[i].status = 'failed';
            }
		}
    },
    tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.1.1']}
});

//* 8.2 Pour chaque page web, le code source généré est-il valide selon le type de document spécifié ?
// 8.2.1 Pour chaque déclaration de type de document, le code source généré de la page vérifie-t-il ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_280",
    code: 'duplicate_id',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "id",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "La valeur de l'attribut id ne contient pas d'espace.",
    query: '[data-tng-invalid-id]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "id",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_281",
	query: '[role][data-tng-el-exposed="true"]',
	testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
		if (item.getAttribute('role').trim() == 0) {
            return false;
        }

        if(item.hasValidRole()) {
            item.setAttribute('data-tng-validRole', true);
        } else {
            return true;
        }
	},
    tags: ['a11y', 'aria', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_282",
	query: '[data-tng-validRole]',
	testStatus: "passed",
	tags: ['a11y', 'aria', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_283",
	query: '[data-tng-ariaAttribute][data-tng-el-exposed="true"]',
    testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.hasInvalidAriaAttributes()) {
            return true;
        } else {
            item.setAttribute('data-tng-validAria', 'true');
            return;
        }
	},
	tags: ['a11y', 'aria', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_284",
	query: '[data-tng-validAria]',
	testStatus: "passed",
	tags: ['a11y', 'aria', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_285",
	query: '[data-tng-validAria]',
	testStatus: "failed",
	filter: function (item) {
		return item.hasAriaAttributesWithInvalidValues({ permissive: true });
	},
	tags: ['a11y', 'aria', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_286",
	query: '[data-tng-validAria]',
	testStatus: "failed",
	filter: function (item) {
		return item.hasProhibitedAriaAttributes();
	},
	tags: ['a11y', 'aria', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_287",
	query: 'form form, button a, a button, ul>a, ol>a, ul>h1, ul>h2, ul>h3, ul>h4, ul>h5, ul>h6, ol>h1, ol>h2, ol>h3, ol>h4, ol>h5, ol>h6, ul>p, ol>p, ul>span, ol>span, ul>div, ol>div, section main, header main, footer main',
	testStatus: "failed",
	tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_288",
	query: 'body title',
	testStatus: "failed",
	filter: function (item) {
		if(item.closest('svg')) return;
	},
	tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_289",
	query: 'head title, body title',
	expectedNbElements: {max: 1},
    explanations: {
        passed: 'locale__mandatory_passed_290',
        failed: 'locale__mandatory_failed_291'
    },
	filter: function (item) {
		if(!item.closest('svg')) return true;
	},
	tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_292",
	query: 'head title, body title',
	testStatus: "failed",
	filter: function (item) {
		if(!item.closest('svg')) return item.textContent.trim().length === 0;
	},
	tags: ['a11y', 'code', 'mandatory'],
	ressources: {'rgaa': ['8.2.1']}
});

//8.3.1 Pour chaque page web, l'indication de langue par défaut vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_293",
    query: 'html[lang], html[xml\\:lang], body[lang], body[xml\\:lang]',
    expectedNbElements: {min: 1},
    explanations: {
        passed: 'locale__mandatory_passed_294',
        failed: 'locale__mandatory_failed_295'
    },
    filter: function(item) {
        if(item.hasAttribute('lang') || item.hasAttribute('xml:lang')) {
            item.setAttribute('data-tng-haslang', true);
            return true;
        }
    },
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "any"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'languages', 'mandatory'],
    ressources: {'rgaa': ['8.3.1']}
});

//8.4.1 Pour chaque page web ayant une langue par défaut, le code de langue est-il pertinent ?
//! dependance 8.3.1
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_296",
	query: '[data-tng-haslang]',
	testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.hasAttribute('lang')) {
            item.setAttribute('data-tng-lang', 'lang');
            if(item.getAttribute('lang').length === 0) {
                item.setAttribute('data-tng-emptylang', 'lang');
            }
        }

        if (item.hasAttribute('xml:lang')) {
            item.setAttribute('data-tng-lang', 'xml');
            if(item.getAttribute('xml:lang').length === 0) {
                if(item.hasAttribute('data-tng-emptylang')) {
                    item.setAttribute('data-tng-emptylang', 'both');
                } else {
                    item.setAttribute('data-tng-emptylang', 'xml');
                }
            }
        }
        return item.hasAttribute('data-tng-emptylang');
	},
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "any"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'languages', 'mandatory'],
    ressources: {'rgaa': ['8.4.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_297",
	query: '[data-tng-lang="lang"]:not([data-tng-emptylang="lang"]):not([data-tng-emptylang="both"]), [data-tng-lang="xml"]:not([data-tng-emptylang="xml"]):not([data-tng-emptylang="both"])',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'languages', 'mandatory'],
    ressources: {'rgaa': ['8.4.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_298",
	query: '[data-tng-lang="lang"][data-tng-lang="xml"]',
	testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        var lang1 = item.getAttribute('lang');
        var lang2 = item.getAttribute('xml:lang');
        if(lang1.length > 0 || lang2.length > 0) {
            var langA = lang1.includes('-') ? lang1.split('-')[0] : lang1;
            var langB = lang2.includes('-') ? lang2.split('-')[0] : lang2;
            if(langA == langB) {
                item.setAttribute('data-tng-samelangs', 'true');
                return;
            }
            return true;
        }
	},
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "any"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'languages', 'mandatory'],
    ressources: {'rgaa': ['8.4.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_299",
	query: '[data-tng-samelangs]',
	testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "any"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'languages', 'mandatory'],
    ressources: {'rgaa': ['8.4.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_300",
	query: '[data-tng-haslang]',
	testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.hasAttribute('lang') && item.hasAttribute('xml:lang')) {
            if(item.hasAttribute('data-tng-emptylang') && item.getAttribute('data-tng-emptylang') === 'both') {
                return;
            }
        } else {
            if(item.hasAttribute('data-tng-emptylang')) {
                return;
            }
        }

        if(item.hasValidLanguageCode()) {
            item.setAttribute('data-tng-validlang', 'true');
            return;
        }
		return true;
	},
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'languages', 'mandatory'],
    ressources: {'rgaa': ['8.4.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_301",
	query: '[data-tng-validlang]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'languages', 'mandatory'],
    ressources: {'rgaa': ['8.4.1']}
});

//8.5.1 Chaque page web a-t-elle un titre de page (balise title) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_302",
    query: 'head title, body title',
    expectedNbElements: {min: 1},
    explanations: {
        passed: 'locale__mandatory_passed_303',
        failed: 'locale__mandatory_failed_304'
    },
    filter: function (item) {
        if(item.closest('svg')) return;
        return true;
    },
    tags: ['a11y','mandatory'],
    ressources: {'rgaa': ['8.5.1']}
});

//8.6.1 Pour chaque page web ayant un titre de page (balise title), le contenu de cette balise est-il pertinent ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_305",
    query: 'head title, body title',
    filter: function(item) {
        if(item.closest('svg')) return;
        if(item.textContent.trim().length > 0) {
            let defaultTitles = [
                'document', 'untitled', 'sans titre', 'untitled document', 'document sans titre', 'no title', 'home', 'accueil'
            ];

            if(defaultTitles.includes(item.textContent.trim().toLowerCase())) {
                item.setAttribute('data-tng-pageTitle', 'false');
                return;
            }
            else return true;
        }

        item.setAttribute('data-tng-pageTitle', 'false');
        return;
    },
    testStatus: 'cantTell',
    warning: false,
    depStatus: ["failed"],
    tags: ['a11y','mandatory'],
    ressources: {'rgaa': ['8.6.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_306",
    query: '[data-tng-pageTitle]',
    testStatus: "failed",
    tags: ['a11y','mandatory'],
    ressources: {'rgaa': ['8.6.1']}
});

//8.7.1 Dans chaque page web, chaque texte écrit dans une langue différente de la langue par défaut vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_307",
    query: 'body [lang], body [xml\\:lang]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "any"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'mandatory'],
    ressources: {'rgaa': ['8.7.1']}
});

//* 8.8 Dans chaque page web, le code de langue de chaque changement de langue est-il valide et pertinent ?
//8.8.1 Pour chaque page web, le code de langue de chaque changement de langue vérifie-t-il ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_308",
	query: 'body [lang], body [xml\\:lang]',
	testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.hasAttribute('lang') && !item.hasAttribute('xml:lang')) {
            if(item.getAttribute('lang').length === 0) {
                return true;
            }
        } else if (item.hasAttribute('xml:lang') && !item.hasAttribute('lang')) {
            if(item.getAttribute('xml:lang').length === 0) {
                return true;
            }
        } else {
            let length1 = item.getAttribute('lang').length;
            let length2 = item.getAttribute('xml:lang').length;
            if(length1 === 0 || length2 === 0) {
                if(length1 + length2 > 0) item.setAttribute('data-tng-el-notemptylang', 'true');
                return true;
            }
        }

        item.setAttribute('data-tng-el-notemptylang', 'true');
        return;
	},
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "egal"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "egal"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'languages', 'mandatory'],
	ressources: { 'rgaa': ['8.8.1'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_309",
	query: '[data-tng-el-notemptylang]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "notEmpty"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'languages', 'mandatory'],
	ressources: { 'rgaa': ['8.8.1'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_310",
	query: '[data-tng-el-notemptylang]',
	testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.hasValidLanguageCode()) {
            item.setAttribute('data-tng-el-validlang', 'true');
            return;
        }

		return true;
	},
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "any"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'languages', 'mandatory'],
	ressources: { 'rgaa': ['8.8.1'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__mandatory_name_311",
	query: '[data-tng-el-validlang]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "lang",
                value: "",
                valueState: "any"
            },
            {
                name: 'xml\\:lang',
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'languages', 'mandatory'],
	ressources: { 'rgaa': ['8.8.1'] }
});

//* 8.9 Dans chaque page web, les balises ne doivent pas être utilisées uniquement à des fins de présentation. Cette règle est-elle respectée ?
// 8.9.1 Dans chaque page web les balises (à l'exception de <div>, <span> et <table>) ne doivent pas être utilisées uniquement à des fins de présentation. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_312",
    description: "locale__mandatory_description_313",
    query: 'br + br',
    testStatus: "failed",
    filter: function (item) {
        var textBetween = item.previousSibling.nodeValue;
        textBetween = textBetween ? textBetween.trim().length : textBetween;
        return !textBetween;
    },
    tags: ['a11y','mandatory'],
    ressources: {'rgaa': ['8.9.1']}
});

//* 8.10 Dans chaque page web, les changements du sens de lecture sont-ils signalés ?
// 8.10.1 Dans chaque page web, chaque texte dont le sens de lecture est différent du sens de lecture par défaut est contenu dans une balise possédant un attribut dir ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_314",
    status: 'untested',
    tags: ['a11y','mandatory'],
    ressources: {'rgaa': ['8.10.1']}
});

// 8.10.2 : Dans chaque page web, chaque changement du sens de lecture (attribut dir) vérifie-t-il ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_315",
    query: '[dir][data-tng-el-exposed="true"]',
    description: "locale__mandatory_description_316",
    testStatus: "failed",
    depStatus: ["cantTell"],
    filter: function (item) {
        var dirAttr = item.getAttribute('dir');

        if(dirAttr === 'ltr' || dirAttr === 'rtl') {
            item.setAttribute('data-tng-dirValid', 'true');
            return;
        }
        else return true;
    },
    mark: function() {
        return {
            attrs: [{
                name: "dir",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y','mandatory'],
    ressources: {'rgaa': ['8.10.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__mandatory_name_317",
    description: "locale__mandatory_description_318",
    query: '[data-tng-dirValid]',
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "dir",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y','mandatory'],
    ressources: {'rgaa': ['8.10.2']}
});

/**
 *? MULTIMEDIA
 ** tous les tests sont répertoriés
 ** dependances gérées
 *TODO voir si l'on peut identifier de façon assez précise les médias non temporels
 *
 * data: data-tng-mediaAuto
 */

//* 4.1 Chaque média temporel pré-enregistré a-t-il, si nécessaire, une transcription textuelle ou une audiodescription (hors cas particuliers) ?
//* 4.2 Pour chaque média temporel pré-enregistré ayant une transcription textuelle ou une audiodescription synchronisée, celles-ci sont-elles pertinentes (hors cas particuliers) ?
// 4.1.1 Chaque média temporel pré-enregistré seulement audio, vérifie-t-il, si nécessaire, l'une de ces conditions (hors cas particuliers) ?
// 4.2.1 Pour chaque média temporel pré-enregistré seulement audio, ayant une transcription textuelle, celle-ci est-elle pertinente (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_319",
    query: 'audio, object[type^="audio/"], object[type="application/ogg"], embed[type^="audio/"]',
    description: "locale__media_description_320",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'audio', 'media'],
    ressources: {'rgaa': ['4.1.1', '4.2.1']}
});

// 4.1.2 Chaque média temporel pré-enregistré seulement vidéo, vérifie-t-il, si nécessaire, l'une de ces conditions (hors cas particuliers) ?
// 4.2.2 Chaque média temporel pré-enregistré seulement vidéo vérifie-t-il une de ces conditions (hors cas particuliers) ?
// 4.1.3  Chaque média temporel synchronisé pré-enregistré vérifie-t-il, si nécessaire, une de ces conditions (hors cas particuliers) ?
// 4.2.3 Chaque média temporel synchronisé pré-enregistré vérifie-t-il, si nécessaire, une de ces conditions (hors cas particuliers) ?
//* 4.3 Chaque média temporel synchronisé pré-enregistré a-t-il, si nécessaire, des sous-titres synchronisés (hors cas particuliers) ?
// 4.3.1 Chaque média temporel synchronisé pré-enregistré vérifie-t-il, si nécessaire, l'une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_321",
    query: 'video, object[type^="video/"], embed[type^="video/"]',
    description: "locale__media_description_322",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'videos', 'media'],
    ressources: {'rgaa': ['4.1.2', '4.1.3', '4.2.2', '4.2.3', '4.3.1']}
});

// 4.3.2 Pour chaque média temporel synchronisé pré-enregistré possédant des sous-titres synchronisés diffusés via une balise <track>, la balise <track> possède-t-elle un attribut kind="captions" ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_323",
    query: 'video track:not([kind=captions])',
    description: "locale__media_description_324",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "kind",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'videos', 'media'],
    ressources: {'rgaa': ['4.3.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_325",
    query: 'video track[kind="captions"]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "kind",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'videos', 'media'],
    ressources: {'rgaa': ['4.3.2']}
});

// 4.4.1 Pour chaque média temporel synchronisé pré-enregistré ayant des sous-titres synchronisés, ces sous-titres sont-ils pertinents ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_326",
    query: 'video track[kind="captions"]',
    description: "locale__media_description_327",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "kind",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'videos', 'media'],
    ressources: {'rgaa': ['4.4.1']}
});

//* 4.5 Chaque média temporel pré-enregistré a-t-il, si nécessaire, une audiodescription synchronisée (hors cas particuliers) ?
//* 4.6 Pour chaque média temporel pré-enregistré ayant une audiodescription synchronisée, celle-ci est-elle pertinente ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_328",
    query: 'video, object[type^="video/"], embed[type^="video/"]',
    description: "locale__media_description_329",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'videos', 'media'],
    ressources: {'rgaa': ['4.5.1', '4.5.2', '4.6.1', '4.6.2']}
});

//* 4.7 Chaque média temporel est-il clairement identifiable (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_330",
    query: 'video, audio, object[type^="video/"], object[type^="audio/"], object[type="application/ogg"], embed[type^="video/"], embed[type^="audio/"]',
    description: "locale__media_description_331",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'videos', 'audio', 'media'],
    ressources: {'rgaa': ['4.7.1']}
});

//* 4.8 Chaque média non temporel a-t-il, si nécessaire, une alternative (hors cas particuliers) ?
// 4.8.1 Chaque média non temporel vérifie-t-il, si nécessaire, une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_332",
    description: "locale__media_description_333",
    status: 'untested',
    tags: ['a11y', 'media'],
    ressources: {'rgaa': ['4.8.1']}
});

// 4.8.2 Chaque média non temporel associé à une alternative vérifie-t-il une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_334",
    description: "locale__media_description_335",
    status: 'untested',
    tags: ['a11y', 'media'],
    ressources: {'rgaa': ['4.8.2']}
});

//* 4.9 Pour chaque média non temporel ayant une alternative, cette alternative est-elle pertinente ?
// 4.9.1 Pour chaque média non temporel ayant une alternative, cette alternative permet-elle d'accéder au même contenu et à des fonctionnalités similaires ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_336",
    description: "locale__media_description_337",
    status: 'untested',
    tags: ['a11y', 'media'],
    ressources: {'rgaa': ['4.9.1']}
});

//* 4.10 Chaque son déclenché automatiquement est-il contrôlable par l'utilisateur ?
// 4.10.1 Chaque séquence sonore déclenchée automatiquement via une balise <object>, <video>, <audio>, <embed>, <bgsound> ou un code JavaScript vérifie-t-elle une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__media_name_338",
	query: 'audio[autoplay]:not([muted]), video[autoplay]:not([muted])',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function(item) {
        if(item.duration <= 3 && !item.hasAttribute('loop')) {
            item.setAttribute('data-tng-mediaAuto', "true");
            return false;
        }

        if(item.hasAttribute('controls')) {
            item.setAttribute('data-tng-mediaAuto', "true");
            return false;
        }

        return true;
    },
    tags: ['a11y', 'audio', 'videos', 'media'],
    ressources: {'rgaa': ['4.10.1'] },
	comments: "Implémentation partielle"
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__media_name_339",
	query: '[data-tng-mediaAuto]',
    testStatus: "passed",
	tags: ['a11y', 'audio', 'videos', 'media'],
    ressources: {'rgaa': ['4.10.1'] },
	comments: "Implémentation partielle"
});

//* 4.11 La consultation de chaque média temporel est-elle, si nécessaire, contrôlable par le clavier et tout dispositif de pointage ?
// 4.11.1 Chaque média temporel a-t-il, si nécessaire, les fonctionnalités de contrôle de sa consultation ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_340",
    query: 'video[controls], audio[controls]',
    testStatus: "passed",
    tags: ['a11y', 'videos', 'audio', 'media'],
    ressources: {'rgaa': ['4.11.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_330",
    query: 'video:not([controls]), audio:not([controls]), object[type^="video/"], object[type^="audio/"], object[type="application/ogg"], embed[type^="video/"], embed[type^="audio/"]',
    description: "locale__media_description_342",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'videos', 'audio', 'media'],
    ressources: {'rgaa': ['4.11.1']}
});

// 4.11.2/4.11.3 Pour chaque média temporel, chaque fonctionnalité vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_330",
    query: 'video, audio, object[type^="video/"], object[type^="audio/"], object[type="application/ogg"], embed[type^="video/"], embed[type^="audio/"]',
    description: "locale__media_description_344",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'videos', 'audio', 'media'],
    ressources: {'rgaa': ['4.11.2', '4.11.3']}
});

//* 4.12 La consultation de chaque média non temporel est-elle contrôlable par le clavier et tout dispositif de pointage ?
// 4.12.1 Pour chaque média non temporel, chaque fonctionnalité vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_345",
    status: 'untested',
    tags: ['a11y', 'media', 'keyboard'],
    ressources: {'rgaa': ['4.12.1']}
});

// 4.12.2 Pour chaque média non temporel, chaque fonctionnalité vérifie-t-elle une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_346",
    status: 'untested',
    tags: ['a11y', 'media', 'keyboard'],
    ressources: {'rgaa': ['4.12.2']}
});

//* 4.13 Chaque média temporel et non temporel est-il compatible avec les technologies d'assistance (hors cas particuliers) ?
// 4.13.1 Chaque média temporel et non temporel vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_347",
    description: "locale__media_description_348",
    status: 'untested',
    tags: ['a11y', 'media'],
    ressources: {'rgaa': ['4.13.1']}
});

// 4.13.2 Chaque média temporel et non temporel qui possède une alternative compatible avec les technologies d'assistance, vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__media_name_349",
    description: "locale__media_description_350",
    status: 'untested',
    tags: ['a11y', 'media'],
    ressources: {'rgaa': ['4.13.2']}
});

/**
 *? NAVIGATION
 ** tous les tests sont répertoriés
 *! aucune dependance
 *TODO voir pour tester les liens d'évitement implémenté de façon "classique"
 *TODO ordre de tabulation - pièges au clavier - raccourcis clavier
 */

//* 12.1 Chaque ensemble de pages dispose-t-il de deux systèmes de navigation différents, au moins (hors cas particuliers) ?
// 12.1.1 Chaque ensemble de pages vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_351",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.1.1'] }
});

//* 12.2 Dans chaque ensemble de pages, le menu et les barres de navigation sont-ils toujours à la même place (hors cas particuliers) ?
// 12.2.1 Dans chaque ensemble de pages, chaque page disposant d'un menu ou de barres de navigation vérifie-t-elle ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_352",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.2.1'] }
});

//* 12.3 La page « plan du site » est-elle pertinente ?
// 12.3.1 La page « plan du site » est-elle représentative de l'architecture générale du site ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_353",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.3.1'] }
});

// 12.3.2 Les liens du plan du site sont-ils fonctionnels ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_354",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.3.2'] }
});

// 12.3.3 Les liens du plan du site renvoient-ils bien vers les pages indiquées par l'intitulé ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_355",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.3.3'] }
});

//* 12.4 Dans chaque ensemble de pages, la page « plan du site » est-elle atteignable de manière identique ?
// 12.4.1 Dans chaque ensemble de pages, la page « plan du site » est-elle accessible à partir d'une fonctionnalité identique ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_356",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.4.1'] }
});

// 12.4.2 Dans chaque ensemble de pages, la fonctionnalité vers la page « plan du site » est-elle située à la même place dans la présentation ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_357",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.4.2'] }
});

// 12.4.3 Dans chaque ensemble de pages, la fonctionnalité vers la page « plan du site » se présente-t-elle toujours dans le même ordre relatif dans le code source ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_358",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.4.3'] }
});

//* 12.5 Dans chaque ensemble de pages, le moteur de recherche est-il atteignable de manière identique ?
// 12.5.1 Dans chaque ensemble de pages, le moteur de recherche est-il accessible à partir d'une fonctionnalité identique ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_359",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.5.1'] }
});

// 12.5.2 Dans chaque ensemble de pages, la fonctionnalité vers le moteur de recherche est-elle située à la même place dans la présentation ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_360",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.5.2'] }
});

// 12.5.3 Dans chaque ensemble de pages, la fonctionnalité vers le moteur de recherche se présente-t-elle toujours dans le même ordre relatif dans le code source ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_361",
    status: 'untested',
    tags: ['a11y', 'navigation'],
    ressources: { 'rgaa': ['12.5.3'] }
});

//* 12.6 Les zones de regroupement de contenus présentes dans plusieurs pages web (zones d'en-tête, de navigation principale, de contenu principal, de pied de page et de moteur de recherche) peuvent-elles être atteintes ou évitées ?
// 12.6.1 Dans chaque page web où elles sont présentes, la zone d'en-tête, de navigation principale, de contenu principal, de pied de page et de moteur de recherche respectent-elles au moins une de ces conditions : 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_362",
    status: 'untested',
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.6.1'] }
});

//* 12.7 Dans chaque page web, un lien d'évitement ou d'accès rapide à la zone de contenu principal est-il présent (hors cas particuliers) ?
// 12.7.1 Dans chaque page web, un lien permet-il d'éviter la zone de contenu principal ou d'y accéder (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_363",
    status: 'untested',
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.7.1'] }
});

// 12.7.2 Dans chaque ensemble de pages, le lien d'évitement ou d'accès rapide à la zone de contenu principal vérifient-il ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_364",
    status: 'untested',
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.7.2'] }
});

//* 12.8 Dans chaque page web, l'ordre de tabulation est-il cohérent ?
// 12.8.1 Dans chaque page web, l'ordre de tabulation dans le contenu est-il cohérent ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_365",
	query: '[data-tng-el-visible="false"]:not([hidden]):not([data-tng-notExposed*="css:display"]):not([data-tng-notExposed*="css:visibility"])',
	description: "locale__navigation_description_366",
	filter: function (item) {
        if(item.disabled) return;

		return item.canBeReachedUsingKeyboardWith.length > 0;
	},
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.8.1'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_21",
	query: '[data-tng-tab-dom-error]',
	description: "locale__navigation_description_2",
    testStatus: "cantTell",
    warning: true,
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.8.1'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_22",
	query: '[data-tng-interactive-notab]',
    testStatus: "failed",
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.8.1'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: 'locale__navigation_name_23',
    description: 'locale__navigation_description_3',
	query: '[data-tng-tab-visual-error]',
    testStatus: "cantTell",
    warning: true,
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.8.1'] }
});

//TODO peut-on simuler un focus client ?
// tanaguruTestsList.push({
// 	lang: 'fr',
// 	name: "locale__navigation_name_365",
// 	query: HTML.getFocusableElementsSelector(),
// 	expectedNbElements: 0,
// 	filter: function (item) {
//         if(item.disabled) return;

//         item.setAttribute('data-tng-temp', 'focused');
//         item.focus();
//         item = document.querySelector('[data-tng-temp]');
//         item.removeAttribute('data-tng-temp');

// 		var exposedState = item.isNotExposedDueTo;

// 		if (exposedState.indexOf('css:display') == -1 && exposedState.indexOf('css:visibility') == -1) {
// 			return !item.isVisible;
// 		}
// 	},
//     tags: ['a11y', 'keyboard', 'navigation'],
//     ressources: { 'rgaa': ['12.8.1'] }
// });

// 12.8.2 Pour chaque script qui met à jour ou insère un contenu, l'ordre de tabulation reste-t-il cohérent ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_368",
    status: 'untested',
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.8.2'] }
});

//* 12.9 Dans chaque page web, la navigation ne doit pas contenir de piège au clavier. Cette règle est-elle respectée ?
// 12.9.1 Dans chaque page web, chaque élément recevant le focus vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
	lang: 'en',
	name: "locale__navigation_name_369",
	query: '[onblur]',
    testStatus: 'cantTell',
    warning: true,
	tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.9.1'] },
	comments: "peut détecter l'attribut onblur (peut-être aussi l'événement) mais ce n'est pas vraiment une preuve que c'est un piège à clavier"
});

//* 12.10 Dans chaque page web, les raccourcis clavier n'utilisant qu'une seule touche (lettre minuscule ou majuscule, ponctuation, chiffre ou symbole) sont-ils contrôlables par l’utilisateur ?
// 12.10.1 Dans chaque page web, chaque raccourci clavier n'utilisant qu'une seule touche (lettres minuscule ou majuscule, ponctuation, chiffre ou symbole) vérifie-t-il l'une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_370",
    status: 'untested',
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.10.1'] }
});

//* 12.11 Dans chaque page web, les contenus additionnels apparaissant au survol, à la prise de focus ou à l'activation d'un composant d'interface sont-ils, si nécessaire, atteignables au clavier ?
// 12.11.1 Dans chaque page web, les contenus additionnels apparaissant au survol, à la prise de focus ou à l'activation d'un composant d'interface sont-ils, si nécessaire, atteignables au clavier ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__navigation_name_371",
    status: 'untested',
    tags: ['a11y', 'keyboard', 'navigation'],
    ressources: { 'rgaa': ['12.11.1'] }
});

/**
 *? PRESENTATION DE L'INFORMATION
 ** Tous les tests sont répertoriés
 ** dependances gérées
 *TODO 10.4.1 récupérer la liste de noeuds texte -> font-size-200% -> check viewport position
 *TODO traiter le 10.5 dans la boucle qui passe chaque noeud texte dans le script de contrast, car il n'est pas possible de recupérer simplement les propriétés color et background appliquées directement sur les éléments
 *TODO 10.11.1 et 10.11.2 voir si on peut être + performant avec l'api windows
 *TODO 10.12.1 passer chaque noeud texte après avoir défini les propriétés d'espacement du texte sur le document
 *
 * data : data-tng-scalable
 */

//* 10.1 Dans le site web, des feuilles de style sont-elles utilisées pour contrôler la présentation de l'information ?
// 10.1.1 : Dans chaque page web, les balises servant à la présentation de l'information ne doivent pas être présentes dans le code source généré des pages. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__presentation_name_372",
    query: 'basefont[data-tng-el-exposed="true"], blink[data-tng-el-exposed="true"], center[data-tng-el-exposed="true"], font[data-tng-el-exposed="true"], marquee[data-tng-el-exposed="true"], s[data-tng-el-exposed="true"], strike[data-tng-el-exposed="true"], tt[data-tng-el-exposed="true"], big[data-tng-el-exposed="true"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [],
            related: {},
            tag: true,
            content: false
        }
    },
    tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.1.1'] }
});

// 10.1.2 : Dans chaque page web, les attributs servant à la présentation de l'information ne doivent pas être présents dans le code source généré des pages. Cette règle est-elle respectée ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__presentation_name_373",
    query: '[align][data-tng-el-exposed="true"], [alink][data-tng-el-exposed="true"], [background][data-tng-el-exposed="true"], [bgcolor][data-tng-el-exposed="true"], [border][data-tng-el-exposed="true"], [cellpadding][data-tng-el-exposed="true"], [cellspacing][data-tng-el-exposed="true"], [char][data-tng-el-exposed="true"], [charoff][data-tng-el-exposed="true"], [clear][data-tng-el-exposed="true"], [compact][data-tng-el-exposed="true"], [color][data-tng-el-exposed="true"], [frameborder][data-tng-el-exposed="true"], [hspace][data-tng-el-exposed="true"], [link][data-tng-el-exposed="true"], [marginheight][data-tng-el-exposed="true"], [marginwidth][data-tng-el-exposed="true"], [text][data-tng-el-exposed="true"], [valign][data-tng-el-exposed="true"], [vlink][data-tng-el-exposed="true"], [vspace][data-tng-el-exposed="true"], [data-tng-el-exposed="true"][size]:not([type="text"]):not([type="password"]), [data-tng-el-exposed="true"]:not(img):not(object):not(embed):not(canvas):not(svg)[width], [data-tng-el-exposed="true"]:not(img):not(object):not(embed):not(canvas):not(svg)[height]',
    filter: function(item) {
        if(item.tagName.toLowerCase() === 'input' && item.type) {
            if(item.type.toLowerCase() === 'text' || item.type.toLowerCase() === 'password') {
                return;
            }
        }

        return true;
    },
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "align",
                value: "",
                valueState: "any"
            },
            {
                name: "alink",
                value: "",
                valueState: "any"
            },
            {
                name: "background",
                value: "",
                valueState: "any"
            },
            {
                name: "bgcolor",
                value: "",
                valueState: "any"
            },
            {
                name: "border",
                value: "",
                valueState: "any"
            },
            {
                name: "cellpadding",
                value: "",
                valueState: "any"
            },
            {
                name: "cellspacing",
                value: "",
                valueState: "any"
            },
            {
                name: "char",
                value: "",
                valueState: "any"
            },
            {
                name: "charoff",
                value: "",
                valueState: "any"
            },
            {
                name: "clear",
                value: "",
                valueState: "any"
            },
            {
                name: "compact",
                value: "",
                valueState: "any"
            },
            {
                name: "color",
                value: "",
                valueState: "any"
            },
            {
                name: "frameborder",
                value: "",
                valueState: "any"
            },
            {
                name: "hspace",
                value: "",
                valueState: "any"
            },
            {
                name: "link",
                value: "",
                valueState: "any"
            },
            {
                name: "marginheight",
                value: "",
                valueState: "any"
            },
            {
                name: "marginwidth",
                value: "",
                valueState: "any"
            },
            {
                name: "text",
                value: "",
                valueState: "any"
            },
            {
                name: "valign",
                value: "",
                valueState: "any"
            },
            {
                name: "vlink",
                value: "",
                valueState: "any"
            },
            {
                name: "vspace",
                value: "",
                valueState: "any"
            },
            {
                name: "size",
                value: "",
                valueState: "any"
            },
            {
                name: "width",
                value: "",
                valueState: "any"
            },
            {
                name: "height",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.1.2'] }
});

// 10.1.3 Dans chaque page web, l'utilisation des espaces vérifie-t-elle ces conditions ? 
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__presentation_name_374",
    status: 'untested',
    tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.1.3'] }
});

//* 10.2 Dans chaque page web, le contenu visible porteur d’information reste-t-il présent lorsque les feuilles de style sont désactivées ?
// 10.2.1 Dans chaque page web, l'information reste-t-elle présente lorsque les feuilles de style sont désactivées ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__presentation_name_375",
    status: 'untested',
    tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.2.1'] }
});

//* 10.3 Dans chaque page web, l'information reste-t-elle compréhensible lorsque les feuilles de style sont désactivées ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__presentation_name_376",
    status: 'untested',
    tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.3.1'] }
});

//* 10.4 Dans chaque page web, le texte reste-t-il lisible lorsque la taille des caractères est augmentée jusqu'à 200%, au moins (hors cas particuliers) ?
// 10.4.1 Dans chaque page web, l'augmentation de la taille des caractères jusqu'à 200 %, au moins, ne doit pas provoquer de perte d'information. Cette règle est-elle respectée selon une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_377",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.4.1'] }
});

// 10.4.2 Dans chaque page web, l'augmentation de la taille des caractères jusqu'à 200 %, au moins, doit être possible pour l’ensemble du texte dans la page. Cette règle est-elle respectée selon une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_378",
	query: 'meta[name="viewport"][content]',
	filter: function (item) {
		var content = item.getAttribute('content').trim();
        if(!content.match(/(user-scalable)|(maximum-scale)/igm)) {
            return true;
        }
		if (content.match(/(user-scalable=)|(maximum-scale=)/igm)) {
			content = content.indexOf(',') > -1 ? content.split(',') : content = [content];
            for (var j = 0; j < content.length; j++) {
				var property = content[j].split('=');
				var propertyName = property[0].trim().toLowerCase();
				var propertyValue = property[1].trim().toLowerCase();
				if (propertyName == 'user-scalable' && propertyValue == "no") {
                    item.setAttribute('data-tng-scalable', 'false');
					return false;
				}
				else if (propertyName == 'maximum-scale' && (parseFloat(propertyValue) < 2 && parseFloat(propertyValue) >= 0)) {
                    item.setAttribute('data-tng-scalable', 'false');
					return false;
				}
			}

            return true;
		}
	},
	testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "content",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'presentation', 'meta'],
    ressources: { 'rgaa': ['10.4.2'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_379",
	query: 'meta[data-tng-scalable]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "content",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'presentation', 'meta'],
    ressources: { 'rgaa': ['10.4.2'] }
});

//* 10.5 Dans chaque page web, les déclarations CSS de couleurs de fond d'élément et de police sont-elles correctement utilisées ?
// 10.5.1 Dans chaque page web, chaque déclaration CSS de couleurs de police (color), d'un élément susceptible de contenir du texte, est-elle accompagnée d'une déclaration de couleur de fond (background, background-color), au moins, héritée d'un parent ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_380",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.5.1'] }
});

// 10.5.2 Dans chaque page web, chaque déclaration de couleur de fond (background, background-color), d'un élément susceptible de contenir du texte, est-elle accompagnée d'une déclaration de couleur de police (color) au moins, héritée d'un parent ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_381",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.5.2'] }
});

// 10.5.3 Dans chaque page web, chaque utilisation d'une image pour créer une couleur de fond d'un élément susceptible de contenir du texte, via CSS (background, background-image), est-elle accompagnée d'une déclaration de couleur de fond (background, background-color), au moins, héritée d'un parent ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_382",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.5.3'] }
});

//* 10.6 Dans chaque page web, chaque lien dont la nature n'est pas évidente est-il visible par rapport au texte environnant ?
// 10.6.1 Dans chaque page web, chaque lien texte signalé uniquement par la couleur, et dont la nature n'est pas évidente, vérifie-t-il ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_383",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.6.1'] }
});

//* 10.7 Dans chaque page web, pour chaque élément recevant le focus, la prise de focus est-elle visible ?
// 10.7.1 Pour chaque élément recevant le focus, la prise de focus vérifie-t-elle une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_384",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.7.1'] }
});

//* 10.8 Pour chaque page web, les contenus cachés ont-ils vocation à être ignorés par les technologies d'assistance ?
// 10.8.1 Dans chaque page web, chaque contenu caché vérifie-t-il une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_385",
	query: '[data-tng-el-exposed="false"][data-tng-el-visible="true"]',
	description: "locale__presentation_description_386",
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'keyboard', 'presentation'],
    ressources: { 'rgaa': ['10.8.1'] }
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_387",
	query: '[data-tng-el-exposed="true"][data-tng-el-visible="false"]',
	description: "locale__presentation_description_388",
    filter: function(item) {
        let an = item.fullAccessibleName;
        if(an[0].length === 0) return;
        an.shift();
        
        let anwithoutchild = "";
        an.forEach(part => {
            for(content in part) {
                if(typeof part[content] === "string") anwithoutchild += part[content].trim();
            }
        });
        return anwithoutchild.length > 0;
    },
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'keyboard', 'presentation'],
    ressources: { 'rgaa': ['10.8.1'] }
});

//* 10.9 Dans chaque page web, l'information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle respectée ?
//* 10.10 Dans chaque page web, l'information ne doit pas être donnée par la forme, taille ou position uniquement. Cette règle est-elle implémentée de façon pertinente ?
// 10.9.1 Dans chaque page web, pour chaque texte ou ensemble de textes, l'information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle respectée ?
// 10.10.1 Dans chaque page web, pour chaque texte ou ensemble de textes, l'information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle implémentée de façon pertinente ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_389",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.9.1', '10.10.1'] }
});

// 10.9.2 Dans chaque page web, pour chaque image ou ensemble d'images, l'information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle respectée ?
// 10.10.2 Dans chaque page web, pour chaque image ou ensemble d'images, l'information ne doit pas être donnée par la forme, taille ou position uniquement. Cette règle est-elle implémentée de façon pertinente ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_390",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.9.2', '10.10.2'] }
});

// 10.9.3 Dans chaque page web, pour chaque média temporel, l'information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle respectée ?
// 10.10.3 Dans chaque page web, pour chaque média temporel, l'information ne doit pas être donnée par la forme, taille ou position uniquement. Cette règle est-elle implémentée de façon pertinente ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_391",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.9.3', '10.10.3'] }
});

// 10.9.4 Dans chaque page web, pour chaque média non temporel, l'information ne doit pas être donnée uniquement par la forme, taille ou position. Cette règle est-elle respectée ?
// 10.10.4 Dans chaque page web, pour chaque média non temporel, l'information ne doit pas être donnée par la forme, taille ou position uniquement. Cette règle est-elle implémentée de façon pertinente ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_392",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.9.4', '10.10.4'] }
});

//! 10.11 l'ajout de l'iframe cache les images sur certains sites sous chrome
//* 10.11 Pour chaque page web, les contenus peuvent-ils être présentés sans avoir recours à un défilement vertical pour une fenêtre ayant une hauteur de 256px ou à un défilement horizontal pour une fenêtre ayant une largeur de 320px (hors cas particuliers) ?
// 10.11.1 Pour chaque page web, lorsque le contenu dont le sens de lecture est horizontal est affiché dans une fenêtre réduite à une largeur de 320px, l'ensemble des informations et des fonctionnalités sont-elles disponibles sans aucun défilement horizontal (hors cas particuliers) ?
// tanaguruTestsList.push({
// 	lang: 'fr',
// 	name: "locale__presentation_name_393",
//     query: 'body',
//     analyzeElements: function(collection) {
//         var currentPage = document.createElement("iframe");
//         currentPage.id = 'test10-11-1-tng';
//         currentPage.style.width = "320px";
//         currentPage.style.height = "256px";
//         var pageHead = document.head.innerHTML;
//         var pageBody = document.body.outerHTML;
//         document.body.appendChild(currentPage);
//         currentPage.contentWindow.document.head.innerHTML = pageHead;
//         currentPage.contentWindow.document.body.outerHTML = pageBody;
//         var horizontalScroll = currentPage.contentWindow.document.body.scrollWidth - currentPage.contentWindow.document.body.clientWidth;
//         var verticalScroll = currentPage.contentWindow.document.body.scrollHeight - currentPage.contentWindow.document.body.clientHeight;
//         currentPage.remove();
//         if(verticalScroll > 0) {
//             collection[0].setAttribute('data-tng-verticallScroll', true);
//         } else {
//             collection[0].setAttribute('data-tng-verticallScroll', false);
//         }
//         if(horizontalScroll > 0) {
//             collection[0].status = 'cantTell';
//         } else {
//             collection[0].status = 'passed';
//         }
//     },
// 	tags: ['a11y', 'presentation'],
//     ressources: { 'rgaa': ['10.11.1'] }
// });

// 10.11.2 Pour chaque page web, lorsque le contenu dont le sens de lecture est vertical est affiché dans une fenêtre réduite à une hauteur de 256px, l'ensemble des informations et des fonctionnalités sont-elles disponibles sans aucun défilement vertical (hors cas particuliers) ?
// tanaguruTestsList.push({
// 	lang: 'fr',
// 	name: "locale__presentation_name_394",
//     query: '[data-tng-verticallScroll]',
//     analyzeElements: function(collection) {
//         if(collection[0].getAttribute('data-tng-verticallScroll') === 'true') {
//             collection[0].status = 'cantTell';
//         }

//         collection[0].status = 'passed';
//     },
// 	tags: ['a11y', 'presentation'],
//     ressources: { 'rgaa': ['10.11.2'] }
// });

//* 10.12 Dans chaque page web, les propriétés d'espacement du texte peuvent-elles être redéfinies par l'utilisateur sans perte de contenu ou de fonctionnalité (hors cas particuliers) ?
// 10.12.1 Dans chaque page web, le texte reste-t-il lisible lorsque l'affichage est modifié selon ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_395",
    status: 'untested',
	tags: ['a11y', 'presentation'],
    ressources: { 'rgaa': ['10.12.1'] }
});

//* 10.13 Dans chaque page web, les contenus additionnels apparaissant à la prise de focus ou au survol d'un composant d'interface sont-ils contrôlables par l'utilisateur (hors cas particuliers) ?
// 10.13.1 Chaque contenu additionnel devenant visible à la prise de focus ou au survol d'un composant d'interface peut-il être masqué par une action utilisateur sans déplacer le focus ou le pointeur de la souris (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_396",
    status: 'untested',
	tags: ['a11y', 'presentation', 'keyboard'],
    ressources: { 'rgaa': ['10.13.1'] }
});

// 10.13.2 Chaque contenu additionnel qui apparaît au survol d'un composant d'interface peut-il être survolé par le pointeur de la souris sans disparaître (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_397",
    status: 'untested',
	tags: ['a11y', 'presentation', 'keyboard'],
    ressources: { 'rgaa': ['10.13.2'] }
});

// 10.13.3 Chaque contenu additionnel qui apparaît à la prise de focus ou au survol d'un composant d'interface vérifie-t-il une de ces conditions (hors cas particuliers) ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_398",
    status: 'untested',
	tags: ['a11y', 'presentation', 'keyboard'],
    ressources: { 'rgaa': ['10.13.3'] }
});

//* 10.14 Dans chaque page web, les contenus additionnels apparaissant via les styles CSS uniquement peuvent-ils être rendus visibles au clavier et par tout dispositif de pointage ?
// 10.14.1 Dans chaque page web, les contenus additionnels apparaissant au survol d'un composant d'interface via les styles CSS respectent-ils si nécessaire une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_399",
    status: 'untested',
	tags: ['a11y', 'presentation', 'keyboard'],
    ressources: { 'rgaa': ['10.14.1'] }
});

// 10.14.2 Dans chaque page web, les contenus additionnels apparaissant au focus d'un composant d'interface via les styles CSS respectent-ils si nécessaire une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__presentation_name_400",
    status: 'untested',
	tags: ['a11y', 'presentation', 'keyboard'],
    ressources: { 'rgaa': ['10.14.2'] }
});

/**
 *? SCRIPTS
 ** tous les tests sont répertoriés
 *! dependances gérées mais attention à la référence à data-tng-altLong
 ** 7.1 & 7.2 implémentation partielle
 *TODO implémenter les modèles de conception dans le script content.js
 *
 * data : data-tng-btn-accessiblename, data-tng-btn-nameMatch
 */
// 7.1 Chaque script est-il, si nécessaire, compatible avec les technologies d'assistance ?
// 7.1.1 Chaque script qui génère ou contrôle un composant d'interface respecte-t-il une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_401",
	query: 'button:not([role]), button[role="none"], [role="button"], input[type="reset"]:not([role]), input[type="submit"]:not([role]), input[type="button"]:not([role])',
	testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.closest('form')) return;
        if((item.getAttribute('data-tng-el-visible') === 'true' || item.getAttribute('data-tng-el-exposed') === 'true') && !item.disabled) {
            if(item.matches('input[type="reset"]:not([value]), input[type="submit"]:not([value])') || item.hasAccessibleName()) {
                item.setAttribute('data-tng-btn-accessiblename', 'true');
                if(item.hasAttribute('data-tng-ANObject')) {
                    let details = JSON.parse(item.getAttribute('data-tng-ANObject'));
                    details.shift();
                    for(let i = 0; i < details.length; i++) {
                        if(Object.keys(details[i]).includes("aria-labelledby") || Object.keys(details[i]).includes("aria-label")) {
                            item.setAttribute('data-tng-script-ANaria', "true");
                            break;
                        }
                    }
                }
                return;
            } else {
                return true;
            }
        }
	},
	tags: ['a11y', 'buttons', 'accessiblename', 'scripts'],
	ressources: {'rgaa': ['7.1.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_402",
	query: '[data-tng-btn-accessiblename]',
	testStatus: "passed",
	tags: ['a11y', 'buttons', 'accessiblename', 'scripts'],
	ressources: {'rgaa': ['7.1.1']}
});

// 7.1.2 Chaque script qui génère ou contrôle un composant d'interface respecte-t-il une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_403",
	query: '[data-tng-el-exposed="false"]',
	testStatus: "failed",
	filter: function (item) {
        if(item.disabled) return;
        let itemNotExposed = item.getAttribute('data-tng-notExposed').split(',');

		return item.canBeReachedUsingKeyboardWith.length > 0 && !itemNotExposed.includes('css:display') && !itemNotExposed.includes('css:visibility');
	},
    tags: ['a11y', 'keyboard', 'scripts'],
    ressources: { 'rgaa': ['7.1.2'] }
});

// 7.1.3 Chaque script qui génère ou contrôle un composant d'interface vérifie-t-il ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_404",
    status: 'untested',
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.1.3']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_405",
    status: 'untested',
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.1.3']}
});

//! dependance 7.1.1
//! reference a data-tng-altLong (defini dans le script image), vérifier si c'est nécessaire, si oui definir cet attribut dans ce script egalement.
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__scripts_name_406",
    query: '[data-tng-script-ANaria][data-tng-el-visible="true"]',
    testStatus: "failed",
    depStatus: ["passed"],
    filter: function (item) {
        if(item.innerText.trim().length > 0 || (item.value && item.value.trim().length > 0) || item.querySelector('[data-tng-altLong]')) {
            var visibleName = '';
            if(item.alt) visibleName += ' '+item.alt;
            if(item.value) visibleName += ' '+item.value;
            item.childNodes.forEach(e => {
                if(e.nodeType === 3) {
                    visibleName += ' '+e.textContent;
                }

                if(e.nodeType === 1 && e.getAttribute('data-tng-el-visible') === 'true') {
                    if(e.alt) visibleName += ' '+e.alt;

                    e.childNodes.forEach(echild => {
                        if(echild.nodeType === 3 || (echild.nodeType === 1 && echild.getAttribute('data-tng-el-visible') === 'true')) {
                            visibleName += ' '+echild.textContent;
                            if(echild.alt) visibleName += ' '+echild.alt;
                        }
                    });
                }
            });

            if(visibleName.length == 0) return;

            let anMatch = isString1MatchString2(item.accessibleName(), visibleName);
            if(anMatch === null) return
            else if(!anMatch) return true
            else {
                item.setAttribute('data-tng-btn-nameMatch', 'true');
                return;
            }
        }
    },
    tags: ['a11y', 'accessiblename', 'buttons', 'scripts'],
    ressources: {'rgaa': ['7.1.3']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__scripts_name_407",
    query: '[data-tng-btn-nameMatch]',
    testStatus: "passed",
    tags: ['a11y', 'accessiblename', 'buttons', 'scripts'],
    ressources: {'rgaa': ['7.1.3']}
});

// 7.2 Pour chaque script ayant une alternative, cette alternative est-elle pertinente ?
// 7.2.1 Pour chaque script ayant une alternative, cette alternative est-elle pertinente ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_408",
    description: "locale__scripts_description_409",
	query: 'noscript',
    testStatus: 'cantTell',
    warning: false,
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.2.1']}
});

// 7.2.2 Chaque élément non textuel mis à jour par un script (dans la page, ou dans un cadre) et ayant une alternative vérifie-t-il ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_410",
    status: 'untested',
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.2.2']}
});

//* 7.3 Chaque script est-il contrôlable par le clavier et par tout dispositif de pointage (hors cas particuliers) ?
// 7.3.1 Chaque élément possédant un gestionnaire d'événement contrôlé par un script vérifie-t-il une de ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_411",
    status: 'untested',
	tags: ['a11y', 'keyboard', 'scripts'],
	ressources: {'rgaa': ['7.3.1']}
});

// 7.3.2 Un script ne doit pas supprimer le focus d'un élément qui le reçoit. Cette règle est-elle respectée (hors cas particuliers) ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_412",
    status: 'untested',
	tags: ['a11y', 'keyboard', 'scripts'],
	ressources: {'rgaa': ['7.3.2']}
});

//* 7.4 Pour chaque script qui initie un changement de contexte, l'utilisateur est-il averti ou en a-t-il le contrôle ?
// 7.4.1 Chaque script qui initie un changement de contexte vérifie-t-il une de ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_413",
    status: 'untested',
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.4.1']}
});

//* 7.5 Dans chaque page web, les messages de statut sont-ils correctement restitués par les technologies d'assistance ?
// 7.5.1 Chaque message de statut qui informe de la réussite, du résultat d'une action ou bien de l'état d'une application utilise-t-il l'attribut WAI-ARIA role="status" ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_414",
    status: 'untested',
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.5.1']}
});

// 7.5.2 Chaque message de statut qui présente une suggestion, ou avertit de l'existence d'une erreur utilise-t-il l'attribut WAI-ARIA role="alert" ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_415",
    status: 'untested',
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.5.2']}
});

// 7.5.3 Chaque message de statut qui indique la progression d'un processus utilise-t-il l'un des attributs WAI-ARIA role="log", role="progressbar" ou role="status" ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__scripts_name_416",
    status: 'untested',
	tags: ['a11y', 'scripts'],
	ressources: {'rgaa': ['7.5.3']}
});

/**
 *? STRUCTURATION DE L'INFORMATION
 ** tous les tests sont répertoriés
 ** dependances gérées
 * data : data-tng-headingAN
 */
//! 9.1.1 : voir content.js getHeadingsMap()
// 9.1.1 : Dans chaque page web, l'information est-elle structurée par l'utilisation appropriée de titres ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_420",
    description: "locale__structure_description_421",
    query: '[data-tng-herror]',
    testStatus: "failed",
    tags: ['a11y', 'headings', 'structure'],
    ressources: { 'rgaa': ['9.1.2'] }
});


// 9.1.2 : Dans chaque page web, le contenu de chaque titre (balise <hx> ou balise possédant un attribut WAI-ARIA role="heading" associé à un attribut WAI-ARIA aria-level) est-il pertinent ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_417",
    query: 'h1[data-tng-el-exposed="true"]:not([role]), h2[data-tng-el-exposed="true"]:not([role]), h3[data-tng-el-exposed="true"]:not([role]), h4[data-tng-el-exposed="true"]:not([role]), h5[data-tng-el-exposed="true"]:not([role]), h6[data-tng-el-exposed="true"]:not([role]), [role="heading"][data-tng-el-exposed="true"][aria-level]',
    testStatus: "failed",
    depStatus: ["cantTell"],
    filter: function (item) {
        if(item.hasAccessibleName()) {
            item.setAttribute('data-tng-headingAN', 'true');
            return;
        } else {
            return true;
        }
    },
    tags: ['a11y', 'headings', 'accessiblename', 'structure'],
    ressources: { 'rgaa': ['9.1.2'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_418",
    query: '[data-tng-headingAN="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'headings', 'accessiblename', 'structure'],
    ressources: { 'rgaa': ['9.1.2'] }
});

// 9.1.3 Dans chaque page web, chaque passage de texte constituant un titre est-il structuré à l'aide d'une balise <hx> ou d'une balise possédant un attribut WAI-ARIA role="heading" associé à un attribut WAI-ARIA aria-level ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_419",
    description: "locale__structure_description_420",
    query: '[role="heading"][data-tng-el-exposed="true"]:not([aria-level]), [class*="heading"][data-tng-el-exposed="true"]:not([role="heading"]), [class*="titre"][data-tng-el-exposed="true"]:not([role="heading"])',
    filter: function(item) {
        if(item.textContent.trim().length === 0) return;
        if(item.tagName.toLowerCase().match(/^h\d$/g)) return;
        return true;
    },
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'headings', 'structure'],
    ressources: { 'rgaa': ['9.1.3'] }
});

// 9.2.1 Dans chaque page web, la structure du document vérifie-t-elle ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_421",
    query: 'header[data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.2.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_422",
    query: 'footer[data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.2.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_423",
    query: 'nav[data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.2.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_424",
    query: 'main[data-tng-el-exposed="true"]',
    testStatus: 'cantTell',
    warning: false,
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.2.1'] }
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_425",
    query: 'main[data-tng-el-exposed="true"][data-tng-el-visible="true"]',
    expectedNbElements : 1,
    explanations: {
        passed: 'locale__structure_passed_426',
        failed: 'locale__structure_failed_427'
    },
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.2.1'] }
});

//* 9.3 Dans chaque page web, chaque liste est-elle correctement structurée ?
// 9.3.1 Dans chaque page web, les informations regroupées visuellement sous forme de liste non ordonnée vérifient-elles une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_428",
    status: 'untested',
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.3.1'] }
});

// 9.3.2 Dans chaque page web, les informations regroupées visuellement sous forme de liste ordonnée vérifient-elles une de ces conditions ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_429",
    status: 'untested',
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.3.2'] }
});

// 9.3.3 Dans chaque page web, les informations regroupées sous forme de liste de description utilisent-elles les balises <dl> et <dt> / <dd> ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_430",
    status: 'untested',
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.3.3'] }
});

//* 9.4 Dans chaque page web, chaque citation est-elle correctement indiquée ?
// 9.4.1 Dans chaque page web, chaque citation courte utilise-t-elle une balise <q> ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_431",
    status: 'untested',
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.4.1'] }
});

// 9.4.2 Dans chaque page web, chaque bloc de citation utilise-t-il une balise <blockquote> ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__structure_name_432",
    status: 'untested',
    tags: ['a11y', 'structure'],
    ressources: { 'rgaa': ['9.4.2'] }
});

/**
 *? TABLEAUX
 ** complet
 ** dependances gérées
 * data : data-tng-tableCaptions, data-tng-prezTable, data-tng-dataTableSummary, data-tng-tableAccessiblename, data-tng-table, data-tng-tableCol, data-tng-tableRow, data-tng-row, data-tng-tableHeaders, data-tng-tableHeader-uniqueID, data-tng-scope, data-tng-partHeader-uniqueID, data-tng-headerInTable, data-tng-prezTable-dataEl
 */

//* 5.1 Chaque tableau de données complexe a-t-il un résumé ?
// 5.1.1  Pour chaque tableau de données complexe un résumé est-il disponible ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_433",
    query: 'table[data-tng-el-exposed="true"][data-tng-el-visible="true"]:not([role]), [role="table"][data-tng-el-exposed="true"][data-tng-el-visible="true"]',
    expectedNbElements: 0,
    explanations: {
        passed: 'locale__tables_passed_434',
        failed: 'locale__tables_failed_435'
    },
    depStatus: ["cantTell"],
    filter: function (item) {
        if(item.querySelectorAll('th').length > 1 || item.querySelectorAll('[role="columnheader"], [role="rowheader"]').length > 1) {
            var isComplex = item.querySelectorAll('[colspan], [rowspan], [aria-colspan], [aria-rowspan]').length > 0;
            if(isComplex) {
                if(item.querySelector('caption')) {
                    if(item.querySelector('caption').textContent.trim().length > 0) {
                        item.setAttribute('data-tng-tableCaptions', 'true');
                        return;
                    }
                } else if(item.hasAttribute('role') && item.hasAttribute('aria-describedby')) {
                    var ids = item.getAttribute('aria-describedby').trim().split(' ');
                    if(ids.length > 0) {
                        var summary = '';
                        ids.forEach(id => {
                            if(document.getElementById(id)) {
                                summary += document.getElementById(id).textContent.trim();
                            }
                        });

                        if(summary.length > 0) {
                            item.setAttribute('data-tng-tableCaptions', 'true');
                            return;
                        }
                    }
                }
                return true;
            }
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.1.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_436",
    query: '[data-tng-tableCaptions]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [],
            related: {
                title: "Description référencée par l'attribut aria-describedby.",
                element: "#!!!aria-describedby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.1.1']}
});

// 5.2.1  Pour chaque tableau de données complexe ayant un résumé, celui-ci est-il pertinent ?
//! dependance 5.1.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_437",
    query: '[data-tng-tableCaptions]',
    description: "locale__tables_description_438",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [],
            related: {
                title: "Description référencée par l'attribut aria-describedby.",
                element: "#!!!aria-describedby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.2.1']}
});

//* 5.3 Pour chaque tableau de mise en forme, le contenu linéarisé reste-t-il compréhensible ?
// 5.3.1 Chaque tableau de mise en forme vérifie-t-il ces conditions (hors cas particuliers) ?
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_439",
    query: 'table',
    description: "locale__tables_description_440",
    testStatus: "failed",
    depStatus: ["cantTell", "passed"],
    filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') == 'false' && item.getAttribute('data-tng-el-visible') == 'false') return;

        if(item.querySelectorAll('th, [role="columnheader"], [role="rowheader"]').length === 0) {
            item.setAttribute('data-tng-prezTable', 'true');

            if(!item.hasAttribute('role') || item.getAttribute('role') !== 'presentation') {
                return true;
            }
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.3.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_441",
    query: 'table[data-tng-prezTable][role="presentation"]',
    description: "locale__tables_description_440",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "role",
                value: "presentation",
                valueState: "egal"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.3.1']}
});

// 5.4.1 Pour chaque tableau de données ayant un titre, le titre est-il correctement associé au tableau de données ?
//! dependance 5.3.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_443",
    query: 'table:not([role]):not([data-tng-prezTable]), [role="table"]:not([data-tng-prezTable])',
    filter: function(item) {
        if(item.querySelector('caption') != null) {
            item.setAttribute('data-tng-dataTableSummary', 'true');
            return true;
        }

        if(item.hasAttribute('title') || item.hasAttribute('aria-label')) {
            item.setAttribute('data-tng-dataTableSummary', 'true');
            return true;
        }

        if(item.hasAttribute('aria-labelledby') && item.getAttribute('aria-labelledby').trim().length > 0) {
            var ids = item.getAttribute('aria-labelledby').trim().split(' ');
            if(ids.length > 0) {
                var summary = false;
                ids.forEach(id => {
                    if(document.getElementById(id)) {
                        summary = true;
                    }
                });

                if(summary) {
                    item.setAttribute('data-tng-dataTableSummary', 'true');
                    return true;
                } else {
                    item.setAttribute('data-tng-dataTableSummary', 'false');
                }
            }
        }
    },
    testStatus: "passed",
    depStatus: ["failed", "cantTell"],
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "any"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "any"
            },
            {
                name: "title",
                value: "",
                valueState: "any"
            }],
            related: {
                title: "Passage de texte associé à la table.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.4.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_444",
    query: '[data-tng-dataTableSummary="false"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "aria-labelledby",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.4.1']}
});

// 5.5.1 Pour chaque tableau de données ayant un titre, ce titre permet-il d'identifier le contenu du tableau de données de manière claire et concise ?
//! dependance 5.4.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_445",
    query: '[data-tng-dataTableSummary="true"]',
    description: "locale__tables_description_446",
    filter: function(item) {
        if(item.hasAccessibleName()) {
            item.setAttribute('data-tng-tableAccessiblename', 'true');
            return true;
        }

        item.setAttribute('data-tng-tableAccessiblename', 'false');
    },
    testStatus: 'cantTell',
    warning: false,
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "notEmpty"
            }],
            related: {
                title: "Passage de texte associé à la table.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables', 'accessiblename'],
    ressources: {'rgaa': ['5.5.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_447",
    query: '[data-tng-tableAccessiblename="false"][data-tng-el-exposed="true"], [data-tng-tableAccessiblename="false"][data-tng-el-visible="true"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "aria-label",
                value: "",
                valueState: "any"
            },
            {
                name: "aria-labelledby",
                value: "",
                valueState: "notEmpty"
            },
            {
                name: "title",
                value: "",
                valueState: "any"
            }],
            related: {
                title: "Passage de texte associé à la table.",
                element: "#!!!aria-labelledby!!!",
                attrs: [],
                tag: false,
                content: true
            },
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.5.1']}
});

//* 5.6 Pour chaque tableau de données, chaque en-tête de colonnes et chaque en-tête de lignes sont-ils correctement déclarés ?
// 5.6.1 Pour chaque tableau de données, chaque en-tête de colonnes s'appliquant à la totalité de la colonne vérifie-t-il une de ces conditions ?
//! dependance 5.3.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_448",
    query: 'table:not([role]):not([data-tng-prezTable]) *[scope="col"][data-tng-el-exposed="true"], table:not([role]):not([data-tng-prezTable]) *[scope="colgroup"][data-tng-el-exposed="true"], table:not([role]):not([data-tng-prezTable]) *[id][data-tng-el-exposed="true"], table:not([role]):not([data-tng-prezTable]) th[data-tng-el-exposed="true"]',
    filter: function (item) {
        var table = item.closest('table');
        var parentRow = item.closest('tr');

        if(item.tagName.toLowerCase() === 'th' && parentRow) {
            if(parentRow.querySelectorAll('th').length < parentRow.querySelectorAll('td').length) return;
        }

        //? header with SCOPE
        if(item.hasAttribute('scope')) {
            if(item.getAttribute('scope') === 'col' || item.getAttribute('scope') === 'colgroup') {
                if(item.tagName.toLowerCase() !== 'th') {
                    item.setAttribute('data-tng-table', 'headerColFull');
                    if(item.hasAttribute('role') && item.getAttribute('role') === 'columnheader') {
                        return true;
                    } else {
                        item.setAttribute('data-tng-tableCol', 'bad');
                        return;
                    }
                } 
                else if(item.tagName.toLowerCase() === 'th' && (item.id.trim().length === 0 || !table.querySelector('[headers*="'+item.id+'"]'))) {
                    item.setAttribute('data-tng-table', 'headerColFull');
                    return true;
                }
            }
        }

        //? if item isn't cell return
        if(item.tagName.toLowerCase() !== 'th' && item.tagName.toLowerCase() !== 'td') return;

        if(item.tagName.toLowerCase() === 'th' && !table.querySelector('*[headers]')) {
            if(parentRow) {
                item.setAttribute('data-tng-table', 'headerColFull');
                return true;
            }

            return;
        }

        //? header with ID
        //? check if this ID corresponding with headers attibute
        var headersList = table.querySelectorAll('*[headers]');
        var headers = [];
        var headersLength = headersList.length;

        for(var i = 0; i < headersLength; i++) {
            var list = headersList[i].getAttribute('headers').split(' ');

            list.forEach(h => {
                if(!headers.includes(h)) {
                    headers.push(h);
                }
            });
        }

        if(!headers.includes(item.id)) return;

        //? get column's size & position
        var row = item.closest('tr');
        if(!row) return;

        var headerIndex = [];
        var p = 0;
        var siblings = row.children;
        var siblingsLength = siblings.length;

        for(var x = 0; x < siblingsLength; x++) {
            if(siblings[x] != item) {
                if(siblings[x].hasAttribute('colspan') && siblings[x].getAttribute('colspan') > 0) {
                    p = p + parseInt(siblings[x].getAttribute('colspan'));
                } else p++;
            } else break;
        }

        if(item.hasAttribute('colspan') && item.getAttribute('colspan') > 0) {
            var size = parseInt(item.getAttribute('colspan'));
            var sizeP = size+p;

            for(var x = p; x < sizeP; x++) {
                headerIndex.push(x+1);
            }
        } else {
            headerIndex.push(p+1);
        }

        //? check if all cells in the column has headers attribute corresponding to the item(header) ID
        var cells = table.querySelectorAll('th, td');
        var columnHeader = true;

        cells.forEach(cell => {
            var cellIndex = [];
            var rowC = cell.closest('tr');
            var pC = 0;
            var siblingsC = rowC.children;
            var siblingsCLength = siblingsC.length;

            for(var x = 0; x < siblingsCLength; x++) {
                if(siblingsC[x] != cell) {
                    if(siblingsC[x].hasAttribute('colspan') && siblingsC[x].getAttribute('colspan') > 0) {
                        pC = pC + parseInt(siblingsC[x].getAttribute('colspan'));
                    } else pC++;
                } else break;
            }

            if(cell.hasAttribute('colspan') && cell.getAttribute('colspan') > 0) {
                var sizeC = parseInt(cell.getAttribute('colspan'));
                var sizeCpC = sizeC+pC;

                for(var x = pC; x < sizeCpC; x++) {
                    cellIndex.push(x+1);
                }
            } else {
                cellIndex.push(pC+1);
            }

            if(cellIndex.some(n => headerIndex.includes(n)) && cell != item) {
                if(cell.hasAttribute('headers')) {
                    columnHeader = cell.getAttribute('headers').match(item.id) ? columnHeader : false;
                } else if(!cell.hasAttribute('headers')) {
                    columnHeader = false;
                }
            }
        });

        if(columnHeader) {
            item.setAttribute('data-tng-table', 'headerColFull');
            if(item.tagName.toLowerCase() !== 'th') {
                if(item.hasAttribute('role') && item.getAttribute('role') === 'columnheader') {
                    return true;
                } else {
                    item.setAttribute('data-tng-tableCol', 'bad');
                    return;
                }
            } else return true;
        }

        // else if(item.hasAttribute('role') && item.getAttribute('role') === 'table') {
        //     var ch = item.querySelectorAll('*[role="columnheader"]');
        //     if(ch.length === 0) {
        //         verifier que l'on a pas d'en-tête appliqué à toute une colonne mis en place avec aria-labelledby
        //     } else {
        //         c'est ok
        //     }
        // }

        else item.setAttribute('data-tng-table', 'headerColPart');
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.1']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_449",
    query: 'table *[data-tng-tableCol="bad"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.1']}
});

// 5.6.2 Pour chaque tableau de données, chaque en-tête de lignes s'appliquant à la totalité de la ligne vérifie-t-il une de ces conditions ?
//! dependance 5.3.1
tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_450",
    query: 'table:not([role]):not([data-tng-prezTable]) *[scope="row"][data-tng-el-exposed="true"], table:not([role]):not([data-tng-prezTable]) *[scope="rowgroup"][data-tng-el-exposed="true"], table:not([role]):not([data-tng-prezTable]) *[id][data-tng-el-exposed="true"], table:not([role]):not([data-tng-prezTable]) th[data-tng-el-exposed="true"]',
    filter: function (item) {
        var table = item.closest('table');
        var parentRow = item.closest('tr');

        if(item.tagName.toLowerCase() === 'th' && parentRow) {
            if(parentRow.querySelectorAll('th').length > parentRow.querySelectorAll('td').length) return;
        }

        //? header with SCOPE
        if(item.hasAttribute('scope')) {
            if(item.getAttribute('scope') === 'row' || item.getAttribute('scope') === 'rowgroup') {
                if(item.tagName.toLowerCase() !== 'th') {
                    item.setAttribute('data-tng-table', 'headerRowFull');
                    if(item.hasAttribute('role') && item.getAttribute('role') === 'rowheader') {
                        return true;
                    } else {
                        item.setAttribute('data-tng-tableRow', 'bad');
                        return
                    }
                }
                else if(item.tagName.toLowerCase() === 'th' && (item.id.trim().length === 0 || !table.querySelector('[headers*="'+item.id+'"]'))) {
                    item.setAttribute('data-tng-table', 'headerRowFull');
                    return true;
                }
            }
        }

        //? if item isn't cell, return
        if(item.tagName.toLowerCase() !== 'th' && item.tagName.toLowerCase() !== 'td') return;

        if(item.tagName.toLowerCase() === 'th' && !table.querySelector('*[headers]')) {
            if(parentRow) {
                item.setAttribute('data-tng-table', 'headerRowFull');
                return true;
            }

            return;
        }

        //? header with ID
        //? check if this ID corresponding with headers attribute
        var headersList = table.querySelectorAll('*[headers]');
        var headers = [];
        var headersLength = headersList.length;

        for(var i = 0; i < headersLength; i++) {
            var list = headersList[i].getAttribute('headers').split(' ');

            list.forEach(h => {
                if(!headers.includes(h)) {
                    headers.push(h);
                }
            });
        }

        if(!headers.includes(item.id)) return;

        //? get row's size & all its cells
        var rows = table.querySelectorAll('tr');
        var cells = [];
        var currentRow = item.closest('tr');
        if(!currentRow) return;
        currentRow.setAttribute('data-tng-row', true);

        if(item.hasAttribute('rowspan') && parseInt(item.getAttribute('rowspan')) > 1) {
            var size = parseInt(item.getAttribute('rowspan'));
            var rowsLength = rows.length;

            for(var i = 0; i < rowsLength; i++) {
                if(rows[i] === currentRow) {
                    for(var x = 1; x < size; x++) {
                        rows[i+x].setAttribute('data-tng-row', true);
                    }
                }
            }
        }

        var cells = table.querySelectorAll('[data-tng-row=true] th, [data-tng-row=true] td');
        var rowHeader = true;

        //? check if all cells in the row has headers attribute corresponding to the item(header) ID
        cells.forEach(cell => {
            if(cell != item) {
                rowHeader = cell.hasAttribute('headers') && cell.getAttribute('headers').match(item.id) ? rowHeader : false;
            }
        });

        rows.forEach(e => {
            e.removeAttribute('data-tng-row');
        });

        if(rowHeader) {
            item.setAttribute('data-tng-table', 'headerRowFull');
            if(item.tagName.toLowerCase() !== 'th') {
                if(item.hasAttribute('role') && item.getAttribute('role') === 'rowheader') {
                    return true;
                } else {
                    item.setAttribute('data-tng-tableRow', 'bad');
                }
            } else return true;
        }

        else item.setAttribute('data-tng-table', 'headerRowPart');
    },
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.2']}
});

tanaguruTestsList.push({
    lang: 'fr',
    name: "locale__tables_name_451",
    query: 'table *[data-tng-tableRow="bad"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
    tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.2']}
});

// 5.6.3 Pour chaque tableau de données, chaque en-tête ne s'appliquant pas à la totalité de la ligne ou de la colonne est-il structuré au moyen d'une balise <th> ?
//! dependances 5.6.1 & 5.6.2
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_452",
    description: "locale__tables_description_453",
    query: '*[data-tng-table="headerColPart"], *[data-tng-table="headerRowPart"]',
    testStatus: "failed",
    filter: function(item) {
        return item.tagName.toLowerCase() != 'th';
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.3']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_454",
    query: 'th[data-tng-table="headerColPart"], th[data-tng-table="headerRowPart"]',
    testStatus: "passed",
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.3']}
});

// 5.6.4 Pour chaque tableau de données, chaque cellule associée à plusieurs en-têtes est-elle structurée au moyen d’une balise <td> ou <th> ?
//! dependance 5.3.1
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_455",
	query: 'table:not([role]):not([data-tng-prezTable]) *[headers][data-tng-el-exposed="true"], [role="table"]:not([data-tng-prezTable]) *[headers][data-tng-el-exposed="true"]',
    testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        var table = item.closest('table');
        var headers = item.getAttribute('headers').split(' ');
        var count = 0;
        var headersLength = headers.length;

        for(var i = 0; i < headersLength; i++) {
            var id = document.getElementById(headers[i]);

            if(id) {
                count = id.closest('table') == table ? count+1 : count;
            }
        }

        if(count > 1) {
            if(item.tagName.toLowerCase() !== 'td' && item.tagName.toLowerCase() !== 'th') {
                return true;
            }
            item.setAttribute('data-tng-tableHeaders', 'true');
        }
	},
    mark: function() {
        return {
            attrs: [{
                name: "headers",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.4']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_456",
	query: 'table *[data-tng-tableHeaders="true"]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "headers",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.6.4']}
});

//* 5.7 Pour chaque tableau de données, la technique appropriée permettant d'associer chaque cellule avec ses en-têtes est-elle utilisée (hors cas particuliers) ?
// 5.7.1 Pour chaque contenu de balise <th> s'appliquant à la totalité de la ligne ou de la colonne, la balise <th> respecte-t-elle une de ces conditions (hors cas particuliers) ?
//! dependances 5.6.1 & 5.6.2
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_457",
	query: 'th[data-tng-table="headerColFull"]:not([scope]):not([role="columnheader"]), th[data-tng-table="headerRowFull"]:not([scope]):not([role="rowheader"])',
    testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.id.trim().length > 0) {
            let thID = item.id;
            item.id = "";
            if(!document.getElementById(thID)) {
                item.id = thID;
                item.setAttribute('data-tng-tableHeader-uniqueID', 'true');
                return;
            }
            item.id = thID;
        }

        return true;
	},
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            },
            {
                name: "id",
                value: "",
                valueState: "any"
            },
            {
                name: "role",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_458",
	query: 'th[data-tng-table="headerColFull"][scope], th[data-tng-table="headerColFull"][role="columnheader"], th[data-tng-table="headerColFull"][data-tng-tableHeader-uniqueID="true"], th[data-tng-table="headerRowFull"][scope], th[data-tng-table="headerRowFull"][role="rowheader"], th[data-tng-table="headerRowFull"][data-tng-tableHeader-uniqueID="true"]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            },
            {
                name: "id",
                value: "",
                valueState: "any"
            },
            {
                name: "role",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.1']}
});

// 5.7.2 Pour chaque contenu de balise <th> s'appliquant à la totalité de la ligne ou de la colonne et possédant un attribut scope, la balise <th> vérifie-t-elle une de ces conditions ? 
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_459",
	query: 'th[scope]',
	filter: function (item) {
		var row = item.parentNode;
        if(row.querySelectorAll('th').length === 1 && row.querySelectorAll('td').length > 0) {
            item.setAttribute('data-tng-scope', 'valid');
            return item.getAttribute('scope') === 'row';
        }

        if(row.querySelectorAll('td').length === 0) {
            item.setAttribute('data-tng-scope', 'valid');
            return item.getAttribute('scope') === 'col';
        }
	},
	testStatus: "passed",
    depStatus: ["failed", "cantTell"],
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.2']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_460",
	query: 'th[scope]:not([data-tng-scope="valid"])',
    testStatus: "failed",
    depStatus: ["cantTell"],
	filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') == 'false' && item.getAttribute('data-tng-el-visible') == 'false') return;

		var scope = item.getAttribute('scope');

        if(scope != 'row' && scope != 'col') {
            item.setAttribute('data-tng-scope', 'invalid');
            return true;
        }
	},
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.2']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_461",
	query: 'th[scope]:not([data-tng-scope])',
    description: "locale__tables_description_462",
    testStatus: 'cantTell',
    warning: false,
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.2']}
});

// 5.7.3  Pour chaque contenu de balise <th> ne s'appliquant pas à la totalité de la ligne ou de la colonne, la balise <th> vérifie-t-elle ces conditions ?
//! dependances 5.6.1 & 5.6.2
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_463",
	query: 'th[data-tng-table="headerColPart"][id]:not([scope="col"]):not([role="columnheader"]), th[data-tng-table="headerRowPart"][id]:not([scope="row"]):not([role="rowheader"])',
	filter: function (item) {
        if(item.id.trim().length > 0) {
            let thID = item.id;
            item.id = "";
            if(!document.getElementById(thID)) {
                item.id = thID;
                item.setAttribute('data-tng-partHeader-uniqueID', 'true');
                return true;
            }
            item.id = thID;
        }
        return;
	},
    testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            },
            {
                name: "id",
                value: "",
                valueState: "any"
            },
            {
                name: "role",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.3']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_464",
	query: 'th[data-tng-table="headerColPart"]:not([data-tng-partHeader-uniqueID="true"]), th[data-tng-table="headerRowPart"]:not([data-tng-partHeader-uniqueID="true"])',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "scope",
                value: "",
                valueState: "any"
            },
            {
                name: "id",
                value: "",
                valueState: "any"
            },
            {
                name: "role",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.3']}
});

// 5.7.4 Pour chaque contenu de balise <td> ou <th> associée à un ou plusieurs en-têtes possédant un attribut id, la balise vérifie-t-elle ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_465",
	query: 'table td[headers], table th[headers]',
	filter: function (item) {
		var headers = item.getAttribute('headers');
		if (/^.+(\s.+)*$/.test(headers)) {
			headers = headers.split(' ');
			if (headers.length > 1) {
				var result = true;
				for (var i = 0; i < headers.length; i++) {
					var th = document.getElementById(headers[i]);;
					result = th ? th.closest('table') == item.closest('table') : false;
					if (!result) {
						break;
					}
				}

                if(result) {
                    return true;
                } else {
                    item.setAttribute('data-tng-headerInTable', 'false');
                    return;
                }
			}
			else {
				var th = document.getElementById(headers[0]);

                if(th && th.closest('table') == item.closest('table')) {
                    return true;
                } else {
                    item.setAttribute('data-tng-headerInTable', 'false');
                    return;
                }
			}
		}
		else {
			return false;
		}
	},
	testStatus: "passed",
    depStatus: ["failed"],
    mark: function() {
        return {
            attrs: [{
                name: "headers",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.4']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_466",
	query: 'table [data-tng-headerInTable="false"][data-tng-el-exposed="true"], table [data-tng-headerInTable="false"][data-tng-el-visible="true"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "headers",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.4']}
});

// 5.7.5 Pour chaque balise pourvue d'un attribut WAI-ARIA role="rowheader" ou role="columnheader" dont le contenu s'applique à la totalité de la ligne ou de la colonne, la balise vérifie-t-elle une de ces conditions ?
//! dependances 5.6.1 & 5.6.2
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_467",
	query: '[role="rowheader"][data-tng-table="headerColFull"], [role="columnheader"][data-tng-table="headerRowFull"]',
    testStatus: "failed",
    mark: function() {
        return {
            attrs: [{
                name: "role",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.5']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_468",
	query: '[role="columnheader"][data-tng-table="headerColFull"], [role="rowheader"][data-tng-table="headerRowFull"]',
    testStatus: "passed",
    mark: function() {
        return {
            attrs: [{
                name: "role",
                value: "",
                valueState: "any"
            }],
            related: {},
            tag: false,
            content: false
        }
    },
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.7.5']}
});

//* 5.8 Chaque tableau de mise en forme ne doit pas utiliser d'éléments propres aux tableaux de données. Cette règle est-elle respectée ?
// 5.8.1 Chaque tableau de mise en forme (balise <table>) vérifie-t-il ces conditions ?
tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_469",
	query: 'table[role="presentation"]',
    testStatus: "failed",
    depStatus: ["passed"],
	filter: function (item) {
        if(item.getAttribute('data-tng-el-exposed') == 'false' && item.getAttribute('data-tng-el-visible') == 'false') return;

		if(item.hasAttribute('summary') && getAttribute('summary').length > 0) {
            return true;
        }

        if(item.querySelectorAll('caption, th, thead, tfoot, colgroup, [role="rowheader"], [role="columnheader"], td[scope], td[headers], td[axis]').length > 0) {
            return true;
        }

        item.setAttribute('data-tng-prezTable-dataEl', 'false');
	},
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.8.1']}
});

tanaguruTestsList.push({
	lang: 'fr',
	name: "locale__tables_name_470",
	query: 'table[role="presentation"][data-tng-prezTable-dataEl="false"]',
    testStatus: "passed",
	tags: ['a11y', 'tables'],
    ressources: {'rgaa': ['5.8.1']}
});

var statuses = ['failed', 'cantTell', 'passed'];
var interactiveRoles = ["button", "checkbox", "combobox", "link", "listbox", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "searchbox", "slider", "spinbutton", "switch", "tab", "textbox"];
// var DOM_archi;
var interactiveIndex = 0;
var interactives = [];
window.scrollTo(0,0);

function isInside(parent, children) {
    let top = parent.top - children.top <= 0;
    let left = parent.left - children.left <= 0;
    let bottom = parent.bottom - children.bottom >= 0;
    let right = parent.right - children.right >= 0;
    
    return top && left && bottom && right;
}

function getElementProperties(element, pos, bgColorParent, positionParent) {
    if(element.localName === "head" || element.localName === "noscript" || element.localName === "noscript") return;
    if(element.scrollTop > 0 || element.scrollLeft < 0) element.scrollTo(0,0);
    let exposed = element.isNotExposedDueTo;
    let properties = {
        index: pos,
        role: element.getComputedAriaRole(),
        tag: element.tagName.toLowerCase(),
        position: getPosition(element),
        width: element.offsetWidth,
        height: element.offsetHeight,
        bgImage: window.getComputedStyle(element).getPropertyValue('background-image') != "none",
        bgColor: window.getComputedStyle(element).getPropertyValue('background-color'),
        color: window.getComputedStyle(element).getPropertyValue('color'),
        text: false,
        content: element.textContent,
        interactive: false,
        tab: false,
        visible: (exposed == 'css:display' || exposed == 'css:visibility') ? false : element.isVisible,
        exposed: exposed.length === 0
    };

    if(properties.exposed) {
        properties.tab = element.canBeReachedUsingKeyboardWith.length > 0;

        if(interactiveRoles.includes(properties.role)) {
            properties.interactive = !element.hasAttribute('disabled') && !(element.hasAttribute('aria-disabled') && element.getAttribute('aria-disabled') === "true");
        }
    } else element.setAttribute('data-tng-notExposed', exposed.join());

    if(properties.bgColor === "rgba(0, 0, 0, 0)") {
        if(positionParent && isInside(positionParent, properties.position)) {
            properties.bgColor = bgColorParent;
        } else properties.bgColor = null;
    }

    if(properties.tab || properties.interactive) {
        interactives.push({el: element, prop: properties});
    }

    //todo traiter également les pseudos éléments ::before & ::after
    let child = element.childNodes;
    let elementChild = {};

    for(let i = 1; i <= child.length; i++) {
        let DOMposition = pos+"."+i;
        if(!properties.text && child[i-1].nodeType === 3 && child[i-1].textContent.trim().length > 0) {
            properties.text = true;
        }

        else if(child[i-1].nodeType === 1) {
            let tag = child[i-1].tagName.toLowerCase();
            if(tag === "head" || tag === "script") continue;
            elementChild[DOMposition] = getElementProperties(child[i-1], DOMposition, properties.bgColor);
        }

        else continue;
    }

    if(Object.keys(elementChild).length > 0) properties.child = elementChild;

    element.setAttribute('data-tng-properties', pos);
    element.setAttribute('data-tng-el-exposed', properties.exposed);
    element.setAttribute('data-tng-el-visible', properties.visible);

    if(properties.tab) {
        element.setAttribute('data-tng-interactive-pos', interactiveIndex);
        interactiveIndex++;
    }

    let attributesList = element.attributes;
    for(let i = 0; i < attributesList.length; i++) {
        if(attributesList[i].name.match(/^aria-.*$/)) {
            element.setAttribute('data-tng-ariaAttribute', true);
        }
    }

    return properties;
}

/**
 * ? Define for each node of the page, if it is exposed, visible and has a [aria-*] attribute
 * ! NEED FOR TESTS
 */
function addDataTng() {
    if(document.querySelector('[sdata-tng-hindex]')) cleanSDATA();
    var eList = document.body.querySelectorAll('*');
    var pos = 1;

    eList.forEach(e => {
        e.setAttribute('data-tng-pos', pos);
        pos++;
        let elExposed = e.isNotExposedDueTo;
        if(elExposed.length > 0) {
            e.setAttribute('data-tng-el-exposed', false);
            e.setAttribute('data-tng-notExposed', elExposed.join());
    
            if(elExposed == 'css:display' || elExposed == 'css:visibility') {
                e.setAttribute('data-tng-el-visible', false);
            }
        } else {
            e.setAttribute('data-tng-el-exposed', true);
        }
    
        if(!e.hasAttribute('data-tng-el-visible')) {
            if(e.isVisible) {
                e.setAttribute('data-tng-el-visible', true);
            } else {
                e.setAttribute('data-tng-el-visible', false);
            }
        }
        
        let attributesList = e.attributes;
        for(let i = 0; i < attributesList.length; i++) {
            if(attributesList[i].name.match(/^aria-.*$/)) {
                e.setAttribute('data-tng-ariaAttribute', true);
            }
        }
    });
}

/**
 * ? Check if page has images, frames, media, tables, links & form fields
 */
function isNACat(currentCat) {
    if(currentCat === 'images') {
        return !document.body.querySelector('img, [role="img"], area, input[type="image"], svg, object[type^="image/"], embed[type^="image/"], canvas');
    }

    if(currentCat === 'frames') {
        return !document.body.querySelector('iframe:not([role="presentation"]), frame:not([role="presentation"])');
    }

    if(currentCat === 'media') {
        return !document.body.querySelector('video, audio, object[type^="video/"], object[type^="audio/"], object[type="application/ogg"], embed[type^="video/"], embed[type^="audio/"]');
    }

    if(currentCat === 'tables') {
        return !document.body.querySelector('table, [role="table]');
    }

    if(currentCat === 'links') {
        return !document.body.querySelector('a[href], [role="link"]');
    }

    if(currentCat === 'forms') {
        return !document.body.querySelector('form, [role="form"], input[type="text"]:not([role]), input[type="password"]:not([role]), input[type="search"]:not([role]), input[type="email"]:not([role]), input[type="number"]:not([role]), input[type="tel"]:not([role]), input[type="url"]:not([role]), textarea:not([role]), input[type="checkbox"]:not([role]), input[type="radio"]:not([role]), input[type="date"]:not([role]), input[type="range"]:not([role]), input[type="color"]:not([role]), input[type="time"]:not([role]), input[type="month"]:not([role]), input[type="week"]:not([role]), input[type="datetime-local"]:not([role]), select:not([role]), datalist:not([role]), input[type="file"]:not([role]), progress:not([role]), meter:not([role]), input:not([type]):not([role]), [role="progressbar"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="listbox"], [role="searchbox"], [role="combobox"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"], [contenteditable="true"]:not([role])');
    }

    return false;
}

/**
 * ? Filters the tests by the user's chosen status
 */
function filterAllTestsByStatus() {
    filterTestsByStatus(statusUser);
}

/**
 * ? remove all [data-tng-*]
 */
function removeAllDataTNG() {
    if(last === "yes") {
        removeDataTNG(document.querySelector('html'));
        document.querySelectorAll('*').forEach(e => removeDataTNG(e));
    }
};

/**
 * ? filter tests list according user choices
 */
function filterCat() {
    /**
     * ? Filters tests according current category request , before launching tests
     */
    if(cat.length > 0) {
        function matchFilters(test) {
            return test.tags && test.tags.includes(cat);
        }
        
        tanaguruTestsList = tanaguruTestsList.filter(matchFilters);
    }
}

function filterStatus() {
    if(statusUser.length === 0) {
        tanaguruTestsList = [];
        return;
    }

    if(isNACat(cat)) {
        tanaguruTestsList = tanaguruTestsList.map(function(test) {
            test.status = "inapplicable";
            test.na = cat;
            return test;
        });
    }

    if(!statusUser.match('untested')) {
        function matchUntested(test) {
            if(test.status && test.status === 'untested') {
                return false;
            } else {
                return true;
            }
        }
        
        tanaguruTestsList = tanaguruTestsList.filter(matchUntested);
    }

    if(!statusUser.match('inapplicable')) {
        function matchInapplicable(test) {
            if((test.status && test.status === 'inapplicable') || (test.testStatus && test.testStatus === 'inapplicable')) {
                if(test.depStatus) {
                    let dep = false;
                    test.depStatus.forEach(e => {
                        if(statusUser.match(e)) dep = true;
                    });

                    return dep;
                } else return false;
            } else {
                return true;
            }
        }
        
        tanaguruTestsList = tanaguruTestsList.filter(matchInapplicable);
    }

    if(!statusUser.match('cantTell')) {
        function matchCantTell(test) {
            if(test.testStatus && test.testStatus === 'cantTell') {
                if(test.depStatus) {
                    let dep = false;
                    test.depStatus.forEach(e => {
                        if(statusUser.match(e)) dep = true;
                    });

                    return dep;
                } else return false;
            } else {
                return true;
            }
        }
        
        tanaguruTestsList = tanaguruTestsList.filter(matchCantTell);
    }

    if(!statusUser.match('failed')) {
        function matchFailed(test) {
            if(test.testStatus && test.testStatus === 'failed') {
                if(test.depStatus) {
                    let dep = false;
                    test.depStatus.forEach(e => {
                        if(statusUser.match(e)) dep = true;
                    });

                    return dep;
                } else return false;
            } else {
                return true;
            }
        }
        
        tanaguruTestsList = tanaguruTestsList.filter(matchFailed);
    }

    if(!statusUser.match('passed')) {
        function matchPassed(test) {
            if(test.testStatus && test.testStatus === 'passed') {
                if(test.depStatus) {
                    let dep = false;
                    test.depStatus.forEach(e => {
                        if(statusUser.match(e)) dep = true;
                    });

                    return dep;
                } else return false;
            } else {
                return true;
            }
        }
        
        tanaguruTestsList = tanaguruTestsList.filter(matchPassed);
    }

    if(!statusUser.match('passed') && !statusUser.match('failed')) {
        function matchPassedFailed(test) {
            if(test.expectedNbElements) {
                if(test.depStatus) {
                    test.depStatus.forEach(e => {
                        if(statusUser.match(e)) return true;
                    });
                }

                return false;
            } else {
                return true;
            }
        }
        
        tanaguruTestsList = tanaguruTestsList.filter(matchPassedFailed);
    }
}

/**
 * ? check if tab order = dom order
 */
function domTab(arr) {
    var relaunch = false;
    for(let i = 0; i < arr.length; i++) {
        var pos = parseInt(arr[i].el.getAttribute('data-tng-interactive-pos'));

        if(pos != i) {
            arr[i].el.setAttribute('data-tng-tab-dom-error', 'true');
            arr = arr.splice(pos, 0, arr.splice(i, 1)[0]);
            relaunch = true;
            break;
        }
    }

    if(relaunch) domTab(arr);
}

/**
 * ? check the pertinence of visual tab order
 */
function visualTab(arr) {
    var segments = [];
    var coords = [];

    for(let i = 0; i < arr.length; i++) {
        if(i === 0) continue;

        let previous = arr[i-1];
        let current = arr[i];

        segments.push({
            a: {x: (previous.prop.position.left), y: (previous.prop.position.top+previous.prop.position.bottom)/2, el: previous.el},
            b: {x: (current.prop.position.left), y: (current.prop.position.top+current.prop.position.bottom)/2, el: current.el}
        });

        coords.push({
            a: {
                x: (previous.prop.position.left >= 0 ? previous.prop.position.left : 0),
                y: (previous.prop.position.top+previous.prop.position.bottom)/2 >= 0 ? (previous.prop.position.top+previous.prop.position.bottom)/2 : 18,
                error: false, visible: previous.prop.visible
            },
            b: {
                x: (current.prop.position.left >= 0 ? current.prop.position.left : 0),
                y: (current.prop.position.top+current.prop.position.bottom)/2 >= 0 ? (current.prop.position.top+current.prop.position.bottom)/2 : 18,
                error: false, visible: current.prop.visible
            }
        });
    }

    for(let i = 0; i < segments.length; i++) {
        if(i === 0 || segments[i].a.el.hasAttribute('data-tng-tab-visual-error') || segments[i].b.el.hasAttribute('data-tng-tab-visual-error')) continue;

        var previousSegments = segments.slice(0, i);

        for(let x = 0; x < previousSegments.length; x++) {
            if(getIntersectionPoint(previousSegments[x].a, previousSegments[x].b, segments[i].a, segments[i].b)) {
                if(previousSegments[x].a.el.hasAttribute('data-tng-tab-visual-error') || previousSegments[x].b.el.hasAttribute('data-tng-tab-visual-error')) continue;

                let a1x = previousSegments[x].a.x;
                let a1y = previousSegments[x].a.y;
                let b1x = previousSegments[x].b.x;
                let b1y = previousSegments[x].b.y;
                let a2x = segments[i].a.x;
                let a2y = segments[i].a.y;
                let b2x = segments[i].b.x;
                let b2y = segments[i].b.y;

                if(a1x >= b1x && a1y >= b1y) {
                    previousSegments[x].a.el.setAttribute('data-tng-tab-visual-error', 'true');
                    coords[x].a.error = true;
                    if(x !== 0) coords[x-1].b.error = true;
                } else if(a2x >= b2x && a2y >= b2y) {
                    segments[i].a.el.setAttribute('data-tng-tab-visual-error', 'true');
                    coords[i].a.error = true;
                    if(i !== 0) coords[i-1].b.error = true;
                    break;
                } else if(b1x >= a2x && b1y >= a2y){
                    previousSegments[x].b.el.setAttribute('data-tng-tab-visual-error', 'true');
                    coords[x].b.error = true;
                    if(x !== coords.length-1) coords[x+1].a.error = true;
                    break;
                } else if(previousSegments[x].b.el === segments[i].a.el) {
                    segments[i].a.el.setAttribute('data-tng-tab-visual-error', 'true');
                    coords[i].a.error = true;
                    if(i !== 0) coords[i-1].b.error = true;
                    break;
                } else {
                    segments[i].b.el.setAttribute('data-tng-tab-visual-error', 'true');
                    coords[i].b.error = true;
                    if(i !== coords.length-1) coords[i+1].a.error = true;
                    break;
                }
            }
        }
    }

    return coords;
}

/**
 * ? calculates the intersection point between 2 segments
 */
function getIntersectionPoint(a, b, c, d) {
    var u = {x: b.x - a.x, y: b.y - a.y};
    var v = {x: d.x - c.x, y: d.y - c.y};
    var div = u.x * v.y - v.x * u.y;

    if(div === 0) {
        //* les droites sont colinéaires
        if(a.x === b.x) {
            //* ab est verticale
            if(a.x === c.x) {
                //* ab et cd sont confondues
                let startAB = a.y < b.y ? a.y : b.y;
                let endAB = a.y < b.y ? b.y : a.y;
                let startCD = c.y < d.y ? c.y : d.y;
                let endCD = c.y < d.y ? d.y : c.y;

                //*? teste si [ab] et [cd] sont confondus
                if(startAB < c.y && c.y < endAB) return true;
                else if(startAB < d.y && d.y < endAB) return true;
                else if(startCD < a.y && a.y < endCD) return true;
                else if(startCD < b.y && b.y < endCD) return true;
            }
        } else {
            var m_ab = (b.y - a.y) / (b.x - a.x);
            var p_ab = m_ab === 0 ? a.y : a.y - m_ab * a.x;

            var m_cd = (d.y - c.y) / (d.x - c.x);
            var p_cd = m_cd === 0 ? c.y : c.y - m_cd * c.x;

            if(p_ab === p_cd) {
                //* ab et cd sont confondues
                let startAB = a.x < b.x ? a.x : b.x;
                let endAB = a.x < b.x ? b.x : a.x;
                let startCD = c.x < d.x ? c.x : d.x;
                let endCD = c.x < d.x ? d.x : c.x;

                //*? teste si [ab] et [cd] sont confondus
                if(startAB < c.x && c.x < endAB) return true;
                else if(startAB < d.x && d.x < endAB) return true;
                else if(startCD < a.x && a.x < endCD) return true;
                else if(startCD < b.x && b.x < endCD) return true;
            }
        }
    } else {
        //* les droites sont sécantes
        var param1 = ((u.x * a.y) - (u.x * c.y) - (u.y * a.x) + (u.y * c.x)) / div;
        var param2 = ((v.x * a.y) - (v.x * c.y) - (v.y * a.x) + (v.y * c.x)) / div;
    
        if(param1 > 0 && param1 < 1 && param2 > 0 && param2 < 1) {
            //* l'intersection est sur le segment
            //? point d'intersection = {x: a.x + param1 * u.x, y: a.y + param1 * u.y}
            return true;
        }
    }

    return false;
}

/**
 * ? launch tests
 */
function launchTests() {
    var testsLength = tanaguruTestsList.length;

    for (var i = 0; i < testsLength; i++) {
        /*
            Schéma des clefs :
            testIdName
            testIdExplanationsPassed
            testIdExplanationsFailed
            testIdExplanationsCantTell
            ---
            name: '',
            explanations: { 'passed': '', 'failed': '' }
        */
        var test = tanaguruTestsList[i];

        if (test.hasOwnProperty('name') && test.name.startsWith("locale__")) {
            test.name = chrome.i18n.getMessage(test.name.split("locale__")[1]);
        }

        if (test.hasOwnProperty('description') && test.description.startsWith("locale__")) {
            test.description = chrome.i18n.getMessage(test.description.split("locale__")[1]);
        }

        if (test.hasOwnProperty('explanations')) {
            if(test.explanations["passed"].startsWith("locale__")) {
                test.explanations["passed"] = chrome.i18n.getMessage(test.explanations["passed"].split("locale__")[1]);
            }

            if(test.explanations["failed"].startsWith("locale__")) {
                test.explanations["failed"] = chrome.i18n.getMessage(test.explanations["failed"].split("locale__")[1]);
            }
        }

        if (!test.hasOwnProperty('name')) {
            if (!test.hasOwnProperty('id')) continue;
            test.name = chrome.i18n.getMessage('test' + test.id + 'Name');
        }

        if (!test.hasOwnProperty('explanations') && test.hasOwnProperty('id')) {
            var explanations = [];
            for (var j = 0; j < statuses.length; j++) {
                var statusname = statuses[j];
                statusname = statusname[0].toUpperCase() + statusname.substring(1);
                var message = chrome.i18n.getMessage('test' + test.id + 'Explanations' + statusname);
                if (message) {
                    explanations.push({ id: statuses[j], text: message });
                }
            }
            if (explanations.length > 0) {
                test.explanations = {};
                for (var j = 0; j < explanations.length; j++) {
                    test.explanations[explanations[j].id] = explanations[j].text;
                }
            }
        }

        createTanaguruTest(test);
    }
}

if(first === "yes") {
    if(document.querySelector('[sdata-tng-hindex]')) cleanSDATA();

    // localStorage.setItem("DOM", JSON.stringify(getElementProperties(document.documentElement, 1, null, null)));
    // DOM_archi = JSON.parse(localStorage.getItem("DOM"));

    getElementProperties(document.documentElement, 1, null, null);

    interactivesError = interactives.filter(e => (e.prop.role && e.prop.role != "application" && e.prop.role != "option") && !e.prop.tab && e.prop.interactive);
    interactivesError.forEach(e => e.el.setAttribute('data-tng-interactive-notab', 'true'));

    var tablist = interactives.filter(e => e.prop.tab).sort((a, b) => b.el.tabIndex - a.el.tabIndex);
    var realTabOrder = tablist.slice(0).filter(e => true);

    localStorage.setItem("TAB", JSON.stringify(Object.assign({}, visualTab(realTabOrder))));

    domTab(tablist);
    getHeadingsMap();
}

var textNodeList = (cat !== 'colors') ? null : getTextNodeContrast();

filterCat();
filterStatus();
launchTests();
filterAllTestsByStatus();
removeAllDataTNG();
loadTanaguruTests();
