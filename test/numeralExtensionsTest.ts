
import { default as numeral } from 'numeral';
import { assert } from 'chai';
import { setupNumeralExtensions } from '../lib/numeralExtensions';

describe('NumeralExtensionTests', function()
{
	setupNumeralExtensions();

	it('Formats us 1', async () =>
	{
		let f = numeral(0).format('0.00s');
		assert.equal(f, '0.00us');
	});

	it('Formats us 2', async () =>
	{
		let f = numeral(1001).format('0.00s');
		assert.equal(f, '1.00ms');
	});

	it('Formats us 3', async () =>
	{
		let f = numeral(1200).format('0.00s');
		assert.equal(f, '1.20ms');
	});

	it('Formats us 4', async () =>
	{
		let f = numeral(60_000).format('0s');
		assert.equal(f, '60ms');
	});

	it('Formats us 5', async () =>
	{
		let f = numeral(6_000_000).format('0s');
		assert.equal(f, '6s');
	});

	it('Formats us 6', async () =>
	{
		let f = numeral(3.156e+8).format('0.00s');
		assert.equal(f, '5.26m');
	});

	it('Formats us 7', async () =>
	{
		let f = numeral(3.6e+9).format('0s');
		assert.equal(f, '1h');
	});

	it('Formats us 8', async () =>
	{
		let f = numeral(122397).format('0.000s');
		assert.equal(f, '122.397ms');
	});
});
