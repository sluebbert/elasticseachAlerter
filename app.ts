
import { readFileSync } from "fs";
import { RuleRunner } from './lib/ruleRunner'
import * as yargs from 'yargs';
import { safeLoad } from "js-yaml";
import { Configuration } from './lib/configuration';
import { ConsoleLogger } from "./lib/models/logging/consoleLogger";
import { setupNumeralExtensions } from "./lib/numeralExtensions";

let argv = yargs
	.env("EA")
	.command('test', "Test a rule. Don't schedule it to run, run it right now!")
	.option('rule', {
		alias: 'r',
		description: 'Which rule or directory of rules to run.',
		type: 'string',
		required: true
	})
	.option('elasticsearchHost', {
		alias: 'H',
		description: 'The elasticsearch host to connect to.',
		type: 'string',
		required: true
	})
	.option('elasticsearchPort', {
		alias: 'p',
		description: 'The elasticsearch port to connect to.',
		type: 'number',
		default: 9200
	})
	.option('dryrun', {
		alias: 'd',
		description: 'Whether or not to actually send out alerts.',
		type: 'boolean'
	})
	.option('outputFile', {
		alias: 'o',
		description: 'For dryruns, where to send the body of alerts to.',
		type: 'string'
	})
	.option('logLevel', {
		alias: 'l',
		description: 'The log level to filter by.',
		type: 'string',
		default: 'Info',
		choices: ['Verbose', 'Info', 'Warning', 'Error']
	})
	.config('config', 'Path to a yaml config file.', (configPath: string) =>
	{
		return safeLoad(readFileSync(configPath, 'utf-8'));
	})
	.help()
	.alias('help', 'h')
	.argv;

setupNumeralExtensions();

let config = new Configuration(argv, __dirname);
let logger = new ConsoleLogger(config.LogLevelFilter);
let runner = new RuleRunner(logger, config);

if (argv._.includes('test'))
{
	runner.runTest(config);
}
else
{
	runner.run(config);
}

process.on('SIGINT', async () => { runner.stop(); process.exit(0); });
process.on('SIGTERM', async () => { runner.stop(); process.exit(0); });
