package logger

import (
	"fmt"
	"log"
)


type Logger struct {
	callback func(string)
}

func New(callback func(string)) *Logger {
	return &Logger{
		callback: callback,
	}
}

func (l *Logger) msg(format string, a ...interface{}) string {
	return fmt.Sprintf(format, a...)
}

func (l *Logger) Info(format string, a ...interface{}) {
	msg := l.msg(format, a...)
	msg = "INFO: " + msg
	log.Println(msg)
	l.callback(msg)
}


func (l *Logger) Error(format string, a ...interface{}) {
	msg := l.msg(format, a...)
	msg = "ERROR: " + msg
	log.Println(msg)
	l.callback(msg)
}


func (l *Logger) Fatal(format string, a ...interface{}) {
	msg := l.msg(format, a...)
	msg = "FATAL: " + msg
	log.Fatalln(msg)
	l.callback(msg)
}

