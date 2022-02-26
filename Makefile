.PHONY: build
build:
	GOOS=linux GOARCH=amd64
	cd lambda && go build -a -o ./getFunction/bin ./getFunction
	cd lambda && go build -a -o ./fetchFunction/bin ./fetchFunction
	cd lambda && go build -a -o ./putFunction/bin ./putFunction
	cd lambda && go build -a -o ./deleteFunction/bin ./deleteFunction
