package main

import (
	"github.com/codewithwan/gostreamix/internal/core"
)

func main() {
	c := core.BuildContainer()
	if err := core.Bootstrap(c); err != nil {
		panic(err)
	}
}
