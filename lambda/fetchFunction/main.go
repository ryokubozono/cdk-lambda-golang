package main

import (
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/guregu/dynamo"

	"github.com/kelseyhightower/envconfig"
)

// Config is the struct for envconfig
type Config struct {
	TableName string `required:"true" split_words:"true"`
	Region    string `default:"ap-northeast-1"`
}

// User is the struct for the table
type User struct {
	UserID   string   `dynamo:"UserID"`
	UserName string   `dynamo:"UserName"`
	Age      int      `dynamo:"Age"`
	Likes    []string `dynamo:"Likes"`
}

// Handler is called by main function
func Handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// envconfig
	var config Config
	if err := envconfig.Process("", &config); err != nil {
		log.Fatal("[ERROR]", err.Error())
	}

	// dynamoDB
	sess := session.Must(session.NewSession())
	db := dynamo.New(sess, &aws.Config{
		Region: aws.String(config.Region),
	})
	table := db.Table(config.TableName)

	// scan all
	var users []User
	err := table.Scan().All(&users)
	if err != nil {
		log.Fatal("[ERROR]", err.Error())
	}
	jsonBytesUsers, err := json.Marshal(users)
	if err != nil {
		log.Fatal("[ERROR]", err.Error())
	}

	return events.APIGatewayProxyResponse{
		Headers: map[string]string{
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Headers": "origin,Accept,Authorization,Content-Type",
			"Content-Type":                 "application/json",
		},
		Body:       string(jsonBytesUsers),
		StatusCode: 200,
	}, nil
}

func main() {
	lambda.Start(Handler)
}
