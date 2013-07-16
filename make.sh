#!/bin/sh

appname=filtersimportexport

cp buildscript/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

