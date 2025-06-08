document.addEventListener('DOMContentLoaded', () => {
  // === DOM элементы ===
  const teamRadios = document.querySelectorAll('input[name="team-select"]');
  const numberGroup = document.getElementById("number-radio-group");
  const btnAlive = document.getElementById("btn-alive");
  const btnDead = document.getElementById("btn-dead");

  let currentTeam = "1";
  let currentNumber = "1";

  const cameraFeed = document.getElementById("camera-feed");
  const defaultPhotoUrl = "/static/img/download.png";
  let lastPhotoUrl = null;
  let isWaitingForAction = false;

  // === Заполняем номера участников ===
  populateNumbers(currentTeam);

  // === Подписываемся на события ===
  teamRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentTeam = e.target.value;
      populateNumbers(currentTeam);
    });
  });

  btnAlive.addEventListener("click", () => handleStatus(true));
  btnDead.addEventListener("click", () => handleStatus(false));


  // === Автообновление фото ===
  function checkForNewPhotos() {
    fetch("/latest-photo")
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          lastPhotoUrl = data.photo_url;
          isWaitingForAction = true; // Ждём решения пользователя
          updatePhotoDisplay(lastPhotoUrl);
        } else {
          if (!isWaitingForAction) {
            updatePhotoDisplay(defaultPhotoUrl);
          }
        }
      })
      .catch(err => console.error("Ошибка получения фото:", err))
      .finally(() => {
        setTimeout(checkForNewPhotos, 3000); // Каждые 3 секунды
      });
  }

  checkForNewPhotos(); // Стартуем автообновление


  // === Обновление фото в интерфейсе ===
  function updatePhotoDisplay(photoUrl) {
    if (!cameraFeed) return;

    cameraFeed.src = photoUrl;
    cameraFeed.style.display = 'block';
  }


  // === Получение данных о кнопке статуса ===
  function getStatusButton(team, number) {
    const columnIndex = team === "1" ? 1 : 3;
    return document.querySelector(
      `.column:nth-child(${columnIndex}) .members-list button[data-number="${number}"]`
    );
  }

  function updateButtonStatus(button, isAlive) {
    if (!button) return;
    button.dataset.status = isAlive ? "alive" : "dead";
    button.classList.remove("active", "inactive");
    button.classList.add(isAlive ? "active" : "inactive");
  }

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

  // === Обработка нажатия "Жив"/"Убит" ===
  function handleStatus(isAlive) {
    const team = document.querySelector('input[name="team-select"]:checked')?.value;
    const number = document.querySelector('input[name="number-select"]:checked')?.value;

    if (!team || !number) {
      alert("Выберите команду и номер участника");
      return;
    }

    const button = getStatusButton(team, number);
    if (!button) return;

    updateButtonStatus(button, isAlive);
    updateCounters(team, isAlive);

    // Отправляем статус на сервер
    fetch('/update_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, number, status: isAlive ? 'alive' : 'dead' })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'next-photo-available') {
        fetchNextPhoto();
      } else {
        // Нет новых фото → снова начинаем автообновление
        isWaitingForAction = false;
      }
    })
    .catch(err => {
      console.error("Ошибка отправки статуса:", err);
      fetchNextPhoto();
    });
  }


  // === Получение следующего фото ===
  function fetchNextPhoto() {
    fetch("/latest-photo")
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          lastPhotoUrl = data.photo_url;
          isWaitingForAction = true;
          updatePhotoDisplay(lastPhotoUrl);
        } else {
          lastPhotoUrl = defaultPhotoUrl;
          isWaitingForAction = false;
          updatePhotoDisplay(defaultPhotoUrl);
        }
      })
      .catch(err => {
        console.error("Ошибка получения фото:", err);
        updatePhotoDisplay(defaultPhotoUrl);
        isWaitingForAction = false;
      });
  }


  // === Заполнение номеров игроков ===
  function populateNumbers(team) {
    numberGroup.innerHTML = "";

    const list = team === "1" ? members1 : members2;

    if (!list || list.length === 0) {
      numberGroup.innerHTML = "<em>Нет участников</em>";
      return;
    }

    list.forEach((_, index) => {
      const num = index + 1;
      const label = document.createElement("label");
      label.style.marginRight = "15px";
      label.innerHTML = `
        <input type="radio" name="number-select" value="${num}" ${index === 0 ? 'checked' : ''}>
        ${num}
      `;
      numberGroup.appendChild(label);
    });
  }
});