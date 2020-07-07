#!/bin/bash

set -e

for name in cart catalogue dispatch load-gen mongo mysql ratings shipping payment user web; do make -C $name ci-release  ; done


# Build all X-ray services
# for name in cart catalogue payment user shipping ratings; do make -C $name ci-release  ; done