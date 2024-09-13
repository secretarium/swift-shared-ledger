import { JSON } from "@klave/sdk";
import { StatusLog, StatusType, Trade, TradeInfo } from "../trade";
import { RoleType, User } from "../user";
import { address, amount, datetime } from "../../klave/types";
import { TradeIdentification } from "../inputs/types";

@JSON 
export class StatusAndTokenOutput {
    status: string;
    message: string;
    UTI: string;
    tokenB64: string;
}

@JSON 
export class SubmitTradeOutput {
    requestId: string;
    result: StatusAndTokenOutput;
}

@JSON 
export class StatusOutput {
    status: string;
    message: string;
    UTI: string;
}

@JSON 
export class GenericOutput {
    requestId: string;
    result: StatusOutput;
}

@JSON 
export class QueryTradeFromCreation {
    UTI: string;
    status: StatusType;
    statusHistory : Array<StatusLog>;
    data: TradeInfo;

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.statusHistory = trade.statusHistory;
        let tradeInfo = trade.tradeCreation;
        this.data = new TradeInfo(tradeInfo.info);
    }
}

@JSON 
export class KeysList {
    klaveServerPublicKey: string;

    constructor(klaveServer:string) {
        this.klaveServerPublicKey = klaveServer;
    }
}

@JSON 
export class TokenIdentityOutput {
    requestId: string;
    result: KeysList;    
}

@JSON 
export class ListOutput {
    requestId: string;
    result: Array<string>;    
}

@JSON 
export class ListTradeIDs {
    requestId: string;
    result: Array<TradeIdentification>;    
}

@JSON
export class SharedLedgerContent {
    locked: boolean;    
    trades: Array<Trade>;

    constructor() {
        this.locked = false;
        this.trades = new Array<Trade>();
    }
}

@JSON
export class SharedLedgerContentOutput {
    requestId: string;
    result: SharedLedgerContent;    
}

@JSON 
export class UserOutput {
    requestId: string;
    result: User;   
}