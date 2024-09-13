import {Notifier, JSON} from "@klave/sdk"

export type address = string
export type amount = number
export type index = number
export type datetime = string

@JSON
export class ResultMessage {
    success!: boolean;
    message!: string;
}

export function error(message: string) : void {
    Notifier.sendJson<ResultMessage>({
        success: false,
        message: message
    });

}

export function success(message: string) : void {
    Notifier.sendJson<ResultMessage>({
        success: true,
        message: message
    });
}

