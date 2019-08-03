import sys

from utils.query import query


class DatabaseOutput(object):

    def __init__(self, id_, out):
        self.id = id_
        self.out = out
        sys.stdout.__init__(self)

    def write(self, string):
        query('UPDATE INTO training_progress')
