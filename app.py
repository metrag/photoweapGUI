from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
import os
import time
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'photos'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.secret_key = 'supersecretkey'

# Для хранения информации о фотографиях
photo_storage = {
    'last_photo': None,
    'photo_queue': [],
    'counter': 0
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start', methods=['GET', 'POST'])
def start():
    if request.method == 'POST':
        team1 = request.form.get('team1', 'Команда 1')
        team2 = request.form.get('team2', 'Команда 2')

        # Сбор участников
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
    
    # Передаем последнее фото при загрузке страницы
    initial_photo = None
    if photo_storage['last_photo']:
        initial_photo = f'/photos/{photo_storage["last_photo"]}'
    
    return render_template('fight.html',
                         team1=data['team1'],
                         team2=data['team2'],
                         members1=data['members1'],
                         members2=data['members2'],
                         initial_photo=initial_photo)

@app.route('/upload', methods=['POST'])
def upload_image():
    if not request.data or len(request.data) < 1024:  # Минимальный размер 1KB
        return jsonify({'status': 'error', 'message': 'Invalid image data'}), 400
    
    try:
        # Генерируем уникальное имя файла
        timestamp = int(time.time())
        filename = f"photo_{photo_storage['counter']}_{timestamp}.jpg"
        photo_storage['counter'] += 1
        
        # Сохраняем фото
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        with open(filepath, 'wb') as f:
            f.write(request.data)
        
        # Обновляем хранилище
        photo_storage['last_photo'] = filename
        photo_storage['photo_queue'].append(filename)
        
        print(f"Фото сохранено: {filename}")
        return jsonify({'status': 'success', 'filename': filename}), 200
    
    except Exception as e:
        print(f"Ошибка при сохранении фото: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_last_photo')
def get_last_photo():
    if not photo_storage['last_photo']:
        return jsonify({'status': 'no_photo'}), 404
    
    return jsonify({
        'status': 'success',
        'photo_url': f'/photos/{photo_storage["last_photo"]}',
        'timestamp': int(time.time())
    })

@app.route('/photos/<filename>')
def serve_photo(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        return jsonify({'status': 'error', 'message': 'Photo not found'}), 404

@app.route('/update_status', methods=['POST'])
def update_status():
    data = request.get_json()
    team = data.get('team')
    number = data.get('number')
    status = data.get('status')
    
    print(f"[STATUS] Player {team}-{number}: {status}")
    
    # Всегда возвращаем последнее фото при обновлении статуса
    if photo_storage['last_photo']:
        return jsonify({
            'status': 'success',
            'photo_url': f'/photos/{photo_storage["last_photo"]}',
            'timestamp': int(time.time())
        })
    
    return jsonify({'status': 'no_photo'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)