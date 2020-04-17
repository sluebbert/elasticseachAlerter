
import { default as numeral } from 'numeral';

export function setupNumeralExtensions()
{
	let boundaries = [1000, 1e+6, 6e+7, 3.6e+9];
	let suffixes = ['us', 'ms', 's', 'm', 'h'];
	numeral.register('format', 'duration', {
		regexps: {
			format: /([0\s]s)/,
			unformat: new RegExp(`(${suffixes.join('|')})`)
		},
		format: function(value, format, roundingFunction) {
            var output,
                suffix = (<any>numeral)._.includes(format, ' s') ? ' ' : '',
                min = 0,
				max;

            // check for space before
			format = format.replace(/\s?s/, '');
			
			let i = 0;
			let found = false;
			for (; i < boundaries.length; i++)
			{
				max = boundaries[i];
				if (value === null || value === 0 || value >= min && value < max)
				{
					suffix += suffixes[i];

					if (min > 0) {
						value = value / min;
					}

					found = true;
					break;
				}

				min = max;
			}

			if (!found)
			{
				suffix += suffixes[i];
				value = value / min;
			}

            output = (<any>numeral)._.numberToFormat(value, format, roundingFunction);

            return output + suffix;
		},
		unformat: function(string) {
            throw new Error('Not supported.');
		}
	});
}
