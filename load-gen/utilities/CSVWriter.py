import os
import csv
from datetime import date

class CSVWriter:
    def __init__(self, filepath, custom_fields=[]):
        if os.environ.get('LOAD_DEBUG') == '1':
            print('CSVWriter init/args: filepath:\'{}\' custom_fields\'{}\''.format(filepath,custom_fields))

        try:
            file = open(filepath,'a')
        except TypeError as typeErr:
            print(f"CSVWriter init/Unexpected {err=}, {type(typeErr)=}")
            raise

        print('CSVWriter init/pass')
        self.file = file

        if not custom_fields:
            print('CSVWriter init/empty params')
        else:
            self.fieldnames = custom_fields

        try:
            self.writer = csv.DictWriter(self.file, self.fieldnames)
            self.writer.writeheader()
        except BaseException as err:
            print(f"CSVWriter init/Unexpected {err=}, {type(err)=}")
            raise

        self.file.flush()

    def writerow(self, row: dict):
        if os.environ.get('LOAD_DEBUG') == '1':
            print('CSVWriter/writerow/args: {}',format(row))

        if not row:
            print('CSVWriter/writerow/empty arg')
        else:
            try:
                self.writer.writerow(row)
                self.file.flush()
            except BaseException as err:
                print(f"CSVWriter/writerow/Unexpected {err=}, {type(err)=}")
                raise
