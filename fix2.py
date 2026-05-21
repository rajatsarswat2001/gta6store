import os

def fix_bytes(data):
    extra_emojis = [
        '\U0001F4F0', '\U0001F534', '\U0001F7E2', '\U0001F4CA', '\U0001F4C8',
        '\U0001F4E2', '\U0001F517', '\U0001F6A8', '\U0001F4DD', '\U0001F552',
        '\U0001F4B8', '\U0001F465', '\U0001F4C5', '\U0001F4CC', '\U0001F50D',
        '\U0001F6E1', '\U0001F4AC', '\U0001F91D', '\U0001F4A1', '\U0001F3B2',
        '\U0001F5A5', '\U0001F50A', '\U0001F6D2', '\U0001F48A', '\U0001F4B9',
    ]
    for ch in extra_emojis:
        try:
            utf8 = ch.encode('utf-8')
            moji = utf8.decode('windows-1252').encode('utf-8')
            if moji != utf8:
                data = data.replace(moji, utf8)
        except:
            pass
    return data

for fname in ['index.html', 'news.html', 'article.html', 'admin.html', '404.html']:
    if not os.path.exists(fname):
        continue
    with open(fname, 'rb') as f:
        data = f.read()
    orig = data
    data = fix_bytes(data)
    # Fix nav-logo and footer-logo .in text
    data = data.replace(
        b'Store</span>.in</a>',
        b'Store</span>.co.uk</a>'
    )
    data = data.replace(
        b'Store</span>.in</div>',
        b'Store</span>.co.uk</div>'
    )
    if data != orig:
        with open(fname, 'wb') as f:
            f.write(data)
        print(fname, '- fixed')
    else:
        print(fname, '- no changes')
