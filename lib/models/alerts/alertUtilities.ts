
import { IAlertTrigger } from '../alertTriggers/iAlertTrigger';

export function buildAlertState(response: any, alertTrigger: IAlertTrigger)
{
	return {
		'results': response,
		'trigger': alertTrigger
	};
}

export function validateTable(tableDefinition: any)
{
	if (!tableDefinition)
		return;

	if (!tableDefinition.columns)
		throw new Error('Table definition is missing a columns property.');

	for (let column of tableDefinition.columns)
	{
		let name = column.name;
		if (!name)
			throw new Error('Table column is missing a name property.');	
		
		if (!column.valuePath)
			throw new Error(`Column ${name} is missing a valuePath property.`);
	}
}
