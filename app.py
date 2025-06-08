from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory, jsonify
import os
import time

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'photos'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.secret_key = 'supersecretkey'

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/start', methods=['GET', 'POST'])
def start():
    if request.method == 'POST':
        team1 = request.form.get('team1', 'Команда 1')
        team2 = request.form.get('team2', 'Команда 2')

        # === Сбор участников команды 1 ===
        members1 = []
        i = 1
        while True:
            rank = request.form.get(f'member1_rank_{i}')
            name = request.form.get(f'member1_name_{i}')
            if not rank and not name:
                break
            members1.append({'rank': rank or '', 'name': name or ''})
            i += 1

        # === Сбор участников команды 2 ===
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
        filename = f"photo_{timestamp}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        with open(filepath, 'wb') as f:
            f.write(request.data)

        print(f"✅ Фото сохранено: {filename}")
        return jsonify({
            'status': 'success',
            'filename': filename
        }), 200

    except Exception as e:
        print("❌ Ошибка:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/latest-photo')
def latest_photo():
    try:
        files = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

        if not files:
            return jsonify({
                'status': 'no-photo',
                'photo_url': '/static/img/download.png'
            })

        def get_mtime(f):
            return os.path.getmtime(os.path.join(app.config['UPLOAD_FOLDER'], f))

        latest_file = max(files, key=get_mtime)
        photo_url = f'/photos/{latest_file}'

        return jsonify({
            'status': 'success',
            'photo_url': photo_url + '?t=' + str(int(time.time()))
        })

    except Exception as e:
        print("Ошибка получения фото:", str(e))
        return jsonify({
            'status': 'error',
            'photo_url': '/static/img/download.png'
        })


@app.route('/photos/<filename>')
def serve_photo(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        return send_from_directory('static/img/', 'download.png')


@app.route('/update_status', methods=['POST'])
def update_status():
    data = request.get_json()
    team = data.get('team')
    number = data.get('number')
    status = data.get('status')

    print(f"[СТАТУС] Игрок {team}-{number}: {status}")

    return jsonify({
        'status': 'ok'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)