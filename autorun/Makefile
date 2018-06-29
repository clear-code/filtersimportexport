PACKAGE_NAME = filtersimportexport-autorun

all: xpi

xpi:
	cp ../makexpi/makexpi.sh ./
	./makexpi.sh -n $(PACKAGE_NAME) -o
	rm ./makexpi.sh
