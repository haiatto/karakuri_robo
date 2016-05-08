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

const int CycleNum     = 120*2*2;
const int ThresholdOn  = 910;//700;
const int ThresholdOff = 400;//400;
const int RotDiv       = 4096;//角度(の分割数)

//ヘッダ検出パタンの定数
// 検出パタンは半径方向へ移動すると線形に変化する２値の模様
// １回転で何周期するかで検出速度が変わります(限界はロータリーエンコーダの精度とセンサ鋭さに大きく依存します)
// ヘッダの可動範囲(カムの溝の位置で決まる)と検出パタンは独立しています
// 一周期の角度長で線形に位置を計算できます
// ヘッダ検出パタンは中心部は検知不能な領域があります(そこまで可動しない前提です。パタン検出の機構的な部分でも無理です)
// パタンのエッジには絶対位置検出の意味もあります(溝のパタン以上のパタンがある場合は欠けて等何かしらの方法で検知する必要があります)

const int HeadPosPtn_OneCycleRot = RotDiv / 2; //ヘッダ位置検出パタンの１周期の角度

//TODO:ホントはmmで検出範囲とカムの範囲とカムの角度当たりの移動速度とかから範囲を計算するべきなのでそうしたい

const int HeadPosPtn_MoveMin = HeadPosPtn_OneCycleRot * 0.3f;//パタンの１周期でみたヘッダの可動範囲
const int HeadPosPtn_MoveMax = HeadPosPtn_OneCycleRot * 0.9f;//パタンの１周期でみたヘッダの可動範囲

const int CamCycleNum = 2;//１回転でのカムのパタンの数

int rotCnt_ = 0;
int rotSw0_  = 0;
int rotSw1_  = 0;
int lastRot_ = 0;

const int HeadThresholdOn  = 900;
const int HeadThresholdOff = 400;

struct HeadWork{
  bool bCalcOk = false;
  int  lastRotOn = -1;
  int  lastRotOff = -1;
  int  lastEdgeSide  =0;

  int  now = 0;
  int  tgt = 120;
  
  bool bNowCmd = false;
  int  startEdge = 0;
  int  waitRot = 0;
  int  moveRot  = 0;
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

  // ■テスト用目標値生成
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
    headWk0.tgt += HeadPosPtn_OneCycleRot * 0.01f;
    if(headWk0.tgt > HeadPosPtn_OneCycleRot){
      headWk0.tgt = HeadPosPtn_OneCycleRot * 0.2f;
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


  // ■■ 以下センサー入力 ■■


  // ■読み込みます
  sensorValueRot0 = analogRead(sensorPinRot0);    
  sensorValueRot1 = analogRead(sensorPinRot1);    
  

  // ■回転角計測です(割り込み処理候補)
  int oldRotSw0 = rotSw0_;
  int oldRotSw1 = rotSw1_;
  if(rotSw0_)
  {
    if(sensorValueRot0<ThresholdOff){
      rotSw0_ = 0;
    }
  }else{
    if(sensorValueRot0>ThresholdOn){
      rotSw0_ = 1;
    }
  }
  if(rotSw1_)
  {
    if(sensorValueRot1<ThresholdOff){
      rotSw1_ = 0;
    }
  }else{
    if(sensorValueRot1>ThresholdOn){
      rotSw1_ = 1;
    }
  }
  if(oldRotSw0!=rotSw0_ || oldRotSw1!=rotSw1_)
  {
    rotCnt_ = (rotCnt_+1) % CycleNum;
  }
#if 0
  sprintf(json,"%d,%d,%d,%d,%d,%d,%d",
      sensorValueRot0 * 0,
      sensorValueRot1 * 0,
      (rotSw0_?ThresholdOn:ThresholdOff)/2+ThresholdOff+20,
      (rotSw1_?ThresholdOn:ThresholdOff)/2,
      rotCnt_*2,
      0,
      1000); 
  Serial.println(json);
#endif

  // ■回転角と量の計算です
  int moveRot = 0;
  int nowRot  = 0;
  bool bOutput=false;
  {
    nowRot = (long)rotCnt_ * RotDiv / CycleNum;
    if(lastRot_ != nowRot)
    {
      moveRot = nowRot - lastRot_;
      while( moveRot < 0      ){ moveRot += RotDiv;}
      while( moveRot > RotDiv ){ moveRot -= RotDiv;}
      bOutput=true;
    }
    lastRot_ = nowRot;
  }

  // ■■ 以下制御 ■■
  

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

    if(nowEdge!=0){
      if(headWk0.lastEdgeSide!=0){
        if(nowEdge > 0){
          headWk0.lastRotOn  = nowRot;
        }
        else{
          headWk0.lastRotOff = nowRot;
        }
      }
      headWk0.lastEdgeSide = nowEdge;
      // エッジ下がり＆立ち上がりも検知済みなら
      if(nowEdge < 0 && headWk0.lastRotOn>=0 && headWk0.lastRotOff>=0)
      {
        int onRotLen = headWk0.lastRotOff - headWk0.lastRotOn;
        if(onRotLen < 0)
        {
          onRotLen = RotDiv + onRotLen;
        }
        headWk0.now = onRotLen;
        headWk0.bCalcOk = true;
      }
    }
  }



  // ■ヘッダ移動の発行
  if(!headWk0.bNowCmd && headWk0.bCalcOk)
  {
    //TODO: かなり適当を直す
    int mov = headWk0.tgt - headWk0.now;    
    if(abs(mov) > 5)
    {
      headWk0.bNowCmd = true;
      headWk0.startEdge = -1;
      headWk0.startTime = micros();
      if(mov>0){
        //外側移動
        headWk0.waitRot  = (RotDiv / CamCycleNum)/2;
        headWk0.moveRot  = (RotDiv / CamCycleNum)/2*0.8f;//@@((long)mov * RotDiv/ HeadPosPtn_OneCycleRot) * 0.5f;//今のCAMは半周で端まで移動する
      }
      else if(mov<0){
        //内側移動
        headWk0.waitRot  = 0;
        headWk0.moveRot  = (RotDiv / CamCycleNum)/2;//@@((long)-mov * RotDiv/ HeadPosPtn_OneCycleRot) * 0.5f;
      }
      if(headWk0.moveRot > (RotDiv / CamCycleNum)/2){
        headWk0.moveRot = (RotDiv / CamCycleNum)/2;  //CAMの１回の最大移動範囲超えたら今のところはカット(連続移動コマンドも確実性ましたらありかも)
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
        headWk0.startEdge=0;
      }
    }
    else{
      if(headWk0.waitRot > 0){
        if(headWk0.waitRot <= moveRot){
          headWk0.moveRot -= moveRot - headWk0.waitRot;
          headWk0.waitRot = 0;
        }
        else{
          headWk0.waitRot -= moveRot;
        }
      }
      else if(headWk0.moveRot > 0){
        headWk0.moveRot -= moveRot;
      }
    }
    if(headWk0.startEdge==0)
    {
      if(headWk0.waitRot<=0)
      {
        digitalWrite(OutputDigPin0, HIGH);
      }
    }
    
    bool bTimeOut = false;
    {
      int timeOut = millis() - headWk0.startTime;
      if(timeOut < 0 || timeOut > 10 * 1000)
      {
        bTimeOut=true;
      }
    }
    if(headWk0.moveRot<=0 || bTimeOut){
      digitalWrite(OutputDigPin0, LOW);
      headWk0.bNowCmd=false;
    }
  }


  if(bOutput)
  {
    static int iii=0;
    iii++;
    sprintf(json, "%d,%d,%d,%d,%d,%d,%d", 
      nowRot>>2, 
      sensorValueHead0, 
      (headWk0.lastEdgeSide>0?1:0) * (HeadThresholdOn-HeadThresholdOff) + HeadThresholdOff,
      headWk0.now >>2,
      headWk0.tgt >>2,
      iii%2*1000   *0,
      2000
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
