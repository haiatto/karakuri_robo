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

int sensorPin0 = A1;    // select the input pin for the potentiometer
int sensorPin1 = A5;    // select the input pin for the potentiometer
int sensorValue0 = 0;  // variable to store the value coming from the sensor
int sensorValue1 = 0;  // variable to store the value coming from the sensor
char json[64];

void setup() {
  // declare the ledPin as an OUTPUT:
  //pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  analogReference(DEFAULT);
}

void loop() {
  analogRead(sensorPin0);    
  analogRead(sensorPin0);    
  sensorValue0 = analogRead(sensorPin0);    

  analogRead(sensorPin1);    
  analogRead(sensorPin1);    
  sensorValue1 = analogRead(sensorPin1);    
  sprintf(json, "{\"val0\":%d, \"val1\":%d}", sensorValue0, sensorValue1);
  Serial.println(json);    
  delay(30);
}
