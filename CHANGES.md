<!-- vim:ts=4:sts=4:sw=4:et:tw=60 -->

## 2.0.4

Streams:

 - Added support for progress observers on readable stream `read` promise.

File system:

 - Added support for `targetFs` argument to `copy` and `copyTree`.
 - Fixed `canonical` by implementing in JavaScript based on `readLink`.
   Depending on Node.js `realpath` was an error since realpath does not handle
   path remainders.
 - Fixed rerooted base file systems.
 - Quietly added `rejoin` to file system, for reversing `split` properly.
   Must consider finding a better narrative about `join`, `absolute`, `split`
   and the distinguishing of relative and absolute paths in their split form,
   as well as handling the issue of drive letters for Windows properly.

HTTP:

 - Server request's now decode `pathInfo` on demand.
   If the encoding is invalid, accessing `pathInfo` will throw an error.
   This change makes it possible to receive requests with file names.
   Using an accessor is questionable.
   A future release might elect to pass `null` for path info if it does not
   parse properly.
 - File service now uses the configured `listDirectory` function if overridden.
 - The client now supports requests with all of the same properteis as the
   options that can be passed to the Node.js request function.

## 2.0.2

 - Fixed problems with hanging connections, and problems with early termination
   of streams.
 - Added missing `node` property to Node writable stream wrapper.
 - Removed `Reader.join`. Removed support for `Reader.prototype.join`.
   Use `Reader(x).read()` and `Buffer.concat(buffers)`.
 - Added `node/process` process stream wrapper.
 - HTTP client now warns when there is a missing host header.
 - Fix problem with HTTP agent option with Node.js v0.11.
 - Refactored file system to use prototype inheritance pattern
   instead of Crockford style closure constructors.
 - Merged changes from v1 for HTTP request normalization.
 - Added support for response.statusText

## 2.0.1

 - Fixed URL dependency.

## 2.0.0 :warning:

 - Rebased on next generation of Q and Collections
 - Reimplements streams. Streams now support back pressure and are consumed on
   demand. Streams must be expressly cancelled or they will stay open
   indefinitely, or until a connection timeout.

## 1.11.0

 - Adds `removeDirectory` and `statLink` to the Mock file system interface.

## 1.10.7-8

 - Fixes support for range content requests, such that Q-IO based web serves can
   host static audio and video content to the web. Further work needed for the
   more escoteric non-contiguous multi-range requests.
 - Allow `copyTree` to write over existing trees. (@nerfin)

## 1.10.6

 - Restores the "request.terms.host" property to report which host pattern was
   selected by a host negotiator.

## 1.10.5

 - Fixes support for host negotiation.

## 1.10.4

 - Fixes the `followInsecureSymbolicLinks` flag on the file tree HTTP
   app. (@francoisfrisch)
 - Fixes an error that gets missed when an HTTP request body is not
   a proper forEachable. (@OliverJAsh)

## 1.10.3

 - Fix support of Node 0.6 path separators (@Sevinf)

## 1.10.2

 - Fix remoteTree for directories containing symbolic links.
 - Tolerate "." in makeTree
 - Stream writers now return reliable promises for finishing and flushing.

## 1.10.0

 - Add support for HTTP agents (@yuxhuang)

## 1.9.4

 - Updated dependencies

## 1.9.3

 - Fixes a regression in supporting `FS.read(path, "b")`.

## 1.9.2

 - Fixes `append` and aligns open flags with the underlying Node, except for
   the default of UTF-8 if bytewise is not specified in the mode flag.
 - Add `node` property to `Reader`, as advertised.
 - Bug fixes

## 1.9.1

 - Brings the mock file system API up to date with file system as of 1.9.0.

## 1.9.0

 - Distinguishes `move` and `rename`.  `move` will work across file system
   boundaries.

## 1.8.0

 - Allows `move` to overwrite the target, or overwrite a target directory if
   empty.

## 1.7.2

 - Fixes JSON content HTTP responses.

## 1.7.1

 - Fixes a bug in the HTTP redirect trap.

## 1.7.0

 - Added FileTree option followInsecureSymbolicLinks (@francoisfrisch)

## 0.0.12

 - Addressed Node 0.7.* compatibility. (@strager)
 - Synchronized Q to 0.8.2.

## 0.0.11

 - Synchronized Q dependency.

## 0.0.10

 - Removed spurious log message.

## 0.0.9

 - Fixed a bug in observing the closing of files. (#1, @hornairs)

## 0.0.8

 - Reorganized, moved q-io to the top level.
 - Reved dependencies.
 - Moved q-io-buffer to its own project.

## 0.0.3

 - reved up Q to version 0.2 so duck-promises will work

## 0.0.2

 - added buffer-io
 - added buffer mode to readers and writers

## 0.0.1

 - fixed dependency on broken q package
 - restructured for overlay style packaging compatibility

