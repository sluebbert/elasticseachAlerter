import { IAlert } from "./iAlert";
import { Configuration } from "../../configuration";
import { IAlertTrigger } from "../alertTriggers/iAlertTrigger";
import { AlertFactory } from "./alertFactory";
import { ILogger, LogLevel } from "../logging/iLogger";

export class TieredAlert implements IAlert
{
	private readonly logger: ILogger;

	private nextTierId: number = 0;

	public Restart: boolean;
	public Tiers: AlertTier[] = [];
	public get CurrentTierId() : number { return this.nextTierId; }
	
	constructor(logger: ILogger, config: Configuration, definition: any)
	{
		this.logger = logger;
		
		this.Restart = definition.restartAfterLast || false;
		if (!definition.tiers)
			throw new Error('No tiers definition found.');

		let i = 0;
		for (let tier of definition.tiers)
			this.Tiers.push(new AlertTier(logger, ++i, config, tier));
	}

	public async sendAlert(response: any, trigger: IAlertTrigger, config: Configuration): Promise<void>
	{
		this.logger.logMessage(LogLevel.Verbose, `Executing alerts for tier ${this.nextTierId + 1}.`);

		let nextTier = this.Tiers[this.nextTierId];
		await nextTier.sendAlert(response, trigger, config);

		this.nextTierId++;
		if (this.nextTierId >= this.Tiers.length)
		{
			if (this.Restart)
				this.nextTierId = 0;
			else
				this.nextTierId = this.Tiers.length - 1;
		}
	}

	public reset(): void
	{
		this.nextTierId = 0;
	}
}

class AlertTier implements IAlert
{
	public TierId: number;
	public Alert: IAlert;
	
	constructor(logger: ILogger, tierId: number, config: Configuration, definition: any)
	{
		this.TierId = tierId;
		this.Alert = AlertFactory.generateAlert(logger, config, definition);
	}

	public async sendAlert(response: any, trigger: IAlertTrigger, config: Configuration): Promise<void>
	{
		await this.Alert.sendAlert(response, trigger, config);
	}
}
