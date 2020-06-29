



# Create a master key ARN to encrypt secrets
# https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/
MASTER_KEY_ARN=$(aws kms create-key --query KeyMetadata.Arn --output text)
aws kms create-alias \
      --alias-name alias/k8s-robotshop-master-key \
      --target-key-id $(echo $MASTER_KEY_ARN | cut -d "/" -f 2)
export MASTER_KEY_ARN=$MASTER_KEY_ARN


