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
def main():
    vendor = '--vendor' in sys.argv
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
    # Inline the local SVG illustrations so the single-file app needs no image files
    ill = {}
    idir = os.path.join(os.path.dirname(SRC), 'illustrations')
    for f in sorted(os.listdir(idir)):
        if f.endswith('.svg'):
            ill[f[:-4]] = ' '.join(open(os.path.join(idir, f), encoding='utf-8').read().replace('#20272A', 'currentColor').split())
    assert '/*ILLUS*/{}' in app
    app = app.replace('/*ILLUS*/{}', json.dumps(ill))
    page = HEAD.format(vendor='<meta name="sd-vendor" content="1">\n' if vendor else '') + app + '\n</body>\n</html>\n'
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
