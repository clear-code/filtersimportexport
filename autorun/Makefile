PACKAGE_NAME = filtersimportexport-autorun

all: xpi

xpi:
	cp ../buildscript/makexpi.sh ./
	./makexpi.sh -n $(PACKAGE_NAME) -o
	rm ./makexpi.sh
