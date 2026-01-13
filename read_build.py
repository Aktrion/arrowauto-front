
with open('build_output.txt', 'rb') as f:
    content = f.read()
    try:
        text = content.decode('utf-16')
        print(text)
    except:
        print(content.decode('utf-8', errors='ignore'))
