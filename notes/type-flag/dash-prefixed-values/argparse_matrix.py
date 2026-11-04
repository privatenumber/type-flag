import argparse
import sys

inputs = [
    ['--range', '-5'],
    ['--range', '-5..10'],
    ['--range', '-5%'],
    ['--range', '-.5x'],
    ['--range', '--verbose'],
]


class NoExit(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError(message)


def make(with_digit_option):
    parser = NoExit(exit_on_error=False)
    parser.add_argument('--range')
    parser.add_argument('--verbose', action='store_true')
    if with_digit_option:
        parser.add_argument('-5', dest='five', action='store_true')
    return parser


print(f'## argparse (Python {sys.version.split()[0]})')
for with_digit_option in (False, True):
    label = 'with -5 option' if with_digit_option else 'no digit options'
    for argv in inputs:
        try:
            result = vars(make(with_digit_option).parse_args(argv))
        except (ValueError, argparse.ArgumentError) as error:
            result = f'error: {error}'
        print(f'[{label}] {" ".join(argv)}\t=> {result}')
