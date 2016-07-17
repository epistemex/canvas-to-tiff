canvas-to-tiff
==============

Converts a HTML5 canvas to a TIFF file (blob, data-uri, typed array).

The TIFF file is standard baseline compliant and support RGB + alpha
channel as well as compression at various compression levels, with option 
for byte-order (big-endian or little-endian) and DPI settings.


Features
--------

- Fast and small
- Asynchronous and non-blocking
- Supports alpha channel
- Supports ZIP compression (default but optional)
- Convert directly to `ArrayBuffer`
- Convert directly to `Blob`
- Convert directly to Data-URI
- Support both big-endian (default) and little-endian byte order
- Can set arbitrary DPI for X and Y directions
- Documented source incl. HTML version (see `docs/` folder)
- Works with all major browsers incl. IE
- No dependencies (pako zlib port if compression is wanted, but isn't required. Included).


Install
-------

- Bower: `bower install canvas-to-tiff`
- Git using HTTPS: `git clone https://github.com/epistemex/canvas-to-tiff.git`
- Git using SSH: `git clone git@github.com:epistemex/canvas-to-tiff.git`
- Download [zip archive](https://github.com/epistemex/canvas-to-tiff/archive/master.zip) and extract.
- [canvastotiff.min.js](https://raw.githubusercontent.com/epistemex/canvas-to-tiff/master/canvastotiff.min.js)


Usage
-----

Include the script in header or before the script section in your HTML file.

To convert the canvas to a TIFF file:
```Javascript
CanvasToTIFF.toDataURL(canvas, function(uri) {
	// uri is a Data-URI that can be used as source for images etc.
	// uri = "data:image/tiff;base64, ...etc...";
});
```

A faster option to Data-URIs is using Blobs:
```Javascript
CanvasToTIFF.toBlob(canvas, function(blob) {
	// blob object can be converted to an objectURL and then
	// set as source for images, or as download target:
	var url = URL.createObjectURL(blob);
});
```

For convenience, a direct Canvas to ObjectURL method is included:
```Javascript
CanvasToTIFF.toObjectURL(canvas, function(url) {
	// can be used as source for image or download target
});
```

To convert it to an ArrayBuffer that can be sent over the net:
```Javascript
CanvasToTIFF.toArrayBuffer(canvas, function(buffer) {
	// buffer is ArrayBuffer with the TIFF file
});
```

Also see `demos/test.html` for sample use of compression and byte-order 
options.

**NOTE:** As with ordinary canvas Cross-Origin Resource Sharing (CORS) 
requirements must be fulfilled.

Tip: The pako zlib library can be (and is) included to support ZIP compression.
It can be left out to reduce code size. CanvasToTIFF will adopt automatically 
and accordingly if not found and produce uncompressed TIFF files instead.


Issues
------

See the [issue tracker](https://github.com/epistemex/canvas-to-tiff/issues) for details.


Related
-------

- [canvas-to-bmp](https://github.com/epistemex/canvas-to-bmp)


Contributors
------------

See contributors [here](https://github.com/epistemex/canvas-to-tiff/graphs/contributors)


Credits
-------

- [pako deflate compression code](https://github.com/nodeca/pako) by Andrey Tupitsin (@anrd83) and Vitaly Puzrin (@puzrin)


License
-------

Released under [MIT license](http://choosealicense.com/licenses/mit/). You may use this class in both commercial and non-commercial projects provided that full header (minified and developer versions) is included.


*&copy; Epistemex 2015-2016*
 
![Epistemex](http://i.imgur.com/wZSsyt8.png)
