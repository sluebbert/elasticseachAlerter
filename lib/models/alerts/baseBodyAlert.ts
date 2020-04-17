import { IAlert } from "./iAlert";
import { IAlertTrigger } from "../alertTriggers/iAlertTrigger";
import { Configuration } from "../../configuration";
import { readFileSync } from 'fs';
import { render } from 'ejs';
import { AlertLink } from "./alertLink";
import { generateTable } from "../../utilities";
import { ILogger } from "../logging/iLogger";
import { validateTable } from "./alertUtilities";

export abstract class BaseBodyAlert implements IAlert
{
	protected readonly logger: ILogger;

	public Summary: string;
	public BodyTemplate: string | null = null;
	public BodyContent: string | null = null;
	public Links: AlertLink[] = [];
	public Tables: any[] | null = null;

	constructor(logger: ILogger, definition: any, defaultTemplatePath: string)
	{
		this.logger = logger;
		this.Summary = definition.summary;

		if (definition.body && typeof(definition.body) == 'string')
		{
			this.BodyContent = definition.body;
		}
		else
		{
			let bodyTemplatePath: string | null = null;
			if (definition.body?.template)
				bodyTemplatePath = definition.body.template;
			else
				bodyTemplatePath = defaultTemplatePath;

			if (bodyTemplatePath)
				this.BodyTemplate = readFileSync(bodyTemplatePath, { encoding: 'utf8' });
		}

		this.Tables = definition.tables || null;
		if (this.Tables)
		{
			for (let table of this.Tables)
				validateTable(table);
		}

		if (definition.links)
		{
			for (let link of definition.links)
			{
				if (typeof(link) == 'string')
					this.Links.push(new AlertLink(link));
				else
					this.Links.push(new AlertLink(link.link, link.text));
			}
		}
	}

	public abstract sendAlert(response: any, trigger: IAlertTrigger, config: Configuration): Promise<void>;

	protected getBody(response: any, title: string, renderOptions: any): string
	{
		let summary = render(this.Summary || '', renderOptions);

		if (this.Tables)
		{
			for (let table of this.Tables)
				generateTable(this.logger, table, response);
		}

		let fullRenderOptions = {
			'title': title,
			'summary': summary,
			'links': this.Links,
			'tables': this.Tables,
			...renderOptions
		};

		let body: string;
		if (this.BodyTemplate)
			body = render(this.BodyTemplate, fullRenderOptions);
		else
			body = render(this.BodyContent || '', fullRenderOptions);

		return body;
	}
}
