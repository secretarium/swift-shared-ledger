import { JSON } from "@klave/sdk";
import { address, amount, datetime } from "../../klave/types";

@JSON 
export class SubmitTradeInput {
    SLID: string;               // SharedLedger ID
    UTI: string;                // Optional: UTI if generated externally
    buyer: address;             // Blockchain address of buyer
    seller: address;            // Blockchain address of seller
    asset: string;              // Asset being traded (e.g., stock symbol)
    quantity: amount;           // Quantity of the asset
    price: amount;              // Trade price
    tradeDate: datetime;        // Date and time of trade execution
    jurisdiction: string;       // Jurisdiction of the trade
}

@JSON 
export class TradeInput {
    SLID: string;               // SharedLedger ID
    UTI: string;                // UTI of the trade
    tokenB64: string;           // Base64 encoded token
}

@JSON 
export class TradeIdentification {
    UTI: string;                // UTI of the trade
    tokenB64: string;           // Base64 encoded token
}
@JSON
export class MultipleTradeInput {
    SLID: string;                       // SharedLedger ID
    trades: Array<TradeIdentification>; // Array of UTI and tokenB64    
}

@JSON 
export class ExecuteTradeInput {
    SLID: string;    
    UTI: string;
    tokenB64: string;           // Base64 encoded token
    executionStatus: string;    // Executed/MetaData
}

@JSON 
export class ConfirmTradeInput {
    SLID: string;    
    UTI: string;
    tokenB64: string;           // Base64 encoded token
    confirmationStatus: string; // Confirmed/Rejected/MetaData
}


@JSON
export class TransferAssetInput {
    SLID: string;
    UTI: string;
    tokenB64: string;           // Base64 encoded token
    transferStatus: string;         // MetaData
}


@JSON
export class SettleTradeInput {
    SLID: string;
    UTI: string;
    tokenB64: string;           // Base64 encoded token
    settlementStatus: string;       // MetaData
}

@JSON
export class CancelTradeInput {
    SLID: string;
    UTI: string;
    tokenB64: string;           // Base64 encoded token
    reason: string;         // Reason for cancelling the trade
}

@JSON 
export class QueryTradeByUTIInput {
    SLID: string;
    UTI: string;
    tokenB64: string;           // Base64 encoded token
}

@JSON 
export class AuditTradeByUTIInput {
    SLID: string;
    UTI: string;
    tokenB64: string;           // Base64 encoded token
}

@JSON 
export class SetIdentitiesInput {
    resetKlaveServer: boolean;
}


@JSON
export class UserRequestInput {
    SLID: string;
    role: string;
    jurisdiction: string;

    constructor(SLID: string, role: string, jurisdiction: string) {
        this.SLID = SLID;
        this.role = role;
        this.jurisdiction = jurisdiction;
    }
}

@JSON
export class ApproveUserRequestInput {
    userRequestId: string;    
}

@JSON
export class SharedLedgerIDInput {
    SLID: string;    
}
