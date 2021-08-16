import { Configuration } from "../../configuration";
import { IAlertTrigger } from "../alertTriggers/iAlertTrigger";
import { IAlert } from "./iAlert";

export class NoopAlert implements IAlert
{
    public sendAlert(response: any, trigger: IAlertTrigger, config: Configuration): Promise<void>
    {
        return Promise.resolve();
    }
}
