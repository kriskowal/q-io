
[![Build Status](https://secure.travis-ci.org/kriskowal/q-io.png)](http://travis-ci.org/kriskowal/q-io)

# Q-IO

Interfaces for IO that make use of promises.

Q-IO now subsumes all of [Q-HTTP][] and [Q-FS][].

[Q-HTTP]: https://github.com/kriskowal/q-http
[Q-FS]: https://github.com/kriskowal/q-fs

The Q-IO package does not export a main module.  You must reach in
directly for `q-io/fs`, `q-io/http`, and `q-io/http-apps`.

## Filesystem

```javascript
var FS = require("q-io/fs");
```

File system API for Q promises with method signatures patterned after
[CommonJS/Fileystem/A](http://wiki.commonjs.org/wiki/Filesystem/A) but
returning promises and promise streams.

### open(path, options)

Options is an optional object.

-   ``flags``: ``r``, ``w``, ``a``, ``b``, default of `r`, not binary
-   ``charset``: default of ``utf-8``
-   ``bufferSize``: in bytes
-   ``mode``: UNIX permissions
-   ``begin`` first byte to read (defaults to zero)
-   ``end`` one past the last byte to read.  ``end - begin == length``

Open returns a promise for either a Reader or a Writer depending on the
given flags.

### read(path, options)

### write(path, content, options)

### append(path, content, options)

### copy(source, target)

### copyTree(source, target)

### list(path)

### listTree(path, guard(path, stat))

### listDirectoryTree(path)

### makeDirectory(path)

### makeTree(path)

### remove(path)

### removeTree(path)

### move(source, target)

### link(source, taget)

### symbolicCopy(source, target)

### symbolicLink(target, relative, type)

### chown(path, uid, gid)

### chmod(path, mode)

### stat(path)

### statLink(path)

### statFd(fd)

### exists(path)

### isFile(path)

### isDirectory(path)

### lastModified(path)

### split(path)

### join(paths)

### join(...paths)

### resolve(...paths)

### normal(...paths)

### absolute(path)

### canonical(path)

### readLink(path)

### contains(parent, child)

### relative(source, target)

### relativeFromFile(source, target)

### relativeFromDirectory(source, target)

### isAbsolute(path)

### isRelative(path)

### isRoot(path)

### root(path)

### directory(path)

### base(path, extension)

### extension(path)

### reroot(path)

### toObject(path)

### glob(pattern)

Not yet implemented

### match(pattern, path)

Not yet implemented

## Mock Filesystem

Q-IO provides a mock filesystem interface. The mock filesystem has the
same interface as the real one and has most of the same features, but
operates on a purely in-memory, in-process, in-javascript filesystem.

A mock filesystem can be created from a data structure. Objects are
directories.  Keys are paths.  A buffer is a file’s contents.  Anything
else is coerced to a string, then to a buffer in the UTF-8 encoding.

```javascript
var MockFs = require("q-io/fs-mock");
var mockFs = MockFs({
    "a": {
        "b": {
            "c.txt": "Content of a/b/c.txt"
        }
    },
    "a/b/d.txt": new Buffer("Content of a/b/d.txt", "utf-8")
})
```

You can also instantiate a mock file system with the content of a
subtree of a real file system.  You receive a promise for the mock
filesystem.

```javascript
var FS = require("q-io/fs");
FS.mock(__dirname)
.then(function (fs) {
    //
})
.done();
```

## HTTP

The HTTP module resembles [CommonJS/JSGI][].

```javascript
var HTTP = require("q-io/http");
```

[CommonJS/JSGI]: http://wiki.commonjs.org/wiki/JSGI

### Server(app)

The `http` module exports a `Server` constructor.

-   accepts an application, returns a server.
-   calls the application function when requests are received.
    -   if the application returns a response object, sends that
        response.
-   ``listen(port)``
    -   accepts a port number.
    -   returns a promise for undefined when the server has begun
        listening.
-   ``stop()``
    -   returns a promise for undefined when the server has stopped.

### request(request object or url)

The `http` module exports a `request` function that returns a promise
for a response.

-   accepts a request or a URL string.
-   returns a promise for a response.

### read(request object or url)

The `http` module exports a `read` function, analogous to
`Fs.read(path)`, but returning a promise for the contento of an OK HTTP
response.

-   accepts a request or a URL string.
-   returns a promise for the response body as a string provided
    that the request is successful with a 200 status.
    -   rejects the promise with the response as the reason for
        failure if the request fails.

### normalizeRequest(request object or url)

-   coerces URLs into request objects.
-   completes an incomplete request object based on its `url`.

### normalizeResponse(response)

-   coerces strings, arrays, and other objects supporting
    ``forEach`` into proper response objects.
-   if it receives `undefined`, it returns `undefined`.  This is used as
    a singal to the requester that the responder has taken control of
    the response stream.

### request

A complete request object has the following properties.

-   ``url`` the full URL of the request as a string
-   ``path`` the full path as a string
-   ``scriptName`` the routed portion of the path, like ``""`` for
    ``http://example.com/`` if no routing has occurred.
-   ``pathInfo`` the part of the path that remains to be routed,
    like ``/`` for ``http://example.com`` or ``http://example.com/``
    if no routing has occurred.
-   ``version`` the requested HTTP version as an array of strings.
-   ``method`` like ``"GET"``
-   ``scheme`` like ``"http:"``
-   ``host`` like ``"example.com"``
-   ``port`` the port number, like ``80``
-   ``remoteHost``
-   ``remotePort``
-   ``headers``
    corresponding values, possibly an array for multiple headers
    of the same name.
-   ``body``
-   ``node`` the wrapped Node request object

### response

A complete response object has the following properties.

-   ``status`` the HTTP status code as a number, like ``200``.
-   ``headers``
-   ``body`` an IO reader
-   ``onclose`` is an optional function that this library will call
    when a response concludes.
-   ``node`` the wrapped Node response object.

### headers

Headers are an object mapping lower-case header-names to corresponding
values, possibly an array for multiple headers of the same name, for
both requests and responses.

### body

body is a representation of a readable stream, either for the content of
a request or a response.  It is implemented as a Q-IO reader.

-   ``forEach(callback)``
    -   accepts a ``callback(chunk)`` function
        -   accepts a chunk as either a string or a ``Buffer``
        -   returns undefined or a promise for undefined when the
            chunk has been flushed.
    -   returns undefined or a promise for undefined when the stream
        is finished writing.
    -   the ``forEach`` function for arrays of strings or buffers is
        sufficient for user-provided bodies
-   the ``forEach`` function is the only necessary function for
    bodies provided to this library.
-   in addition to ``forEach``, bodies provided by this library
    support the entire readable stream interface provided by
    ``q-io``.
-   ``read()``
    -   returns a promise for the entire body as a string or a
        buffer.

### application

An HTTP application is a function that accepts a request and returns a
response.  The `request` function itself is an application.
Applications can be chained and combined to make advanced servers and
clients.

-   accepts a request
-   returns a response, a promise for a response, or nothing if no
    response should be sent.

## Reader

Reader instances have the following methods:

-   `read()`
-   `forEach(callback)`
-   `close()`
-   `node` the underlying node reader

Additionally, the `Reader` constructor has the following methods:

-   `read(tream, charset)` accepts any foreachable and returns either a
    buffer or a string if given a charset.
-   `join(buffers)` consolidates an array of buffers into a single
    buffer.  The buffers array is collapsed in place and the new first
    and only buffer is returned.

The `reader` module exports a function that accepts a Node reader and
returns a Q reader.

## Writer

Writer instances have the following methods:

-   `write(content)` writes a chunk of content, either from a string or
    a buffer.
-   `flush()` returns a promise to drain the outbound content all the
    way to its destination.
-   `close()`
-   `destroy()`
-   `node` the underlying node writer

The `writer` module exports a function that accepts a Node writer and
returns a Q writer.

# HTTP Applications

The HTTP applications module provides a comprehensive set of JSGI-alike
middleware.

```javascript
var Apps = require("q-io/http-apps");
```

# Coverage

Use `npm run cover` to generate and view a coverage report of Q-IO.

<table>
    <thead>
        <tr>
            <th>File</th>
            <th>Percentage</th>
            <th>Missing</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>fs-boot.js</code></td>
            <td>87%</td>
            <td>41</td>
        </tr>
        <tr>
            <td><code>fs.js</code></td>
            <td>72%</td>
            <td>100</td>
        </tr>
        <tr>
            <td><code>reader.js</code></td>
            <td>94%</td>
            <td>8</td>
        </tr>
        <tr>
            <td><code>writer.js</code></td>
            <td>91%</td>
            <td>8</td>
        </tr>
        <tr>
            <td><code>fs-common.js</code></td>
            <td>87%</td>
            <td>52</td>
        </tr>
        <tr>
            <td><code>fs-root.js</code></td>
            <td>88%</td>
            <td>11</td>
        </tr>
        <tr>
            <td><code>fs-mock.js</code></td>
            <td>91%</td>
            <td>46</td>
        </tr>
        <tr>
            <td><code>buffer-stream.js</code></td>
            <td>89%</td>
            <td>6</td>
        </tr>
        <tr>
            <td><code>http.js</code></td>
            <td>93%</td>
            <td>25</td>
        </tr>
        <tr>
            <td><code>http-apps.js</code></td>
            <td>80%</td>
            <td>286</td>
        </tr>
        <tr>
            <td><code>http-cookie.js</code></td>
            <td>79%</td>
            <td>15</td>
        </tr>
    </tbody>
</table>


---

Copyright 2009–2012 Kristopher Michael Kowal
MIT License (enclosed)

