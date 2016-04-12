#!/bin/bash

# only used by storage tests
export AZURE_STORAGE_TEST_LOCATION="West US"

export NOCK_OFF=true
export AZURE_NOCK_RECORD= 

base_dir=$(dirname $0)

files=$@
if [ "$files" == "" ]; then
  # for now only test arm ones, as asm mode one rarely changed
  files=`ls $base_dir/*arm-*-live.txt`
fi
echo "Scenario Test Start: `date`"
echo
# echo files: $files
for file in $files
do
  location=`cat $file | grep '#location' | cut -c11-100`
  if [ "$location" == "" ]; then
    export AZURE_ARM_TEST_LOCATION="West US" 
  else
    export AZURE_ARM_TEST_LOCATION="$location" 
  fi
  echo set location: $AZURE_STORAGE_TEST_LOCATION
  file=`basename $file`
  echo executing $base_dir/$file
  node $base_dir/../scripts/unit.js $file 
  echo
done
echo "Scenario Test End: `date`"