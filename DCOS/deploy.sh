#!/bin/bash

cd manifest && \
  for i in *.json; do dcos marathon app add $i; done