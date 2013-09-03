PACKAGE_NAME = filtersimportexport

.PHONY: xpi autorun

all: xpi autorun

xpi: buildscript/makexpi.sh
	cp buildscript/makexpi.sh ./
	./makexpi.sh -n $(PACKAGE_NAME) -o
	rm ./makexpi.sh

buildscript/makexpi.sh:
	git submodule update --init

autorun:
	cd autorun && make && mv *.xpi ../
