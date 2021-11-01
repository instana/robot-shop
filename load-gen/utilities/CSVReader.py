import csv

# Refs:
# [Tutorial1] https://rharshad.com/locust-load-test/
class CSVReader:
    def __init__(self, filepath):
        try:
            file = open(filepath)
        except TypeError:
            pass
        self.file = file
        self.reader = csv.reader(file)

    def __next__(self):
        try:
            return next(self.reader)
        except StopIteration:
            self.file.seek(0, 0)
            return next(self.reader)
