document.addEventListener("DOMContentLoaded", function () {
  const columns = document.querySelectorAll('.column');

  // === ЛЕВАЯ КОМАНДА ===
  const addBtnLeft = columns[0].querySelector('.add-member');
  const removeBtnLeft = columns[0].querySelector('.remove-member');
  const listLeft = columns[0].querySelector('.members-list');
  const countSpanLeft = columns[0].querySelector('.member-count');

  let memberCountLeft = 0;

  function updateCountLeft() {
    countSpanLeft.textContent = memberCountLeft;
  }

  addBtnLeft.addEventListener('click', () => {
    if (memberCountLeft < 99) {
      memberCountLeft++;

      const div = document.createElement('div');
      div.className = 'member-entry';

      div.innerHTML = `
        <input type="text" value="${memberCountLeft}" readonly style="width: 15%; margin-right: 5px;">
        <input type="text" placeholder="в/з" style="width: 30%; margin-right: 5px;">
        <input type="text" placeholder="ФИО" style="width: 50%;">
      `;

      listLeft.appendChild(div);
      updateCountLeft();
    }
  });

  removeBtnLeft.addEventListener('click', () => {
    if (memberCountLeft > 0 && listLeft.lastChild) {
      listLeft.removeChild(listLeft.lastChild);
      memberCountLeft--;
      updateCountLeft();
      updateMemberNumbers(listLeft, 'left');
    }
  });


  // === ПРАВАЯ КОМАНДА ===
  const addBtnRight = columns[2].querySelector('.add-member');
  const removeBtnRight = columns[2].querySelector('.remove-member');
  const listRight = columns[2].querySelector('.members-list');
  const countSpanRight = columns[2].querySelector('.member-count');

  let memberCountRight = 0;

  function updateCountRight() {
    countSpanRight.textContent = memberCountRight;
  }

  addBtnRight.addEventListener('click', () => {
    if (memberCountRight < 99) {
      memberCountRight++;

      const div = document.createElement('div');
      div.className = 'member-entry';

      div.innerHTML = `
        <input type="text" value="${memberCountRight}" readonly style="width: 15%; margin-right: 5px;">
        <input type="text" placeholder="в/з" style="width: 30%; margin-right: 5px;">
        <input type="text" placeholder="ФИО" style="width: 50%;">
      `;

      listRight.appendChild(div);
      updateCountRight();
    }
  });

  removeBtnRight.addEventListener('click', () => {
    if (memberCountRight > 0 && listRight.lastChild) {
      listRight.removeChild(listRight.lastChild);
      memberCountRight--;
      updateCountRight();
      updateMemberNumbers(listRight, 'right');
    }
  });


  // === Перенумеровка после удаления ===
  function updateMemberNumbers(list, side) {
    const entries = list.querySelectorAll('.member-entry');
    entries.forEach((entry, index) => {
      const numberInput = entry.querySelector('input[type="text"]');
      numberInput.value = index + 1;
    });

    if (side === 'left') {
      memberCountLeft = entries.length;
      updateCountLeft();
    } else if (side === 'right') {
      memberCountRight = entries.length;
      updateCountRight();
    }
  }


  document.querySelector('.start-button').addEventListener('click', function (e) {
    e.preventDefault();
  
    const columns = document.querySelectorAll('.column');
    const teamNameLeft = columns[0].querySelector('.team-name-input').value || 'Команда 1';
    const teamNameRight = columns[2].querySelector('.team-name-input').value || 'Команда 2';
  
    const listLeft = columns[0].querySelector('.members-list');
    const listRight = columns[2].querySelector('.members-list');
  
    const membersListLeft = [];
    listLeft.querySelectorAll('.member-entry').forEach((entry, index) => {
      const inputs = entry.querySelectorAll('input[type="text"]');
      const rank = inputs[1].value.trim();
      const name = inputs[2].value.trim();
      membersListLeft.push({ rank, name });
    });
  
    const membersListRight = [];
    listRight.querySelectorAll('.member-entry').forEach((entry, index) => {
      const inputs = entry.querySelectorAll('input[type="text"]');
      const rank = inputs[1].value.trim();
      const name = inputs[2].value.trim();
      membersListRight.push({ rank, name });
    });
  
    console.log("membersListLeft:", JSON.stringify(membersListLeft));
    console.log("membersListRight:", JSON.stringify(membersListRight));
  
    const payload = new URLSearchParams();
    payload.append('team1', teamNameLeft);
    payload.append('team2', teamNameRight);
  
    membersListLeft.forEach((member, i) => {
      payload.append(`member1_rank_${i + 1}`, member.rank || '');
      payload.append(`member1_name_${i + 1}`, member.name || '');
    });
  
    membersListRight.forEach((member, i) => {
      payload.append(`member2_rank_${i + 1}`, member.rank || '');
      payload.append(`member2_name_${i + 1}`, member.name || '');
    });
  
    fetch('/start', {
      method: 'POST',
      body: payload,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    .then(response => {
      if (response.redirected) {
        window.location.href = response.url;
      } else {
        return response.text().then(html => {
          document.open();
          document.write(html);
          document.close();
        });
      }
    })
    .catch(err => {
      console.error("Ошибка отправки формы:", err);
    });
  });
});