import { Ledger, Crypto, JSON } from '@klave/sdk'
import { success, error } from "../klave/types"
import { encode as b64encode, decode as b64decode } from 'as-base64/assembly';
import { address, amount, datetime } from "../klave/types";
import { ActionTradeInput } from './inputs/types';
import { Context } from '@klave/sdk/assembly';
import { JurisdictionType, RoleType } from './user';
import { levenshtein } from './levenshtein';

const TradesTable = "TradesTable";

@JSON
export class TradeInfo {
    buyerName: address;             // Blockchain address of buyer  
    buyerCountry: string;           // Country of buyer       
    buyerAccountId: string;           // AccountId of buyer       
    sellerName: address;            // Blockchain address of seller    
    sellerCountry: string;          // Country of seller
    sellerAccountId: string;          // AccountId of seller
    asset: string;                  // Asset being traded           - custodian/clearing house
    quantity: amount;               // Quantity of the asset        
    price: amount;                  // Trade price                  
    tradeDate: datetime;            // Date and time of trade execution 
    jurisdiction: JurisdictionType;           // Jurisdiction of the trade

    constructor(tradeInput: TradeInfo) {
        this.buyerName = tradeInput.buyerName;
        this.sellerName = tradeInput.sellerName;
        this.buyerCountry = tradeInput.buyerCountry;
        this.buyerAccountId = tradeInput.buyerAccountId;
        this.sellerCountry = tradeInput.sellerCountry;
        this.sellerAccountId = tradeInput.sellerAccountId;
        this.asset = tradeInput.asset;
        this.quantity = tradeInput.quantity;
        this.price = tradeInput.price;
        this.tradeDate = tradeInput.tradeDate;
        this.jurisdiction = tradeInput.jurisdiction;
    }
}

@JSON
export class TradeCreation {
    addedBy: address;       // Blockchain address of Trader
    datetime: datetime;     // Date and time of trade execution
    info: TradeInfo;        // MetaData for Trade Execution

    constructor(addedBy: address, datetime: datetime, info: TradeInfo) {
        this.addedBy = addedBy;
        this.datetime = datetime;
        this.info = info;
    }

    clear(): void {
        this.info.buyerName = "";
        this.info.sellerName = "";
        this.info.buyerCountry = "";
        this.info.sellerCountry = "";
        this.info.asset = "";
        this.info.quantity = 0;
        this.info.price = 0;
        this.info.tradeDate = "";
        this.info.jurisdiction = JurisdictionType.None;
        this.addedBy = "";
    }

    onlyKeepAssetAndSellerInfo(): void {
        this.info.buyerName = "";
        this.info.buyerCountry = "";
        this.info.quantity = 0;
        this.info.price = 0;
        this.info.tradeDate = "";
        this.info.jurisdiction = JurisdictionType.None;
        this.addedBy = "";
    }

    onlyKeepAssetAndBuyerInfo(): void {
        this.info.sellerName = "";
        this.info.sellerCountry = "";
        this.info.quantity = 0;
        this.info.price = 0;
        this.info.tradeDate = "";
        this.info.jurisdiction = JurisdictionType.None;
        this.addedBy = "";
    }

    onlyKeepAssetBuyerAndSellerInfo(): void {
        this.info.quantity = 0;
        this.info.price = 0;
        this.info.tradeDate = "";
        this.info.jurisdiction = JurisdictionType.None;
        this.addedBy = "";
    }
}

@JSON
export class TradeComment {
    addedBy: address;       // Blockchain address of Broker
    role: RoleType;         // Role of the user adding the comment
    datetime: datetime;     // Date and time of trade execution
    metadata: string;       // MetaData for Trade Confirmation

    constructor(addedBy: address, role: RoleType, datetime: datetime, metadata: string) {
        this.addedBy = addedBy;
        this.role = role;
        this.datetime = datetime;
        this.metadata = metadata;
    }
}

@JSON
export class StatusLog {
    datetime: datetime;
    status: StatusType;

    constructor(datetime: datetime, status: StatusType) {
        this.datetime = datetime;
        this.status = status;
    }
}

@JSON 
export class AuditLog {
    performedBy: address;
    datetime: datetime;

    constructor(performedBy: address, datetime: datetime) {
        this.performedBy = performedBy;
        this.datetime = datetime;
    }
}

@JSON 
export class MatchLog {
    performedBy: address;
    datetime: datetime;
    matchedKey: string;
    matchedValue: string;

    constructor(performedBy: address, datetime: datetime, matchedKey: string, matchedValue: string) {
        this.performedBy = performedBy;
        this.datetime = datetime;
        this.matchedKey = matchedKey;
        this.matchedValue = matchedValue;
    }
}

@JSON 
export class MatchedEvent {
    key: string;
    matched: boolean;    

    constructor(key: string, matched: boolean) {
        this.key = key;
        this.matched = matched;
    }
}

@JSON 
export class MatchCheckList {
    events: Array<MatchedEvent>;

    constructor() {
        this.events = new Array<MatchedEvent>();
    }
}

/** Status types. */
export enum StatusType {    
    None = 0,
    Executed = 1,
    Settling = 2,
    Settled = 3
};

export function status_type(input: string): StatusType {
    if (input === "executed")
        return StatusType.Executed;  
    if (input === "settling")
        return StatusType.Settling;
    if (input === "settled")
        return StatusType.Settled;
    return StatusType.None;
}


@JSON
export class Trade {    
    UTI: string;                            //Unique Trade Identifier
    tokenB64: string;                       //Token allowing access to this trade

    tradeCreation: TradeCreation;        
    tradePublicComments: Array<TradeComment>;   
    tradePrivateComments: Array<TradeComment>;  

    matchTradeDetails:  Array<MatchLog>;        // Settlement Agent => settling    (buyerName, buyerCountry, sellerName, sellerCountry)
    matchMoneyTransfer: Array<MatchLog>;        // Clearing House  (price) inputs(asset)
    matchAssetTransfer: Array<MatchLog>;        // Custodian       (quantity) inputs(asset)
    matchAMLSanction:   Array<MatchLog>;        // AMLSanction   (AMLRiskRank, UnderSanction) 

    status: StatusType;                         // Current status (e.g., "executed", "settling", "settled")
    statusHistory : Array<StatusLog>;     
    auditHistory: Array<AuditLog>;         // Audit trail of the trade

    constructor(UTI: string, tradeInfo: TradeInfo) {
        this.UTI = UTI;
        if (UTI.length === 0) {
            //Create a UTI with a format corresponding to BOFAUS3N.TRADE20230905SEQ1234567890
            //<SWIFTCode>.TRADE<YYYYMMDD><sequence number for uniqueness>
            let dateString = new Date(u64(parseInt(tradeInfo.tradeDate))).toISOString().slice(0, 10).replace("-", "").replace("-", "");
            this.UTI = "SWIFT" + b64encode(Crypto.Utils.convertToUint8Array(Crypto.getRandomValues(4))) + ".TRADE" + dateString + "SEQ" + b64encode(Crypto.Utils.convertToUint8Array(Crypto.getRandomValues(8)));
        }
        this.tradeCreation=new TradeCreation(Context.get('sender'), Context.get("trusted_time"), tradeInfo);
        this.tradePublicComments = new Array<TradeComment>();
        this.tradePrivateComments = new Array<TradeComment>();
        this.matchTradeDetails = new Array<MatchLog>();
        this.matchMoneyTransfer = new Array<MatchLog>();
        this.matchAssetTransfer = new Array<MatchLog>();
        this.matchAMLSanction = new Array<MatchLog>();

        this.tokenB64 = "";
        this.status = StatusType.Executed;
        this.statusHistory = new Array<StatusLog>();
        this.auditHistory = new Array<AuditLog>();
        this.statusHistory.push(new StatusLog(Context.get("trusted_time"), this.status));
    }

    static load(UTI: string) : Trade | null {
        let TradeObject = Ledger.getTable(TradesTable).get(UTI);
        if (TradeObject.length === 0) {
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

    addPublicComments(role: RoleType, input: ActionTradeInput): void {
        this.tradePublicComments.push(new TradeComment(Context.get('sender'), role, Context.get("trusted_time"), input.metadata));
    }

    addPrivateComments(role: RoleType, input: ActionTradeInput): void {
        this.tradePrivateComments.push(new TradeComment(Context.get('sender'), role, Context.get("trusted_time"), input.metadata));
    }

    filterPrivateComments(role: RoleType): void {
        let tmp = new Array<TradeComment>();
        for (let i = 0; i < this.tradePrivateComments.length; i++) {
            if (this.tradePrivateComments[i].role != role) {
                tmp.push(this.tradePrivateComments[i]);
            }
        }
        this.tradePrivateComments = tmp;
    }

    addAuditLog(): void {
        this.auditHistory.push(new AuditLog(Context.get('sender'), Context.get("trusted_time")));
    }

    addMatchLog(roleType: RoleType, key: string, value: string): void {
        switch (roleType) {            
            case RoleType.SettlementAgent:            
                this.matchTradeDetails.push(new MatchLog(Context.get('sender'), Context.get("trusted_time"), key, value));
                break;
            case RoleType.ClearingHouse:
                this.matchMoneyTransfer.push(new MatchLog(Context.get('sender'), Context.get("trusted_time"), key, value));
                break;
            case RoleType.Custodian:
                this.matchAssetTransfer.push(new MatchLog(Context.get('sender'), Context.get("trusted_time"), key, value));
                break;
            case RoleType.AMLSanction:
                this.matchAMLSanction.push(new MatchLog(Context.get('sender'), Context.get("trusted_time"), key, value));
                break;
            default:
                error("Invalid role type");
        }        
    }

    checkTradeDetailsMatch(): boolean {
        let tradeDetails = new MatchCheckList();
        tradeDetails.events.push(new MatchedEvent("buyerName", false));
        tradeDetails.events.push(new MatchedEvent("buyerCountry", false));
        tradeDetails.events.push(new MatchedEvent("sellerName", false));
        tradeDetails.events.push(new MatchedEvent("sellerCountry", false));

        for (let i = 0; i < this.matchTradeDetails.length; i++) {
            if (this.matchTradeDetails[i].matchedKey == "buyerName") {
                tradeDetails.events[0].matched = true;
            }
            if (this.matchTradeDetails[i].matchedKey == "buyerCountry") {
                tradeDetails.events[1].matched = true;
            }
            if (this.matchTradeDetails[i].matchedKey == "sellerName") {
                tradeDetails.events[2].matched = true;
            }
            if (this.matchTradeDetails[i].matchedKey == "sellerCountry") {
                tradeDetails.events[3].matched = true;
            }
        }
        for (let i = 0; i < tradeDetails.events.length; i++) {
            if (!tradeDetails.events[i].matched) {
                return false;
            }
        }
        return true;
    }

    checkAssetTransferMatch(): boolean {
        let assetTransfer = new MatchCheckList();
        assetTransfer.events = new Array<MatchedEvent>();
        assetTransfer.events.push(new MatchedEvent("quantity", false));

        for (let i = 0; i < this.matchAssetTransfer.length; i++) {
            if (this.matchAssetTransfer[i].matchedKey == "quantity") {
                assetTransfer.events[0].matched = true;
            }
        }
        for (let i = 0; i < assetTransfer.events.length; i++) {
            if (!assetTransfer.events[i].matched) {
                return false;
            }
        }
        return true;
    }

    checkMoneyTransferMatch(): boolean {
        let moneyTransfer = new MatchCheckList();
        moneyTransfer.events = new Array<MatchedEvent>();
        moneyTransfer.events.push(new MatchedEvent("price", false));

        for (let i = 0; i < this.matchMoneyTransfer.length; i++) {
            if (this.matchMoneyTransfer[i].matchedKey == "price") {
                moneyTransfer.events[0].matched = true;
            }
        }

        for (let i = 0; i < moneyTransfer.events.length; i++) {
            if (!moneyTransfer.events[i].matched) {
                return false;
            }
        }
        return true;
    }

    checkAMLSanctionsMatch(): boolean {
        let amlSanctionDetails = new MatchCheckList();
        amlSanctionDetails.events.push(new MatchedEvent("amlRiskRank", false));
        amlSanctionDetails.events.push(new MatchedEvent("underSanction", false));

        for (let i = 0; i < this.matchAMLSanction.length; i++) {
            if (this.matchAMLSanction[i].matchedKey == "amlRiskRank") {
                amlSanctionDetails.events[0].matched = true;
            }
            if (this.matchAMLSanction[i].matchedKey == "underSanction") {
                amlSanctionDetails.events[1].matched = true;
            }
        }
        for (let i = 0; i < amlSanctionDetails.events.length; i++) {
            if (!amlSanctionDetails.events[i].matched) {
                return false;
            }
        }
        return true;
    }


    processStatusProgression(): void {
        if (this.status === StatusType.Executed && this.checkTradeDetailsMatch()) {
            this.status = StatusType.Settling;
            this.statusHistory.push(new StatusLog(Context.get("trusted_time"), this.status));
        }
        if (this.status === StatusType.Settling && this.checkAssetTransferMatch() && this.checkMoneyTransferMatch() && this.checkAMLSanctionsMatch()) {
            this.status = StatusType.Settled;
            this.statusHistory.push(new StatusLog(Context.get("trusted_time"), this.status));
        }
    }

    exactMatch(key: string, value: string): boolean {
        let tradeInfo = this.tradeCreation.info;
        if (key === "buyerName") {
            return tradeInfo.buyerName === value;
        }
        if (key === "buyerCountry") {
            return tradeInfo.buyerCountry === value;
        }
        if (key === "sellerName") {
            return tradeInfo.sellerName === value;
        }
        if (key === "sellerCountry") {
            return tradeInfo.sellerCountry === value;
        }
        if (key === "asset") {
            return tradeInfo.asset === value;
        }
        if (key === "quantity") {
            return tradeInfo.quantity.toString() === value;
        }
        if (key === "price") {
            return tradeInfo.price.toString() === value;
        }
        if (key === "tradeDate") {
            return tradeInfo.tradeDate === value;
        }        
        if (key === "underSanction") {
            return value === "true";
        }                
        return false;
    }

    levenshteinMatch(key: string, value: string): number {
        let tradeInfo = this.tradeCreation.info;
        if (key === "buyerName") {
            return levenshtein(tradeInfo.buyerName, value);
        }
        if (key === "buyerCountry") {
            return levenshtein(tradeInfo.buyerCountry, value);
        }
        if (key === "sellerName") {
            return levenshtein(tradeInfo.sellerName, value);
        }
        if (key === "sellerCountry") {
            return levenshtein(tradeInfo.sellerCountry, value);
        }
        if (key === "asset") {
            return levenshtein(tradeInfo.asset, value);
        }
        return -1;
    }

    boundaryMatch(key: string, min: amount, max: amount): boolean {
        let tradeInfo = this.tradeCreation.info;
        if (key === "quantity") {
            return min < tradeInfo.quantity && tradeInfo.quantity < max;
        }
        if (key === "price") {
            return min < tradeInfo.price && tradeInfo.price < max;
        }
        if (key === "tradeDate") {
            return min < parseInt(tradeInfo.tradeDate) && parseInt(tradeInfo.tradeDate) < max;
        }
        if (key === "amlRiskRank") {
            return max < 0.05;   //Percentage of risk
        }
        return false;        
    }

    processExactMatch(role: RoleType, key: string, value: string): boolean {
        if (this.exactMatch(key, value)) {
            this.addMatchLog(role, key, value);
            return true;
        }
        return false;
    }

    processBoundaryMatch(role: RoleType, key: string, min: amount, max: amount): boolean {
        if (this.boundaryMatch(key, min, max)) {
            this.addMatchLog(role, key, min.toString() + "< x <" + max.toString());
            return true;
        }
        return false;
    }

    processLevenshteinMatch(role: RoleType, key: string, value: string, distance: number): boolean {
        if (this.levenshteinMatch(key, value) <= distance) {
            this.addMatchLog(role, key, value);
            return true;
        }
        return false;
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