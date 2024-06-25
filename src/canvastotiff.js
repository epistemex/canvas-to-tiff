/*!
	canvas-to-tiff 2.0.0
	(c) epistemex 2015-2016, 2024
	MIT License
	Multi-page support by Elias Khoury: 31/08/2016
*/

'use strict';

/**
 * Static function to convert a CORS-compliant canvas context
 * to a 32-bits TIFF file (buffer, Blob and data-URI).
 *
 * The TIFF is by default saved in big-endian format as interleaved RGBA
 * and ZIP compressed data.
 *
 * @type {{toArrayBuffer: Function, toBlob: Function, toDataURL: Function}}
 * @namespace
 */
const CanvasToTIFF = {

  /**
   * @private
   */
  _dly: 7,

  /**
   * Convert a canvas to an ArrayBuffer representing a TIFF file.
   * Includes the alpha channel. The call is asynchronous so a callback
   * must be provided. The image data is ZIP compressed by default.
   *
   * Note that CORS requirements must be fulfilled.
   *
   * @param {HTMLCanvasElement|Array} canvases - a single or an array of canvas elements to export
   * @param {function} callback - called when conversion is done. Argument is ArrayBuffer
   * @param {object} [options] - an option object
   * @param {boolean} [options.compress=true] - enable ZIP compression (requires ezlib deflate - if not available it will revert gracefully to uncompressed)
   * @param {number} [options.compressionLevel=6] - if compression is enabled, defined compression level [0, 9] where 9 is best/slowest.
   * @param {boolean} [options.littleEndian=false] - set to true to produce a little-endian based TIFF
   * @param {number} [options.dpi=96] - DPI for both X and Y directions. Default 96 DPI (PPI).
   * @param {number} [options.dpiX=96] - DPI for X directions (overrides options.dpi).
   * @param {number} [options.dpiY=96] - DPI for Y directions (overrides options.dpi).
   * @param {function} [options.onError] - Set error handler
   * @static
   */
  toArrayBuffer: function(canvases, callback, options) {

    options = Object.assign({}, options);

    const me = this;
    const images = [];
    const offsetList = [];
    const sid = 'canvas-to-tiff 2.0\0';
    const lsb = !!options.littleEndian;
    const dpiX = +(options.dpiX || options.dpi || 96) | 0;
    const dpiY = +(options.dpiY || options.dpi || 96) | 0;
    const canDeflate = typeof ezlib !== 'undefined' && typeof ezlib.Deflate !== 'undefined';
    const compLevel = typeof options.compressionLevel === 'number' ? Math.max(0, Math.min(9, options.compressionLevel)) : 6;

    let iOffset = 258;
    let pos = 0;
    let offset = 0;
    let IFDOffset = 8;
    let entries = 0;
    let ctx, idata;

    if (Array.isArray(canvases)) {
      for(const c of canvases) {
        images.push(extractData(c, this));
      }
    }
    else {
      images.push(extractData(canvases, this));
    }
    finish(images);

    function extractData(canvas) {
      const w = canvas.width;
      const h = canvas.height;
      let result = null;

      // Check if we can obtain a 2D context for canvas
      ctx = canvas.getContext('2d');

      if ( !ctx ) {
        // could not get a 2D context, make a new internal canvas
        ctx = document.createElement('canvas').getContext('2d');
        if ( ctx ) {
          ctx.canvas.width = w;
          ctx.canvas.height = h;
          ctx.drawImage(canvas, 0, 0);
        }
        else {
          if ( options.onError ) {
            options.onError({ msg: 'Cannot obtain a 2D context.' });
          }
        }
      }

      // Get image data
      idata = (function(ctx) {
        try {
          return ctx.getImageData(0, 0, w, h);	// throws security error (18) if canvas is tainted
        }
        catch(err) {
          if ( options.onError ) options.onError({ msg: err.toString() });
        }
      })(ctx);

      // Compress data if compression is enabled / available
      if ( canDeflate && (typeof options.compress === 'boolean' ? options.compress : true) ) {
        ezlib.deflateAsync(idata.data, { level: compLevel }, function(e) {
          result = e.result;
        }, function(e) {
          if ( options.onError ) options.onError(e);
        });

      }
      else result = idata;

      return {
        'result': result,
        'w'     : w,
        'h'     : h
      };
    }

    // Build TIFF file
    function finish(results) {

      let fileLength = 0;

      // Calculate total file length
      for(const image of results) {
        fileLength += image.result.length ? image.result.length + iOffset : image.result.data.length + iOffset;
      }

      const file = new ArrayBuffer(fileLength);
      const file8 = new Uint8Array(file);
      const view = new DataView(file);

      // Header
      set16(lsb ? 0x4949 : 0x4d4d);      // II or MM
      set16(42);                         // magic 42
      set32(IFDOffset);                       // offset to first IFD

      for(let i = 1; i <= results.length; i++) {
        const image = results[ i - 1 ];
        const length = image.result.length ? image.result.length : image.result.data.length;
        const imageData = image.result.length ? image.result : image.result.data;
        const nextIFD = length + iOffset;

        // Reset entries for every IFD
        entries = 0;
        offsetList.length = 0;

        // IFD
        addIFD();                                                               // IFD start
        addEntry(0xfe, 4, 1, 0);                          // NewSubfileType
        addEntry(0x100, 4, 1, image.w);                         // ImageWidth
        addEntry(0x101, 4, 1, image.h);                         // ImageLength (height)
        addEntry(0x102, 3, 4, offset, 8);               // BitsPerSample
        addEntry(0x103, 3, 1, image.result.length ? 8 : 1); // Compression (ZIP or raw)
        addEntry(0x106, 3, 1, 2);                         // PhotometricInterpretation: RGB
        addEntry(0x111, 4, 1, iOffset, 0);             // StripOffsets
        addEntry(0x115, 3, 1, 4);                         // SamplesPerPixel
        addEntry(0x117, 4, 1, length);                          // StripByteCounts
        addEntry(0x11a, 5, 1, offset, 8);               // XResolution
        addEntry(0x11b, 5, 1, offset, 8);               // YResolution
        addEntry(0x128, 3, 1, 2);                         // ResolutionUnit: inch
        addEntry(0x131, 2, sid.length, offset, getStrLen(sid));       // sid
        addEntry(0x132, 2, 0x14, offset, 0x14);        // Datetime
        addEntry(0x152, 3, 1, 2);                         // ExtraSamples
        (i === results.length) ? endIFD() : endIFD(nextIFD);                    // write offset to the next IFD if there is another image

        // Fields section > long ---------------------------

        // BitsPerSample (2x4), 8,8,8,8 (RGBA)
        set32(0x80008);
        set32(0x80008);

        // XRes PPI
        set32(dpiX);
        set32(1);

        // YRes PPI
        set32(dpiY);
        set32(1);

        // sid
        setStr(sid);

        // date
        setStr(getDateStr());

        file8.set(imageData, iOffset);

        // Need to calculate the offsets for the next IFD, strip, and image.
        pos += length;            // Start writing the next IFD after the image data
        iOffset += length + 250;  // The strip offsets for the next IFD
        offset += length + 186;   // The offset for the long values for the next IFD
      }

      // make call async
      setTimeout(function() { callback(file); }, me._dly);
      return 0;

      function getDateStr() {
        const d = new Date();
        return d.getFullYear() + ':' + pad2(d.getMonth() + 1) + ':' + pad2(d.getDate()) + ' '
          + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());

        function pad2(v) {return v < 10 ? '0' + v : v;}
      }

      // helper method to move current buffer position
      function set16(data) {
        view.setUint16(pos, data, lsb);
        pos += 2;
      }

      function set32(data) {
        view.setUint32(pos, data, lsb);
        pos += 4;
      }

      function setStr(str) {
        let i = 0;
        while( i < str.length ) view.setUint8(pos++, str.charCodeAt(i++) & 0xff);
        if ( pos & 1 ) pos++;
      }

      function getStrLen(str) {
        let l = str.length;
        return l & 1 ? l + 1 : l;
      }

      function addEntry(tag, type, count, value, dltOffset) {
        set16(tag);
        set16(type);
        set32(count);

        if ( dltOffset ) {
          offset += dltOffset;
          offsetList.push(pos);
        }

        if ( count === 1 && type === 3 && !dltOffset ) {
          set16(value);
          set16(0);
        }
        else
          set32(value);

        entries++;
      }

      function addIFD(offset) {
        IFDOffset = offset || pos;
        pos += 2;
      }

      function endIFD(nextImage) {
        view.setUint16(IFDOffset, entries, lsb);
        nextImage ? set32(nextImage) : set32(0);
        //set32(0);

        const delta = 14 + entries * 12;			 // 14 = offset to IFD (8) + IFD count (2) + end pointer (4)

        // compile offsets
        for(let i = 0, p, o; i < offsetList.length; i++) {
          p = offsetList[ i ];
          o = view.getUint32(p, lsb);
          view.setUint32(p, o + delta, lsb);
        }
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
      callback(new Blob([ file ], { type: 'image/tiff' }));
    }, options);
  },

  /**
   * Converts a canvas to TIFF file, returns an ObjectURL (for Blob)
   * representing the file. The call is asynchronous so a callback
   * must be provided.
   *
   * When no longer needed the Object-URL should be revoked to release
   * memory:
   *
   *     (window.URL || window.webkitURL).revokeObjectURL(url);
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
      callback((window.URL || window.webkitURL).createObjectURL(blob));
    }, options);
  },

  /**
   * Converts the canvas to a data-URI representing a TIFF file. The
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
    this.toBlob(canvas, function(blob) {
      const fr = new FileReader();
      fr.onload = function() {callback(fr.result);};
      fr.onerror = function() {
        if ( options && options.onError )
          options.onError({ msg: 'Error converting data to Data-URI.' });
      };
      fr.readAsDataURL(blob);
    }, options);
  }
};
