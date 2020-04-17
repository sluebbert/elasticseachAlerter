
export class AlertLink
{
	public Text: string;
	public Link: string;

	constructor(link: string, text?: string)
	{
		this.Link = link;
		this.Text = text || link;
	}
}
