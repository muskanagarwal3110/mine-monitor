// ============================================================
// ESP32 BLE Server — Mine Monitor
// Pairs with the Next.js dashboard via Web Bluetooth API.
//
// What this does:
//   1. Reads all 4 MQ sensors + DHT11 every second
//   2. Converts ADC → PPM using calibrated baselines
//   3. Serialises as JSON and sends via BLE NOTIFY characteristic
//   4. Listens on WRITE characteristic for commands (SIREN_ON/OFF)
//
// Required libraries (install via Arduino Library Manager):
//   - ESP32 BLE Arduino  (built-in with esp32 board package)
//   - DHT sensor library by Adafruit
//   - Adafruit Unified Sensor
// ============================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "DHT.h"

// ─── Pin Definitions ──────────────────────────────────────────────────────────
#define DHTPIN      21
#define DHTTYPE     DHT11
#define RED_LED     13
#define GREEN_LED   12
#define BUZZER_PIN  26

const int GAS_PINS[4] = {34, 35, 32, 33}; // MQ2, MQ4, MQ7, MQ135

// ─── Calibration Baselines (clean air ADC values) ─────────────────────────────
const int BASE[4]    = {1627, 2032, 851, 3042};
const int PPM_MAX[4] = {500,  500,  5000, 200};
const int ADC_SPAN[4]= {2468, 2063, 3244, 1053};
const int DEADZONE   = 30;

// Alarm thresholds (DGMS India statutory limits)
const int ALARM_PPM[4] = {100, 250, 50, 50};

// DHT correction offsets
const float TEMP_OFFSET = -10.0;
const float HUM_OFFSET  =  10.0;

// ─── BLE UUIDs ── Must match src/lib/constants.ts ─────────────────────────────
#define SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_UUID_NOTIFY  "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_UUID_WRITE   "beb5483e-36e1-4688-b7f5-ea07361b26a9"

// ─── Globals ──────────────────────────────────────────────────────────────────
BLECharacteristic* pNotifyChar = nullptr;
BLECharacteristic* pWriteChar  = nullptr;
bool deviceConnected  = false;
bool sirenActive      = false;
DHT dht(DHTPIN, DHTTYPE);

// ─── PPM Conversion ───────────────────────────────────────────────────────────
int getPPM(int sIdx, int adcVal) {
  int delta = adcVal - BASE[sIdx];
  if (delta <= DEADZONE) return 0;
  delta = constrain(delta, DEADZONE, ADC_SPAN[sIdx]);
  long ppm = map((long)delta, DEADZONE, ADC_SPAN[sIdx], 1, PPM_MAX[sIdx]);
  return (int)constrain(ppm, 0, PPM_MAX[sIdx]);
}

// ─── BLE Server Callbacks ─────────────────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Client connected");
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected — restarting advertising...");
    pServer->startAdvertising();
  }
};

// ─── Write Characteristic Callback (receives commands from dashboard) ─────────
class WriteCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    std::string value = pChar->getValue();
    if (value.empty()) return;
    Serial.print("[CMD] Received: ");
    Serial.println(value.c_str());

    if (value == "SIREN_ON\n"  || value == "SIREN_ON")  sirenActive = true;
    if (value == "SIREN_OFF\n" || value == "SIREN_OFF") sirenActive = false;
  }
};

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  // Hardware init
  pinMode(RED_LED,    OUTPUT);
  pinMode(GREEN_LED,  OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  analogWrite(RED_LED,    0);
  analogWrite(GREEN_LED, 30);
  analogWrite(BUZZER_PIN, 0);

  dht.begin();
  delay(200);

  // BLE init
  BLEDevice::init("MineMonitor-ESP32");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  // NOTIFY characteristic — ESP32 → Dashboard
  pNotifyChar = pService->createCharacteristic(
    CHAR_UUID_NOTIFY,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pNotifyChar->addDescriptor(new BLE2902());

  // WRITE characteristic — Dashboard → ESP32 (commands)
  pWriteChar = pService->createCharacteristic(
    CHAR_UUID_WRITE,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pWriteChar->setCallbacks(new WriteCallbacks());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // helps with iOS connection stability
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising as 'MineMonitor-ESP32'");
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  // Alarm output
  bool alarm = sirenActive;
  // Also auto-alarm if any sensor exceeds threshold
  for (int i = 0; i < 4 && !alarm; i++) {
    if (getPPM(i, analogRead(GAS_PINS[i])) >= ALARM_PPM[i]) alarm = true;
  }

  if (alarm) {
    analogWrite(GREEN_LED,   0);
    analogWrite(RED_LED,    30);
    analogWrite(BUZZER_PIN, 45);
  } else {
    analogWrite(GREEN_LED,  30);
    analogWrite(RED_LED,     0);
    analogWrite(BUZZER_PIN,  0);
  }

  // Read sensors every second
  static unsigned long lastSend = 0;
  if (millis() - lastSend < 1000) return;
  lastSend = millis();

  // Read DHT
  float rawTemp = dht.readTemperature();
  float rawHum  = dht.readHumidity();
  float t       = isnan(rawTemp) ? 0.0 : rawTemp + TEMP_OFFSET;
  float h       = isnan(rawHum)  ? 0.0 : rawHum  + HUM_OFFSET;

  // Read gas sensors
  int ppm[4];
  for (int i = 0; i < 4; i++) {
    ppm[i] = getPPM(i, analogRead(GAS_PINS[i]));
  }

  // Build compact JSON — key names match SensorPayload interface
  // Format: {"t":27.3,"h":58,"mq2":12,"mq4":0,"mq7":8,"mq135":4}
  char json[128];
  snprintf(
    json, sizeof(json),
    "{\"t\":%.1f,\"h\":%.0f,\"mq2\":%d,\"mq4\":%d,\"mq7\":%d,\"mq135\":%d}\n",
    t, h, ppm[0], ppm[1], ppm[2], ppm[3]
  );

  Serial.print(json); // Also log to Serial Monitor for debugging

  // Send via BLE only if client is connected
  if (deviceConnected && pNotifyChar) {
    pNotifyChar->setValue((uint8_t*)json, strlen(json));
    pNotifyChar->notify();
  }
}
