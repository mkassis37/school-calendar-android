from PIL import Image
from pathlib import Path

path = Path('/home/ubuntu/school-calendar-android/assets/images/icon.png')
image = Image.open(path).convert('RGB')
image.thumbnail((512, 512), Image.Resampling.LANCZOS)
image.save(path, 'PNG', optimize=True)
print(path, image.size)
