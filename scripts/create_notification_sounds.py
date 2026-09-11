import math
import struct
import wave
from pathlib import Path

out = Path('/home/ubuntu/school-calendar-android/assets/sounds')
out.mkdir(parents=True, exist_ok=True)
rate = 44100

def tone(path: Path, notes: list[tuple[float, float]], gap: float = 0.04):
    samples = []
    for frequency, duration in notes:
        count = int(rate * duration)
        for i in range(count):
            envelope = min(1.0, i / (rate * 0.02), (count - i) / (rate * 0.06))
            value = 0.28 * envelope * math.sin(2 * math.pi * frequency * i / rate)
            samples.append(struct.pack('<h', int(value * 32767)))
        samples.extend([struct.pack('<h', 0)] * int(rate * gap))
    with wave.open(str(path), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(b''.join(samples))

tone(out / 'homework-soft.wav', [(660.0, 0.22), (880.0, 0.28)])
tone(out / 'exam-alert.wav', [(880.0, 0.18), (660.0, 0.18), (880.0, 0.34)])
print('created', *(str(path) for path in out.glob('*.wav')))
