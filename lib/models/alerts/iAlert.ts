
import { IAlertTrigger } from '../alertTriggers/iAlertTrigger';
import { Configuration } from '../../configuration';

export interface IAlert
{
	sendAlert(response: any, trigger: IAlertTrigger, config: Configuration): Promise<void>;
}
