import { Ledger, JSON, Crypto } from "@klave/sdk";
import { success, error } from "../klave/types"
import { encode as b64encode } from 'as-base64/assembly';
import { Context, Notifier } from "@klave/sdk/assembly";
import { UserOutput } from "./outputs/types";

const UsersTable = "UsersTable";


@JSON 
export class SharedLedgerRole {
    sharedLedgerId: string;
    role: string;
    jurisdiction: string;

    constructor(sharedLedgerId: string, role: string, jurisdiction: string) {
        this.sharedLedgerId = sharedLedgerId;
        this.role = role;
        this.jurisdiction = jurisdiction;
    }
}

/**
 * Roles of the user in the Shared Ledger
 *  Trader/Investor: Initiates the trade and holds the tokenized assets.
 *  Broker/Dealer: Facilitates the trade and manages execution.
 *  Custodian: Safeguards the assets and confirms ownership transfers.
 *  Clearinghouse: Ensures the trade is confirmed, matched, and netted.
 *  Settlement Agent: Manages final settlement and transfer of ownership.
 *  Regulator: Monitors the trades for compliance and ensures transparency.
 **/
@JSON
export class User {
    id: string;
    roles: Array<SharedLedgerRole>;

    constructor(id: string, role: SharedLedgerRole) {
        if (id.length > 0) {
            this.id = id;
        }
        else {
            this.id = b64encode(Crypto.Utils.convertToUint8Array(Crypto.getRandomValues(64)));
        }
        this.roles = new Array<SharedLedgerRole>();
        this.roles.push(role);
    }

    static load(id: string) : User | null {
        let userTable = Ledger.getTable(UsersTable).get(id);
        if (userTable.length == 0) {
            // error(`User ${id} does not exist. Create it first`);
            return null;
        }
        let user = JSON.parse<User>(userTable);
        // success(`User profile loaded successfully: '${user.id}'`);
        return user;
    }

    save(): void {
        let userTable = JSON.stringify<User>(this);
        Ledger.getTable(UsersTable).set(this.id, userTable);
        // success(`User saved successfully: '${this.id}'`);
    }

    delete(): void {
        this.roles = new Array<SharedLedgerRole>();
        Ledger.getTable(UsersTable).unset(this.id);
        success(`User deleted successfully: ${this.id}`);
        this.id = "";
    }

    isAdmin(sharedLedgerId: string): boolean {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId == sharedLedgerId) {
                return this.roles[i].role == 'admin';
            }
        }
        return false;
    }   
    
    canExecute(sharedLedgerId: string): boolean {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId == sharedLedgerId) {
                return this.roles[i].role == 'broker' || this.roles[i].role == 'dealer';
            }
        }
        return false;
    }

    canConfirm(sharedLedgerId: string): boolean {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId == sharedLedgerId) {
                return this.roles[i].role == 'clearingHouse';
            }
        }
        return false;
    }

    canTransfer(sharedLedgerId: string): boolean {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId == sharedLedgerId) {
                return this.roles[i].role == 'custodian';
            }
        }
        return false;
    }

    canSettle(sharedLedgerId: string): boolean {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId == sharedLedgerId) {
                return this.roles[i].role == 'settlementAgent';
            }
        }
        return false;
    }

    canAccess(sharedLedgerId: string): boolean {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId == sharedLedgerId) {
                return this.roles[i].role == 'regulator';
            }
        }
        return false;
    }

    getContent(): void {
        Notifier.sendJson<UserOutput>({
            requestId: Context.get('request_id'),
            result: this                
        });        
    }

    updateRole(newRole: SharedLedgerRole): void {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId == newRole.sharedLedgerId) {
                this.roles[i].role = newRole.role;
                return;
            }
        }
        this.roles.push(newRole);
        return;
    }
}
