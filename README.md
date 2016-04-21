canvas-to-tiff
==============

Converts a HTML5 canvas bitmap to a TIFF file (blob, data-uri, typed array)
that can be saved on user's computer or transferred to a server.

The TIFF file is standard compliant (baseline) and support RGB + alpha
channel as well as compression at various compression levels, with option 
for byte-order (big-endian or little-endian).


Features
--------

- Fast and small!
- All operations are asynchronous and non-blocking
- Supports alpha channel
- Supports ZIP compression (default)
- Can convert directly to ArrayBuffer
- Can convert directly to Blob
- Can convert directly to Data-URI
- Can save both in big-endian (default) or little-endian byte order.
- Arbitrary DPI for both X and Y directions can be set.
- Documented source incl. HTML version (see docs/ folder)
- Works with all major browsers incl. IE
- No dependencies


Install
-------

**canvas-to-tiff** can be installed in various ways:

- Bower: `bower install canvas-to-tiff`
- Git using HTTPS: `git clone https://github.com/epistemex/canvas-to-tiff.git`
- Git using SSH: `git clone git@github.com:epistemex/canvas-to-tiff.git`
- Download [zip archive](https://github.com/epistemex/canvas-to-tiff/archive/master.zip) and extract.
- [canvastotiff.min.js](https://raw.githubusercontent.com/epistemex/canvas-to-tiff/master/canvastotiff.min.js)


Usage
-----

**canvas-to-tiff** is easy to use. Just include the script in header 
or before the script section in your HTML file.

To convert the canvas to a TIFF file, call:

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

Also see demos/test.html for sample use of compression and byte-order options.

**NOTE:** Cross-Origin Resource Sharing (CORS) requirements must be fulfilled.


Issues
------

See the [issue tracker](https://github.com/epistemex/canvas-to-tiff/issues) for details.


Related
-------

- [canvas-to-bmp](https://github.com/epistemex/canvas-to-bmp)


Credits
-------

- The [pako deflate compression code](https://github.com/nodeca/pako) was written by Andrey Tupitsin (@anrd83) and Vitaly Puzrin (@puzrin)


License
-------

Released under [MIT license](http://choosealicense.com/licenses/mit/). You may use this class in both commercial and non-commercial projects provided that full header (minified and developer versions) is included.


*&copy; Epistemex 2015-2016*
 
![Epistemex](http://i.imgur.com/wZSsyt8.png)
