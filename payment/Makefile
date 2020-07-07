IMG_NAME = robot-shop/payment
ACCOUNT_JJ=164382793440
DOCKER_PUSH_REPOSITORY=dkr.ecr.us-west-2.amazonaws.com
TAG?=latest
IMAGE=$(ACCOUNT_JJ).$(DOCKER_PUSH_REPOSITORY)/$(IMG_NAME)


ci-pr: build-image push-image
ci-release: build-image push-image

build-image:
	docker build -t $(IMG_NAME) .
push-image:
	docker tag $(IMG_NAME) $(IMAGE):$(TAG)
	docker push $(IMAGE):$(TAG) 