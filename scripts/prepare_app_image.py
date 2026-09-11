from PIL import Image
from pathlib import Path

source = Path('/home/ubuntu/school-calendar-android/assets/images/school-calendar-hero.png')
target = Path('/home/ubuntu/school-calendar-android/assets/images/school-calendar-hero-small.jpg')
image = Image.open(source).convert('RGB')
image.thumbnail((720, 720), Image.Resampling.LANCZOS)
image.save(target, 'JPEG', quality=86, optimize=True)
print(target, image.size)
