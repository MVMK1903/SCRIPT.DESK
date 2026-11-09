#!/usr/bin/env python3
"""Build www/index.html from src/app.html (the same source the Claude version uses).

  python3 scripts/build.py            # page only (libraries load from CDN, cached after first use)
  python3 scripts/build.py --vendor   # also download libraries into www/vendor for fully offline installs
"""
import os, sys, json, subprocess, urllib.request, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src', 'app.html')
WWW = os.path.join(ROOT, 'www')
LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
]
HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{vendor}<meta name="theme-color" content="#e4e7ec">
<meta name="description" content="AI film script breakdown: single line orders, artist and location lists, breakdown sheets, costume continuity, art and props, character profiles.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="ScriptDesk">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>:root{{color-scheme:dark;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
</head>
<body>
'''

def load_home():
    """Demo pictures for the Home page (src/home/*.webp), inlined as data addresses so the app stays one file."""
    import base64, glob
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'src', 'home', '*.webp'))):
        out[os.path.basename(f)[:-5]] = 'data:image/webp;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
    return out

def load_illustrations():
    """Validate every illustration against the central manifest and return what the app needs. Fails the build on any problem."""
    import re
    import xml.etree.ElementTree as ET
    idir = os.path.join(os.path.dirname(SRC), 'illustrations')
    man = json.load(open(os.path.join(idir, 'manifest.json'), encoding='utf-8'))
    problems, svgs, items, ids = [], {}, [], set()
    on_disk = {os.path.relpath(os.path.join(r, f), idir).replace(os.sep, '/') for r, _, fs in os.walk(idir) for f in fs if f.endswith('.svg') and not os.path.relpath(r, idir).startswith('scenes')}
    for it in man['items']:
        i = it['id']
        if i in ids: problems.append('duplicate id ' + i)
        ids.add(i)
        if it['category'] not in man['categories']: problems.append(i + ': unknown category ' + it['category'])
        if not it.get('alt') or not it['alt'].startswith('Conceptual illustration'): problems.append(i + ': alt text must start with "Conceptual illustration"')
        if it.get('match'):
            try: re.compile(it['match'])
            except re.error as e: problems.append(i + ': bad match regex ' + str(e))
        path = os.path.join(idir, it['file'])
        if not os.path.isfile(path):
            problems.append(i + ': missing file ' + it['file']); continue
        raw = open(path, encoding='utf-8').read()
        try: root = ET.fromstring(raw)
        except ET.ParseError as e: problems.append(it['file'] + ': invalid SVG ' + str(e)); continue
        if not root.tag.endswith('svg') or not root.get('viewBox'): problems.append(it['file'] + ': no svg/viewBox')
        chk = re.sub(r'<image [^>]*?href="data:image/webp;base64,[A-Za-z0-9+/=]+"[^>]*/>', '', raw)
        if re.search(r'<script|<image|href=|onload|url\(\s*[\'"]?https?:|https?://(?!www\.w3\.org)', chk): problems.append(it['file'] + ': contains script or external reference (only embedded webp data allowed)')
        svgs[i] = ' '.join(raw.split())
        items.append({k: it[k] for k in ('id', 'category', 'name', 'alt', 'match')})
        if not it.get('source'): problems.append(i + ': no source recorded')
    for f in sorted(on_disk - {it['file'] for it in man['items']}): problems.append('no manifest entry for ' + f)
    for k, v in man['fallback'].items():
        if v not in ids: problems.append('fallback ' + k + ' -> unknown asset ' + v)
    if problems:
        print('ILLUSTRATION CHECK FAILED:\n  ' + '\n  '.join(problems)); sys.exit(1)
    by = {}
    for it in items: by[it['category']] = by.get(it['category'], 0) + 1
    print('illustrations OK:', len(items), 'files,', ', '.join(k + ' ' + str(v) for k, v in by.items()))
    for c in man['categories']:
        if c not in man.get('categoryInfo', {}): problems.append('no categoryInfo for ' + c)
    if problems:
        print('ILLUSTRATION CHECK FAILED:\n  ' + '\n  '.join(problems)); sys.exit(1)
    import base64
    needs = set(re.findall(r"\['(\w+)','", open(SRC, encoding='utf-8').read().split('const NEEDS=[')[1].split('];')[0]))
    scenes = {}
    for k, v in man.get('scenes', {}).items():
        fp = os.path.join(idir, v['file'])
        if k not in needs: problems.append('scene ' + k + ': not a need id')
        if not os.path.isfile(fp): problems.append('scene ' + k + ': missing file ' + v['file']); continue
        if not v.get('alt') or not v.get('source'): problems.append('scene ' + k + ': alt and source required')
        if re.search(r'<script|href=|onload|https?://(?!www\.w3\.org)', open(fp, encoding='utf-8').read()): problems.append('scene ' + k + ': script or external reference')
        scenes[k] = {'name': v['name'], 'alt': v['alt'], 'src': 'data:image/svg+xml;base64,' + base64.b64encode(open(fp, 'rb').read()).decode()}
    for f in sorted({os.path.relpath(os.path.join(r, f), idir).replace(os.sep, '/') for r, _, fs in os.walk(os.path.join(idir, 'scenes')) for f in fs} - {v['file'] for v in man.get('scenes', {}).values()}): problems.append('no manifest entry for ' + f)
    if problems:
        print('ILLUSTRATION CHECK FAILED:\n  ' + '\n  '.join(problems)); sys.exit(1)
    print('scene images OK:', len(scenes))
    return {'scenes': scenes, 'svgs': svgs, 'items': items, 'fallback': man['fallback'], 'cats': [dict(id=c, **man['categoryInfo'][c]) for c in man['categories']]}

def firebase_config():
    """Firebase web settings for ScriptDesk accounts: from the FIREBASE_CONFIG environment variable (CI secret) or
    config/firebase.json. They are public identifiers (access is controlled by firestore.rules), not passwords."""
    # config/firebase.public.json (kept in the repository: Firebase web settings are public) wins over the CI secret
    raw = ''
    for name in ('firebase.public.json', 'firebase.json'):
        path = os.path.join(ROOT, 'config', name)
        if not raw and os.path.isfile(path):
            raw = open(path, encoding='utf-8').read().strip()
    raw = raw or os.environ.get('FIREBASE_CONFIG', '').strip()
    if not raw:
        return None
    try:
        c = json.loads(raw)
    except ValueError:
        # also accept the "const firebaseConfig = {...}" snippet from the console, as pasted: comments, trailing commas,
        # single or double quotes. Only key: "value" pairs are read.
        c = dict(re.findall(r'''["']?(\w+)["']?\s*:\s*["']([^"'\r\n]*)["']''', raw))
    keep = {k: str(c[k]) for k in ('apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket', 'messagingSenderId') if c.get(k)}
    if keep.get('apiKey') and not re.fullmatch(r'AIza[0-9A-Za-z_-]{35}', keep['apiKey']):
        raise SystemExit('FIREBASE_CONFIG: the apiKey does not look like a Firebase web key (AIza + 35 characters). Copy the config again.')
    return keep if keep.get('apiKey') and keep.get('projectId') else None

def csp_policy(page):
    """Content Security Policy for the installed apps and the web app. Only the page's own inline scripts (by hash), the
    pinned library CDNs and Google sign-in may run scripts, so text hidden in an imported script or a project file can
    never run as code. AI services are reached over https (and http on this computer or the office network)."""
    import hashlib, base64
    hashes = ["'sha256-%s'" % base64.b64encode(hashlib.sha256(m.encode('utf-8')).digest()).decode()
              for m in re.findall(r'<script>(.*?)</script>', page, re.S)]
    pol = ("default-src 'self'; "
           "script-src 'self' " + ' '.join(hashes) + " https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://accounts.google.com https://www.gstatic.com https://apis.google.com https://www.google.com https://www.recaptcha.net; "
           "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; "
           "font-src 'self' data: https://fonts.gstatic.com; "
           "img-src 'self' data: blob: https:; "
           "connect-src 'self' https: http: ws://localhost:* ws://127.0.0.1:*; "
           "worker-src 'self' blob: https://cdnjs.cloudflare.com; "
           "frame-src https://accounts.google.com https://*.firebaseapp.com https://*.web.app https://www.google.com https://recaptcha.google.com https://www.recaptcha.net; "
           "media-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'")
    return pol

def csp(page):
    return '<meta http-equiv="Content-Security-Policy" content="%s">' % csp_policy(page)

def headers_file(page):
    """www/_headers: real HTTP security headers for hosts that read this file (Cloudflare Pages, Netlify). GitHub Pages
    ignores it, so there the policy in the page's <meta> is the only one (a meta tag cannot stop other sites framing the
    page; these headers can)."""
    return ('/*\n'
            "  Content-Security-Policy: %s; frame-ancestors 'none'\n"
            '  Strict-Transport-Security: max-age=31536000; includeSubDomains\n'
            '  X-Content-Type-Options: nosniff\n'
            '  X-Frame-Options: DENY\n'
            '  Referrer-Policy: strict-origin-when-cross-origin\n'
            '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n'
            '  Cross-Origin-Opener-Policy: same-origin-allow-popups\n'
            '  Cross-Origin-Resource-Policy: same-origin\n'
            '/sw.js\n'
            '  Cache-Control: no-cache\n') % csp_policy(page)

def main():
    vendor = '--vendor' in sys.argv
    if subprocess.call([sys.executable, os.path.join(ROOT, 'scripts', 'check_logs.py')]):  # never log passwords, tokens or codes
        sys.exit(1)
    app = open(SRC, encoding='utf-8').read()
    files = []
    if vendor:
        os.makedirs(os.path.join(WWW, 'vendor'), exist_ok=True)
        for u in LIBS:
            name = u.rsplit('/', 1)[1]
            print('downloading', name)
            for attempt in range(5):  # a stalled download must not hang the build
                try:
                    with urllib.request.urlopen(u, timeout=30) as r, open(os.path.join(WWW, 'vendor', name), 'wb') as f:
                        f.write(r.read())
                    break
                except Exception as e:
                    print('retry', name, attempt + 1, e)
                    if attempt == 4:
                        raise
            files.append(name)
        json.dump(files, open(os.path.join(WWW, 'vendor', 'manifest.json'), 'w'))
    # Inline the local SVG illustrations (src/illustrations + manifest.json) so the single-file app needs no image files.
    app = app.replace('/*ILLUS*/{}', json.dumps(load_illustrations(), ensure_ascii=False, separators=(',', ':')))
    app = app.replace('/*HOME*/{}', json.dumps(load_home(), separators=(',', ':')))
    page = HEAD.format(vendor='<meta name="sd-vendor" content="1">\n' if vendor else '') + app + '\n</body>\n</html>\n'
    fbc = firebase_config()
    print('firebase accounts: ON for project ' + fbc['projectId'] if fbc else 'firebase accounts: OFF (no FIREBASE_CONFIG)')
    if fbc:
        import html as _h
        page = page.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="sd-firebase" content="' + _h.escape(json.dumps(fbc, separators=(',', ':')), quote=True) + '">', 1)
    hdr = headers_file(page)
    page = page.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + csp(page), 1)
    open(os.path.join(WWW, '_headers'), 'w', encoding='utf-8').write(hdr)
    open(os.path.join(WWW, 'index.html'), 'w', encoding='utf-8').write(page)
    try:
        ver = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT).decode().strip()
    except Exception:
        ver = 'dev'
    sw = os.path.join(WWW, 'sw.js')
    s = open(sw, encoding='utf-8').read()
    s = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'scriptdesk-{ver}{'-v' if vendor else ''}';", s)
    open(sw, 'w', encoding='utf-8').write(s)
    print('built www/index.html', '(with bundled libraries)' if vendor else '')
if __name__ == '__main__':
    main()
