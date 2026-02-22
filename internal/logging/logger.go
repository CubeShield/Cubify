package logger

import (
	"context"
	"fmt"
	"log"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)


type Logger struct {
	callback func(string)
}

func New(ctx context.Context) *Logger {
	return &Logger{
		callback: func (msg string) {runtime.EventsEmit(ctx, "log:line", msg)},
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

