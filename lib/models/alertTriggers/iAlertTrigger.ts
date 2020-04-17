
export interface IAlertTrigger
{
	doesTrigger(response: any): Promise<boolean>;
}
