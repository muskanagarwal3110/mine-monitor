#include <TFT_eSPI.h>
#include <SPI.h>
#include "DHT.h"

// --- BLE Libraries ---
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ============================================================
// BLE SETUP & UUIDs (Updated to match Web Dashboard)
// ============================================================
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define NOTIFY_CHAR_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define WRITE_CHAR_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a9"

BLEServer* pServer = NULL;
BLECharacteristic* pNotifyCharacteristic = NULL;
BLECharacteristic* pWriteCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Callback class to handle BLE connections/disconnections
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };
    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

// Callback class for incoming data from the web dashboard
class MyWriteCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pChar) {
      std::string rxValue = pChar->getValue();
      if (rxValue.length() > 0) {
        Serial.print("Received from Web: ");
        for (int i = 0; i < rxValue.length(); i++) Serial.print(rxValue[i]);
        Serial.println();
      }
    }
};

// ============================================================
// PIN DEFINITIONS
// ============================================================
#define DHTPIN      21
#define DHTTYPE     DHT11
#define RED_LED     13
#define GREEN_LED   12
#define BUZZER_PIN  26
#define JOY_X       27
#define JOY_Y       25
#define JOY_SW      14

// ============================================================
// COLOR PALETTE
// ============================================================
#define C_BG        0x0000  
#define C_CARD      0x10A2  
#define C_CARD_H    0x2124  
#define C_ACCENT    0x07FF  
#define C_WARN      0xFBE0  
#define C_DANGER    0xF800  
#define C_SAFE      0x07E0  
#define C_TEXT_MAIN 0xFFFF  
#define C_TEXT_SUB  0xBDF7  
#define C_GRID      0x18E3  

// ============================================================
// SENSOR BASELINES
// ============================================================
const int BASE_MQ2   = 1557;  
const int BASE_MQ4   = 1452;  
const int BASE_MQ7   = 700;   
const int BASE_MQ135 = 2582;  

// ============================================================
// PPM SCALING
// ============================================================
const int PPM_MAX[]      = {500,  500,   5000, 200};
const int ADC_SPAN[]     = {2468, 2063,  3244, 1053};
const int DEADZONE       = 30;

// ============================================================
// STATUTORY SAFETY THRESHOLDS
// ============================================================
const int ALARM_PPM[]    = {100,  250,   50,   50};

const float TEMP_OFFSET = -10.0;
const float HUM_OFFSET  = +10.0;

// ============================================================
// GLOBAL VARIABLES
// ============================================================
const int gasPins[]    = {34,   35,   32,   33};
const char* labels[]   = {"MQ2","MQ4","MQ7","MQ135"};
const char* gasDesc[]  = {"COMBUSTIBLE","METHANE","CO GAS","SMOKE/SOx"};

#define HISTORY_LEN 20
int sensorHistory[4][HISTORY_LEN] = {0};

float currentTemp = NAN; 
float currentHum  = NAN; 

int viewMode   = 0;
int currentBox = 0;
int selectedRow = 1;  
bool sirenActive = false;
unsigned long lastMove = 0;
int lastSwState = HIGH;

DHT dht(DHTPIN, DHTTYPE);
TFT_eSPI tft = TFT_eSPI();

// ============================================================
// FUNCTION PROTOTYPES
// ============================================================
void drawDashboardLayout();
void updateUISelection();
void drawGraphView(int sIdx);
void drawAnalysisPage();
void updateAnalysisValues();
void updateDashboardValues();
void drawGraphContent(int sIdx);
void transitionScrollUp();
void drawProgressBar(int x, int y, int w, int h, int val, int maxVal, uint16_t color);
void drawIndexBar(int x, int y, int val, uint16_t color);
void updateSensors();
void handleJoystick();
int  getPPM(int sIdx, int adcVal);
bool checkAlarm();

// ============================================================
// SETUP
// ============================================================
void setup() {
  Serial.begin(115200);

  // --- Initialize BLE ---
  // FIX 1: Updated device name
  BLEDevice::init("MineMonitor-ESP32");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  // 1. Notify Characteristic (Sends data TO web dashboard)
  pNotifyCharacteristic = pService->createCharacteristic(
                      NOTIFY_CHAR_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_NOTIFY
                    );
  pNotifyCharacteristic->addDescriptor(new BLE2902());

  // 2. Write Characteristic (Receives data FROM web dashboard)
  pWriteCharacteristic = pService->createCharacteristic(
                      WRITE_CHAR_UUID,
                      BLECharacteristic::PROPERTY_WRITE
                    );
  pWriteCharacteristic->setCallbacks(new MyWriteCallbacks());

  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  
  BLEDevice::startAdvertising();
  Serial.println("BLE Device Started. Waiting for connections...");

  analogWrite(RED_LED,    0);
  analogWrite(BUZZER_PIN, 0);
  analogWrite(GREEN_LED, 30);
  pinMode(JOY_SW, INPUT_PULLUP);

  tft.init();
  tft.setRotation(1);
  tft.fillScreen(C_BG);
  dht.begin();

  delay(100);
  lastSwState = digitalRead(JOY_SW);
  viewMode = 0;
  drawDashboardLayout();
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
  handleJoystick();

  bool autoAlarm = checkAlarm();
  bool alarmOn   = sirenActive || autoAlarm;

  if (alarmOn) {
    analogWrite(GREEN_LED,   0);
    analogWrite(RED_LED,    30);
    analogWrite(BUZZER_PIN, 35);
  } else {
    analogWrite(GREEN_LED,  30);
    analogWrite(RED_LED,     0);
    analogWrite(BUZZER_PIN,  0);
  }

  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate >= 1000) {
    lastUpdate = millis();
    updateSensors();

    // --- SEND JSON DATA OVER BLE ---
    if (deviceConnected) {
      String jsonStr = "{";
      jsonStr += "\"t\":" + (isnan(currentTemp) ? "0.0" : String(currentTemp, 1)) + ",";
      jsonStr += "\"h\":" + (isnan(currentHum)  ? "0"   : String((int)currentHum)) + ",";
      jsonStr += "\"mq2\":" + String(getPPM(0, sensorHistory[0][0])) + ",";
      jsonStr += "\"mq4\":" + String(getPPM(1, sensorHistory[1][0])) + ",";
      jsonStr += "\"mq7\":" + String(getPPM(2, sensorHistory[2][0])) + ",";
      jsonStr += "\"mq135\":" + String(getPPM(3, sensorHistory[3][0]));
      jsonStr += "}";
      
      // FIX 2: Added newline and updated string conversion method
      jsonStr += "\n";
      
      Serial.print("Sending BLE Payload: ");
      Serial.print(jsonStr);

      pNotifyCharacteristic->setValue((uint8_t*)jsonStr.c_str(), jsonStr.length());
      pNotifyCharacteristic->notify();
    }
  }

  // --- BLE Disconnection/Reconnection Handling ---
  if (!deviceConnected && oldDeviceConnected) {
      delay(500); 
      pServer->startAdvertising(); 
      Serial.println("BLE Disconnected. Advertising restarted.");
      oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
      oldDeviceConnected = deviceConnected;
      Serial.println("BLE Connected.");
  }
}

// ============================================================
// CORE: PPM CONVERSION
// ============================================================
int getPPM(int sIdx, int adcVal) {
  int delta = adcVal - BASE_MQ2;  

  switch (sIdx) {
    case 0: delta = adcVal - BASE_MQ2;   break;
    case 1: delta = adcVal - BASE_MQ4;   break;
    case 2: delta = adcVal - BASE_MQ7;   break;
    case 3: delta = adcVal - BASE_MQ135; break;
    default: return 0;
  }

  if (delta <= DEADZONE) return 0;
  delta = constrain(delta, DEADZONE, ADC_SPAN[sIdx]);
  long ppm = map((long)delta, DEADZONE, ADC_SPAN[sIdx], 1, PPM_MAX[sIdx]);
  return (int)constrain(ppm, 0, PPM_MAX[sIdx]);
}

// ============================================================
// ALARM CHECK
// ============================================================
bool checkAlarm() {
  for (int i = 0; i < 4; i++) {
    int ppm = getPPM(i, sensorHistory[i][0]);
    if (ppm >= ALARM_PPM[i]) return true;
  }
  return false;
}

// ============================================================
// JOYSTICK HANDLER
// ============================================================
void handleJoystick() {
  int xVal         = analogRead(JOY_X);
  int yVal         = analogRead(JOY_Y);
  int currentSwState = digitalRead(JOY_SW);

  bool isCentered = (xVal > 800 && xVal < 3200 && yVal > 800 && yVal < 3200);
  static bool canMove = true;

  if (isCentered) {
    canMove = true; 
  }

  if (canMove && millis() - lastMove > 400) {
    bool moveUp    = (yVal < 400);
    bool moveDown  = (yVal > 3600);
    bool moveLeft  = (xVal < 400);
    bool moveRight = (xVal > 3600);

    if (viewMode == 0) {
      int prevBox = currentBox;
      int prevRow = selectedRow;

      if (moveUp) {
        selectedRow = 0;
        lastMove = millis();
        canMove = false;
      }
      else if (moveDown) {
        if (selectedRow == 0) {
          selectedRow = 1;
          lastMove = millis();
          canMove = false;
        } else if (selectedRow == 1) {
          viewMode = 2;
          transitionScrollUp();
          drawAnalysisPage();
          lastMove = millis();
          canMove = false;
          return; 
        }
      }
      else if (selectedRow == 1) {
        if (moveRight) { currentBox = (currentBox > 0) ? currentBox - 1 : 3; lastMove = millis(); canMove = false; }
        else if (moveLeft)  { currentBox = (currentBox < 3) ? currentBox + 1 : 0; lastMove = millis(); canMove = false; }
      }

      if (prevBox != currentBox || prevRow != selectedRow) updateUISelection();
    }
    else if (viewMode == 2) {
      if (moveUp) {
        viewMode = 0;
        tft.fillScreen(C_BG);
        drawDashboardLayout();
        lastMove = millis();
        canMove = false;
      }
    }
    else if (viewMode == 1) {
      int prevBox = currentBox;
      if (moveRight) { currentBox = (currentBox > 0) ? currentBox - 1 : 3; lastMove = millis(); canMove = false; }
      else if (moveLeft)  { currentBox = (currentBox < 3) ? currentBox + 1 : 0; lastMove = millis(); canMove = false; }
      if (prevBox != currentBox) drawGraphView(currentBox);
    }
  }

  if (lastSwState == HIGH && currentSwState == LOW) {
    if (viewMode == 0) {
      if (selectedRow == 0) {
        sirenActive = !sirenActive;
        updateUISelection();
      } else {
        viewMode = 1;
        drawGraphView(currentBox);
      }
    } else {
      viewMode = 0;
      drawDashboardLayout();
    }
    delay(200); 
  }
  lastSwState = currentSwState;
}

// ============================================================
// SENSOR UPDATE 
// ============================================================
void updateSensors() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(t)) currentTemp = t + TEMP_OFFSET;
  if (!isnan(h)) currentHum = h + HUM_OFFSET;

  for (int i = 0; i < 4; i++) {
    int val = analogRead(gasPins[i]);
    for (int j = HISTORY_LEN - 1; j > 0; j--) sensorHistory[i][j] = sensorHistory[i][j-1];
    sensorHistory[i][0] = val;
  }

  if      (viewMode == 0) updateDashboardValues();
  else if (viewMode == 1) drawGraphContent(currentBox);
  else if (viewMode == 2) updateAnalysisValues();
}

// ============================================================
// TRANSITION ANIMATION
// ============================================================
void transitionScrollUp() {
  for (int y = 320; y >= 0; y -= 40) {
    tft.fillRect(0, y, 480, 40, C_CARD);
    tft.drawFastHLine(0, y, 480, C_ACCENT);
  }
  tft.fillScreen(C_BG);
}

// ============================================================
// VISUAL HELPER — PROGRESS BAR
// ============================================================
void drawProgressBar(int x, int y, int w, int h, int val, int maxVal, uint16_t color) {
  tft.drawRect(x, y, w, h, C_GRID);
  int fillW = map(constrain(val, 0, maxVal), 0, maxVal, 0, w - 2);
  tft.fillRect(x + 1,         y + 1, fillW,           h - 2, color);
  tft.fillRect(x + 1 + fillW, y + 1, (w-2) - fillW,   h - 2, C_BG);
}

// ============================================================
// VISUAL HELPER — INDEX BAR 
// ============================================================
void drawIndexBar(int x, int y, int val, uint16_t color) {
  tft.fillRoundRect(x, y, 200, 15, 6, C_CARD);
  int w = map(constrain(val, 0, 100), 0, 100, 0, 200);
  if (w > 0) tft.fillRoundRect(x, y, w, 15, 6, color);
  tft.setTextSize(1);
  tft.setTextColor(C_TEXT_MAIN, C_BG);
  tft.setCursor(x + 210, y + 4);
  tft.print(val); tft.print("%");
}

// ============================================================
// PAGE 0: DASHBOARD — Layout 
// ============================================================
void drawDashboardLayout() {
  tft.fillScreen(C_BG);

  tft.setTextSize(2);
  tft.setTextColor(C_ACCENT);
  tft.setCursor(15, 10);
  tft.print(" ENV ");
  tft.setTextColor(C_TEXT_MAIN);
  tft.print("MONITOR");
  tft.drawFastHLine(15, 35, 150, C_ACCENT);

  tft.fillRoundRect(10, 50, 225, 100, 10, C_CARD);
  tft.setTextColor(C_TEXT_SUB, C_CARD);
  tft.setTextSize(1);
  tft.drawString("TEMPERATURE (C)", 25, 60, 2);

  tft.fillRoundRect(245, 50, 225, 100, 10, C_CARD);
  tft.setTextColor(C_TEXT_SUB, C_CARD);
  tft.drawString("HUMIDITY (%)", 260, 60, 2);

  for (int i = 0; i < 4; i++) {
    int x = 15 + (i * 115);
    tft.fillRoundRect(x, 165, 105, 130, 8, C_CARD);
    tft.fillRoundRect(x, 165, 105, 35, 8, C_CARD_H);
    tft.fillRect(x, 190, 105, 10, C_CARD_H);
    tft.setTextColor(C_ACCENT, C_CARD_H);
    tft.setTextSize(1);
    tft.drawCentreString(gasDesc[i], x + 52, 178, 2);
    tft.setTextColor(C_TEXT_SUB, C_CARD);
    tft.drawCentreString(labels[i], x + 52, 215, 2);
    tft.setTextColor(0x632C, C_CARD);
    tft.drawCentreString("PPM", x + 52, 280, 1);
  }
  updateUISelection();
}

// ============================================================
// PAGE 0: DASHBOARD — Values 
// ============================================================
void updateDashboardValues() {
  float t = currentTemp;
  float h = currentHum;

  tft.setTextSize(4);
  tft.setTextColor(0xFDA0, C_CARD);
  tft.drawCentreString(isnan(t) ? "--.-" : String(t, 1), 115, 80, 1);
  if (!isnan(t)) drawProgressBar(30, 120, 170, 10, (int)t, 60, 0xFDA0);

  tft.setTextColor(0x87FF, C_CARD);
  tft.drawCentreString(isnan(h) ? "--" : String(h, 0), 365, 80, 1);
  if (!isnan(h)) drawProgressBar(260, 120, 170, 10, (int)h, 100, 0x87FF);

  tft.setTextSize(2);
  for (int i = 0; i < 4; i++) {
    int x = 15 + (i * 115);
    int ppm = getPPM(i, sensorHistory[i][0]);

    uint16_t valueColor;
    if      (ppm >= ALARM_PPM[i])             valueColor = C_DANGER;
    else if (ppm >= ALARM_PPM[i] / 2)         valueColor = C_WARN;
    else                                      valueColor = C_SAFE;

    tft.fillRect(x + 5, 235, 95, 40, C_CARD);  
    tft.setTextColor(valueColor, C_CARD);

    String dispStr;
    if (ppm >= 10000) dispStr = String(ppm / 1000) + "K";
    else              dispStr = String(ppm);

    tft.drawCentreString(dispStr, x + 52, 245, 1);

    if (ppm >= ALARM_PPM[i]) {
      tft.fillCircle(x + 95, 170, 5, C_DANGER);
    } else {
      tft.fillCircle(x + 95, 170, 5, C_SAFE);
    }
  }
}

// ============================================================
// SELECTION HIGHLIGHT OVERLAY
// ============================================================
void updateUISelection() {
  uint16_t sirenFill = (selectedRow == 0) ? C_ACCENT
                     : (sirenActive       ? C_DANGER : C_CARD_H);
  uint16_t sirenText = (selectedRow == 0) ? C_BG : C_TEXT_MAIN;

  tft.fillRoundRect(350, 8, 120, 24, 12, sirenFill);
  tft.setTextColor(sirenText);
  tft.setTextSize(1);
  tft.drawCentreString(sirenActive ? "SIREN: ON" : "SIREN: OFF", 410, 12, 2);

  for (int i = 0; i < 4; i++) {
    int x = 15 + (i * 115);
    tft.fillRoundRect(x, 165, 105, 35, 8, C_CARD_H);
    tft.fillRect(x, 190, 105, 10, C_CARD_H);
    tft.setTextColor(C_ACCENT, C_CARD_H);
    tft.setTextSize(1);
    tft.drawCentreString(gasDesc[i], x + 52, 178, 2);

    if (selectedRow == 1 && i == currentBox) {
      tft.drawRoundRect(x-2, 163, 109, 134, 10, C_ACCENT);
      tft.drawRoundRect(x-1, 164, 107, 132,  9, C_ACCENT);
    } else {
      tft.drawRoundRect(x-2, 163, 109, 134, 10, C_BG);
      tft.drawRoundRect(x-1, 164, 107, 132,  9, C_BG);
    }
  }
}

// ============================================================
// PAGE 2: SAFETY ANALYTICS
// ============================================================
void drawAnalysisPage() {
  tft.fillScreen(C_BG);

  tft.fillRect(0, 0, 480, 50, C_CARD);
  tft.drawFastHLine(0, 50, 480, C_ACCENT);
  tft.setTextColor(C_TEXT_MAIN, C_CARD);
  tft.setTextSize(2);
  tft.drawCentreString("SAFETY ANALYTICS", 240, 15, 1);

  tft.setTextColor(C_TEXT_SUB, C_BG);
  tft.setTextSize(2);
  int startY = 80, gap = 45;
  tft.drawString("STABILITY (GSI)",   20, startY);
  tft.drawString("VENTILATION (VEI)", 20, startY + gap);
  tft.drawString("METHANE (MRI)",     20, startY + gap*2);
  tft.drawString("FIRE RISK (FRI)",   20, startY + gap*3);

  tft.drawFastHLine(20, 260, 440, C_GRID);
  tft.setTextColor(C_ACCENT, C_BG);
  tft.setTextSize(1);
  tft.drawCentreString("- ANALYSIS RESULT -", 240, 270, 1);

  updateAnalysisValues();
}

void updateAnalysisValues() {
  if (viewMode != 2) return;

  int ppmMQ2   = getPPM(0, sensorHistory[0][0]);  
  int ppmMQ4   = getPPM(1, sensorHistory[1][0]);  
  int ppmMQ7   = getPPM(2, sensorHistory[2][0]);  
  int ppmMQ135 = getPPM(3, sensorHistory[3][0]);  

  int excHC  = constrain((int)((long)ppmMQ2   * 100 / ALARM_PPM[0]), 0, 100);
  int excCH4 = constrain((int)((long)ppmMQ4   * 100 / ALARM_PPM[1]), 0, 100);
  int excCO  = constrain((int)((long)ppmMQ7   * 100 / ALARM_PPM[2]), 0, 100);
  int excSOx = constrain((int)((long)ppmMQ135 * 100 / ALARM_PPM[3]), 0, 100);

  int worstExcess = max(max(excHC, excCH4), max(excCO, excSOx));
  int gsi = constrain(100 - worstExcess, 0, 100);
  int vei = constrain(100 - (excCO + excSOx) / 2, 0, 100);
  int mri = excCH4;
  int fri = constrain((excHC + excCO) / 2, 0, 100);

  uint16_t gsiColor = (gsi > 60) ? C_SAFE   : (gsi > 30 ? C_WARN : C_DANGER);
  uint16_t veiColor = (vei > 60) ? 0xF81F   : (vei > 30 ? C_WARN : C_DANGER);
  uint16_t mriColor = (mri < 40) ? C_SAFE   : (mri < 70 ? C_WARN : C_DANGER);
  uint16_t friColor = (fri < 40) ? C_WARN   : C_DANGER;
  if (fri == 0) friColor = C_SAFE;

  int barX = 240, startY = 80, gap = 45;
  drawIndexBar(barX, startY,         gsi, gsiColor);
  drawIndexBar(barX, startY + gap,   vei, veiColor);
  drawIndexBar(barX, startY + gap*2, mri, mriColor);
  drawIndexBar(barX, startY + gap*3, fri, friColor);

  String statusMsg;
  uint16_t sColor = C_SAFE;

  if (ppmMQ7 >= ALARM_PPM[2] && ppmMQ2 >= ALARM_PPM[0]) {
    statusMsg = "SMOKE / FIRE DETECTED";  sColor = C_DANGER;
  } else if (ppmMQ4 >= ALARM_PPM[1]) {
    statusMsg = "METHANE ACCUMULATION";   sColor = C_DANGER;
  } else if (ppmMQ7 >= ALARM_PPM[2]) {
    statusMsg = "HIGH CO - POOR VENT.";   sColor = C_DANGER;
  } else if (ppmMQ2 >= ALARM_PPM[0] && ppmMQ4 >= ALARM_PP