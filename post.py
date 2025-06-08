import requests

# Настройки
server_url = "http://localhost:5000/upload"  # Меняй на IP сервера, если он удалённый
image_path = "test4.jpg"  # Путь к изображению

# Отправляем фото
with open(image_path, "rb") as f:
    image_data = f.read()

response = requests.post(server_url, data=image_data)

# Проверяем ответ
if response.status_code == 200:
    print("✅ Фото успешно отправлено!")
else:
    print(f"❌ Ошибка: {response.status_code} — {response.text}")