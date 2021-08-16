
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { LogLevel } from "./models/logging/iLogger";

export class Configuration
{
	public LogLevelFilter: LogLevel;
	public DryRun: boolean;
	public OutputFile: string | null;
	public RulesPath: string;
	public ElasticsearchHost: string;
	public ElasticsearchPort: number;
	public BaseDirectory: string;
	public DefaultSmtpOptions: SmtpOptions | null;

	constructor(argv: any, baseDirectory: string)
	{
		this.BaseDirectory = baseDirectory;
		this.DryRun = argv.dryrun || false;
		this.OutputFile = argv.outputFile || null;
		this.RulesPath = argv.rule || null;
		this.ElasticsearchHost = argv.elasticsearchHost || '';
		this.ElasticsearchPort = argv.elasticsearchPort || 9200;
		this.LogLevelFilter = LogLevel[argv.logLevel as keyof typeof LogLevel];

		if (argv.smtp)
			this.DefaultSmtpOptions = new SmtpOptions(argv.smtp);
		else
			this.DefaultSmtpOptions = null;
	}
}

export class SmtpOptions
{
	public Host: string;
	public Port: number;
	public Secure: boolean;
	public UserName: string;
	public Password: string;

	constructor(definition: any)
	{
		this.Host = definition.host;
		this.Port = definition.port;
		this.Secure = definition.secure;
		
		if (definition.authFile)
		{
			let contents = readFileSync(definition.authFile, { encoding: 'utf8' });
			let yaml = <any> load(contents);
			this.UserName = yaml.user;
			this.Password = yaml.pass;
		}
		else
		{
			this.UserName = definition.user;
			this.Password = definition.pass;
		}

		if (!this.UserName || !this.Password)
			throw new Error("Smtp username or password was not provided.");
	}
}
