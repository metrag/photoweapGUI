#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// Настройки камеры
#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

// WiFi данные
const char *ssid = "HP";
const char *password = "123456789000";

// Пин кнопки (подключена между GPIO0 и GND)
const int buttonPin = 0;
#define DEBOUNCE_TIME 100    // время антидребезга (мс)
#define HOLD_TIME 300       // минимальное время удержания (мс)
#define COOLDOWN_TIME 2500  // защита от повторных срабатываний (мс)

// Пин светодиода
#define LED_PIN 4

// Адрес сервера
const char* serverUrl = "http://192.168.8.41:5000/upload";
//const char* serverUrl = "http://10.7.0.2:5000";

//// Переменные для обработки кнопки
//bool buttonActive = false;
//unsigned long lastPressTime = 0;
//unsigned long lastTriggerTime = 0;
// Безопасные настройки камеры для ESP32 без PSRAM
#define IMAGE_QUALITY 10        // 10-63 (больше = меньше качество, но меньше памяти)
#define FRAME_SIZE FRAMESIZE_VGA // 640x480 (безопасное разрешение)
#define BRIGHTNESS 0
#define CONTRAST 1
#define SATURATION 1
#define SHARPNESS 0

bool buttonActive = false;
unsigned long lastPressTime = 0;
unsigned long lastTriggerTime = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(buttonPin, INPUT_PULLUP);
  
  Serial.begin(115200);
  delay(1000);
  Serial.println("\nИнициализация системы...");

  // Конфигурация камеры с безопасными параметрами
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;  // Пониженная частота для стабильности
  config.frame_size = FRAME_SIZE;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.fb_location = CAMERA_FB_IN_DRAM; // Только DRAM
  config.jpeg_quality = IMAGE_QUALITY;
  config.fb_count = 1;                    // Только один буфер


  // Подключение к WiFi
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);
  
  Serial.print("Подключение к WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    Serial.print(".");
  }
  digitalWrite(LED_PIN, HIGH);
  Serial.println("\nWiFi подключен!");

  // Инициализация камеры
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Ошибка камеры: 0x%x\n", err);
    errorBlink(5);
    ESP.restart();
  }

  Serial.println("Система готова к работе");
}

void loop() {
  handleButton();
  delay(10);
}

void handleButton() {
  // Текущее состояние кнопки
  bool buttonState = digitalRead(buttonPin);
  unsigned long currentTime = millis();

  // Кнопка нажата (LOW)
  if (buttonState == LOW) {
    if (!buttonActive && (currentTime - lastTriggerTime > COOLDOWN_TIME)) {
      // Первое обнаружение нажатия
      buttonActive = true;
      lastPressTime = currentTime;
      Serial.println("Кнопка нажата (ожидание подтверждения)");
    }
    
    // Проверка удержания кнопки
    if (buttonActive && (currentTime - lastPressTime > HOLD_TIME)) {
      // Нажатие подтверждено
      lastTriggerTime = currentTime;
      buttonActive = false;
      Serial.println("Нажатие подтверждено - делаем фото!");
      captureAndSendPhoto();
    }
  } 
  else {
    // Кнопка отпущена
    if (buttonActive) {
      // Сброс состояния, если кнопку отпустили слишком быстро
      if (currentTime - lastPressTime < HOLD_TIME) {
        Serial.println("Кнопка отпущена (нажатие не подтверждено)");
      }
      buttonActive = false;
    }
  }
}

void captureAndSendPhoto() {
  // Индикация начала съемки
  digitalWrite(LED_PIN, LOW);
  delay(100);
  
  // Получение кадра
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Ошибка получения кадра");
    errorBlink(3);
    return;
  }

  // Отправка фото
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/octet-stream");
    
    int httpCode = http.POST(fb->buf, fb->len);
    if (httpCode > 0) {
      Serial.printf("Фото отправлено. Код: %d\n", httpCode);
      //successBlink();
    } else {
      Serial.printf("Ошибка отправки: %d\n", httpCode);
      errorBlink(2);
    }
    http.end();
  } else {
    Serial.println("Нет соединения с WiFi");
    errorBlink(4);
  }

  // Освобождение ресурсов
  esp_camera_fb_return(fb);
  digitalWrite(LED_PIN, LOW);
}

void successBlink() {
  for(int i = 0; i < 2; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(80);
    digitalWrite(LED_PIN, HIGH);
    delay(80);
  }
}

void errorBlink(int count) {
  for(int i = 0; i < count; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(300);
    digitalWrite(LED_PIN, HIGH);
    delay(300);
  }
}
