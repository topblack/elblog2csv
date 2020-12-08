import glob

for name in glob.glob('**/*.log', recursive=True):
    print(name)