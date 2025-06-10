document.addEventListener('DOMContentLoaded', () => {
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

  window.members1 = window.members1 || [];
  window.members2 = window.members2 || [];

  populateNumbers(currentTeam);

  teamRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentTeam = e.target.value;
      populateNumbers(currentTeam);
    });
  });

  btnAlive.addEventListener("click", () => handleStatus(true));
  btnDead.addEventListener("click", () => handleStatus(false));


  function fetchNextPhoto() {
    fetch("/latest-photo")
      .then(response => response.json())
      .then(data => {
        if (data.status === "success") {
          lastPhotoUrl = data.photo_url + '?t=' + Date.now();
          isWaitingForAction = true;
          updatePhotoDisplay(lastPhotoUrl);
          enableControls();
        } else {
          lastPhotoUrl = defaultPhotoUrl + '?t=' + Date.now();
          isWaitingForAction = false;
          updatePhotoDisplay(defaultPhotoUrl);
          disableControls();
        }
      })
      .catch(err => {
        console.error("Ошибка получения фото:", err);
        lastPhotoUrl = defaultPhotoUrl + '?t=' + Date.now();
        updatePhotoDisplay(defaultPhotoUrl);
        disableControls();
      });
  }

  // === Обновление фото в интерфейсе ===
  function updatePhotoDisplay(photoUrl) {
    if (!cameraFeed) return;
    cameraFeed.src = photoUrl;
    cameraFeed.style.display = 'block';
  }

  // === Подписываемся на события обновления фото ===
  function subscribeToPhotoUpdates() {
    const eventSource = new EventSource("/photo-updated");

    eventSource.onmessage = function(event) {
      console.log("📷 Новое фото доступно", event.data);
      fetchNextPhoto(); // Мгновенно запрашиваем новое фото
    };

    eventSource.onerror = function(err) {
      console.error("⚠️ Ошибка SSE:", err);
      setTimeout(() => subscribeToPhotoUpdates(), 5000); // Переподписываемся
    };
  }

  subscribeToPhotoUpdates(); // Подписываемся на обновления
  fetchNextPhoto(); // Запрашиваем начальное фото


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

  function disableControls() {
    document.querySelectorAll('input[name="team-select"]').forEach(input => input.disabled = true);
    document.querySelectorAll('input[name="number-select"]').forEach(input => input.disabled = true);
    btnAlive.disabled = true;
    btnDead.disabled = true;
    btnAlive.classList.add("disabled");
    btnDead.classList.add("disabled");
  }

  function enableControls() {
    document.querySelectorAll('input[name="team-select"]').forEach(input => input.disabled = false);
    document.querySelectorAll('input[name="number-select"]').forEach(input => input.disabled = false);
    btnAlive.disabled = false;
    btnDead.disabled = false;
    btnAlive.classList.remove("disabled");
    btnDead.classList.remove("disabled");
  }

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
    .then(() => {
      // Уведомляем сервер о том, что фото использовано
      return fetch('/ack_photo', { method: 'POST' });
    })
    .then(() => {
      fetchNextPhoto(); // Запрашиваем следующее фото (может быть download.png)
    })
    .catch(err => {
      console.error("Ошибка:", err);
      fetchNextPhoto();
    });
  }

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
      label.setAttribute("for", id);
      label.style.marginRight = "15px";
      label.innerHTML = `
        <input type="radio" name="number-select" value="${num}" ${index === 0 ? 'checked' : ''}>
        ${num}
      `;
      numberGroup.appendChild(label);
    });
  }

  disableControls();

  function disableControls() {
    document.querySelectorAll('input[name="team-select"]').forEach(input => input.disabled = true);
    document.querySelectorAll('input[name="number-select"]').forEach(input => input.disabled = true);
    btnAlive.disabled = true;
    btnDead.disabled = true;
    btnAlive.classList.add("disabled");
    btnDead.classList.add("disabled");
  }

  function enableControls() {
    document.querySelectorAll('input[name="team-select"]').forEach(input => input.disabled = false);
    document.querySelectorAll('input[name="number-select"]').forEach(input => input.disabled = false);
    btnAlive.disabled = false;
    btnDead.disabled = false;
    btnAlive.classList.remove("disabled");
    btnDead.classList.remove("disabled");
  }
});