/*
 * karakuri input
 */
int OutputDigPin0 = 4;

int sensorPinRot0 = A2;
int sensorPinRot1 = A4;
int sensorPinHead0  = A5;

int sensorValueRot0 = 0;  // variable to store the value coming from the sensor
int sensorValueRot1 = 0;  // variable to store the value coming from the sensor
int sensorValueHead0 = 0;  // variable to store the value coming from the sensor

char json[64];
int cnt0=0;
int cnt1=0;

const int CycleNum    = 120;
const int OneCycleDeg = 360/120;
const int ThresholdOn  = 600;//700;
const int ThresholdOff = 400;//400;
int rotCnt_ = 0;
int rotSw_  = 0;
int lastDeg_ = 0;

const int HeadThresholdOn  = 900;
const int HeadThresholdOff = 300;

struct HeadWork{
  bool bCalcOk = false;
  int  lastDegOn = -1;
  int  lastDegOff = -1;
  int  lastEdgeSide  =0;

  int  now = 0;
  int  tgt = 120;
  
  bool bNowCmd = false;
  int  startEdge = 0;
  int  moveDeg  = 0;
  int  startTime = 0;
};

HeadWork headWk0;

int testMoveTime = 0;

void setup() {
  // declare the ledPin as an OUTPUT:
  //pinMode(ledPin, OUTPUT);
  //Serial.begin(9600);
  //Serial.begin(115200);
  Serial.begin(250000);
  analogReference(DEFAULT);
/*
      pinMode(12, OUTPUT); // 回転方向 (HIGH/LOW)
      pinMode(9, OUTPUT); // ブレーキ (HIGH/LOW)
      pinMode(3, OUTPUT); // PWMによるスピード制御 (0-255)
    
      pinMode(13, OUTPUT); // 回転方向 (HIGH/LOW)
      pinMode(11, OUTPUT); // ブレーキ (HIGH/LOW)
      pinMode(8, OUTPUT); // PWMによるスピード制御 (0-255)
*/
  pinMode(OutputDigPin0, OUTPUT); // PWMによるスピード制御 (0-255)
  pinMode(7, OUTPUT); // PWMによるスピード制御 (0-255)

  // ADC高速化(精度低下)
  ADCSRA = ADCSRA & 0xf8;
  ADCSRA = ADCSRA | 0x04;

  testMoveTime = millis();
}

void loop() {

  int time0 = micros();
  int time1 = 0;

  int moveTime = millis() - testMoveTime;
#if 0
  if(moveTime> 1000*4)
  {
    testMoveTime = millis();
    if(headWk0.tgt != 200){
      headWk0.tgt = 200;
    }else{
      headWk0.tgt = 80;
    }
  }
#endif
  if(moveTime> 100)
  {
    testMoveTime = millis();
    headWk0.tgt += 3;
    if(headWk0.tgt>200){
      headWk0.tgt = 80;
    }
  }
  
  // ■目標値入力
  while(Serial.available())
  { 
    char c = Serial.read();
    if(c=='t')
    {
      headWk0.tgt = 0;
      headWk0.tgt += (Serial.read()-'0')*100;
      headWk0.tgt += (Serial.read()-'0')*10;
      headWk0.tgt += (Serial.read()-'0')*1;
    }
  }
  // ■センサー入力です
//  sensorValueRot0 = analogRead(sensorPinRot0);    
  sensorValueRot1 = analogRead(sensorPinRot1);    
  
  // ■回転角計測です(割り込み処理候補)
  if(rotSw_)
  {
    if(sensorValueRot1<ThresholdOff){
      rotSw_ = 0;
    }
  }else{
    if(sensorValueRot1>ThresholdOn){
      rotSw_ = 1;
      rotCnt_ = (rotCnt_+1) % CycleNum;
    }
  }
  // ■回転角と量の計算です
  int moveDeg = 0;
  int nowDeg  = 0;
  bool bOutput=false;
  {
    nowDeg = rotCnt_ * OneCycleDeg;
    if(lastDeg_ != nowDeg)
    {
      moveDeg = nowDeg - lastDeg_;
      while(moveDeg< 0 ){moveDeg += 360;}
      while( moveDeg > 360 ){ moveDeg -= 360;}
      bOutput=true;
    }
    lastDeg_ = nowDeg;
  }

  // ■ヘッダ位置推定
  int nowEdge = 0;
  if(bOutput)
  {
    // ADCが遅いので必要に応じて読むことに…数増やすなら何か考える方がよさそう？
    sensorValueHead0 = analogRead(sensorPinHead0);

    if(sensorValueHead0 > HeadThresholdOn){
      if(headWk0.lastEdgeSide <= 0){
        nowEdge = 1;
      }
    }
    else if(sensorValueHead0 < HeadThresholdOff){
      if(headWk0.lastEdgeSide >= 0){
        nowEdge = -1;
      }
    }
    if(nowEdge!=0)
    {

      if(headWk0.lastEdgeSide!=0)
      {
        if(nowEdge > 0)
        {
          headWk0.lastDegOn  = nowDeg;
        }
        else{
          headWk0.lastDegOff = nowDeg;
        }
      }
      headWk0.lastEdgeSide = nowEdge;
      
      if(headWk0.lastDegOn>=0 && headWk0.lastDegOff>=0)
      {
        if(headWk0.lastDegOff >= headWk0.lastDegOn)
        {
          headWk0.now = headWk0.lastDegOff - headWk0.lastDegOn;
        }else{
          headWk0.now = (headWk0.lastDegOff+360) - headWk0.lastDegOn;
        }
        headWk0.bCalcOk = true;
      }
    }
  }

  // ■ヘッダ移動の発行
  if(!headWk0.bNowCmd && headWk0.bCalcOk)
  {
    int mov = headWk0.tgt - headWk0.now; 
    if(abs(mov)>5)
    {
      if(mov>0){
        headWk0.bNowCmd = true;
        headWk0.startEdge = -1;
        headWk0.moveDeg  = mov/2;//20;//60;//mov;
        headWk0.startTime = micros();
      }
      else if(mov<0){
        headWk0.bNowCmd = true;
        headWk0.startEdge = +1;
        headWk0.moveDeg  = -mov/2;//20;//60;//-mov;
        headWk0.startTime = millis();
      }
    }
  }
  //■ヘッダ駆動
  if(headWk0.bNowCmd)
  {
    if(headWk0.startEdge!=0)
    {
      if(headWk0.startEdge == nowEdge)
      {
        digitalWrite(OutputDigPin0, HIGH);
        headWk0.startEdge=0;
      }
    }
    else{
      headWk0.moveDeg -= moveDeg;
    }
    bool bTimeOut = false;
    {
      int timeOut = millis() - headWk0.startTime;
      if(timeOut < 0 || timeOut > 5 * 1000)
      {
        bTimeOut=true;
      }
    }
    if(headWk0.moveDeg<=0 || bTimeOut){
      digitalWrite(OutputDigPin0, LOW);
      headWk0.bNowCmd=false;
    }
  }

  if(bOutput)
  {
    sprintf(json, "%d,%d,%d,%d,%d", 
      nowDeg, 
      sensorValueHead0, 
      (headWk0.lastEdgeSide>0?1:0) * (HeadThresholdOn-HeadThresholdOff) + HeadThresholdOff,
      headWk0.now,
      headWk0.tgt
      );
    Serial.println(json);
  }
#if 0
  time1 = micros();
  sprintf(json,"%d",time1-time0); 
  Serial.println(json);
#endif
#if 0
  sprintf(json,"%d",sensorValueRot1,time1); 
  Serial.println(json);
#endif

  //sprintf(json, "{\"val0\":%d, \"val1\":%d, \"head0\":%d}", sensorValue0, sensorValue1, sensorValueHead0);
  //sprintf(json, "%d,%d,%d,%d", sensorValue0, sensorValue1, sensorValueHead0, rotCnt);
  //Serial.println(json);
  //delay(10);
}
