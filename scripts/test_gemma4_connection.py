"""
Diagnostic script to test connectivity with Google Gemma 4 via:
1. Google AI Studio (generativelanguage.googleapis.com)
2. Local Ollama (localhost:11434/v1)
3. OpenRouter (openrouter.ai/api/v1)
"""
import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

def test_connection():
    preset = os.environ.get("COPILOT_PRESET", "aistudio").lower()
    base_url = os.environ.get("COPILOT_BASE_URL", "").strip()
    api_key = os.environ.get("COPILOT_API_KEY", "")
    model = os.environ.get("COPILOT_MODEL", "")

    print("=" * 60)
    print("  FLYTOPS · GEMMA 4 CONNECTIVITY TEST")
    print("=" * 60)
    print(f"  Target Preset: {preset}")

    if preset == "ollama":
        endpoint = base_url or "http://localhost:11434/v1/chat/completions"
        target_model = model or "gemma4:31b"
        headers = {"Content-Type": "application/json"}
    elif preset == "openrouter":
        endpoint = base_url or "https://openrouter.ai/api/v1/chat/completions"
        target_model = model or "google/gemma-4-31b-it:free"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    else:  # aistudio default
        endpoint = base_url or "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        target_model = model or "gemma-4-31b-it"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    print(f"  Endpoint: {endpoint}")
    print(f"  Model:    {target_model}")
    print(f"  API Key:  {'[SET: ' + api_key[:6] + '...]' if api_key else '[NONE / LOCAL]'}")
    print("-" * 60)

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": "You are the FlytBase Asset Intelligence Copilot."},
            {"role": "user", "content": "Respond with: 'Gemma 4 online and ready for operations.'"}
        ],
        "temperature": 0.1,
        "max_tokens": 50
    }

    try:
        print("  Sending ping to model...")
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            reply = data["choices"][0]["message"]["content"].strip()
            print("  [SUCCESS] Model Response:")
            print(f"  --> \"{reply}\"")
            print("=" * 60)
            return True
        else:
            print(f"  [ERROR] Status Code {resp.status_code}: {resp.text}")
            print("=" * 60)
            return False
    except Exception as e:
        print(f"  [CONNECTION FAILED]: {e}")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
