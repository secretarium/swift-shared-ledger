import { Ledger, JSON, Crypto, Context } from "@klave/sdk";
import { success, error, ResultMessage } from "../klave/types"
import { encode as b64encode } from 'as-base64/assembly';
import { AuditLog, MatchLog, StatusLog, StatusType, Trade, TradeCreation, TradeInfo } from "./trade";
import { ActionTradeInput, BoundaryMatchInput, KeyValueMatchInput, LevenshteinMatchInput, SubmitTradeInput, TradeIdentification, TradeInput } from "./inputs/types";
import { Notifier } from "@klave/sdk/assembly";
import { SharedLedgerContent, SharedLedgerContentOutput, SubmitTradeOutput } from "./outputs/types";
import { JurisdictionType, RoleType, SharedLedgerRole, User } from "./user";
import { Keys } from "./keys";
import { Users } from "./users";

const SharedLedgersTable = "SharedLedgersTable";

@JSON
export class PublicKey {
    keyId: string;
    spkiPubKey: string;

    constructor(id: string, spki: string) {
        this.keyId = id;
        this.spkiPubKey = spki;
    }    
}

class VerifiedObjects {
    user: User;
    trade: Trade;
    constructor(user: User, trade: Trade) {
        this.user = user;
        this.trade = trade;
    }
}

@JSON
export class SharedLedger {
    id: string;
    trades: Array<string>;
    users: Array<string>;
    locked: boolean;

    constructor(id: string) {
        if (id.length > 0 ) {
            this.id = id;
        }
        else {
            this.id = b64encode(Crypto.Utils.convertToUint8Array(Crypto.getRandomValues(64)));
        }
        this.trades = new Array<string>();
        this.users = new Array<string>();
        this.locked = false;
    }

    static load(sharedLedgerId: string) : SharedLedger | null {
        let sharedLedgerTable = Ledger.getTable(SharedLedgersTable).get(sharedLedgerId);
        if (sharedLedgerTable.length === 0) {
            // error(`SharedLedger ${sharedLedgerId} does not exists. Create it first`);
            return null;
        }
        let sharedLedger = JSON.parse<SharedLedger>(sharedLedgerTable);
        // success(`SharedLedger loaded successfully: '${sharedLedger.id}'`);
        return sharedLedger;
    }

    save(): void {
        let sharedLedgerTable = JSON.stringify<SharedLedger>(this);
        Ledger.getTable(SharedLedgersTable).set(this.id, sharedLedgerTable);
        // success(`SharedLedger saved successfully: ${this.id}`);
    }

    delete(): void {
        //Delete trades first
        for (let i = 0; i < this.trades.length; i++) {
            let trade = Trade.load(this.trades[i]);
            if (trade === null) {
                continue;
            }
            trade.delete();
        }
        this.trades = new Array<string>();
        //Delete users first
        for (let i = 0; i < this.users.length; i++) {
            let user = User.load(this.users[i]);
            if (user === null) {
                continue;
            }
            user.delete();
        }
        this.users = new Array<string>();
        this.locked = false;
        Ledger.getTable(SharedLedgersTable).unset(this.id);
        success(`SharedLedger deleted successfully: ${this.id}`);
        this.id = "";
    }

    includes(tradeName: string): string | null {
        for (let i=0; i<this.trades.length; ++i) {
            if (this.trades[i] === tradeName) 
            {
                return this.trades[i];
            }
        }
        return null;
    }

    verify(UTI: string, tokenB64: string) : VerifiedObjects | null {  
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return null;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return null;
        }
        let trade = Trade.load(UTI);
        if (!trade) {
            error(`This trade ${UTI} does not exist.`)
            return null;
        }
        if (tokenB64 != trade.tokenB64) {            
            error(`Error: Trade token ${trade.tokenB64} does not match given token ${tokenB64} for trade ${UTI}`);
            return null;
        }
        return new VerifiedObjects(user, trade);
    }

    addTrade(input: SubmitTradeInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to add trades to this sharedLedger.`);
            return false;
        }

        if (input.UTI.length != 0) {
            if (this.trades.includes(input.UTI)) {
                error(`This trade ${input.UTI} already exists in this sharedLedger.`)
                return false;
            }
        }

        let keys = Keys.load();
        if (keys.klaveServer_private_key === "") {
            error(`Cannot read klaveServer identity.`);
            return false;
        }

        let trade = new Trade(input.UTI, input.tradeInfo);
        trade.tokenB64 = b64encode(trade.generate_trade_token(Context.get("trusted_time"), keys.klaveServer_private_key));            
        trade.save();

        this.trades.push(trade.UTI);

        Notifier.sendJson<SubmitTradeOutput>({
            requestId: Context.get('request_id'),
            result: {
                status: "success",
                message: "",
                UTI: trade.UTI,
                tokenB64: trade.tokenB64
            }
        });    
        return true;
    }

    addMetadata(input: ActionTradeInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        let trade = Trade.load(input.UTI);
        if (!trade) {
            error(`This trade ${input.UTI} does not exist.`)
            return false;
        }
        if (input.tokenB64 != trade.tokenB64) {            
            error(`Error: Trade token ${trade.tokenB64} does not match given token ${input.tokenB64} for trade ${input.UTI}`);
            return false;
        }

        if (input.publicData) {
            trade.addPublicComments(user.getRole(this.id), input);
        }
        else {
            trade.addPrivateComments(user.getRole(this.id), input);
        }
        trade.save();
        return true;
    }

    exactMatch(input: KeyValueMatchInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        let trade = Trade.load(input.UTI);
        if (!trade) {
            error(`This trade ${input.UTI} does not exist.`)
            return false;
        }
        if (input.tokenB64 != trade.tokenB64) {            
            error(`Error: Trade token ${trade.tokenB64} does not match given token ${input.tokenB64} for trade ${input.UTI}`);
            return false;
        }
        if (trade.processExactMatch(user.getRole(input.SLID),input.key, input.value)) {
            trade.processStatusProgression();
            trade.save();
            return true;
        }
        return false;
    }

    levenshteinMatch(input: LevenshteinMatchInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        let trade = Trade.load(input.UTI);
        if (!trade) {
            error(`This trade ${input.UTI} does not exist.`)
            return false;
        }
        if (input.tokenB64 != trade.tokenB64) {            
            error(`Error: Trade token ${trade.tokenB64} does not match given token ${input.tokenB64} for trade ${input.UTI}`);
            return false;
        }

        if (trade.processLevenshteinMatch(user.getRole(input.SLID),input.key, input.value, input.distance)) {
            trade.processStatusProgression();
            trade.save();
            return true;
        }
        return false;
    }

    boundaryMatch(input: BoundaryMatchInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        let trade = Trade.load(input.UTI);
        if (!trade) {
            error(`This trade ${input.UTI} does not exist.`)
            return false;
        }
        if (input.tokenB64 != trade.tokenB64) {            
            error(`Error: Trade token ${trade.tokenB64} does not match given token ${input.tokenB64} for trade ${input.UTI}`);
            return false;
        }

        if (trade.processBoundaryMatch(user.getRole(input.SLID),input.key, input.min, input.max)) {
            trade.processStatusProgression();
            trade.save();
            return true;
        }
        return false;
    }

    removeTrade(input: TradeInput): boolean {   
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to remove trades from this sharedLedger.`);
            return false;
        }

        if (!this.trades.includes(input.UTI)) {
            error(`This trade ${input.UTI} does not exist in this sharedLedger.`)
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        if (!user.isAdmin(this.id)) {
            error(`You are not authorized to remove trades on this sharedLedger.`);
            return false;
        }

        let index = this.trades.indexOf(input.UTI);
        this.trades.splice(index, 1);

        let trade = Trade.load(input.UTI);
        if (trade === null) {
            return false;
        }
        trade.delete();
        return true;
    }

    lock(): void {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to lock this sharedLedger.`);
            return;
        }
        this.locked = true;
    }

    getContent(): void {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to retrieve the content of this sharedLedger.`);
            return;
        }

        let content = new SharedLedgerContent;
        content.locked = this.locked;
        for (let i = 0; i < this.trades.length; i++) {
            let trade = Trade.load(this.trades[i]);
            if (trade === null) {
                continue;
            }
            content.trades.push(trade);
        }

        Notifier.sendJson<SharedLedgerContentOutput>({
            requestId: Context.get('request_id'),
            result: content
        });
    }

    addUser(userId: string, role: RoleType, jurisdiction: JurisdictionType): boolean {
        if (!this.users.includes(userId)) {
            let user = User.load(userId);
            if (!user)
            {
                let users = Users.load();
                if (users.addUser(userId, this.id, role, jurisdiction)) {
                    users.save();
                }            
            }
            else {
                user.updateRole(new SharedLedgerRole(this.id, role, jurisdiction));
                user.save();
            }
            this.users.push(userId);
            return true;
        }
        return false;
    }

    getAllTrades(user: User): Array<TradeIdentification> {
        let result = new Array<TradeIdentification>();
        for (let i = 0; i < this.trades.length; i++) {
            let UTI = this.trades[i];
            
            let trade = Trade.load(this.trades[i]);
            if (trade === null) {            
                error(`Error: Trade ${UTI} not found`);
                return new Array<TradeIdentification>();
            }

            trade.auditHistory.push(new AuditLog(user.id, Context.get("trusted_time")));
            trade.save();

            let tradeInfo = trade.tradeCreation;
            switch (user.getRole(this.id)) {
                case RoleType.Trader:
                case RoleType.Dealer:
                case RoleType.Broker:
                case RoleType.Investor:
                    if (tradeInfo.addedBy == user.id) {
                        result.push(new TradeIdentification(trade.UTI, trade.tokenB64));
                    }
                    break;
                case RoleType.SettlementAgent:
                    if (trade.status === StatusType.Executed || trade.status === StatusType.Settling || trade.status === StatusType.Settled) {
                        result.push(new TradeIdentification(trade.UTI, trade.tokenB64));
                    }
                    break;
                case RoleType.ClearingHouse:
                case RoleType.Custodian:
                case RoleType.AMLSanction:
                    if (trade.status === StatusType.Settling || trade.status === StatusType.Settled) {
                        result.push(new TradeIdentification(trade.UTI, trade.tokenB64));
                    }
                    break;
                case RoleType.Admin:
                case RoleType.Regulator:
                    result.push(new TradeIdentification(trade.UTI, trade.tokenB64));
                    break;
                default:
                    break;
            }
        }
        return result;
    }

    getTradeInfo(user: User, UTI: string, tokenB64: string): string {
        let trade = Trade.load(UTI);
        if (trade === null) {            
            return `Error: Trade ${UTI} not found`;
        }

        if (tokenB64 != trade.tokenB64) {            
            return `Error: Trade token ${trade.tokenB64} does not match given token ${tokenB64} for trade ${UTI}`;
        }

        trade.auditHistory.push(new AuditLog(user.id, Context.get("trusted_time")));
        trade.save();

        let filteredTrade = trade;
        let role = user.getRole(this.id)
        switch (role) {
            case RoleType.Trader:
            case RoleType.Dealer:
            case RoleType.Broker:
            case RoleType.Investor: {
                filteredTrade.filterPrivateComments(role);
                filteredTrade.matchTradeDetails = new Array<MatchLog>();
                filteredTrade.auditHistory = new Array<AuditLog>();
            }
            break;
            case RoleType.SettlementAgent: {
                filteredTrade.filterPrivateComments(role);
                filteredTrade.tradeCreation.clear()
                filteredTrade.auditHistory = new Array<AuditLog>();
            }
            break;
            case RoleType.ClearingHouse: {
                filteredTrade.filterPrivateComments(role);
                filteredTrade.tradeCreation.onlyKeepAssetAndBuyerInfo();
                filteredTrade.matchTradeDetails = new Array<MatchLog>();
                filteredTrade.auditHistory = new Array<AuditLog>();
            }
            break;
            case RoleType.Custodian:
                filteredTrade.filterPrivateComments(role);
                filteredTrade.tradeCreation.onlyKeepAssetAndSellerInfo();
                filteredTrade.matchTradeDetails = new Array<MatchLog>();
                filteredTrade.auditHistory = new Array<AuditLog>();
                break;
            case RoleType.AMLSanction:
                filteredTrade.filterPrivateComments(role);
                filteredTrade.tradeCreation.onlyKeepAssetBuyerAndSellerInfo();
                filteredTrade.matchTradeDetails = new Array<MatchLog>();
                filteredTrade.auditHistory = new Array<AuditLog>();
                break;
            case RoleType.Admin:
            case RoleType.Regulator:
                filteredTrade.auditHistory = new Array<AuditLog>();
                break;
            default:                
                return "`Error: User ${user.id} is not authorized to query trade ${UTI}`";
        }
        return JSON.stringify<Trade>(filteredTrade);        
    }

    getMultipleTradeInfo(user: User, trades: Array<TradeIdentification>): Array<string> {
        let result = new Array<string>();
        for (let i = 0; i < trades.length; i++) {
            result.push(this.getTradeInfo(user, trades[i].UTI, trades[i].tokenB64));
        }
        return result;
    }
}
