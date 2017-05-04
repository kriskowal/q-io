var normalizeRequest = require("../../http").normalizeRequest;

describe("request normalization", function () {

    it("must parse string HTTP URL into components", function () {
        var request = normalizeRequest("http://google.com");
        expect(request).toEqual({
            url: "http://google.com",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/",
            headers: { host: "google.com" }
        });
    });

    it("must parse string HTTP URL with path into components with path specified", function () {
        var request = normalizeRequest("http://google.com/search?q=q-io");
        expect(request).toEqual({
            url: "http://google.com/search?q=q-io",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=q-io",
            headers: { host: "google.com" }
        });
    });

    it("must parse string HTTP URL with port into components with port specified", function () {
        var request = normalizeRequest("http://google.com:8080/search?q=q-io");
        expect(request).toEqual({
            url: "http://google.com:8080/search?q=q-io",
            method: "GET",
            ssl: false,
            host: "google.com:8080",
            hostname: "google.com",
            port: 8080,
            path: "/search?q=q-io",
            headers: { host: "google.com:8080" }
        });
    });

    it("must parse string HTTPS URL into components", function () {
        var request = normalizeRequest("https://google.com");
        expect(request).toEqual({
            url: "https://google.com",
            method: "GET",
            ssl: true,
            host: "google.com",
            hostname: "google.com",
            port: 443,
            path: "/",
            headers: { host: "google.com" }
        });
    });

    it("must parse string HTTPS URL with port into components with port overriden", function () {
        var request = normalizeRequest("https://google.com:8080");
        expect(request).toEqual({
            url: "https://google.com:8080",
            method: "GET",
            ssl: true,
            host: "google.com:8080",
            hostname: "google.com",
            port: 8080,
            path: "/",
            headers: { host: "google.com:8080" }
        });
    });

    it("must parse string HTTP URL of request object into components", function () {
        var request = normalizeRequest({ url: "http://google.com/search?q=q-io" });
        expect(request).toEqual({
            url: "http://google.com/search?q=q-io",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=q-io",
            headers: { host: "google.com" }
        });
    });

    it("must preserve request method of request object with string HTTP URL", function () {
        var request = normalizeRequest({
            method: "POST",
            url: "http://google.com/search?q=q-io"
        });
        expect(request).toEqual({
            url: "http://google.com/search?q=q-io",
            method: "POST",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=q-io",
            headers: { host: "google.com" }
        });
    });

    it("must preserve host header of request object with string HTTP URL", function () {
        var request = normalizeRequest({
            url: "http://google.com/search?q=q-io",
            headers: { host: "yahoo.com" }
        });
        expect(request).toEqual({
            url: "http://google.com/search?q=q-io",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=q-io",
            headers: { host: "yahoo.com" }
        });
    });

    it("must ignore host of request object with string HTTP URL", function () {
        var request = normalizeRequest({
            url: "http://google.com/search?q=q-io",
            host: "yahoo.com",
            hostname: "yahoo.com"
        });
        expect(request).toEqual({
            url: "http://google.com/search?q=q-io",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=q-io",
            headers: { host: "google.com" }
        });
    });

    it("must ignore port number of request object with string HTTP URL", function () {
        var request = normalizeRequest({
            url: "http://google.com/search?q=q-io",
            port: 8080
        });
        expect(request).toEqual({
            url: "http://google.com/search?q=q-io",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=q-io",
            headers: { host: "google.com" }
        });
    });

    it("must ignore path string of request object with string HTTP URL", function () {
        var request = normalizeRequest({
            url: "http://google.com/search?q=q-io",
            path: "/"
        });
        expect(request).toEqual({
            url: "http://google.com/search?q=q-io",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=q-io",
            headers: { host: "google.com" }
        });
    });

    it("must fill all missing fields of request object", function () {
        var request = normalizeRequest({
            host: "google.com"
        });
        expect(request).toEqual({
            method: "GET",
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/",
            headers: { host: "google.com" }
        });
    });

    it("must preserve host header of request object", function () {
        var request = normalizeRequest({
            host: "google.com",
            headers: { host: "yahoo.com" }
        });
        expect(request).toEqual({
            method: "GET",
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/",
            headers: { host: "yahoo.com" }
        });
    });

    it("must url encode the request's querystring", function () {
        var request = normalizeRequest("http://google.com/search?q=entrées");
        expect(request).toEqual({
            url: "http://google.com/search?q=entrées",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/search?q=entr%C3%A9es",
            headers: { host: "google.com" }
        });
    });

    it("must url encode the request's path", function () {
        var request = normalizeRequest("http://google.com/é");
        expect(request).toEqual({
            url: "http://google.com/é",
            method: "GET",
            ssl: false,
            host: "google.com",
            hostname: "google.com",
            port: 80,
            path: "/%C3%A9",
            headers: { host: "google.com" }
        });
    });

    it("must url encode the request's path (more characters)", function () {
        var charactersToEncode = "èÈàÀêÊÀùÙçÇÈîôôÇöä";
        var request = normalizeRequest(
            "http://google.com/search?q=" + charactersToEncode);
        var decodedPath = decodeURIComponent(request.path);
        expect(decodedPath).toEqual("/search?q=" + charactersToEncode);
    });

    it("must not double url encode a request", function () {
        var uri = "http://google.com/search?q=entr%C3%A9es";
        var request = normalizeRequest(uri);
        var decodedPath = decodeURIComponent(request.path);
        expect(request.path).toEqual("/search?q=entr%C3%A9es");
    });
});
