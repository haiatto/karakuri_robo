/*
  Analog Input
 Demonstrates analog input by reading an analog sensor on analog pin 0 and
 turning on and off a light emitting diode(LED)  connected to digital pin 13. 
 The amount of time the LED will be on and off depends on
 the value obtained by analogRead(). 
 
 The circuit:
 * Potentiometer attached to analog input 0
 * center pin of the potentiometer to the analog pin
 * one side pin (either one) to ground
 * the other side pin to +5V
 * LED anode (long leg) attached to digital output 13
 * LED cathode (short leg) attached to ground
 
 * Note: because most Arduinos have a built-in LED attached 
 to pin 13 on the board, the LED is optional.
 
 
 Created by David Cuartielles
 modified 30 Aug 2011
 By Tom Igoe
 
 This example code is in the public domain.
 
 http://arduino.cc/en/Tutorial/AnalogInput
 
 */

int sensorPin0 = A2;    // select the input pin for the potentiometer
int sensorPin1 = A5;    // select the input pin for the potentiometer
int sensorValue0 = 0;  // variable to store the value coming from the sensor
int sensorValue1 = 0;  // variable to store the value coming from the sensor
char json[64];
int cnt0=0;
int cnt1=0;

void setup() {
  // declare the ledPin as an OUTPUT:
  //pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  analogReference(DEFAULT);

  pinMode(12, OUTPUT); // 回転方向 (HIGH/LOW)
  pinMode(9, OUTPUT); // ブレーキ (HIGH/LOW)
  pinMode(3, OUTPUT); // PWMによるスピード制御 (0-255)

  pinMode(13, OUTPUT); // 回転方向 (HIGH/LOW)
  pinMode(11, OUTPUT); // ブレーキ (HIGH/LOW)
  pinMode(8, OUTPUT); // PWMによるスピード制御 (0-255)
}

void loop() {
  
  while(Serial.available())
  { 
    char c = Serial.read();
    if(c=='1')
    {
      c = Serial.read();
      digitalWrite(12, HIGH);
      digitalWrite(9, LOW);
      if(c=='h'){
        cnt0=100;
        analogWrite(3, 255);
      }
      if(c=='l'){
        analogWrite(3, 0);
      }        
    }
    if(c=='2')
    {
      c = Serial.read();
      digitalWrite(13, HIGH);
      digitalWrite(11, LOW);
      if(c=='h'){
        cnt1=100;
        analogWrite(8, 255);
      }
      if(c=='l'){
        analogWrite(8, 0);
      }        
    }
  }
  if(cnt0>0){
    cnt0--;
    if(cnt0==0){
      analogWrite(3,0);
    }
  }
  if(cnt1>0){
    cnt1--;
    if(cnt1==0){
      analogWrite(8,0);
    }
  }
  
//  analogRead(sensorPin0);    
  analogRead(sensorPin0);    
  sensorValue0 = analogRead(sensorPin0);    

//  analogRead(sensorPin1);    
  analogRead(sensorPin1);    
  sensorValue1 = analogRead(sensorPin1);    
  
  sprintf(json, "{\"val0\":%d, \"val1\":%d}", sensorValue0, sensorValue1);
  Serial.println(json);   
  
  delay(10);
}
