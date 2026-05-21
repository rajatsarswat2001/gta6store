import os

old = b'supabase-js@2">'
new = b'supabase-js@2.49.4">'

for fname in ['index.html','news.html','article.html','admin.html']:
    if not os.path.exists(fname):
        continue
    with open(fname, 'rb') as f:
        data = f.read()
    orig = data
    data = data.replace(old, new)
    if data != orig:
        with open(fname, 'wb') as f:
            f.write(data)
        print(fname, '- updated to v2.49.4')
    else:
        print(fname, '- no change (already pinned or not found)')
