document.addEventListener("DOMContentLoaded", function () {
  // === ЛЕВАЯ КОМАНДА ===
  const addBtnLeft = document.querySelector('.column:nth-child(1) .add-member');
  const removeBtnLeft = document.querySelector('.column:nth-child(1) .remove-member');
  const listLeft = document.querySelector('.column:nth-child(1) .members-list');
  const countSpanLeft = document.querySelector('.column:nth-child(1) .member-count');
  const players1Display = document.getElementById('players1');

  let memberCountLeft = 0;

  function updateCountLeft() {
    countSpanLeft.textContent = memberCountLeft;
    players1Display.textContent = memberCountLeft;
  }

  addBtnLeft.addEventListener('click', () => {
    if (memberCountLeft < 99) {
      memberCountLeft++;

      const div = document.createElement('div');
      div.className = 'member-entry';

      // Поле № будет заполнено автоматически через memberCountLeft
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

      // Перенумеровываем оставшиеся поля
      updateMemberNumbers(listLeft, 'left');
    }
  });


  // === ПРАВАЯ КОМАНДА ===
  const addBtnRight = document.querySelector('.column:nth-child(3) .add-member');
  const removeBtnRight = document.querySelector('.column:nth-child(3) .remove-member');
  const listRight = document.querySelector('.column:nth-child(3) .members-list');
  const countSpanRight = document.querySelector('.column:nth-child(3) .member-count');
  const players2Display = document.getElementById('players2');

  let memberCountRight = 0;

  function updateCountRight() {
    countSpanRight.textContent = memberCountRight;
    players2Display.textContent = memberCountRight;
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

      // Перенумеровываем оставшиеся поля
      updateMemberNumbers(listRight, 'right');
    }
  });


  // === Функция для перенумерации оставшихся участников ===
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
});