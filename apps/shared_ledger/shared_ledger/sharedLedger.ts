import { Ledger, JSON, Crypto, Context } from "@klave/sdk";
import { success, error } from "../klave/types"
import { encode as b64encode } from 'as-base64/assembly';
import { AuditLog, StatusLog, Trade } from "./trade";
import { ConfirmTradeInput, SettleTradeInput, SubmitTradeInput, TradeIdentification, TradeInput, TransferAssetInput } from "./inputs/types";
import { Notifier } from "@klave/sdk/assembly";
import { QueryTradeFromConfirmation, QueryTradeFromConfirmationOutput, QueryTradeFromCreation, QueryTradeFromCreationOutput, QueryTradeFromExecution, QueryTradeFromExecutionOutput, QueryTradeFromSettlement, QueryTradeFromSettlementOutput, QueryTradeFromTransfer, QueryTradeFromTransferOutput, SharedLedgerContent, SharedLedgerContentOutput, SubmitTradeOutput } from "./outputs/types";
import { SharedLedgerRole, User } from "./user";
import { Keys } from "./keys";

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
        if (sharedLedgerTable.length == 0) {
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
        for (let i = 0; i < this.trades.length; i++) {
            let trade = Trade.load(this.trades[i]);
            if (trade == null) {
                continue;
            }
            trade.delete();
        }
        this.trades = new Array<string>();
        this.users = new Array<string>();
        this.locked = false;
        Ledger.getTable(SharedLedgersTable).unset(this.id);
        success(`SharedLedger deleted successfully: ${this.id}`);
        this.id = "";
    }

    includes(tradeName: string): string | null {
        for (let i=0; i<this.trades.length; ++i) {
            if (this.trades[i] == tradeName) 
            {
                return this.trades[i];
            }
        }
        return null;
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
        if (keys.klaveServer_private_key == "") {
            error(`Cannot read klaveServer identity.`);
            return false;
        }

        let trade = new Trade(input.UTI, input.buyer, input.seller, input.asset, input.quantity, input.price, input.tradeDate, input.jurisdiction);
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

    confirmTrade(input: ConfirmTradeInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        if (!user.canConfirm(this.id)) {
            error(`You are not authorized to confirm trades on this sharedLedger.`);
            return false;
        }

        let trade = Trade.load(input.UTI);
        if (!trade) {
            error(`This trade ${input.UTI} does not exist.`)
            return false;
        }
        trade.addConfirmationDetails(input);
        trade.save();
        return true;
    }

    transferTrade(input: TransferAssetInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        if (!user.canTransfer(this.id)) {
            error(`You are not authorized to confirm trades on this sharedLedger.`);
            return false;
        }

        let trade = Trade.load(input.UTI);
        if (!trade) {
            error(`This trade ${input.UTI} does not exist.`)
            return false;
        }
        trade.addTransferDetails(input);
        trade.save();
        return true;
    }

    settleTrade(input: SettleTradeInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to interact (Read or Write) with trades on this sharedLedger.`);
            return false;
        }

        let user = User.load(Context.get('sender'))
        if (!user) {
            error("User not found: " + Context.get('sender'));
            return false;
        }
        if (!user.canSettle(this.id)) {
            error(`You are not authorized to confirm trades on this sharedLedger.`);
            return false;
        }

        let trade = Trade.load(input.UTI);
        if (!trade) {
            error(`This trade ${input.UTI} does not exist.`)
            return false;
        }
        trade.addSettlementDetails(input);
        trade.save();
        return true;
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
        if (trade == null) {
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
            if (trade == null) {
                continue;
            }
            content.trades.push(trade);
        }

        Notifier.sendJson<SharedLedgerContentOutput>({
            requestId: Context.get('request_id'),
            result: content
        });
    }

    addUser(userId: string, role: string, jurisdiction: string): boolean {
        if (!this.users.includes(userId)) {
            // This is a user request to become an admin
            let user = User.load(userId);
            if (!user)
            {
                error("User not found");
                return false;
            }
            user.updateRole(new SharedLedgerRole(this.id, role, jurisdiction));
            user.save();

            this.users.push(userId);
            return true;
        }
        return false;
    }

    getTradeInfo(user: User, UTI: string, tokenB64: string): string {
        let trade = Trade.load(UTI);
        if (trade == null) {            
            return `Error: Trade ${UTI} not found`;
        }

        if (tokenB64 != trade.tokenB64) {            
            return `Error: Trade token ${trade.tokenB64} does not match given token ${tokenB64} for trade ${UTI}`;
        }

        if (user.getJurisdiction(this.id) != trade.tradeInfo.jurisdiction) {            
            return `Error: User ${user.id} is not authorized to query trade ${UTI}`;
        }

        trade.audit_history.push(new AuditLog(user.id, Context.get("trusted_time")));
        trade.save();

        if (user.canCreate(this.id)) {                        
            return JSON.stringify<QueryTradeFromCreation>(new QueryTradeFromCreation(trade));
        }
        if (user.canExecute(this.id)) {
            return JSON.stringify<QueryTradeFromExecution>(new QueryTradeFromExecution(trade));
        }
        if (user.canConfirm(this.id)) {
            return JSON.stringify<QueryTradeFromConfirmation>(new QueryTradeFromConfirmation(trade));
        }
        if (user.canTransfer(this.id)) {
            return JSON.stringify<QueryTradeFromTransfer>(new QueryTradeFromTransfer(trade));
        }
        if (user.canSettle(this.id)) {
            return JSON.stringify<QueryTradeFromSettlement>(new QueryTradeFromSettlement(trade));
        }
        if (user.isAdmin(this.id) || user.isRegulator(this.id)) {
            return JSON.stringify<Trade>(trade);
        }                
        return `Error: User ${user.id} is not authorized to query trade ${UTI}`;
    }

    getMultipleTradeInfo(user: User, trades: Array<TradeIdentification>): Array<string> {
        let result = new Array<string>();
        for (let i = 0; i < trades.length; i++) {
            result.push(this.getTradeInfo(user, trades[i].UTI, trades[i].tokenB64));
        }
        return result;
    }
}
