
import { IAlert } from "./alerts/iAlert";
import { IAlertTrigger } from './alertTriggers/iAlertTrigger';
import { ThresholdAlertTrigger } from './alertTriggers/thresholdAlertTrigger';
import { parseExpression } from "cron-parser";
import { request } from 'http';
import { Configuration } from "../configuration";
import { AlertFactory } from "./alerts/alertFactory";
import { TieredAlert } from "./alerts/tieredAlert";
import { ILogger, LogLevel } from "./logging/iLogger";

export class RunResult
{
	public HitCount: number;
	public Alerted: boolean;
	public Silenced: boolean;

	constructor(hitCount: number, alerted: boolean, silenced: boolean)
	{
		this.HitCount = hitCount;
		this.Alerted = alerted;
		this.Silenced = silenced;
	}
}

export class Rule
{
	private lastAlertDateTime: Date | null = null;
	private readonly logger: ILogger;

	public IndexPattern: string;
	public Request: any;
	public AlertTrigger: IAlertTrigger;
	public Alert: IAlert;
	public Name: string;
	public CronExpression: any;
	public Delay: number;
	public ReAlertOptions: ReAlertOptions;
	public FollowPaging: boolean;
	
	public get MillisecondsTillNextRun() : number
	{
		this.CronExpression.reset(new Date());
		return this.CronExpression.next().getTime() - (new Date().getTime()) + this.Delay;
	}
	
	constructor(logger: ILogger, config: Configuration, definition: any)
	{
		this.logger = logger;
		this.IndexPattern = definition.indexPattern;
		this.Request = definition.request;
		this.Name = definition.name;
		this.CronExpression = parseExpression(definition.interval || '*/15 * * * *');
		this.Delay = definition.delay || 0;
		this.Alert = AlertFactory.generateAlert(logger, config, definition.alert);
		this.FollowPaging = definition.followPaging || true;

		var alertTriggerType = definition.alertTrigger?.type || null;
		switch (alertTriggerType)
		{
			case 'threshold':
				this.AlertTrigger = new ThresholdAlertTrigger(this.logger, definition.alertTrigger);
				break;
			default:
				throw new Error(`Alert trigger type ${alertTriggerType} is not supported.`);
		}

		this.ReAlertOptions = new ReAlertOptions(definition.waitBeforeReAlert);
	}

	public async run(config: Configuration): Promise<RunResult>
	{
		let results = {
			hits: <any[]> [],
			aggregations: <any> null
		};
		let totalCount = 1;

		while (results.hits.length < totalCount)
		{
			var result = await this.getSearchResults(config, results.hits.length, this.Request.size == 0 ? 0 : 1000);
			results.aggregations = result.Aggregations;
			if (this.Request.size == 0)
			{
				totalCount = 0;
				break;
			}

			for (var row of result.Hits)
				results.hits.push(row);
			totalCount = result.TotalCount;
		}

		let shouldAlert = await this.AlertTrigger.doesTrigger(results);
		let silenced = false;
		if (shouldAlert && this.ReAlertOptions.DurationInMs > 0 && this.lastAlertDateTime)
		{
			let durationSince = new Date().getTime() - this.lastAlertDateTime.getTime();
			if (durationSince < this.ReAlertOptions.DurationInMs)
			{
				this.logger.logMessage(LogLevel.Verbose, `Silencing alert. Duration since last alert: ${durationSince}ms.`);
				shouldAlert = false;
				silenced = true;
			}
		}

		if (shouldAlert)
		{
			await this.Alert.sendAlert(results, this.AlertTrigger, config);
			this.lastAlertDateTime = new Date();
		}
		else if (!silenced && this.Alert instanceof TieredAlert && this.Alert.CurrentTierId > 0)
		{
			this.logger.logMessage(LogLevel.Verbose, `Not an alert condition, resetting current alert tier.`);
			this.Alert.reset();
		}

		return new RunResult(totalCount, shouldAlert, silenced);
	}

	private getSearchResults(config: Configuration, offset: number, size: number): Promise<SearchResults>
	{
		this.logger.logMessage(LogLevel.Verbose, `Sending POST to ${config.ElasticsearchHost}:${config.ElasticsearchPort}/${this.IndexPattern}/_search; From: ${offset}; Size: ${size};`);
		return new Promise<SearchResults>(async (resolve, reject) =>
		{
			var postData = JSON.stringify({
				"query": this.Request.query,
				"aggs": this.Request.aggregation || this.Request.aggs,
				"from": offset,
				"size": size
			});

			var options = {
				hostname: config.ElasticsearchHost,
				port: config.ElasticsearchPort,
				path: `/${this.IndexPattern}/_search`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': postData.length
				}
			};

			var req = request(options, res =>
			{
				res.setEncoding('utf8');
				
				var data = '';
				res.on('data', (d) => data += d);
				
				res.on('end', async () =>
				{
					if (<number>res.statusCode < 200 || <number>res.statusCode > 399)
					{
						reject(`Unsuccessful status code received (${res.statusCode}):\n${data}`);
						return;
					}

					var responseJson = JSON.parse(data);
					resolve(new SearchResults(responseJson.hits.hits, responseJson.aggregations, responseJson.hits.total.value));
				});
			});

			req.on('error', (error: Error) =>
			{
				reject(error);
			});

			req.write(postData);
			req.end();
		});
	}
}

class SearchResults
{
	public Hits: any[];
	public Aggregations: any[] | null;
	public TotalCount: number;

	constructor(hits: any[], aggregations: any[] | null, totalCount: number)
	{
		this.Hits = hits;
		this.TotalCount = totalCount;
		this.Aggregations = aggregations;
	}
}

class ReAlertOptions
{
	public DurationInMs: number;

	constructor(definition: any)
	{
		this.DurationInMs = 0;
		if (definition && definition.duration)
		{
			if (definition.duration.seconds)
				this.DurationInMs += definition.duration.seconds * 1000;
			if (definition.duration.minutes)
				this.DurationInMs += definition.duration.minutes * 60 * 1000;
			if (definition.duration.hours)
				this.DurationInMs += definition.duration.hours * 3600 * 1000;
			if (definition.duration.days)
				this.DurationInMs += definition.duration.days * 3600 * 24 * 1000;
		}
	}
}
