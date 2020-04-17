
export enum LogLevel
{
	Verbose = 0,
	Info = 1,
	Warning = 2,
	Error = 3
}

export interface ILogger
{
	logMessage(logLevel: LogLevel, message: any): void;
}
