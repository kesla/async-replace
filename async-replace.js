var async = require('async');

function toLocal(regexp) {
    var flags = '';
    if (regexp.ignoreCase) flags += 'i';
    var copy = new RegExp(regexp.source, flags);
    return copy;
}

function replaceLocal(string, regexp, replacer, callback) {
    var matched = string.match(regexp);
    if (!matched)
        return callback(null, string);

    var args = matched.slice();
    args.push(matched.index);
    args.push(matched.input);
    args.push(function(err, newString) {
        if (err) return callback(err);

        callback(null, string.replace(regexp, newString));
    });

    replacer.apply(null, args);
}

module.exports = function(string, regexp, replacer, callback) {
    if (!regexp.global) return replaceLocal(string, regexp, replacer, callback);

    var matched = string.match(regexp);
    if (!matched)
        return callback(null, string);

    // matched is an array of matched strings
    var result = [];
    var i = 0;
    var index = 0;
    var copy = toLocal(regexp);
    copy.global = false;
    var callbacks = [];
    while(matched.length > 0) {
        var subString = matched.shift();
        var nextIndex = string.indexOf(subString, index);
        result[i] = string.slice(index, nextIndex);
        i++;
        (function(j, index, subString) {
            callbacks.push(function(done) {
                var match = subString.match(copy);
                var args = match.slice();
                args.push(index);
                args.push(string);
                args.push(function(err, newString) {
                    if (err) return done(err);
                    result[j] = newString;
                    done(null);
                });
                replacer.apply(null, args);
            });
        })(i, nextIndex, subString);

        index = nextIndex + subString.length;
        i++;
    }
    result[i] = string.slice(index);
    async.parallel(callbacks, function(err) {
        if (err) return callback(err);
        callback(null, result.join(''));
    });
}