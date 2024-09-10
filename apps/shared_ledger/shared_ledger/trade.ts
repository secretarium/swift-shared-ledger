import { Ledger, Crypto, JSON } from '@klave/sdk'
import { success, error } from "../klave/types"
import { encode as b64encode, decode as b64decode } from 'as-base64/assembly';
import { address, amount, datetime } from "../klave/types";
import { ConfirmTradeInput, ExecuteTradeInput, QueryTradeByUTIInput, SettleTradeInput, TransferAssetInput } from './inputs/types';
import { Context } from '@klave/sdk/assembly';

const TradesTable = "TradesTable";

@JSON
export class TradeInfo {
    buyer: address;                 // Blockchain address of buyer
    seller: address;                // Blockchain address of seller
    asset: string;                  // Asset being traded
    quantity: amount;               // Quantity of the asset
    price: amount;                  // Trade price
    tradeDate: datetime;            // Date and time of trade execution
    jurisdiction: string;           // Jurisdiction of the trade

    constructor(buyer: address, seller: address, asset: string, quantity: amount,  price: amount, tradeDate: datetime, jurisdiction: string) {
        this.buyer = buyer;
        this.seller = seller;
        this.asset = asset;
        this.quantity = quantity;
        this.price = price;
        this.tradeDate = tradeDate;
        this.jurisdiction = jurisdiction;
    }
}

@JSON
export class TradeExecution {
    executedBy: address;           // Blockchain address of Clearing House
    executionDate: datetime;     // Date and time of trade confirmation
    executionStatus: string;     // MetaData for Trade Confirmation

    constructor(executedBy: address, executionDate: datetime, executionStatus: string) {
        this.executedBy = executedBy;
        this.executionDate = executionDate;
        this.executionStatus = executionStatus;
    }
}

@JSON
export class TradeConfirmation {
    confirmedBy: address;           // Blockchain address of Clearing House
    confirmationDate: datetime;     // Date and time of trade confirmation
    confirmationStatus: string;     // MetaData for Trade Confirmation

    constructor(confirmedBy: address, confirmationDate: datetime, confirmationStatus: string) {
        this.confirmedBy = confirmedBy;
        this.confirmationDate = confirmationDate;
        this.confirmationStatus = confirmationStatus;
    }
}

@JSON
export class TradeTransfer {
    transferredBy: address;         // Blockchain address of Custodian
    transferDate: datetime;         // Date and time of transfer
    transferStatus: string;         // MetaData for Trade Transfer

    constructor(transferredBy: address, transferDate: datetime, transferStatus: string) {
        this.transferredBy = transferredBy;
        this.transferDate = transferDate;
        this.transferStatus = transferStatus;
    }
}

@JSON
export class TradeSettlement {
    settledBy: address;             // Blockchain address of Settlement Agent
    settlementDate: datetime;       // Date and time of reconciliation and final settlement
    settlementStatus: string;       // MetaData for Trade Settlement

    constructor(settledBy: address, settlementDate: datetime, settlementStatus: string) {
        this.settledBy = settledBy;
        this.settlementDate = settlementDate;
        this.settlementStatus = settlementStatus;
    }
}

@JSON
export class StatusLog {
    datetime: datetime;
    status: string;

    constructor(datetime: datetime, status: string) {
        this.datetime = datetime;
        this.status = status;
    }
}

@JSON 
export class AuditLog {
    performedBy: address;
    datetime: string;

    constructor(performedBy: address, datetime: string) {
        this.performedBy = performedBy;
        this.datetime = datetime;
    }
}

@JSON
export class Trade {    
    UTI: string;                            //Unique Trade Identifier
    tokenB64: string;                       //Token allowing access to this trade

    tradeInfo: TradeInfo;                   //Available with Read/Write for Trader/Investor
    tradeExecution: TradeExecution;         //Available with Read/Write for Broker/Dealer
    tradeConfirmation: TradeConfirmation;   //Available with Read/Write for ClearingHouse
    tradeTransfer: TradeTransfer;           //Available with Read/Write for Custodian
    tradeSettlement: TradeSettlement;       //Available with Read/Write for Settlement Agent

    status: string;                         // Current status (e.g., "pending", "confirmed", "settled")
    status_history : Array<StatusLog>;     
    audit_history: Array<AuditLog>;         // Audit trail of the trade

    constructor(UTI: string, buyer: address, seller: address, asset: string, quantity: amount, price: amount, tradeDate: datetime, jurisdiction: string) {
        this.UTI = "";
        if (UTI.length == 0) {
            //Create a UTI with a format corresponding to BOFAUS3N.TRADE20230905SEQ1234567890
            //<SWIFTCode>.TRADE<YYYYMMDD><sequence number for uniqueness>
            this.UTI = "SWIFT" + b64encode(Crypto.Utils.convertToUint8Array(Crypto.getRandomValues(8))) + ".TRADE" + tradeDate + b64encode(Crypto.Utils.convertToUint8Array(Crypto.getRandomValues(8)));
        }
        else {
            //Potentially check the format
            this.UTI = UTI;
        }
        this.tradeInfo = new TradeInfo(buyer, seller, asset, quantity, price, tradeDate, jurisdiction);
        this.tradeExecution = new TradeExecution("", "", "");
        this.tradeConfirmation = new TradeConfirmation("", "", "");
        this.tradeTransfer = new TradeTransfer("", "", "");
        this.tradeSettlement = new TradeSettlement("", "", "");

        this.tokenB64 = "";
        this.status = "pending";
        this.status_history = new Array<StatusLog>();
        this.audit_history = new Array<AuditLog>();
        this.status_history.push(new StatusLog(Context.get("trusted_time"), this.status));
    }

    static load(UTI: string) : Trade | null {
        let TradeObject = Ledger.getTable(TradesTable).get(UTI);
        if (TradeObject.length == 0) {
            // error("Trade does not exists. Create it first");
            return null;
        }
        let Trade = JSON.parse<Trade>(TradeObject);
        // success(`Trade loaded successfully: '${Trade.UTI}'`);
        return Trade;
    }

    save(): void {
        let TradeObject = JSON.stringify<Trade>(this);
        Ledger.getTable(TradesTable).set(this.UTI, TradeObject);
        // success(`Trade saved successfully: ${this.UTI}`);
    }

    delete(): void {
        Ledger.getTable(TradesTable).unset(this.UTI);
        success(`Trade deleted successfully: ${this.UTI}`);
    }

    addExecutionDetails(input: ExecuteTradeInput): void {
        this.tradeExecution = new TradeExecution(Context.get('sender'), Context.get("trusted_time"), input.executionStatus);
        this.status = "executed";
        this.status_history.push(new StatusLog(Context.get("trusted_time"), this.status));
    }

    addConfirmationDetails(input: ConfirmTradeInput): void {
        this.tradeConfirmation = new TradeConfirmation(Context.get('sender'), Context.get("trusted_time"), input.confirmationStatus);
        this.status = "confirmed";
        this.status_history.push(new StatusLog(Context.get("trusted_time"), this.status));
    }

    addTransferDetails(input: TransferAssetInput): void {
        this.tradeTransfer = new TradeTransfer(Context.get('sender'), Context.get("trusted_time"), input.transferStatus);
        this.status = "transferred";
        this.status_history.push(new StatusLog(Context.get("trusted_time"), this.status));
    }

    addSettlementDetails(input: SettleTradeInput): void {
        this.tradeSettlement = new TradeSettlement(Context.get('sender'), Context.get("trusted_time"), input.settlementStatus);
        this.status = "settled";
        this.status_history.push(new StatusLog(Context.get("trusted_time"), this.status));
    }

    verify_trade_token(now: string, storageServer_private_key: string) : boolean {        
        let token = b64decode(this.tokenB64);
        if (token.length != (40 + 64)) {
            error("Trade upload token size is invalid");
            return false;
        }

        let digestUTI = token.subarray(0, 32);
        let expectedDigestUTI = Crypto.SHA.digest("sha2-256", this.UTI);
        if (!expectedDigestUTI || expectedDigestUTI.byteLength != 32) {
            error("Expected Trade UTI digest size is invalid");
            return false;
        }
        if (digestUTI != expectedDigestUTI) {
            error("Trade upload token refers to the wrong Trade: " + digestUTI + " != vs expected " + expectedDigestUTI);
			return false;
        }

        // let token_time = token.subarray(32, 40);
        // Check the token has not expired
        // if (token_time.toString() > now) {
        //     error("Trade upload token has expired:" + token_time.toString() + " > " + now);
		// 	return false;
        // }

        let token_body = token.subarray(0, 40);
        let token_signature = token.subarray(40, 40+64);

        let storageServer_pkey = Crypto.ECDSA.getKey(storageServer_private_key);
        if (!storageServer_pkey) {
            error("Issue retrieving the key" + storageServer_private_key);
            return false;
        }
        let verified = storageServer_pkey.verify(b64encode(token_body), Crypto.Utils.convertToU8Array(token_signature));
        if(!verified) {
			error("Trade upload token signature is invalid: " + b64encode(token_signature) + ", " + b64encode(token_body));
			return false;            
        }
        return true;
    }

    generate_trade_token(now: string, klaveServer_private_key: string): Uint8Array {        
        let digestUTI = Crypto.SHA.digest("sha2-256", this.UTI);
        if (!digestUTI || digestUTI.byteLength != 32) {
            error("Trade UTI digest size is invalid");
            return new Uint8Array(0);
        }

        let token_body = new Uint8Array(40);
        token_body.set(Crypto.Utils.convertToUint8Array(digestUTI), 0);
        // This is where the time could go if expiration was needed.
        token_body.set(new Uint8Array(8), digestUTI.byteLength);

        let klaveServer_signing_key = Crypto.ECDSA.getKey(klaveServer_private_key);
        if (!klaveServer_signing_key) {
            error("Issue retrieving the key" + klaveServer_private_key);
            return new Uint8Array(0);
        }

        let token_signature = klaveServer_signing_key.sign(b64encode(token_body));
        let token = new Uint8Array(40 + 64);
        token.set(token_body, 0);
        token.set(Crypto.Utils.convertToUint8Array(token_signature), 40);
        return token;
    }
}