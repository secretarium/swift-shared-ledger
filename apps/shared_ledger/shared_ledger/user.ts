import { Ledger, JSON, Crypto } from "@klave/sdk";
import { success, error } from "../klave/types"
import { encode as b64encode } from 'as-base64/assembly';
import { Context, Notifier } from "@klave/sdk/assembly";
import { UserOutput } from "./outputs/types";

const UsersTable = "UsersTable";

/** Role types. */
export enum RoleType {    
    None = 0,
    Admin = 1,
    Trader = 2,
    Investor = 3,
    Broker = 4,
    Dealer = 5,
    Custodian = 6,  
    ClearingHouse = 7,
    SettlementAgent = 8,
    Regulator = 9,    
    AMLSanction = 10,
};

export function role_type(input: string): RoleType {
    if (input === "admin")
        return RoleType.Admin;  
    if (input === "trader")
        return RoleType.Trader;
    if (input === "investor")
        return RoleType.Investor;
    if (input === "broker")
        return RoleType.Broker;
    if (input === "dealer")
        return RoleType.Dealer;
    if (input === "custodian")
        return RoleType.Custodian;
    if (input === "clearingHouse")
        return RoleType.ClearingHouse;
    if (input === "settlementAgent")
        return RoleType.SettlementAgent;
    if (input === "regulator")
        return RoleType.Regulator;
    if (input === "amlSanction")
        return RoleType.AMLSanction;
    return RoleType.None;
}

/** Jurisdiction types. */
export enum JurisdictionType {    
    None = 0,
    Global = 1,
    Northern_Europe = 2,
    Southern_Europe = 3,
    UK = 4,
    Northern_America = 5,
    Southern_America = 6,  
    East_Asia = 7,
    Middle_East = 8,
    Africa = 9,
};

export function jurisdiction_type(input: string): JurisdictionType {
    if (input === "global")
        return JurisdictionType.Global;
    if (input === "northernEurope")
        return JurisdictionType.Northern_Europe;
    if (input === "southernEurope")
        return JurisdictionType.Southern_Europe;
    if (input === "uk")
        return JurisdictionType.UK;
    if (input === "northernAmerica")
        return JurisdictionType.Northern_America;
    if (input === "southernAmerica")
        return JurisdictionType.Southern_America;
    if (input === "eastAsia")
        return JurisdictionType.East_Asia;
    if (input === "middleEast")
        return JurisdictionType.Middle_East;
    if (input === "africa")
        return JurisdictionType.Africa;
    return JurisdictionType.None;
}

@JSON 
export class SharedLedgerRole {
    sharedLedgerId: string;
    role: RoleType;
    jurisdiction: JurisdictionType;

    constructor(sharedLedgerId: string, role: RoleType, jurisdiction: JurisdictionType) {
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
 *  AML Sanction: Monitors the trades for Anti-Money Laundering and Sanctions.
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
        if (userTable.length === 0) {
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
            if (this.roles[i].sharedLedgerId === sharedLedgerId) {
                return this.roles[i].role === RoleType.Admin;
            }
        }
        return false;
    }   

    isRegulator(sharedLedgerId: string): boolean {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId === sharedLedgerId) {
                return this.roles[i].role === RoleType.Regulator;
            }
        }
        return false;
    }   

    getRole(sharedLedgerId: string): RoleType {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId === sharedLedgerId) {
                return this.roles[i].role;
            }
        }
        return RoleType.None;
    }   

    getJurisdiction(sharedLedgerId: string): JurisdictionType {
        for (let i = 0; i < this.roles.length; ++i)
        {
            if (this.roles[i].sharedLedgerId === sharedLedgerId) {
                return this.roles[i].jurisdiction;
            }
        }
        return JurisdictionType.None;
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
            if (this.roles[i].sharedLedgerId === newRole.sharedLedgerId) {
                this.roles[i].role = newRole.role;
                return;
            }
        }
        this.roles.push(newRole);
        return;
    }
}
