function updateImage() {
  const img = document.getElementById('camera-feed');
  if (img) {
    img.src = '/latest.jpg?' + new Date().getTime(); // Антикэширование
  }
}

setInterval(updateImage, 5000); // Обновление каждые 5 секунд
window.addEventListener('load', updateImage);