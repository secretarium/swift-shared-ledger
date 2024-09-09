import { Ledger, JSON, Crypto, Context } from "@klave/sdk";
import { success, error } from "../klave/types"
import { encode as b64encode } from 'as-base64/assembly';
import { Trade } from "./trade";
import { ConfirmTradeInput, SettleTradeInput, TradeInput, TransferAssetInput } from "./inputs/types";
import { Notifier } from "@klave/sdk/assembly";
import { SharedLedgerContent, SharedLedgerContentOutput } from "./outputs/types";
import { SharedLedgerRole, User } from "./user";

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

    addTrade(input: TradeInput): boolean {
        if (!this.users.includes(Context.get('sender'))) {
            error(`You are not authorized to add trades to this sharedLedger.`);
            return false;
        }

        if (this.trades.includes(input.UTI)) {
            error(`This trade ${input.UTI} already exists in this sharedLedger.`)
            return false;
        }
        this.trades.push(input.UTI);

        let trade = new Trade(input.UTI, input.buyer, input.seller, input.asset, input.quantity, input.price, input.tradeDate);
        trade.save();
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
}
