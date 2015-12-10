#!/bin/sh

appname=filtersimportexport

cp makexpi/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

