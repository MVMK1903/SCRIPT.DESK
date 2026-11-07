#!/usr/bin/env python3
"""Fails the build if a log call could print a password, token, secret or reset link.

Scans src/app.html, the server functions and the desktop app for console.* and logger.* calls whose arguments name
something sensitive. Run by scripts/build.py; also usable alone: python3 scripts/check_logs.py
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILES = [ROOT / 'src/app.html', *sorted((ROOT / 'functions').glob('*.js')), *sorted((ROOT / 'desktop').glob('*.js'))]
CALL = re.compile(r'\b(?:console|logger)\s*\.\s*(?:log|info|warn|error|debug|trace)\s*\(')
BAD = re.compile(r'pass(?:word|wd)?\b|\bpwd\b|secret|token|refresh_?token|idToken|accessToken|api_?key|\blink\b|(?<![\w.])code(?![\w:])', re.I)


def args_of(text, start):
    """the text of a call's arguments, from just after '(' to its matching ')'"""
    depth, i = 1, start
    while i < len(text) and depth:
        depth += {'(': 1, ')': -1}.get(text[i], 0)
        i += 1
    return text[start:i - 1]


def main():
    problems = []
    for f in FILES:
        if not f.exists():
            continue
        text = f.read_text(encoding='utf-8')
        for m in CALL.finditer(text):
            a = args_of(text, m.end())
            # words inside plain string literals ("sign-in failed") are fine; look at what is being printed
            code = re.sub(r"'[^'\n]*'|\"[^\"\n]*\"|`[^`\n]*`", '""', a)
            hit = BAD.search(code)
            if hit:
                line = text.count('\n', 0, m.start()) + 1
                problems.append(f'{f.relative_to(ROOT)}:{line}: log call prints "{hit.group(0).strip()}": {a.strip()[:80]}')
    if problems:
        print('LOG CHECK FAILED (never log passwords, tokens, codes or links):\n  ' + '\n  '.join(problems))
        return 1
    print('log check OK: no log call prints a password, token, code or link')
    return 0


if __name__ == '__main__':
    sys.exit(main())
