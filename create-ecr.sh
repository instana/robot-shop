#!/bin/bash

set -e

export AWS_DEFAULT_REGION=us-west-2

aws ecr create-repository --repository-name robot-shop/cart || true
aws ecr create-repository --repository-name robot-shop/catalogue || true
aws ecr create-repository --repository-name robot-shop/dispatch || true
aws ecr create-repository --repository-name robot-shop/load-gen || true
aws ecr create-repository --repository-name robot-shop/mongo || true
aws ecr create-repository --repository-name robot-shop/mysql || true
aws ecr create-repository --repository-name robot-shop/payment || true
aws ecr create-repository --repository-name robot-shop/ratings || true
aws ecr create-repository --repository-name robot-shop/shipping || true
aws ecr create-repository --repository-name robot-shop/payment || true
aws ecr create-repository --repository-name robot-shop/user || true
aws ecr create-repository --repository-name robot-shop/web || true



