# Makefile
CDK_AWS_ACCOUNT_ID = $(shell aws sts get-caller-identity --query Account --output text)
CDK_AWS_REGION = $(shell aws configure get region)

ifeq ($(CDK_AWS_REGION),)
    $(error CDK_AWS_REGION is not set)
endif
ifeq ($(CDK_AWS_ACCOUNT_ID),)
    $(error CDK_AWS_ACCOUNT_ID is not set)
endif

$(info Account is $(CDK_AWS_ACCOUNT_ID))
$(info Region is $(CDK_AWS_REGION))

IOT_CLIENT = iot_client/

.PHONY: init
init:
	npm install
	curl https://www.amazontrust.com/repository/AmazonRootCA1.pem > ${IOT_CLIENT}root-CA.crt
	python3 -m venv ${IOT_CLIENT}venv/
	${IOT_CLIENT}venv/bin/pip install -r ${IOT_CLIENT}requirements.txt

.PHONY: deploy
deploy:
	npm run build
	npm test
	npx cdk deploy -f

.PHONY: destroy
destroy:
	npx cdk destroy -f
