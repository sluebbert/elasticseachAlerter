import { Configuration } from "../../configuration";
import { IAlert } from "./iAlert";
import { EmailAlert } from "./emailAlert";
import { TieredAlert } from "./tieredAlert";
import { ILogger } from "../logging/iLogger";

export class AlertFactory
{
	public static generateAlert(logger: ILogger, config: Configuration, definition: any): IAlert
	{
		var alertType = definition?.type || null;
		switch (alertType)
		{
			case 'email':
				return new EmailAlert(logger, config, definition);
			case 'tiered':
				return new TieredAlert(logger, config, definition);
			default:
				throw new Error(`Alert type ${alertType} is not supported.`);
		}
	}
}
