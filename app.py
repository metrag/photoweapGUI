from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify, Response
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
model = YOLO("yolov8s.pt")  # Скачается автоматически
CLASS_HUMAN = 0  # класс человека в YOLO


# === Храним последнее время изменения файла ===
last_processed_time = None

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
            name = request.form.get(f'member2_name_${j}')
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
        raw_path = os.path.join(app.config['UPLOAD_FOLDER'], 'latest.jpg')
        processed_path = os.path.join(app.config['PROCESSED_FOLDER'], 'latest_processed.jpg')

        with open(raw_path, 'wb') as f:
            f.write(request.data)

        found_human = process_and_save_image(raw_path, processed_path)

        global last_processed_time
        last_processed_time = int(time.time())

        if found_human:
            print("✅ Фото обработано")
            return jsonify({
                'status': 'success',
                'photo_url': '/latest.jpg'
            }), 200
        else:
            print("🚫 Человека нет на фото")
            return jsonify({
                'status': 'no-human',
                'photo_url': '/static/img/download.png'
            }), 200

    except Exception as e:
        print("❌ Ошибка:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/latest.jpg')
def get_latest_processed_photo():
    processed_path = os.path.join(app.config['PROCESSED_FOLDER'], 'latest_processed.jpg')
    if os.path.exists(processed_path):
        return send_from_directory(app.config['PROCESSED_FOLDER'], 'latest_processed.jpg', mimetype='image/jpeg')
    else:
        return send_from_directory('static/img/', 'download.png')


@app.route('/latest-photo')
def latest_photo():
    processed_path = os.path.join(app.config['PROCESSED_FOLDER'], 'latest_processed.jpg')
    if os.path.exists(processed_path):
        return jsonify({
            'status': 'success',
            'photo_url': '/latest.jpg'
        })
    else:
        return jsonify({
            'status': 'no-photo',
            'photo_url': '/static/img/download.png'
        })


@app.route('/ack_photo', methods=['POST'])
def ack_photo():
    """Клиент подтверждает, что получил фото → сервер удаляет его"""
    processed_path = os.path.join(app.config['PROCESSED_FOLDER'], 'latest_processed.jpg')
    if os.path.exists(processed_path):
        os.remove(processed_path)
        print("🗑 Фото удалено после вывода")
    return jsonify({'status': 'ok'})


@app.route('/update_status', methods=['POST'])
def update_status():
    data = request.get_json()
    team = data.get('team')
    number = data.get('number')
    status = data.get('status')

    print(f"[СТАТУС] Игрок {team}-{number}: {status}")

    return jsonify({'status': 'ok'})


@app.route('/photo-updated')
def photo_updated():
    def generate():
        old_mtime = None
        while True:
            processed_path = os.path.join(app.config['PROCESSED_FOLDER'], 'latest_processed.jpg')
            current_mtime = os.path.getmtime(processed_path) if os.path.exists(processed_path) else None

            if current_mtime != old_mtime and os.path.exists(processed_path):
                yield f"data: {int(time.time())}\n\n"
                old_mtime = current_mtime

            time.sleep(0.5)  # Проверяем часто, но не нагружаем систему

    return Response(generate(), mimetype='text/event-stream')


def process_and_save_image(input_path, output_path):
    # Загрузка изображения
    frame = cv2.imread(input_path)
    if frame is None:
        print("❌ Не удалось загрузить кадр")
        return False

    # Поворачиваем изображение на 90 градусов ПО ЧАСОВОЙ стрелке
    frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)

    h, w, _ = frame.shape
    center_x, center_y = w // 2, h // 2

    # Обработка модели (YOLO) с повернутым изображением
    results = model(frame, verbose=False)

    found_human = False

    for r in results:
        boxes = r.boxes
        for box in boxes:
            if int(box.cls) != CLASS_HUMAN:  # Убедись, что CLASS_HUMAN определена
                continue

            b = box.xyxy[0].tolist()
            x1, y1, x2, y2 = map(int, b)
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2

            # Рисуем чёрную рамку вокруг человека
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 0), 3)

            # Прицел в центре кадра
            color = (0, 0, 255) if abs(cx - center_x) < 50 and abs(cy - center_y) < 50 else (128, 128, 128)
            cv2.line(frame, (center_x - 20, center_y), (center_x + 20, center_y), color, 2)
            cv2.line(frame, (center_x, center_y - 20), (center_x, center_y + 20), color, 2)

            found_human = True

    if found_human:
        # Сохраняем уже повернутое изображение с разметкой
        cv2.imwrite(output_path, frame)
        print("🖼️ Фото сохранено (уже повернутое)")

    return found_human


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)