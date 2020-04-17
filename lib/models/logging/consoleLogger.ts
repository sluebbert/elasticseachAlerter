import { ILogger, LogLevel } from "./iLogger";
import { getFormatted } from "../../utilities";

export class ConsoleLogger implements ILogger
{
	private levelFilter: LogLevel;

	constructor(levelFilter: LogLevel)
	{
		this.levelFilter = levelFilter;
	}

	public logMessage(logLevel: LogLevel, message: any): void
	{
		if (logLevel < this.levelFilter)
			return;

		let stream = console.log;
		if (logLevel == LogLevel.Error)
			stream = console.error;

		let tag = '';
		switch (logLevel)
		{
			case LogLevel.Verbose:
				tag = '\x1b[2mVERBOSE';
				break;
			case LogLevel.Info:
				tag = 'INFO';
				break;
			case LogLevel.Warning:
				tag = '\x1b[35mWARNING';
				break;
			case LogLevel.Error:
				tag = '\x1b[31mERROR';
				break;
		}
		
		if (typeof(message) == 'object')
		{
			stream(`[${getFormatted()}] ${tag}:`);
			stream(message);
			stream('\x1b[0m');
		}
		else
			stream(`[${getFormatted()}] ${tag}: ${message}\x1b[0m`);
	}
}
