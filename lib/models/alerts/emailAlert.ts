
import { IAlertTrigger } from '../alertTriggers/iAlertTrigger';
import { IAlert } from './iAlert';
import { render } from 'ejs';
import { writeFileSync } from 'fs';
import { default as path } from 'path';
import { createTransport } from 'nodemailer';
import { buildAlertState } from './alertUtilities';
import { Configuration, SmtpOptions } from '../../configuration';
import { BaseBodyAlert } from './baseBodyAlert';
import { ILogger, LogLevel } from '../logging/iLogger';

export class EmailAlert extends BaseBodyAlert implements IAlert
{
	private static readonly HtmlRegex = /^\<\!DOCTYPE\s+html/i;
	
	public SmtpOptions: SmtpOptions;
	public ToAddresses: string[];
	public FromAddress: string;
	public Title: string;

	private readonly transporter: any;

	constructor(logger: ILogger, config: Configuration, definition: any)
	{
		const defaultEmailTemplate = path.join(config.BaseDirectory, 'defaultTemplates/defaultEmailTemplate.ejs');

		super(logger, definition, defaultEmailTemplate);

		this.ToAddresses = definition.to;
		this.FromAddress = definition.from;
		this.Title = definition.title;

		if (definition.smtp)
			this.SmtpOptions = new SmtpOptions(definition.smtp || {});
		else
		{
			if (config.DefaultSmtpOptions)
				this.SmtpOptions = config.DefaultSmtpOptions;
			else
				throw new Error('No smtp options found in the rule definition or in the config definition.');
		}

		this.transporter = createTransport({
			host: this.SmtpOptions.Host,
			port: this.SmtpOptions.Port,
			secure: this.SmtpOptions.Secure,
			auth: {
				user: this.SmtpOptions.UserName,
				pass: this.SmtpOptions.Password
			}
		});
	}

	public async sendAlert(response: any, trigger: IAlertTrigger, config: Configuration): Promise<void>
	{
		let renderOptions = buildAlertState(response, trigger);

		let title = render(this.Title || '', renderOptions);
		let body = this.getBody(response, title, renderOptions);

		let mailOptions = {
			from: this.FromAddress,
			to: this.ToAddresses.join(', '),
			subject: title,
			html: <string | undefined> undefined,
			text: <string | undefined> undefined
		};

		if (EmailAlert.HtmlRegex.test(body))
			mailOptions.html = body;
		else
			mailOptions.text = body;

		if (config.DryRun)
		{
			if (config.OutputFile)
			{
				writeFileSync(config.OutputFile, body);
				this.logger.logMessage(LogLevel.Info, `Wrote output to ${config.OutputFile}`);
			}
			else
				this.logger.logMessage(LogLevel.Info, body);
			return;
		}

		this.logger.logMessage(LogLevel.Verbose, `Sending email`);
		return new Promise<void>((resolve, reject) =>
		{
			this.transporter.sendMail(mailOptions, (error: Error | null) =>
			{
				if (error)
					reject(error);
				else
					resolve();
			});
		});
	}
}
