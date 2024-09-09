import { JSON } from "@klave/sdk";
import { Trade, TradeConfirmation, TradeExecution, TradeSettlement, TradeTransfer } from "../trade";
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
export class QueryTradeFromExecutionOutput {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    data: TradeExecution;           // Trade Execution data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.data = new TradeExecution(trade.tradeExecution.buyer, trade.tradeExecution.seller, trade.tradeExecution.asset, trade.tradeExecution.quantity, trade.tradeExecution.price, trade.tradeExecution.tradeDate);
    }
}

@JSON 
export class QueryTradeFromConfirmationOutput {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    data: TradeConfirmation;        // Trade Confirmation data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.data = new TradeConfirmation(trade.tradeConfirmation.confirmedBy, trade.tradeConfirmation.confirmationDate, trade.tradeConfirmation.confirmationStatus);
    }
}

@JSON 
export class QueryTradeFromTransferOutput {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    data: TradeTransfer;            // Trade Transfer data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.data = new TradeTransfer(trade.tradeTransfer.transferredBy, trade.tradeTransfer.transferDate, trade.tradeTransfer.transferStatus);
    }
}

@JSON 
export class QueryTradeFromSettlementOutput {
    UTI: string;                    // UTI of the trade
    status: string;                 // Current status (e.g., "pending", "confirmed", "settled")
    data: TradeSettlement;          // Trade Transfer data

    constructor(trade: Trade) {
        this.UTI = trade.UTI;
        this.status = trade.status;
        this.data = new TradeSettlement(trade.tradeSettlement.settledBy, trade.tradeSettlement.settlementDate, trade.tradeSettlement.settlementStatus);
    }
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

    constructor() {
        this.result = new SharedLedgerContent;
    }
}

@JSON 
export class UserOutput {
    requestId: string;
    result: User;   
}