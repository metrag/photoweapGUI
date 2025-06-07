from flask import Flask, render_template, request, redirect, url_for, session, send_from_directory
import os

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'photos'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Лимит 16 МБ

app.secret_key = 'supersecretkey'  # Нужен для использования session
UPLOAD_FOLDER = 'photos'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# === Главная страница ===
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start', methods=['GET', 'POST'])
def start():
    if request.method == 'POST':
        team1 = request.form.get('team1', 'Команда 1')
        team2 = request.form.get('team2', 'Команда 2')

        print("team1:", team1)
        print("team2:", team2)

        # === Сбор участников ===
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

        print("members1:", members1)
        print("members2:", members2)

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
        return "Нет данных", 404

    return render_template('fight.html',
                           team1=data['team1'],
                           team2=data['team2'],
                           members1=data['members1'],
                           members2=data['members2'])


@app.route('/upload', methods=['POST'])
def upload_image():
    if not request.data:
        return "Нет данных", 400

    photo_path = os.path.join(app.config['UPLOAD_FOLDER'], "latest.jpg")
    with open(photo_path, 'wb') as f:
        f.write(request.data)

    print("✅ Фото сохранено как latest.jpg")
    return "OK", 200


@app.route('/latest.jpg')
def get_latest_photo():
    return send_from_directory(app.config['UPLOAD_FOLDER'], "latest.jpg")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)