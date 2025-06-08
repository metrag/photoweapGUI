from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
import os
import time
import cv2
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'photos'
app.config['PROCESSED_FOLDER'] = 'processed'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)
app.secret_key = 'supersecretkey'

# === Загрузка модели YOLO ===
model = YOLO("yolov8s.pt")  # Скачается при первом запуске
CLASS_HUMAN = 0  # В YOLO класс человека — это 0

# === Храним список обработанных файлов ===
processed_files = []

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/start', methods=['GET', 'POST'])
def start():
    if request.method == 'POST':
        team1 = request.form.get('team1', 'Команда 1')
        team2 = request.form.get('team2', 'Команда 2')

        members1 = []
        i = 1
        while True:
            rank = request.form.get(f'member1_rank_{i}')
            name = request.form.get(f'member1_name_{i}')
            if not rank and not name:
                break
            members1.append({'rank': rank or '', 'name': name or ''})
            i += 1

        members2 = []
        j = 1
        while True:
            rank = request.form.get(f'member2_rank_{j}')
            name = request.form.get(f'member2_name_{j}')
            if not rank and not name:
                break
            members2.append({'rank': rank or '', 'name': name or ''})
            j += 1

        session['fight_data'] = {
            'team1': team1,
            'team2': team2,
            'members1': members1,
            'members2': members2
        }

        return redirect(url_for('fight'))

    return render_template('start.html')


@app.route('/fight')
def fight():
    data = session.get('fight_data')
    if not data:
        return redirect(url_for('start'))

    return render_template('fight.html',
                           team1=data['team1'],
                           team2=data['team2'],
                           members1=data['members1'],
                           members2=data['members2'])


@app.route('/upload', methods=['POST'])
def upload_image():
    if not request.data or len(request.data) < 1024:
        return jsonify({'status': 'error', 'message': 'Неверные данные'}), 400

    try:
        timestamp = int(time.time())
        raw_path = os.path.join(app.config['UPLOAD_FOLDER'], f'latest.jpg')  # Сохраняем как latest.jpg
        processed_path = os.path.join(app.config['PROCESSED_FOLDER'], f'latest_processed_{timestamp}.jpg')

        with open(raw_path, 'wb') as f:
            f.write(request.data)

        # Обработка фото
        process_and_save_image(raw_path, processed_path)

        # Добавляем в очередь обработанных
        processed_files.insert(0, f'latest_processed_{timestamp}.jpg')

        print("✅ Фото сохранено и обработано")
        return jsonify({'status': 'success'}), 200

    except Exception as e:
        print("❌ Ошибка:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/get_next_photo')
def get_next_photo():
    """Возвращает последнее обработанное фото или download.png"""
    if len(processed_files) > 0:
        filename = processed_files.pop(0)
        photo_url = f'/processed/{filename}'
        return jsonify({
            'status': 'success',
            'photo_url': photo_url + '?t=' + str(int(time.time()))
        })
    else:
        return jsonify({
            'status': 'no-photo',
            'photo_url': '/static/img/download.png'
        })


@app.route('/processed/<filename>')
def serve_processed(filename):
    return send_from_directory(app.config['PROCESSED_FOLDER'], filename)


@app.route('/update_status', methods=['POST'])
def update_status():
    data = request.get_json()
    team = data.get('team')
    number = data.get('number')
    status = data.get('status')

    print(f"[СТАТУС] Игрок {team}-{number}: {status}")

    return jsonify({'status': 'ok'})


def process_and_save_image(input_path, output_path):
    frame = cv2.imread(input_path)
    h, w, _ = frame.shape
    center_x, center_y = w // 2, h // 2

    results = model(input_path, verbose=False)

    hit = False

    for r in results:
        boxes = r.boxes
        for box in boxes:
            if int(box.cls) != CLASS_HUMAN:
                continue

            b = box.xyxy[0].tolist()
            x1, y1, x2, y2 = map(int, b)
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2

            # Рисуем чёрную рамку вокруг человека
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 3)

            # Проверяем, находится ли человек в центре
            if abs(cx - center_x) < 50 and abs(cy - center_y) < 50:
                hit = True  # Человек поражён

    # === Рисуем крест-прицел: красный или серый ===
    color = (0, 0, 255) if hit else (128, 128, 128)

    cv2.line(frame, (center_x - 20, center_y), (center_x + 20, center_y), color, 2)
    cv2.line(frame, (center_x, center_y - 20), (center_x, center_y + 20), color, 2)

    # Сохраняем обработанное фото
    cv2.imwrite(output_path, frame)
    print("🖼️ Фото обработано и сохранено")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)