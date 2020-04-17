
import { readFileSync, readdirSync, statSync } from "fs";
import * as path from "path";
import { safeLoad } from "js-yaml";
import { Rule } from './models/rule';
import { getFormatted } from './utilities';
import { Configuration } from './configuration';
import { ILogger, LogLevel } from "./models/logging/iLogger";
import { ConsoleLogger } from "./models/logging/consoleLogger";

export class RuleRunner
{
	private readonly config: Configuration;
	private readonly logger: ILogger;
	private rules: Rule[] = [];

	private timeoutMap: Map<Rule, NodeJS.Timeout> = new Map<Rule, NodeJS.Timeout>();

	constructor(logger: ILogger, config: Configuration)
	{
		this.config = config;
		this.logger = logger;
		this.reloadRules();
	}

	public async run(config: Configuration): Promise<void>
	{
		for (let rule of this.rules)
			this.timeoutMap.set(rule, this.scheduleRule(rule, config));
		this.logger.logMessage(LogLevel.Info, 'Rules loaded.');
	}

	public async stop(): Promise<void>
	{
		for (let value of this.timeoutMap.values())
			clearTimeout(value);

		this.timeoutMap.clear();
		this.logger.logMessage(LogLevel.Info, 'Rules unloaded.');
	}

	public async runTest(config: Configuration): Promise<void>
	{
		if (this.rules.length > 1)
			throw new Error('Cannot execute a dryrun on multiple rules.');
		if (this.rules.length == 0)
			throw new Error('No rules found.');

		var rule = this.rules[0];
		try
		{
			this.logger.logMessage(LogLevel.Info, `Running rule ${rule.Name}`);
			let result = await rule.run(config);
			this.logger.logMessage(LogLevel.Info, `Rule ${rule.Name} completed. Hits: ${result.HitCount}. Alerted: ${result.Alerted}. Silenced: ${result.Silenced}.`);
		}
		catch (error)
		{
			this.logger.logMessage(LogLevel.Error, `Error caught while running rule ${rule.Name}:`);
			this.logger.logMessage(LogLevel.Error, error);
		}
	}

	private reloadRules()
	{
		this.rules = [];
		let stat = statSync(this.config.RulesPath);
		if (stat.isDirectory())
		{
			let files = readdirSync(this.config.RulesPath);
			for (let file of files)
			{
				let fullFilename = path.join(this.config.RulesPath, file);
				if (fullFilename.endsWith('yaml') || fullFilename.endsWith('yml'))
				{
					var fileContents = readFileSync(fullFilename, { encoding: 'utf8' });
					var loadedYaml = safeLoad(fileContents);
					this.rules.push(new Rule(this.logger, this.config, loadedYaml));
				}
			}
		}
		else
		{
			var fileContents = readFileSync(this.config.RulesPath, { encoding: 'utf8' });
			var loadedYaml = safeLoad(fileContents);
			this.rules.push(new Rule(this.logger, this.config, loadedYaml));
		}
	}

	private scheduleRule(rule: Rule, config: Configuration): NodeJS.Timeout
	{
		this.logger.logMessage(LogLevel.Info, `Scheduling next run for rule ${rule.Name} at ${getFormatted(new Date(new Date().getTime() + rule.MillisecondsTillNextRun))}.`);
		return setTimeout(() => this.executeRule(rule, config), rule.MillisecondsTillNextRun);
	}

	private async executeRule(rule: Rule, config: Configuration): Promise<void>
	{
		try
		{
			this.logger.logMessage(LogLevel.Info, `Running rule ${rule.Name}.`);
			let result = await rule.run(config);
			this.logger.logMessage(LogLevel.Info, `Rule ${rule.Name} completed. Hits: ${result.HitCount}. Alerted: ${result.Alerted}. Silenced: ${result.Silenced}.`);
		}
		catch (error)
		{
			this.logger.logMessage(LogLevel.Error, `Error caught while running rule ${rule.Name}:`);
			this.logger.logMessage(LogLevel.Error, error);
		}
		finally
		{
			this.timeoutMap.set(rule, this.scheduleRule(rule, config));
		}
	}
}
