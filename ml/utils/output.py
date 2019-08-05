import sys
from io import TextIOWrapper

from utils.query import query


class DatabaseOutput(TextIOWrapper):

    def __init__(self, id_, out):
        self.id = id_
        self.out = out
        self.stdout = sys.stdout
        self.stderr = sys.stderr

    def write(self, output):
        if self.out == 'out':
            print(output, file=self.stdout, end='')
        elif self.out == 'err':
            print(output, file=self.stderr, end='')
        else:
            raise ValueError('output must either be "out" or "err"')

        query(f'UPDATE training_progress SET std_{self.out} = std_{self.out} || %s WHERE id=%s',
              (output, self.id))

    def flush(self):
        # Flush must exist, but its a no-op for us
        pass
