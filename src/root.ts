function joinSegments(base: string, ...segments: string[]) {
    if (!segments.length) return base;
    let url = base;
    for (const segment of segments) {
        const e = url.endsWith('/');
        if (e !== segment.startsWith('/'))
            url += segment;
        else if (e)
            url += segment.substring(1);
        else
            url += ('/' + segment);
    }
    return url;
}

function getBasePath() {
    let href = document.querySelector('base')?.getAttribute('href') || '';
    if (!href.endsWith('/'))
        href = href + '/';
    return href;
}
function segments(path: string) {
    if (!path.startsWith('/')) path = '/' + path;
    const segs: string[] = ['/'];
    let si = 1;
    do {
        let ei = path.indexOf('/', si);
        if (ei < 0) ei = path.length - 1;
        const seg = path.substring(si, ei + 1);
        if (seg && seg !== '/') segs.push(seg);
        si = ei + 1;
    } while (si < path.length)
    const lastSeg = segs[segs.length - 1];
    if (!lastSeg.endsWith('/') && lastSeg.indexOf('.') < 0)
        segs[segs.length - 1] = lastSeg + '/';
    return segs;
}

class UrlPath {
    constructor(path: string, basePath?: string) {
        this._pathSegs = segments(path);
        this.path = this._pathSegs.join('');
        const baseSegs = segments(basePath);
        this.basePath = baseSegs.join('');
        let testBase = this._pathSegs.slice(0, baseSegs.length).join('');
        this._localStart = testBase === this.basePath ? baseSegs.length : -1;
        const segsLen = this._pathSegs.length;
        this.dirPath = this._pathSegs.slice(0, segsLen - 1).join(''); // empty string if there is no parent directory
        const lastSeg = this._pathSegs[segsLen - 1];
        this.name = lastSeg;
        if (this.isDir)
            this.name = lastSeg.slice(0, -1);
    }
    private _pathSegs: string[];
    private _localStart: number;
    readonly basePath: string;
    readonly path: string;
    readonly dirPath: string;
    readonly name: string;

    get isDir() { return this.path.endsWith('/'); }

    get isLocal() {
        return this._localStart >= 0;
    }

    get isLocalRoot() {
        return this._localStart === this._pathSegs.length;
    }
}

const basePath = getBasePath();
console.log("basePath is:", basePath);

function loadPageFromUrl() {
    const urlPath = new UrlPath(window.location.pathname, basePath);
    console.log("loading page from url:", urlPath.path);
    if (urlPath.isLocal) {
        if (urlPath.isLocalRoot) {
            const b = urlPath.basePath;
            loadTd(b + 'td/index.td', b, b + 'td/');
            return;
        }
        else if (urlPath.isDir && urlPath.path.indexOf('/td/') >= 0) {
            loadTd(urlPath.path.slice(0, -1) + '.td', urlPath.basePath, urlPath.dirPath);
            return;
        }
    }
}

async function loadTd(path: string, basePath: string, dirPath: string) {
    const r = await fetch(path);
    const text = await r.text();
    document.getElementById('page').innerHTML = tdToHtml(text, basePath, dirPath);
}

async function onTdlink(this: HTMLAnchorElement, e: Event) {
    e.preventDefault();
    const u = new URL(this.href);
    const match = u.pathname.match(/\/([^\/]+)\/?$/);
    if (match) {
        const page = joinSegments(u.pathname, match[1] + ".td");
        loadTd(page, basePath, u.pathname);
        history.pushState(null, null, u.pathname);
    }
}

function breakIntoLines(text: string) {
    let match: RegExpExecArray;
    const lines: string[] = [];
    const lineRegex = /([^\r\n]*)(?:\r\n|\r|\n)/g;
    let e = 0;
    while ((match = lineRegex.exec(text)) !== null) {
        e = match.index + match[0].length;
        lines.push(match[1]);
    }
    if (e < text.length) {
        lines.push(text.substring(e));
    }
    return lines;
}

type TdParsingState = {
    mode: 'default'; // top level or inside an enclosing tag other than code or on the target line for a next-line tag
    tag: string;
    htag: string;
    isNextLine: boolean;
} | {
    mode: 'code'; // inside an enclosing code tag
    indent: string;
} | {
    mode: 'nextline'; // on the line of a next-line tag
    tag: string;
    htag: string;
} | {
    mode: 'tag'; // inside a start tag with attributes and or values
    tag: string;
    htag: string;
    attrs: Record<string, string>;
    attName: string;
    value: string | undefined;
};

function escapeHTML(unsafeText: string) {
    const div = document.createElement('div');
    div.innerText = unsafeText;
    return div.innerHTML;
}

function isWhiteSpace(s: string) {
    return /^\s+$/.test(s);
}

function tagToHtml(tag: string, headingLevel: number) {
    if (tag === "heading") {
        return "h" + headingLevel;
    }
    return tag;//need to sanitize
}

const voidHtmlTags = new Set<string>(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function tdToHtml(td: string, basePath: string, dirPath: string, headingLevel = 1) {
    const lines = breakIntoLines(td);
    let state: TdParsingState = { mode: 'default', tag: '', htag: '', isNextLine: false };
    const stack: TdParsingState[] = [state];
    let html = '';
    let paraStart: { index: number; state: TdParsingState } | undefined = undefined;
    let lineEndState: TdParsingState | undefined = undefined;
    for (const origLine of lines) {
        let line = origLine;
        let text = '';
        let htmlOnLine = false;
        while (true) {
            if (state.mode === 'default') {
                let pMatch = line.match(/\({2}|\){2}/); // Find the first (( or ))
                if (pMatch == null) {
                    text += line;
                    if (text.length > 0 && state === lineEndState) {
                        html += "<br>";
                    }
                    if (paraStart && paraStart.state === state && (origLine.length === 0 || isWhiteSpace(origLine))) {
                        html = html.substring(0, paraStart.index) + "<p>" + html.substring(paraStart.index) + "</p>";
                        paraStart.index = html.length;
                    }
                    if (!paraStart && !htmlOnLine && text.length > 0 && !state.isNextLine) {
                        paraStart = { index: html.length, state };
                    }
                    htmlOnLine = true;
                    html += escapeHTML(text);
                    if (state.isNextLine) {
                        html += `</${state.htag}>`
                        stack.pop();
                        state = stack[stack.length - 1];
                        lineEndState = undefined;
                    }
                    else if (text.length > 0) {
                        lineEndState = state;
                    }
                    else {
                        lineEndState = undefined;
                    }
                    text = '';
                    break;
                }
                let pi = pMatch.index!;
                if (pMatch[0] === '))') {
                    if (pi + 2 < line.length && line[pi + 2] === ')') {
                        // Escape the ))
                        text += line.substring(0, pi + 2);
                        line = line.substring(pi + 3);
                        continue;
                    }
                    if (state.isNextLine || !state.tag) {
                        // Unexpected ))
                        text += line.substring(0, pi + 2);
                        line = line.substring(pi + 2);
                        continue;
                    }
                    if (!line.substring(0, pi).endsWith('(' + state.tag)) {
                        // Unexpected ))
                        text += line.substring(0, pi + 2);
                        line = line.substring(pi + 2);
                        continue;
                    }
                    text += line.substring(0, pi - state.tag.length - 1);
                    if (lineEndState === state) {
                        if (text.length > 0) {
                            html += '<br>';
                        }
                        lineEndState = undefined;
                    }
                    if (text.length > 0) {
                        if (!paraStart && !htmlOnLine && text.length > 0 && !state.isNextLine) {
                            paraStart = { index: html.length, state };
                        }
                        htmlOnLine = true;
                        html += escapeHTML(text);
                        text = '';
                    }
                    htmlOnLine = true;
                    html += `</${state.htag}>`;
                    line = line.substring(pi + 2);
                    stack.pop();
                    state = stack[stack.length - 1];
                    continue;
                }
                if (line.length > pi + 2) {
                    let next = line[pi + 2];
                    if (next === '(') {
                        // Escape the ((
                        text += line.substring(0, pi + 2);
                        line = line.substring(pi + 3);
                        continue;
                    }
                    text += line.substring(0, pi);
                    line = line.substring(pi + 2);
                    const tagNameEndMatch = line.match(/\/\){2}|\){1,2}|\s+/); // /)) or )) or ) or \s
                    if (tagNameEndMatch == null) {
                        // Neither a space before an attribute nor a closing parenthesis were encountered on the line. This is invalid syntax and we will ignore it.
                        text += '((';
                        continue;
                    }
                    const tnei = tagNameEndMatch.index!;
                    if (tnei === 0) {
                        // Empty start tag is invalid syntax and we will ignore it
                        text += '((';
                        continue;
                    }
                    if (lineEndState === state) {
                        if (text.length > 0 && !htmlOnLine) {
                            html += '<br>';
                        }
                        lineEndState = undefined;
                    }
                    if (text.length > 0) {
                        if (!paraStart && !htmlOnLine && text.length > 0 && !state.isNextLine) {
                            paraStart = { index: html.length, state };
                        }
                        htmlOnLine = true;
                        html += escapeHTML(text);
                        text = '';
                    }
                    next = tagNameEndMatch[0];
                    let tag = line.substring(0, tnei);
                    line = line.substring(tnei + next.length);
                    let htag = tagToHtml(tag, headingLevel);
                    if (next === ')') {
                        if (!paraStart && !htmlOnLine && !state.isNextLine) {
                            paraStart = { index: html.length, state };
                        }
                        htmlOnLine = true;
                        html += `<${htag}>`;
                        if (tag === 'code') {
                            state = { mode: 'code', indent: '' };
                        }
                        else {
                            state = { mode: 'default', tag, htag, isNextLine: false };
                        }
                        stack.push(state);
                        continue;
                    }
                    if (next === '))') {
                        paraStart = undefined;
                        htmlOnLine = true;
                        html += `<${htag}>`;
                        state = { mode: 'nextline', tag, htag };
                        stack.push(state);
                        continue;
                    }
                    if (next === '/))') {
                        if (!paraStart && !htmlOnLine && !state.isNextLine) {
                            paraStart = { index: html.length, state };
                        }
                        htmlOnLine = true;
                        html += `<${htag}>`;
                        if (!voidHtmlTags.has(htag))
                            html += `</${htag}>`;
                        continue;
                    }
                    if (!line) {
                        //First attribute must be on same line
                        html += `</${state.htag}>`;
                        continue;
                    }
                    if (!paraStart && !htmlOnLine && !state.isNextLine) {
                        paraStart = { index: html.length, state };
                    }
                    state = { mode: 'tag', tag, htag, attrs: {}, attName: '', value: undefined };
                    stack.push(state);
                    continue;
                }
                else {
                    // Invalid Syntax: Line ends with ((
                    text += line.substring(0, pi + 2);
                    if (text.length > 0) {
                        htmlOnLine = true;
                        html += escapeHTML(text);
                        text = '';
                    }
                    break;
                }
            }
            else if (state.mode === 'nextline') {
                stack.pop();
                if (line.length === 0 || isWhiteSpace(line)) {
                    state = { mode: 'default', tag: state.tag, htag: state.htag, isNextLine: true };
                    stack.push(state);
                    break;
                }
                else {
                    html += `</${state.htag}>`
                    state = stack[stack.length - 1];
                    continue;
                }
            }
            else if (state.mode === 'tag') {
                line = line.substring(line.match(/^\s*/)[0].length!);
                if (!line)
                    break;
                const isUrl = line.startsWith('url(');
                if (isUrl) {
                    line = line.substring('url('.length);
                }
                const c = line[0];
                let qv: string | null = null;
                let sMatch: RegExpMatchArray | null = null;
                if (c === '"') {
                    sMatch = line.match(/^"((?:[^"]|"")*)/);
                    qv = sMatch[1].replace(/""/g, '"');
                }
                else if (c === "'") {
                    sMatch = line.match(/^'((?:[^']|'')*)/);
                    qv = sMatch[1].replace(/''/g, "'");
                }
                else if (c === "`") {
                    sMatch = line.match(/^`((?:[^`]|``)*)/);
                    qv = sMatch[1].replace(/``/g, '`');
                }
                if (sMatch != null) {
                    const close = isUrl ? c + ')' : c;
                    if (line.indexOf(close, sMatch[0].length) === sMatch[0].length) {
                        line = line.substring(sMatch[0].length + close.length);
                    }
                    else {
                        // unmatched close
                    }
                    if (isUrl) {
                        if (qv.startsWith('~')) qv = joinSegments(basePath, qv.substring(1));
                        else if (qv.startsWith('.')) qv = joinSegments(dirPath, qv.substring(1));
                        else {
                            // incorrect use of url
                        }
                    }
                    if (state.attName) {
                        state.attrs[state.attName] = qv!;
                    }
                    else if (state.value === undefined) {
                        state.value = qv!;
                    }
                    else {
                        // unexpected value with a missing attribute
                    }
                    continue;
                }
                const nextMatch = line.match(/[=]|\){1,2}|\/\){2}/);
                if (nextMatch == null) {
                    //invalid syntax
                    break;
                }
                const befMatch = line.substring(0, nextMatch.index!);
                const next = nextMatch[0];
                line = line.substring(nextMatch.index! + next.length);
                if (next === '=') {
                    state.attName = befMatch;
                    continue;
                }
                const attrs = state.attrs;
                const attrsHtml = Object.keys(attrs).map(k => ` ${k}="${attrs[k].replace(/"/g, '""')}"`).join('');
                html += `<${state.htag}${attrsHtml}>`
                stack.pop();
                if (next === ')') {
                    if (state.tag === 'code') {
                        state = { mode: 'code', indent: '' };
                    }
                    else {
                        state = { mode: 'default', tag: state.tag, htag: state.htag, isNextLine: false };
                    }
                    stack.push(state);
                    continue;
                }
                if (next === '))') {
                    paraStart = undefined;
                    state = { mode: 'nextline', tag: state.tag, htag: state.htag };
                    stack.push(state);
                    continue;
                }
                if (next === '/))') {
                    if (state.value != null)
                        html += escapeHTML(state.value);
                    if (!voidHtmlTags.has(state.htag))
                        html += `</${state.htag}>`;
                    state = stack[stack.length - 1];
                    continue;
                }
            }
            else if (state.mode === 'code') {

            }
        }
        html += '\n';
    }
    return html;
}

document.querySelectorAll('a.tdlink').forEach(a => {
    (a as HTMLAnchorElement).addEventListener('click', onTdlink);
});

loadPageFromUrl();

window.onpopstate = function onPopState(this: Window, ev: PopStateEvent) {
    loadPageFromUrl();
}