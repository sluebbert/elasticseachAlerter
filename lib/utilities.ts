
import { default as dayjs } from 'dayjs';
import { default as numeral } from 'numeral';
import jsonQuery from 'json-query';
import { ILogger, LogLevel } from './models/logging/iLogger';

export function formatValue(column: any, value: any)
{
	var columnType = column.type?.toLowerCase();

	let typedValue = value;
	if (columnType)
	{
		switch (columnType)
		{
			case 'date':
				typedValue = new Date(typedValue);
		}
	}
	
	if (column.format)
	{
		if (column.type == 'date')
			typedValue = dayjs(typedValue).format(column.format);

		if (column.type == 'duration')
		{
			let unit = column.unit || 'ms';
			if (unit == 'us')
			{
				typedValue /= 1000;
				unit = 'ms';
			}

			let date = dayjs('1/1/1900').add(typedValue, unit);
			typedValue = date.format(column.format);
		}

		if (column.type == 'number')
		{
			typedValue = parseFloat(typedValue);
			if (column.format.indexOf('s') > -1)
			{
				let unit = column.unit || 'us';
				if (unit == 'ms')
					typedValue *= 1000;
			}

			typedValue = numeral(typedValue).format(column.format);
		}
	}

	return typedValue;
}

export function getFormatted(currentDate?: Date): string
{
	// return strftime('%m/%d/%Y %H:%M:%S.%L', currentDate || new Date());
	return (currentDate || new Date()).toISOString();
}

export function generateTable(logger: ILogger, tableDefinition: any, response: any)
{
	let rowPath = tableDefinition.rowPath || 'hits';
	if (!tableDefinition.rowPath)
		logger.logMessage(LogLevel.Verbose, `No rowPath property found for table, defaulting to '${rowPath}'.`);

	let rows = jsonQuery(rowPath, {data: response}).value;
	let table: any[] = [];
	for (let row of rows)
	{
		if (tableDefinition.limit && table.length > tableDefinition.limit)
			break;

		let tableRow: any[] = [];
		table.push(tableRow);

		for (let column of tableDefinition.columns)
		{
			let link: string | undefined = undefined;
			if (column.link)
			{
				link = <string> column.link;
				let matches = link.match(/\{[^\}]+\}/g);
				if (matches)
				{
					for (let match of matches)
					{
						let path = match.substr(1, match.length - 2);
						let value = jsonQuery(path, {data: row}).value;
						link = link.replace(match, encodeURIComponent(value));
					}
				}
			}

			let cell = {
				column: column,
				data: row,
				link: link,
				value: formatValue(column, jsonQuery(column.valuePath, {data: row}).value)
			};
			tableRow.push(cell);
		}
	}

	tableDefinition.rows = table;
}
