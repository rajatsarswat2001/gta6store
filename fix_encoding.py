import os, sys

def build_replacements():
    chars = (
        '\u20bf\u039e\u20ae\u25ce\u25ef'
        '\u2192\u2190\u2191\u2193\u2197\u2198'
        '\u2014\u2013\u2018\u2019\u201c\u201d\u2026\u2022'
        '\u00a9\u00ae\u2122\u00b7\u00b0\u00b1\u00a3\u00a0\u00a7'
        '\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5\u00e6\u00e7'
        '\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef'
        '\u00f0\u00f1\u00f2\u00f3\u00f4\u00f5\u00f6\u00f8'
        '\u00f9\u00fa\u00fb\u00fc\u00fd\u00fe\u00ff'
        '\u00c0\u00c1\u00c2\u00c3\u00c4\u00c5\u00c6\u00c7'
        '\u00c8\u00c9\u00ca\u00cb\u00cc\u00cd\u00ce\u00cf'
        '\u00d0\u00d1\u00d2\u00d3\u00d4\u00d5\u00d6\u00d8'
        '\u00d9\u00da\u00db\u00dc\u00dd\u00de'
        '\u2605\u2606\u2713\u2714\u2715\u2717'
        '\u26a0\u26a1\u2b50\u2705\u274c\u2716'
        '\U0001F3AE\U0001F514\U0001F525\U0001F3AF'
        '\U0001F680\U0001F30D\U0001F48E\U0001F3C6'
        '\U0001F4B3\U0001F4B0\U0001F381\U0001F6D2'
        '\U0001F310\U0001F511\U0001F4E7\U0001F4F1'
    )
    reps = {}
    for ch in set(chars):
        if ord(ch) < 0x80:
            continue
        try:
            utf8 = ch.encode('utf-8')
            moji = utf8.decode('windows-1252').encode('utf-8')
            if moji != utf8:
                reps[moji] = utf8
        except:
            pass
    return reps

reps = build_replacements()
print("Patterns:", len(reps))

for fname in ['index.html','news.html','article.html','admin.html','404.html']:
    if not os.path.exists(fname):
        print("Skip:", fname)
        continue
    with open(fname,'rb') as f:
        data = f.read()
    orig = data
    for bad, good in sorted(reps.items(), key=lambda x: -len(x[0])):
        data = data.replace(bad, good)
    # Fix remaining gta6store.in
    n = data.count(b'gta6store.in')
    if n:
        data = data.replace(b'gta6store.in', b'gta6store.co.uk')
        print(fname, "- fixed", n, "domain refs")
    if data != orig:
        with open(fname,'wb') as f:
            f.write(data)
        print(fname, "- encoding fixed OK")
    else:
        print(fname, "- no changes")
