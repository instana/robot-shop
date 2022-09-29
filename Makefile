

image-names:=rs-mongodb rs-catalogue rs-user rs-cart rs-mysql-db rs-shipping rs-ratings rs-payment rs-dispatch rs-web

aws-region:=ap-northeast-1
aws-account-id:=
image-name:=
tag:=latest
repository-base:=$(aws-account-id).dkr.ecr.ap-northeast-1.amazonaws.com
repository:=$(repository-base)/$(image-name)


docker-login:
	aws ecr get-login-password | docker login --username AWS --password-stdin $(repository-base)

create-repository-ll: $(image-names)

$(image-names):
	make create-repository image-name=$@

create-repository:
	aws ecr create-repository --repository-name $(image-name) --region $(aws-region)

push-all:
	make docker-push image-name=rs-mongodb target=mongo
	make docker-push image-name=rs-catalogue target=catalogue
	make docker-push image-name=rs-user target=user
	make docker-push image-name=rs-cart target=cart
	make docker-push image-name=rs-mysql-db target=mysql
	make docker-push image-name=rs-shipping target=shipping
	make docker-push image-name=rs-ratings target=ratings
	make docker-push image-name=rs-payment target=payment
	make docker-push image-name=rs-dispatch target=dispatch
	make docker-push image-name=rs-web target=web


docker-push:
	docker build -t $(image-name) $(target)
	docker tag $(image-name):$(tag) $(repository):$(tag)
	docker push $(repository):$(tag)


splunk-rum-token:=
splunk-realm:=us1
helm-upgrade:
	helm upgrade \
	  --set image.repo=$(repository-base) --set image.version=$(tag) --set image.pullPolicy=Always \
	  --set splunk.rumToken=$(splunk-rum-token) --set splunk.realm=$(splunk-realm) \
	  robot-shop --namespace robot-shop ./K8s/helm/


