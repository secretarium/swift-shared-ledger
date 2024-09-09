import { JSON } from "@klave/sdk";
import { StatusHistory, Trade, TradeConfirmation, TradeExecution, TradeInfo, TradeSettlement, TradeTransfer } from "../trade";
import { User } from "../user";
import { address, amount, datetime } from "../../klave/types";

@JSON 
export class StatusAndTokenOutput {
    status: string;
    message: string;
    UTI: string;    //generatedUTI
    tokenB64: string;  //token for access to the shared ledger
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
    UTI: string;    //just as a reminder
}

@JSON 
export class GenericOutput {
    requestId: string;
    result: StatusOutput;
}

@JSON 
export class QueryTradeFromCreation {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    status_history : Array<StatusHistory>;
    data: TradeInfo;                // Trade Execution data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.status_history = trade.status_history;
        this.data = new TradeInfo(trade.tradeInfo.buyer, trade.tradeInfo.seller, trade.tradeInfo.asset, trade.tradeInfo.quantity, trade.tradeInfo.price, trade.tradeInfo.tradeDate);
    }
}
@JSON 
export class QueryTradeFromCreationOutput {
    requestId: string;
    result: QueryTradeFromCreation;
}

@JSON 
export class QueryTradeFromExecution {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    status_history : Array<StatusHistory>;
    data: TradeExecution;           // Trade Execution data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.status_history = trade.status_history;
        this.data = new TradeExecution(trade.tradeExecution.executedBy, trade.tradeExecution.executionDate, trade.tradeExecution.executionStatus);
    }
}
@JSON 
export class QueryTradeFromExecutionOutput {
    requestId: string;
    result: QueryTradeFromExecution;
}

@JSON 
export class QueryTradeFromConfirmation {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    status_history : Array<StatusHistory>;
    data: TradeConfirmation;        // Trade Confirmation data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.status_history = trade.status_history;
        this.data = new TradeConfirmation(trade.tradeConfirmation.confirmedBy, trade.tradeConfirmation.confirmationDate, trade.tradeConfirmation.confirmationStatus);
    }
}
@JSON 
export class QueryTradeFromConfirmationOutput {
    requestId: string;
    result: QueryTradeFromConfirmation;
}

@JSON 
export class QueryTradeFromTransfer {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    status_history : Array<StatusHistory>;
    data: TradeTransfer;            // Trade Transfer data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.status_history = trade.status_history;
        this.data = new TradeTransfer(trade.tradeTransfer.transferredBy, trade.tradeTransfer.transferDate, trade.tradeTransfer.transferStatus);
    }
}
@JSON 
export class QueryTradeFromTransferOutput {
    requestId: string;
    result: QueryTradeFromTransfer;
}

@JSON 
export class QueryTradeFromSettlement {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    status_history : Array<StatusHistory>;
    data: TradeSettlement;          // Trade Transfer data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.status_history = trade.status_history;
        this.data = new TradeSettlement(trade.tradeSettlement.settledBy, trade.tradeSettlement.settlementDate, trade.tradeSettlement.settlementStatus);
    }
}
@JSON 
export class QueryTradeFromSettlementOutput {
    requestId: string;
    result: QueryTradeFromSettlement;
}

@JSON 
export class AuditLog {
    action: string;
    timestamp: string;
    performedBy: address;

    constructor(action: string, timestamp: string, performedBy: address) {
        this.action = action;
        this.timestamp = timestamp;
        this.performedBy = performedBy;
    }
}

@JSON 
export class AuditTradeByUTIOutput {
    UTI: string;                    // UTI of the trade
    AuditLogs: Array<AuditLog>;     // List of all performed audits

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.AuditLogs = new Array<AuditLog>();
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