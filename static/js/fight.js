// Получаем данные участников из HTML
const members1 = JSON.parse(document.getElementById('members1-data').textContent);
const members2 = JSON.parse(document.getElementById('members2-data').textContent);

// DOM элементы
const numberGroup = document.getElementById("number-radio-group");
const btnAlive = document.getElementById("btn-alive");
const btnDead = document.getElementById("btn-dead");
const cameraFeed = document.getElementById("camera-feed");

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Устанавливаем начальное фото (если есть)
    const initialPhoto = document.getElementById('initial-photo').value;
    if (initialPhoto && initialPhoto !== 'None') {
        updatePhotoDisplay(initialPhoto);
    }

    // Заполняем номера участников для выбранной команды
    populateNumbers(getSelectedTeam());
    
    // Настраиваем обработчики событий
    setupEventListeners();
});

// Обновляет отображение фото
function updatePhotoDisplay(photoUrl) {
    if (!photoUrl) return;
    
    // Добавляем параметр времени для предотвращения кеширования
    const timestamp = new Date().getTime();
    cameraFeed.src = `${photoUrl}?t=${timestamp}`;
    cameraFeed.style.display = 'block';
}

// Заполняет радио-кнопки с номерами участников
function populateNumbers(team) {
    numberGroup.innerHTML = "";
    
    const list = team === "1" ? members1 : members2;
    
    if (!list || list.length === 0) {
        numberGroup.innerHTML = "<em>Нет участников</em>";
        return;
    }
    
    list.forEach((_, index) => {
        const num = index + 1;
        const id = `number-${team}-${num}`;
        
        const label = document.createElement("label");
        label.htmlFor = id;
        label.style.marginRight = "15px";
        
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "number-select";
        radio.value = num;
        radio.id = id;
        if (index === 0) radio.checked = true;
        
        label.appendChild(radio);
        label.appendChild(document.createTextNode(num));
        
        numberGroup.appendChild(label);
    });
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик изменения команды
    document.querySelectorAll('input[name="team-select"]').forEach(radio => {
        radio.addEventListener("change", (e) => {
            populateNumbers(e.target.value);
        });
    });
    
    // Кнопки статуса
    btnAlive.addEventListener("click", () => setStatus(true));
    btnDead.addEventListener("click", () => setStatus(false));
}

// Получает выбранную команду
function getSelectedTeam() {
    const selected = document.querySelector('input[name="team-select"]:checked');
    return selected ? selected.value : null;
}

// Получает выбранный номер участника
function getSelectedNumber() {
    const selected = document.querySelector('input[name="number-select"]:checked');
    return selected ? selected.value : null;
}

// Устанавливает статус участника
function setStatus(isAlive) {
    const team = getSelectedTeam();
    const number = getSelectedNumber();
    
    if (!team || !number) {
        alert("Выберите команду и номер игрока");
        return;
    }
    
    const button = getStatusButton(team, number);
    if (!button) return;
    
    updateButtonStatus(button, isAlive);
    updateCounters(team, isAlive);
    
    // При нажатии "Убит" запрашиваем новое фото
    if (!isAlive) {
        fetchNewPhoto(team, number);
    }
}

// Находит кнопку статуса для участника
function getStatusButton(team, number) {
    const columnIndex = team === "1" ? 1 : 3;
    return document.querySelector(
        `.column:nth-child(${columnIndex}) .members-list button[data-number="${number}"]`
    );
}

// Обновляет визуальное состояние кнопки статуса
function updateButtonStatus(button, isAlive) {
    const oldStatus = button.dataset.status;
    const newStatus = isAlive ? "alive" : "dead";
    
    if (oldStatus === newStatus) return;
    
    button.dataset.status = newStatus;
    button.classList.toggle("active", isAlive);
    button.classList.toggle("inactive", !isAlive);
}

// Обновляет счетчики живых/убитых
function updateCounters(team, isAlive) {
    const columnIndex = team === "1" ? 1 : 3;
    const column = document.querySelector(`.column:nth-child(${columnIndex})`);
    const aliveSpan = column.querySelector(".in-battle-count");
    const deadSpan = column.querySelector(".killed-count");
    
    const aliveCount = parseInt(aliveSpan.textContent);
    const deadCount = parseInt(deadSpan.textContent);
    
    if (isAlive) {
        aliveSpan.textContent = aliveCount + 1;
        deadSpan.textContent = Math.max(0, deadCount - 1);
    } else {
        aliveSpan.textContent = Math.max(0, aliveCount - 1);
        deadSpan.textContent = deadCount + 1;
    }
}

// Запрашивает новое фото при нажатии "Убит"
function fetchNewPhoto(team, number) {
    fetch('/update_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            team: team,
            number: number,
            status: 'dead'
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            updatePhotoDisplay(data.photo_url);
            console.log('Фото обновлено:', data.photo_url);
        } else {
            console.log('Нет доступных фото');
        }
    })
    .catch(error => {
        console.error('Ошибка при получении фото:', error);
    });
}