PACKAGE_NAME = filtersimportexport

.PHONY: xpi autorun

all: xpi autorun

xpi: makexpi/makexpi.sh
	makexpi/makexpi.sh -n $(PACKAGE_NAME) -o

makexpi/makexpi.sh:
	git submodule update --init

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi

autorun:
	cd autorun && make && mv *.xpi ../
