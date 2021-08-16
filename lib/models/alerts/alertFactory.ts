import { Configuration } from "../../configuration";
import { IAlert } from "./iAlert";
import { EmailAlert } from "./emailAlert";
import { TieredAlert } from "./tieredAlert";
import { ILogger } from "../logging/iLogger";
import { NoopAlert } from "./noopAlert";

export class AlertFactory
{
	public static generateAlert(logger: ILogger, config: Configuration, definition: any): IAlert
	{
		var alertType: string | null = definition?.type?.toString() || null;
		switch (alertType?.toLowerCase())
		{
			case 'email':
				return new EmailAlert(logger, config, definition);
			case 'tiered':
				return new TieredAlert(logger, config, definition);
			case 'noop':
				return new NoopAlert();
			default:
				throw new Error(`Alert type ${alertType} is not supported.`);
		}
	}
}
