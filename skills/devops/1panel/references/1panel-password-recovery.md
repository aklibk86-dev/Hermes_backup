# 1Panel Password Recovery (from SQLite Database)

When you have **SSH root access** to the 1Panel server but forgot the web UI password, the panel's `settings` table in SQLite stores the encrypted password. You can **decrypt it** without resetting it.

## Location

| Item | Path |
|------|------|
| SQLite DB | `/opt/1panel/db/core.db` |
| Config (encrypted) | `/etc/1panel/.1panel` |
| CLI | `/usr/local/bin/1pctl` |

## Decryption Method

1Panel encrypts the password using **AES-128-CBC** with the `EncryptKey` as the raw 16-byte key. The ciphertext layout is: **first 16 bytes = IV, next 16 bytes = encrypted password**.

### Step 1: Extract the encrypted password and key

```bash
python3 << 'PYEOF'
import sqlite3

conn = sqlite3.connect('/opt/1panel/db/core.db')
c = conn.cursor()
c.execute("SELECT key, value FROM settings WHERE key IN ('Password', 'EncryptKey')")
rows = {r[0]: r[1] for r in c.fetchall()}

print(f"Encrypted password (base64): {rows.get('Password')}")
print(f"EncryptKey: {rows.get('EncryptKey')}")
PYEOF
```

### Step 2: Decrypt using Python (cryptography library, usually pre-installed)

```python
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

encrypted_b64 = "PASTE_ENCRYPTED_PASSWORD_HERE"
encrypt_key = "PASTE_ENCRYPTKEY_HERE"  # 16-char AES key

encrypted = base64.b64decode(encrypted_b64)
key = encrypt_key.encode('utf-8')  # 16 bytes

# Layout: first 16 bytes = IV, next 16 bytes = ciphertext
iv = encrypted[:16]
ct = encrypted[16:32]

cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
decryptor = cipher.decryptor()
decrypted = decryptor.update(ct) + decryptor.finalize()

# Strip PKCS7 padding
padding_len = decrypted[-1]
password = decrypted[:-padding_len].decode('utf-8')

print(f"Decrypted password: {password}")
```

### Step 3: One-liner (all at once)

```bash
python3 << 'PYEOF'
import sqlite3, base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

conn = sqlite3.connect('/opt/1panel/db/core.db')
c = conn.cursor()
c.execute("SELECT key, value FROM settings WHERE key IN ('Password', 'EncryptKey')")
rows = {r[0]: r[1] for r in c.fetchall()}

enc = base64.b64decode(rows['Password'])
key = rows['EncryptKey'].encode()
cipher = Cipher(algorithms.AES(key), modes.CBC(enc[:16]), backend=default_backend())
pw = cipher.decryptor().update(enc[16:32]) + cipher.decryptor().finalize()
print(f"Password: {pw[:-pw[-1]].decode()}")
PYEOF
```

## Verification

- The decrypted password should be a short alphanumeric string (typically 10-12 chars)
- After PKCS7 stripping, the output is clean plaintext
- Test by logging into `http://IP:PORT/SECURITY_ENTRANCE` with the discovered password

## Alternative (if you don't have Python cryptography)

Use `openssl` with the RSA private key from the database:

```bash
# Extract the RSA private key
python3 -c "
import sqlite3
conn = sqlite3.connect('/opt/1panel/db/core.db')
v = conn.execute(\"SELECT value FROM settings WHERE key='PASSWORD_PRIVATE_KEY'\").fetchone()[0]
with open('/tmp/pk.pem', 'w') as f: f.write(v)
"

# Decrypt the password (first base64 decode then RSA decrypt)
python3 -c "
import sqlite3, base64
conn = sqlite3.connect('/opt/1panel/db/core.db')
v = conn.execute(\"SELECT value FROM settings WHERE key='Password'\").fetchone()[0]
with open('/tmp/enc.b64', 'w') as f: f.write(v)
"
base64 -d /tmp/enc.b64 > /tmp/enc.bin
openssl pkeyutl -decrypt -inkey /tmp/pk.pem -in /tmp/enc.bin
```

> **Note**: The RSA approach only works if the encrypted blob is 256 bytes (2048-bit RSA ciphertext). The AES-CBC approach above is the primary encryption method for newer 1Panel versions — try it first.

## Pitfall

- The `PASSWORD_PRIVATE_KEY` in the settings table may be a **2048-bit RSA key** used to encrypt an AES key, not the password directly. Modern 1Panel encrypts the password directly with AES-128-CBC using the `EncryptKey`. If decryption produces garbage, the encryption scheme may have changed between versions — check the 1Panel source code for the current cipher configuration.
