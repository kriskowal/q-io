
/**
 * Provides utilities for reading and writing HTTP cookies.
 * @module
 */

/*whatsupdoc*/

var QS = require("qs");

/**
 * @param {String} cookie
 * @returns {Object}
 */
var DOMAIN_REG_EXP = /^domain$/i,   
    PATH_REG_EXP = /^path$/i,
    EXPIRE_REG_EXP = /^expires$/i,
    MAX_AGE_REG_EXP = /^max-age$/i,
    SECURE_REG_EXP = /^secure$/i,
    HTTP_ONLY_REG_EXP = /^httponly$/i;

exports.parse = function (cookie, date) {
    date = date || new Date();
    var parsed = {};
    var terms = cookie.split(/[;,]/g);
    var keyValue = terms.shift().split("=");
    parsed.key = decodeURIComponent(keyValue[0]);
    parsed.value = decodeURIComponent(keyValue[1]);
    terms.forEach(function (term) {
        var parts = term.split("=").map(function (part) {
            return part.trim();
        });
        var key = parts[0], value = parts[1];
        if (DOMAIN_REG_EXP.test(key)) {
            parsed.domain = value;
        } else if (PATH_REG_EXP.test(key)) {
            parsed.path = value;
        } else if (EXPIRE_REG_EXP.test(key)) {
            parsed.expires = new Date(
                +new Date() + // actual now
                (new Date(value) - date) // server offset
            );
        } else if (MAX_AGE_REG_EXP.test(key)) {
            parsed.expires = new Date(
                new Date().getTime() +
                (value * 1000)
            );
        } else if (SECURE_REG_EXP.test(key)) {
            parsed.secure = true;
        } else if (HTTP_ONLY_REG_EXP.test(key)) {
            parsed.httpOnly = true;
        }
    });
    return parsed;
};

/**
 * @param {String} key
 * @param {String} value
 * @param {Object} options (optional)
 * @returns {String} a cookie string
 */
exports.stringify = function (key, value, options) {
    var cookie = (
        encodeURIComponent(key) + "=" +
        encodeURIComponent(value)
    );
    if (options) {
        if (options.domain)
            cookie += "; Domain=" + encodeURIComponent(options.domain);
        if (options.path)
            cookie += "; Path=" + encodeURIComponent(options.path);
        if (options.expires)
            cookie += "; Expires=" + options.expires.toGMTString();
        if (options.secure)
            cookie += "; Secure";
        if (options.httpOnly)
            cookie += "; HttpOnly";
    }
    return cookie;
};
