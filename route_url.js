function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var si = uri.indexOf('/s/');
    var tdi = uri.indexOf('/td/');
    // Find segments s or td in the url
    // If neither is found, do not touch the url at all
    if (si >= 0 || tdi >= 0) {
        
        var lastSegment = '';
        if (uri !== '/') {
            var i = uri.lastIndexOf('/');
            if (i === uri.length - 1) {
                i = uri.lastIndexOf('/', i - 1);
            }
            lastSegment = uri.substring(i + 1);
        }
        
        // Check if the last segment of the url is should be interpreted as a directory
        // If not, do not touch the url at all, so that files are served as is
        if (lastSegment.endsWith('/') || lastSegment.indexOf('.') < 0) {
            if (tdi >= 0 && (si < 0 || tdi < si)) {
                // If segment td appears first in the url, just serve the root of the site
                // It is assumed that index.html at the root of the site is served by default
                // This could be modified to /index.html to be explicit about this
                uri = '/';
            }
            else {
                // s appears first in the url. Find the segment (directory) immediately after s and serve the index.html inside it
                var ei = uri.indexOf('/', si + '/s/'.length);
                if (ei >= 0) {
                    uri = uri.substring(0, ei + 1) + 'index.html';
                }
                else {
                    uri = uri + '/index.html'
                }
            }
        }
    }
    
    request.uri = uri;
    return request;
}