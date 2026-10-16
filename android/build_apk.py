#!/usr/bin/env python3
"""Build a signed, installable Android APK of the game.

No Android SDK/Gradle needed. Tools come from Maven Central:
  - aapt2 + Android framework resources  (bundled inside org.apktool:apktool-lib)
  - smali assembler                      (org.smali:smali)  -> classes.dex
Zip alignment and APK Signature Scheme v2 signing are done here in Python
(requires the `cryptography` package).

    python3 android/build_apk.py                  # -> dist/riotshift.apk
    python3 android/build_apk.py --out my.apk --version-code 2 --version-name 0.2.0

Signing key: android/.keys/ (git-ignored) is created on first run. Keep it —
Android only installs an update if it is signed with the same key.
Override with --key/--cert (PEM files).
"""
import argparse, datetime, hashlib, os, shutil, struct, subprocess, tempfile, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANDROID = ROOT / 'android'
TOOLS = ANDROID / '.tools'
KEYS = ANDROID / '.keys'

APKTOOL_LIB = 'org.apktool:apktool-lib:3.0.3'
SMALI = 'org.smali:smali:2.5.2'
MIN_SDK, TARGET_SDK = 24, 35

# What goes into assets/ (the web game).
WEB_FILES = ['index.html', 'css', 'src', 'vendor', 'Assets']


def run(cmd, **kw):
    print('+', ' '.join(str(c) for c in cmd))
    subprocess.run([str(c) for c in cmd], check=True, **kw)


# ---------------------------------------------------------------- tools
def mvn(*args):
    run(['mvn', '-q', '-B',
         '-Daether.connector.http.retryHandler.count=12',
         '-Daether.connector.http.retryHandler.interval=8000', *args], cwd=TOOLS)


def ensure_tools():
    aapt2 = TOOLS / 'prebuilt/linux/aapt2'
    framework = TOOLS / 'prebuilt/android-framework.jar'
    smali_dir = TOOLS / 'smali'
    TOOLS.mkdir(parents=True, exist_ok=True)
    if not aapt2.exists():
        mvn('dependency:copy', f'-Dartifact={APKTOOL_LIB}', '-DoutputDirectory=.')
        jar = next(TOOLS.glob('apktool-lib-*.jar'))
        with zipfile.ZipFile(jar) as z:
            z.extract('prebuilt/linux/aapt2', TOOLS)
            z.extract('prebuilt/android-framework.jar', TOOLS)
        jar.unlink()
        aapt2.chmod(0o755)
    if not smali_dir.exists():
        g, a, v = SMALI.split(':')
        (TOOLS / 'pom.xml').write_text(f'''<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion><groupId>local</groupId><artifactId>tools</artifactId><version>1</version>
  <dependencies><dependency><groupId>{g}</groupId><artifactId>{a}</artifactId><version>{v}</version></dependency></dependencies>
</project>''')
        mvn('dependency:copy-dependencies', '-DoutputDirectory=smali')
    return aapt2, framework, os.pathsep.join(str(p) for p in sorted(smali_dir.glob('*.jar')))


# ---------------------------------------------------------------- zip align
def zipalign(src, dst, align=4):
    """Rewrite the zip so every STORED entry's data starts on an `align` boundary."""
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, 'w') as zout:
        for info in zin.infolist():
            data = zin.read(info)
            out = zipfile.ZipInfo(info.filename, date_time=(2008, 1, 1, 0, 0, 0))
            out.compress_type = info.compress_type
            out.external_attr = info.external_attr
            out.create_system = 0
            if info.compress_type == zipfile.ZIP_STORED:
                header_end = zout.fp.tell() + 30 + len(info.filename.encode())
                pad = (-header_end) % align
                out.extra = b'\0' * pad
            zout.writestr(out, data)


# ---------------------------------------------------------------- v2 signing
def lp(b):  # uint32 length-prefixed
    return struct.pack('<I', len(b)) + b


def find_eocd(data):
    i = data.rfind(b'PK\x05\x06')
    if i < 0:
        raise ValueError('not a zip')
    cd_size, cd_off = struct.unpack('<II', data[i + 12:i + 20])
    return i, cd_off, cd_size


def v2_digest(sections):
    chunks = []
    for s in sections:
        for o in range(0, len(s), 1 << 20):
            c = s[o:o + (1 << 20)]
            chunks.append(hashlib.sha256(b'\xa5' + struct.pack('<I', len(c)) + c).digest())
    return hashlib.sha256(b'\x5a' + struct.pack('<I', len(chunks)) + b''.join(chunks)).digest()


def load_or_create_key(key_path, cert_path):
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    if not key_path.exists():
        key_path.parent.mkdir(parents=True, exist_ok=True)
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'RIOT SHIFT Dev')])
        now = datetime.datetime.now(datetime.timezone.utc)
        cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
                .public_key(key.public_key()).serial_number(x509.random_serial_number())
                .not_valid_before(now).not_valid_after(now + datetime.timedelta(days=365 * 30))
                .sign(key, hashes.SHA256()))
        key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                               serialization.NoEncryption()))
        key_path.chmod(0o600)
        cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
        print(f'Created signing key {key_path}')
    key = serialization.load_pem_private_key(key_path.read_bytes(), password=None)
    cert = x509.load_pem_x509_certificate(cert_path.read_bytes())
    return key, cert


def sign_v2(src, dst, key, cert):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    RSA_PKCS1_SHA256 = 0x0103

    data = Path(src).read_bytes()
    eocd_off, cd_off, cd_size = find_eocd(data)
    entries, cd, eocd = data[:cd_off], data[cd_off:cd_off + cd_size], data[eocd_off:]
    digest = v2_digest([entries, cd, eocd])

    cert_der = cert.public_bytes(serialization.Encoding.DER)
    signed_data = (lp(lp(struct.pack('<I', RSA_PKCS1_SHA256) + lp(digest)))  # digests
                   + lp(lp(cert_der))                                         # certificates
                   + lp(b''))                                                 # additional attributes
    signature = key.sign(signed_data, padding.PKCS1v15(), hashes.SHA256())
    pubkey = key.public_key().public_bytes(serialization.Encoding.DER,
                                           serialization.PublicFormat.SubjectPublicKeyInfo)
    signer = lp(signed_data) + lp(lp(struct.pack('<I', RSA_PKCS1_SHA256) + lp(signature))) + lp(pubkey)
    v2_value = lp(lp(signer))

    pair = struct.pack('<I', 0x7109871a) + v2_value
    pairs = struct.pack('<Q', len(pair)) + pair
    block_size = len(pairs) + 8 + 16  # pairs + trailing size + magic
    block = struct.pack('<Q', block_size) + pairs + struct.pack('<Q', block_size) + b'APK Sig Block 42'

    new_eocd = bytearray(eocd)
    struct.pack_into('<I', new_eocd, 16, cd_off + len(block))
    Path(dst).write_bytes(entries + block + cd + bytes(new_eocd))


# ---------------------------------------------------------------- build
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=str(ROOT / 'dist/riotshift.apk'))
    ap.add_argument('--version-code', default='1')
    ap.add_argument('--version-name', default='0.1.0')
    ap.add_argument('--key', default=str(KEYS / 'signing-key.pem'))
    ap.add_argument('--cert', default=str(KEYS / 'signing-cert.pem'))
    args = ap.parse_args()

    aapt2, framework, smali_cp = ensure_tools()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        assets = tmp / 'assets'
        assets.mkdir()
        for name in WEB_FILES:
            src = ROOT / name
            if src.is_dir():
                shutil.copytree(src, assets / name, ignore=shutil.ignore_patterns('.*'))
            else:
                shutil.copy2(src, assets / name)

        run([aapt2, 'compile', '--dir', ANDROID / 'res', '-o', tmp / 'res.zip'])
        run([aapt2, 'link', '-I', framework, '--manifest', ANDROID / 'AndroidManifest.xml',
             '--min-sdk-version', MIN_SDK, '--target-sdk-version', TARGET_SDK,
             '--version-code', args.version_code, '--version-name', args.version_name,
             '-A', assets, '-o', tmp / 'base.apk', tmp / 'res.zip'])
        run(['java', '-cp', smali_cp, 'org.jf.smali.Main', 'assemble', '--api', MIN_SDK,
             '-o', tmp / 'classes.dex', ANDROID / 'smali'])
        with zipfile.ZipFile(tmp / 'base.apk', 'a', zipfile.ZIP_DEFLATED) as z:
            z.write(tmp / 'classes.dex', 'classes.dex')

        zipalign(tmp / 'base.apk', tmp / 'aligned.apk')
        key, cert = load_or_create_key(Path(args.key), Path(args.cert))
        sign_v2(tmp / 'aligned.apk', out, key, cert)

    print(f'\nBuilt {out} ({out.stat().st_size / 1e6:.1f} MB)')


if __name__ == '__main__':
    main()
