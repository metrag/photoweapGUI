document.addEventListener('DOMContentLoaded', () => {
  // === DOM элементы ===
  const teamRadios = document.querySelectorAll('input[name="team-select"]');
  const numberGroup = document.getElementById("number-radio-group");
  const btnAlive = document.getElementById("btn-alive");
  const btnDead = document.getElementById("btn-dead");

  let currentTeam = "1";
  let currentNumber = "1";

  // === Заполняем номера участников по умолчанию ===
  populateNumbers(currentTeam);

  // === Обработчики событий ===
  teamRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentTeam = e.target.value;
      populateNumbers(currentTeam);
    });
  });

  btnAlive.addEventListener("click", () => setStatus(true));
  btnDead.addEventListener("click", () => setStatus(false));

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
      const radio = document.createElement("input");

      radio.type = "radio";
      radio.name = "number-select";
      radio.value = num;
      radio.id = `number-${team}-${num}`;
      if (index === 0) radio.checked = true;

      label.setAttribute("for", radio.id);
      label.style.marginRight = "15px";
      label.innerHTML = `<input type="radio" name="number-select" value="${num}" ${index === 0 ? 'checked' : ''}> ${num}`;

      numberGroup.appendChild(label);
    });
  }

  // === Обновление статуса игрока ===
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

  function setStatus(isAlive) {
    const team = document.querySelector('input[name="team-select"]:checked')?.value;
    const number = document.querySelector('input[name="number-select"]:checked')?.value;

    if (!team || !number) {
      alert("Выберите команду и номер");
      return;
    }

    const button = getStatusButton(team, number);
    if (!button) return;

    updateButtonStatus(button, isAlive);
    updateCounters(team, isAlive);

    console.log(`[STATUS] Участник ${team}-${number} → ${isAlive ? 'жив' : 'убит'}`);
  }

  // === Автоматическое обновление фото ===
  const cameraFeed = document.getElementById("camera-feed");
  let lastPhotoUrl = null;

  function checkForNewPhotos() {
    fetch("/latest-photo")
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          if (lastPhotoUrl !== data.photo_url) {
            lastPhotoUrl = data.photo_url;
            updatePhotoDisplay(lastPhotoUrl);
          }
        } else {
          if (!cameraFeed.src.includes("download.png")) {
            updatePhotoDisplay("/static/img/download.png");
          }
        }
      })
      .catch(err => console.error("Ошибка загрузки фото:", err))
      .finally(() => {
        setTimeout(checkForNewPhotos, 3000); // Каждые 3 секунды
      });
  }

  function updatePhotoDisplay(photoUrl) {
    cameraFeed.src = photoUrl;
    cameraFeed.style.display = "block";
  }

  checkForNewPhotos(); // Запускаем опрос сервера
});