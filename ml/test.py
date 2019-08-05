import sys

from utils.output import DatabaseOutput


if __name__ == '__main__':

    sys.stderr = DatabaseOutput(1, 'err')

    print('hello ', end='', file=sys.stderr)
    print('world!!!', file=sys.stderr)
