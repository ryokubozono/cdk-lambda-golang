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

// UserRequest is the request with user-info
type UserRequest struct {
	UserID   string   `json:"userID"`
	UserName string   `json:"userName"`
	Age      int      `json:"age"`
	Likes    []string `json:"likes"`
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

	// get n parse the request data
	bytesReqBody := []byte(request.Body)
	userReq := new(UserRequest)
	if err := json.Unmarshal(bytesReqBody, userReq); err != nil {
		log.Fatal("[ERROR]", err.Error())
	}

	// put an item
	user := User{
		UserID:   userReq.UserID,
		UserName: userReq.UserName,
		Age:      userReq.Age,
		Likes:    userReq.Likes,
	}
	err := table.Put(user).Run()
	if err != nil {
		log.Fatal("[ERROR]", err.Error())
	}

	return events.APIGatewayProxyResponse{
		Headers: map[string]string{
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Headers": "origin,Accept,Authorization,Content-Type",
			"Content-Type":                 "application/json",
		},
		Body:       string(bytesReqBody),
		StatusCode: 200,
	}, nil
}

func main() {
	lambda.Start(Handler)
}
