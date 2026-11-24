import urllib.request
import json

BASE = 'https://mrdev444-scenario-training-backend.hf.space'
login_url = f'{BASE}/api/auth/login'
login_data = json.dumps({'passcode': 'UZAIR-2026', 'display_name': 'Dev'}).encode('utf-8')
req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})
token = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))['access_token']
print('Login token acquired.')

tts_url = f'{BASE}/api/voice/tts?text=Hello+I+want+to+talk+about+the+budget&voice=male'
audio_bytes = urllib.request.urlopen(tts_url).read()
print('Fetched TTS audio bytes:', len(audio_bytes))

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
parts = [
    (f'--{boundary}\r\n'
     'Content-Disposition: form-data; name="file"; filename="audio.mp3"\r\n'
     'Content-Type: audio/mpeg\r\n\r\n').encode('utf-8'),
    audio_bytes,
    f'\r\n--{boundary}--\r\n'.encode('utf-8')
]
body = b''.join(parts)

trans_req = urllib.request.Request(
    f'{BASE}/api/voice/transcribe',
    data=body,
    headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'Authorization': f'Bearer {token}'
    }
)
try:
    with urllib.request.urlopen(trans_req, timeout=30) as tr_resp:
        result = json.loads(tr_resp.read().decode('utf-8'))
        print('Transcription status:', tr_resp.status, 'Result:', result)
except Exception as e:
    print('Transcription FAILED:', e)
