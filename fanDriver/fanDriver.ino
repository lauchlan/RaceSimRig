/*
Drive 2 motors on a 2 channel motor shield rev3 (or compatiable)
*************************************************************/

#include <PWM.h>

const byte DATA_MAX_SIZE = 32;
char serialData[DATA_MAX_SIZE];

const int SPACE = 32;
const char END_MARKER = '\n';

const int MAX_IDLE_LOOPS = 50;
const int REPORT_LOOP_COUNT = 50;
const int LOOP_DELAY_MS = 100;

int channelACurrentSpeed = 0;
int channelBCurrentSpeed = 0;

const int CHANNEL_A_DIRECTION = 12;
const int CHANNEL_A_PWM = 3;
const int CHANNEL_A_BRAKE = 9;

const int CHANNEL_B_DIRECTION = 13;
const int CHANNEL_B_PWM = 11;
const int CHANNEL_B_BRAKE = 8;

void setup()
{
  pinMode(CHANNEL_A_DIRECTION, OUTPUT);
  pinMode(CHANNEL_A_BRAKE, OUTPUT);

  pinMode(CHANNEL_B_DIRECTION, OUTPUT);
  pinMode(CHANNEL_B_BRAKE, OUTPUT);

  digitalWrite(CHANNEL_A_DIRECTION, HIGH);
  digitalWrite(CHANNEL_A_BRAKE, LOW);

  digitalWrite(CHANNEL_B_DIRECTION, HIGH);
  digitalWrite(CHANNEL_B_BRAKE, LOW);

  SetPinFrequencySafe(CHANNEL_A_PWM, 60);

  Serial.begin(9600);
}

boolean receiveData()
{
  int index = 0;
  memset(serialData, SPACE, sizeof(serialData));

  // still receiving the same message.
  while ((Serial.available() > 0) && (index < DATA_MAX_SIZE))
  {
    char receivedChar = Serial.read();
    if (receivedChar == END_MARKER)
    {
      serialData[index] = '\0'; // end current message
      return true;
    }

    serialData[index++] = receivedChar;
  }

  // no more available bytes to read from serial and we
  // did not receive the separato. it's an incomplete message!
  memset(serialData, SPACE, sizeof(serialData));
  return false;
}

void processCommand(char channel, int value)
{
  switch (tolower(channel))
  {
  case 'a':
    analogWrite(CHANNEL_A_PWM, value);
    channelACurrentSpeed = value;
    break;
  case 'b':
    analogWrite(CHANNEL_B_PWM, value);
    channelBCurrentSpeed = value;
    break;
  }
}

void runCommands(char *data)
{
  // Commands should be in the form A:255;B:255
  char *command = strtok(data, ";");
  while (command != 0)
  {
    char *separator = strchr(command, ':');
    if (separator != 0)
    {
      *separator = 0;
      char channel = command[0];
      int value = atoi(++separator);

      processCommand(channel, value);
    }

    // next command
    command = strtok(0, ";");
  }
}

int loopCount = 0;
int consecutiveLoopsWithNoData = 0;

void loop()
{
  if (receiveData())
  {
    consecutiveLoopsWithNoData = 0;
    runCommands(serialData);
  }
  else
  {
    ++consecutiveLoopsWithNoData;
  }

  if (consecutiveLoopsWithNoData > MAX_IDLE_LOOPS)
  {
    processCommand('A', 0);
    processCommand('B', 0);
  }

  if (loopCount >= MAX_IDLE_LOOPS)
  {
    Serial.print("Fan speeds A:");
    Serial.print(channelACurrentSpeed);
    Serial.print(" B:");
    Serial.println(channelBCurrentSpeed);
    loopCount = 0;
  }

  ++loopCount;

  delay(LOOP_DELAY_MS);
}
