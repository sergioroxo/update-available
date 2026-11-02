"""Audit and zip the festival build. Usage: python3 tools/package-itch.py 2026-11-02"""
from pathlib import Path
import json
import os
import re
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
build = root / 'dist-itch'
files = sorted(p for p in build.rglob('*') if p.is_file())
assert (build / 'index.html').is_file(), 'Build first: npm run build:itch'
assert len(files) <= 1000, 'itch file limit'
assert sum(p.stat().st_size for p in files) < 500_000_000, 'itch extracted-size limit'
assert max(p.stat().st_size for p in files) < 200_000_000, 'itch single-file limit'
assert max(len(p.relative_to(build).as_posix()) for p in files) <= 240
assert len({p.relative_to(build).as_posix().casefold() for p in files}) == len(files), 'case collision'

def exact_file(p):
    p = Path(os.path.normpath(p))
    if not p.is_file():
        return False
    current = Path(p.anchor)
    for segment in p.parts[1:]:
        if segment not in os.listdir(current):
            return False
        current /= segment
    return True

imports = 0
for p in (root / 'src').rglob('*.ts'):
    for ref in re.findall(r'''(?:from\s*|import\s*\(\s*|import\s*)["'](\.[^"']+)["']''', p.read_text()):
        target = p.parent / ref
        assert any(exact_file(c) for c in [target, Path(str(target)+'.ts'), target/'index.ts']), (p, ref)
        imports += 1

resources = set()
for p in files:
    if p.suffix not in {'.js', '.html', '.css', '.json', '.webmanifest', '.gltf'}:
        continue
    text = p.read_text()
    # Audit executable resource references; outside hrefs in documentary pages are deliberate links.
    assert not re.search(r'''["'`]\/+(?:assets|home|sites|models|fonts|audio|video)/''', text), p
    assert not re.search(r'''(?:src\s*=\s*["']|url\(\s*["']?)/(?!/)''', text), p
    for ref in re.findall(r'''["']((?:\./)?(?:assets|home|sites)/[^"'\s<>]+\.(?:mp3|mp4|glb|gltf|png|jpg|jpeg|webp|svg|woff2?|ttf|html|css|json))["']''', text):
        assert exact_file(build / ref), (p, ref)
        resources.add(ref)
    if p.suffix == '.gltf':
        for ref in re.findall(r'''"uri"\s*:\s*"([^"]+)"''', text):
            assert ref.startswith('data:') or exact_file(p.parent / ref), (p, ref)

date = sys.argv[1]  # Explicit release date; never silently use the build machine's timezone.
assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', date)
release = root / 'release'
release.mkdir(exist_ok=True)
archive = release / f'your-update-has-failed_itch_{date}.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        z.write(p, p.relative_to(build).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert 'index.html' in z.namelist()
assert archive.stat().st_size < 500_000_000
report = dict(zip=str(archive), zip_bytes=archive.stat().st_size, files=len(files),
              extracted_bytes=sum(p.stat().st_size for p in files),
              largest_file_bytes=max(p.stat().st_size for p in files),
              exact_case_imports=imports, literal_resource_urls=len(resources))
out = root / 'out/itch'
out.mkdir(parents=True, exist_ok=True)
(out / 'package.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
