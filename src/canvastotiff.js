/*!
	canvas-to-tiff version 1.5.3
	By Epistemex (c) 2015-2016
	www.epistemex.com
	MIT License (this header required)
*/

/**
 * Static helper object that can convert a CORS-compliant canvas context
 * to a 32-bits TIFF file (buffer, Blob and data-URI). The TIFF is by
 * default saved in big-endian format with ZIP compressed interleaved RGBA
 * data.
 *
 * @type {{toArrayBuffer: Function, toBlob: Function, toDataURL: Function}}
 * @namespace
 */
var CanvasToTIFF = {

	/**
	 * @private
	 */
	_dly: 9,

	/**
	 * @private
	 */
	_error: null,

	/**
	 * Convert a 2D canvas context to a ArrayBuffer containing a TIFF file.
	 * Includes the alpha channel. The call is asynchronous so a callback
	 * must be provided. The image data is ZIP compressed by default.
	 *
	 * Note that CORS requirements must be fulfilled.
	 *
	 * @param {HTMLCanvasElement} canvas - the canvas element to convert
	 * @param {function} callback - called when conversion is done. Argument is ArrayBuffer
	 * @param {object} [options] - an option object
	 * @param {boolean} [options.compress=true] - enable ZIP compression (requires Pako deflate - if not available it will gracefully revert to non-compressed)
	 * @param {number} [options.compressionLevel=6] - if compression is enabled, defined compression level [0, 9] where 9 is best/slowest.
	 * @param {boolean} [options.littleEndian=false] - set to true to produce a little-endian based TIFF
	 * @param {number} [options.dpi=96] - DPI for both X and Y directions. Default 96 DPI (PPI).
	 * @param {number} [options.dpiX=96] - DPI for X directions (overrides options.dpi).
	 * @param {number} [options.dpiY=96] - DPI for Y directions (overrides options.dpi).
	 * @param {function} [options.onError] - Set error handler (replaces setErrorHandler)
	 * @static
	 */
	toArrayBuffer: function(canvas, callback, options) {

		options = options || {};

		this._error = options.onError || null;

		var me = this;

		try {
			var w          = canvas.width,
				h          = canvas.height,
				offset     = 0,
				iOffset    = 258,
				entries	   = 0,
				offsetList = [],
				idfOffset,
				sid        = "\x63\x61\x6e\x76\x61\x73\x2d\x74\x6f\x2d\x74\x69\x66\x66\x20\x31\x2e\x35\0",
				lsb        = !!options.littleEndian,
				dpiX	   = +(options.dpiX || options.dpi || 96)|0,
				dpiY	   = +(options.dpiY || options.dpi || 96)|0,
				idata      = canvas.getContext("2d").getImageData(0, 0, w, h),
				pos        = 0,
				date       = new Date(),
				canDeflate = typeof pako !== "undefined" && typeof pako.deflate !== "undefined",
				compLevel  = typeof options.compressionLevel === "number" ? Math.max(0, Math.min(9, options.compressionLevel)) : 6,
				result, length, fileLength,
				file, file8, view,
				dateStr;

			// compression?
			if (typeof options.compress === "boolean" ? options.compress : true) {
				if (canDeflate)
					result = pako.deflate(idata.data, {level: compLevel});
				else
					console.warn("Cannot compress. See docs.")
			}

			length = result ? result.length : idata.data.length;
			fileLength = iOffset + length;
			file       = new ArrayBuffer(fileLength);
			file8      = new Uint8Array(file);
			view       = new DataView(file);

			// Header
			set16(lsb ? 0x4949 : 0x4d4d);							// II or MM
			set16(42);												// magic 42
			set32(8);												// offset to first IFD

			// IFD
			addIDF();												// IDF start
			addEntry(0xfe, 4, 1, 0);								// NewSubfileType
			addEntry(0x100, 4, 1, w);								// ImageWidth
			addEntry(0x101, 4, 1, h);								// ImageLength (height)
			addEntry(0x102, 3, 4, offset, 8);						// BitsPerSample
			addEntry(0x103, 3, 1, result ? 8 : 1);					// Compression (ZIP or nada)
			addEntry(0x106, 3, 1, 2);								// PhotometricInterpretation: RGB
			addEntry(0x111, 4, 1, iOffset, 0);						// StripOffsets
			addEntry(0x115, 3, 1, 4);								// SamplesPerPixel
			addEntry(0x117, 4, 1, length);							// StripByteCounts
			addEntry(0x11a, 5, 1, offset, 8);						// XResolution
			addEntry(0x11b, 5, 1, offset, 8);						// YResolution
			addEntry(0x128, 3, 1, 2);								// ResolutionUnit: inch
			addEntry(0x131, 2, sid.length, offset, getStrLen(sid));	// sid
			addEntry(0x132, 2, 0x14, offset, 0x14);					// Datetime
			addEntry(0x152, 3, 1, 2);								// ExtraSamples
			endIDF();

			// Fields section > long ---------------------------

			// BitsPerSample (2x4), 8,8,8,8 (RGBA)
			set32(0x00080008);
			set32(0x00080008);

			// XRes PPI
			set32(dpiX);
			set32(1);

			// YRes PPI
			set32(dpiY);
			set32(1);

			// sid
			setStr(sid);

			// date
			dateStr = date.getFullYear() + ":" + pad2(date.getMonth() + 1) + ":" + pad2(date.getDate()) + " ";
			dateStr += pad2(date.getHours()) + ":" + pad2(date.getMinutes()) + ":" + pad2(date.getSeconds());
			setStr(dateStr);

			// image data
			file8.set(result ? result : idata.data, iOffset);

			// make call async
			setTimeout(function() { callback(file) }, me._dly)
		}
		catch(err) {
			if (me._error) me._error(err.toString())
		}

		function pad2(str) {
			str += "";
			return str.length === 1 ? "0" + str : str
		}

		// helper method to move current buffer position
		function set16(data) {
			view.setUint16(pos, data, lsb);
			pos += 2
		}

		function set32(data) {
			view.setUint32(pos, data, lsb);
			pos += 4
		}

		function setStr(str) {
			var i = 0;
			while(i < str.length) view.setUint8(pos++, str.charCodeAt(i++) & 0xff, lsb);
			if (pos & 1) pos++
		}

		function getStrLen(str) {
			var l = str.length;
			return l & 1 ? l + 1 : l
		}

		function addEntry(tag, type, count, value, dltOffset) {
			set16(tag);
			set16(type);
			set32(count);

			if (dltOffset) {
				offset += dltOffset;
				offsetList.push(pos)
			}

			if (count === 1 && type === 3 && !dltOffset) {
				set16(value);
				set16(0)
			}
			else
				set32(value);

			entries++
		}

		function addIDF(offset) {
			idfOffset = offset || pos;
			pos += 2
		}

		function endIDF() {
			view.setUint16(idfOffset, entries, lsb);
			set32(0);

			var delta = 14 + entries * 12;			 // 14 = offset to IDF (8) + IDF count (2) + end pointer (4)

			// compile offsets
			for(var i = 0, p, o; i < offsetList.length; i++) {
				p = offsetList[i];
				o = view.getUint32(p, lsb);
				view.setUint32(p, o + delta, lsb)
			}
		}
	},

	/**
	 * Converts a canvas to TIFF file, returns a Blob representing the
	 * file. This can be used with URL.createObjectURL(). The call is
	 * asynchronous so a callback must be provided.
	 *
	 * Note that CORS requirement must be fulfilled.
	 *
	 * @param {HTMLCanvasElement} canvas - the canvas element to convert
	 * @param {function} callback - called when conversion is done. Argument is a Blob
	 * @param {object} [options] - an option object - see toArrayBuffer for details
	 * @static
	 */
	toBlob: function(canvas, callback, options) {
		this.toArrayBuffer(canvas, function(file) {
			callback(new Blob([file], {type: "image/tiff"}));
		}, options)
	},

	/**
	 * Converts a canvas to TIFF file, returns an ObjectURL (for Blob)
	 * representing the file. The call is asynchronous so a callback
	 * must be provided.
	 *
	 * **Important**: To avoid memory-leakage you must revoke the returned
	 * ObjectURL when no longer needed:
	 *
	 *     var _URL = window.URL || window.webkitURL;
	 *     _URL.revokeObjectURL(url);
	 *
	 * Note that CORS requirement must be fulfilled.
	 *
	 * @param {HTMLCanvasElement} canvas - the canvas element to convert
	 * @param {function} callback - called when conversion is done. Argument is a Blob
	 * @param {object} [options] - an option object - see toArrayBuffer for details
	 * @static
	 */
	toObjectURL: function(canvas, callback, options) {
		this.toBlob(canvas, function(blob) {
			callback((window.URL || window.webkitURL).createObjectURL(blob))
		}, options)
	},

	/**
	 * Converts the canvas to an data-URI representing a TIFF file. The
	 * call is asynchronous so a callback must be provided.
	 *
	 * Note that CORS requirement must be fulfilled.
	 *
	 * @param {HTMLCanvasElement} canvas - the canvas element to convert
	 * @param {function} callback - called when conversion is done. Argument is an data-URI (string)
	 * @param {object} [options] - an option object - see toArrayBuffer for details
	 * @static
	 */
	toDataURL: function(canvas, callback, options) {

		var me = this;

		me.toArrayBuffer(canvas, function(file) {
			var buffer = new Uint8Array(file),
				blockSize = 1<<20,
				block = blockSize,
				bs = "", base64 = "", i = 0,
				l = buffer.length;

			// This is a necessary step before we can use btoa(). We can
			// replace this later with a direct byte-buffer to Base-64 routine.
			// Will do for now, impacts only with very large bitmaps (in which
			// case toBlob() should be used).
			(function prepBase64() {

				while(i < l && block-- > 0)
					bs += String.fromCharCode(buffer[i++]);

				if (i < l) {
					block = blockSize;
					setTimeout(prepBase64, me._dly)
				}
				else {
					// convert string to Base-64
					i = 0;
					l = bs.length;
					block = 180000;		// !must be divisible by 3 -> integer

					(function toBase64() {
						base64 += btoa(bs.substr(i, block));
						i += block;
						(i < l)
							? setTimeout(toBase64, me._dly)
							: callback("data:image/tiff;base64," + base64)
					})()
				}
			})();
		}, options)
	}
};
