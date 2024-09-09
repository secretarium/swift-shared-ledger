import { JSON } from "@klave/sdk";
import { address, amount, datetime } from "../../klave/types";

@JSON 
export class TradeInput {
    SLID: string;               // SharedLedger ID
    UTI: string;                // Optional: UTI if generated externally
    buyer: address;             // Blockchain address of buyer
    seller: address;            // Blockchain address of seller
    asset: string;              // Asset being traded (e.g., stock symbol)
    quantity: amount;           // Quantity of the asset
    price: amount;              // Trade price
    tradeDate: datetime;        // Date and time of trade execution
}

@JSON 
export class ConfirmTradeInput {
    SLID: string;
    UTI: string;
    confirmedBy: address;       // Blockchain address confirming the trade
    confirmationStatus: string; // Confirmed/Rejected/MetaData
}


@JSON
export class TransferAssetInput {
    SLID: string;
    UTI: string;
    transferredBy: address;         // Blockchain address settling the trade
    transferStatus: string;         // MetaData
}


@JSON
export class SettleTradeInput {
    SLID: string;
    UTI: string;
    settledBy: address;             // Blockchain address settling the trade
    settlementStatus: string;       // MetaData
}

@JSON
export class CancelTradeInput {
    SLID: string;
    UTI: string;
    cancelledBy: address;   // Blockchain address of the party initiating the cancellation
    reason: string;         // Reason for cancelling the trade
}

@JSON 
export class QueryTradeByUTIInput {
    SLID: string;
    UTI: string;
}

@JSON 
export class AuditTradeByUTIInput {
    SLID: string;
    UTI: string;
}

@JSON 
export class SetIdentitiesInput {
    resetKlaveServer: boolean;
    resetStorageServer: boolean;
}


@JSON
export class UserRequestInput {
    sharedLedgerId: string;
    role: string;
    jurisdiction: string;

    constructor(sharedLedgerId: string, role: string, jurisdiction: string) {
        this.sharedLedgerId = sharedLedgerId;
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
    sharedLedgerId: string;    
}
