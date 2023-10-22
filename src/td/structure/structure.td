((section)

((heading))
Directory structure and links

Static pages are written in the ((a href=url("~/td/format"))td file format(a)). For example, this file is 'structure.td' and it is contained in a directory named 'structure'. This containing directory can contain local resource files like images.

Since browsers do not know about td files, a td file cannot be served directly. A request to a path like /**/s/<app>/**/td/**/<page>/ will be served with the file at path /**/s/<app>/index.html. Such index.html files include a script that looks at the url that was requested, makes a JavaScript request to /**/s/<app>/**/td/**/<page>/<page>.td, converts the td format to html, and makes it the content of some container element in the DOM.

A link to another td file in the same app will look like url("~/**/td/**/<other>")
A link to another td file in a different app will look like /**/s/<otherapp>/**/td/**/<other>. The url function is not required because no transformation is required.
A link to a local resource in the containing directory of a td file will look like url("./**/<resource>.<ext>)

Each app may be maintained separately.

(section))