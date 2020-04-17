
import { IAlertTrigger } from './iAlertTrigger';
import { ILogger, LogLevel } from '../logging/iLogger';
import jsonQuery from 'json-query';

export enum Operator
{
	eq,
	lt,
	gt,
	lte,
	gte,
	ne
}

export enum Aggregation
{
	count,
	max,
	min,
	avg,
	sum
}

export class ThresholdAlertTrigger implements IAlertTrigger
{
	private readonly logger: ILogger;
	
	public Value: Number;
	public Operator: Operator;
	public ValuePath: string | null;
	public Aggregation: Aggregation;
	public AggregatedValue: any;
	public RowPath: string;

	constructor(logger: ILogger, definition: any)
	{
		this.logger = logger;
		this.ValuePath = "count";

		this.Value = definition?.value || 0;
		this.ValuePath = definition?.valuePath || null;

		let agg: Aggregation | undefined = (<any>Aggregation)[(definition?.aggregation || (Aggregation[Aggregation.count]))];
		if (agg === undefined)
			throw new Error(`Aggregation ${definition.aggregation} is not supported.`);
		this.Aggregation = agg;
		
		let op: Operator | undefined = (<any>Operator)[(definition?.operator || (Operator[Operator.gt]))];
		if (op === undefined)
			throw new Error(`Operator ${definition.operator} is not supported.`);
		this.Operator = op;

		if (this.ValuePath == null && this.Aggregation != Aggregation.count)
			throw new Error(`A property name must be provided when not using count as an aggregation.`);

		if (!definition.rowPath)
			logger.logMessage(LogLevel.Verbose, `No rowPath property found for alert trigger, defaulting to 'hits'.`);
	
		this.RowPath = definition.rowPath || 'hits';
	}

	public async doesTrigger(response: any): Promise<boolean>
	{
		var rows = jsonQuery(this.RowPath, {data: response}).value;
		if (!rows)
			throw new Error(`Provided list path ${this.RowPath} did not find a valid list.`);

		this.logger.logMessage(LogLevel.Verbose, `Running alert trigger conditions on list that contains ${rows.length} items.`);

		if (this.Aggregation == Aggregation.count)
		{
			this.AggregatedValue = rows.length;
			return this.compareTo(rows.length, this.Value);
		}

		return this.compareTo(this.extractAggregation(rows), this.Value);
	}

	private extractAggregation(rows: any[]): any
	{
		if (this.ValuePath == null)
			throw new Error(`A property name must be provided when not using count as an aggregation.`);

		let runner: any = undefined;
		for (let row of rows)
		{
			let value = jsonQuery(this.ValuePath, {data: row}).value;

			switch (this.Aggregation)
			{
				case Aggregation.max:
					if (runner === undefined || value > runner)
						runner = value;
					break;
				case Aggregation.min:
					if (runner === undefined || value < runner)
						runner = value;
					break;
				case Aggregation.sum:
				case Aggregation.avg:
					if (runner === undefined)
						runner = value;
					else
						runner += value;
			}
		}

		if (this.Aggregation == Aggregation.avg)
			runner /= rows.length;

		this.AggregatedValue = runner;
		this.logger.logMessage(LogLevel.Verbose, `Aggregated result of ${Aggregation[this.Aggregation]} is ${runner}`);
		return runner;
	}

	private compareTo(value1: any, value2: any): boolean
	{
		switch (this.Operator)
		{
			case Operator.eq:
				this.logger.logMessage(LogLevel.Verbose, `Comparing ${value1} == ${value2}`);
				return value1 == value2;
			case Operator.gt:
				this.logger.logMessage(LogLevel.Verbose, `Comparing ${value1} > ${value2}`);
				return value1 > value2;
			case Operator.gte:
				this.logger.logMessage(LogLevel.Verbose, `Comparing ${value1} >= ${value2}`);
				return value1 >= value2;
			case Operator.lt:
				this.logger.logMessage(LogLevel.Verbose, `Comparing ${value1} < ${value2}`);
				return value1 < value2;
			case Operator.lte:
				this.logger.logMessage(LogLevel.Verbose, `Comparing ${value1} <= ${value2}`);
				return value1 <= value2;
			case Operator.ne:
				this.logger.logMessage(LogLevel.Verbose, `Comparing ${value1} != ${value2}`);
				return value1 != value2;
		}
	}
}
