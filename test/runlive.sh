#!/bin/bash

# used by almost all arm test
export AZURE_ARM_TEST_LOCATION=South Central US

# only used by storage tests
export AZURE_STORAGE_TEST_LOCATION=West US

export NOCK_OFF=true

base_dir=$(dirname $0)

files=$@
if [ "$files" == "" ]; then
   # only test arm ones, as asm mode one rarely changed
  files=`ls $base_dir/*arm-*-live.txt`
fi

for file in $files
do
  echo executing $file
  node $base_dir/../scripts/unit.js $base_dir/$file 
done