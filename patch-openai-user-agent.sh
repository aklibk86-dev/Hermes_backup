#!/command/with-contenv sh
# Patch the OpenAI Python SDK's User-Agent to avoid 403 from API relay
# This runs as an s6 cont-init script on every container start
set -e

TARGET="/opt/hermes/.venv/lib/python3.13/site-packages/openai/_base_client.py"
if [ -f "$TARGET" ]; then
    # Replace the OpenAI/Python User-Agent with a generic one
    sed -i 's/return f"{self.__class__.__name__}\/Python {self._version}"/return "Mozilla\/5.0 (compatible; Hermes)"/' "$TARGET"
    echo "[patch] OpenAI User-Agent patched successfully"
else
    echo "[patch] WARNING: $TARGET not found"
fi
