package logger

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func NewLogger() (*zap.Logger, error) {
	ec := zap.NewDevelopmentEncoderConfig()
	ec.EncodeTime = zapcore.ISO8601TimeEncoder
	return zap.New(zapcore.NewCore(
		zapcore.NewConsoleEncoder(ec),
		zapcore.AddSync(os.Stdout),
		zap.InfoLevel,
	)), nil
}
