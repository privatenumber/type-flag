# Usage: python3.14 -I argparse_survey.py <argv...>
# Parses one argv with the shared survey schema (see survey.mjs) and prints one compact cell.
import argparse
import json
import sys


class NoExit(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(message)


def size(value):
    if value == 'bad':
        raise argparse.ArgumentTypeError('bad size')
    return value


parser = NoExit(exit_on_error=False)
parser.add_argument('-n', '--name')
parser.add_argument('-v', '--verbose', action=argparse.BooleanOptionalAction)
parser.add_argument('-c', '--count', type=float)
parser.add_argument('-s', '--size', type=size)
parser.add_argument('--über')
parser.add_argument('-é', '--eacute', action='store_true', default=None)
parser.add_argument('rest', nargs='*')

try:
    values = vars(parser.parse_args(sys.argv[1:]))
except (ValueError, argparse.ArgumentError) as error:
    print(f'error: {error}')
    sys.exit(0)

parts = [
    f'{key}={json.dumps(values[key], ensure_ascii=False)}'
    for key in ('name', 'verbose', 'count', 'size', 'über', 'eacute')
    if values[key] is not None
]
if values['rest']:
    parts.append(f'_={json.dumps(values["rest"], ensure_ascii=False)}')
print(' '.join(parts) or '(nothing)')
