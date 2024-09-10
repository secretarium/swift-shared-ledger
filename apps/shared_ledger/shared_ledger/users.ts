import { Ledger, JSON, Context } from "@klave/sdk";
import { success, error } from "../klave/types";
import { ListOutput } from "./outputs/types";
import { Notifier } from "@klave/sdk/assembly";
import { SharedLedgerRole, User } from "./user";

const UsersTable = "UsersTable";

/**
 * Users is just a list of users.
 */
@JSON
export class Users {
    users: Array<string>;

    constructor() {
        this.users = new Array<string>();
    }

    /**
     * load the users from the ledger.
     * @returns a list of users.
     */
    static load(): Users {
        let usersTable = Ledger.getTable(UsersTable).get("ALL");
        if (usersTable.length == 0) {            
            // success(`New Users Table created successfully`);
            return new Users;
        }
        let wlt = JSON.parse<Users>(usersTable);
        // success(`Users loaded successfully: ${usersTable}`);
        return wlt;
    }

    /**
     * save the users to the ledger.
     */
    save(): void {
        let usersTable = JSON.stringify<Users>(this);
        Ledger.getTable(UsersTable).set("ALL", usersTable);
        // success(`Users saved successfully: ${usersTable}`);
    }

    /**
     * Add a user for the smart contract. User can already have a role for a specific dataroom.
     * @param userId The id of the user to add.     
     * @param dataRoomId The id of the dataRoom the user would want a role for.
     */
    addUser(userId: string, sharedLedgerId: string, role: string, jurisdiction: string): boolean {
        let existingUser = User.load(userId);
        if (existingUser) {
            error(`User already exists: ${userId}`);
            return false;
        }
        let user = new User(userId, new SharedLedgerRole(sharedLedgerId, role, jurisdiction));
        user.save();
        this.users.push(user.id);

        // success(`User added successfully: ${user.id} `);
        return true;
    }

    /**
     * Remove a user from the list of users.
     * @param userId The id of the user to remove.
     */
    removeUser(userId: string): boolean {
        let user = User.load(userId);
        if (!user) {
            error("User not found: " + userId);
            return false;
        }
        user.delete();

        let index = this.users.indexOf(user.id);
        this.users.splice(index, 1);
        success("User removed successfully: " + userId);
        return true;
    }

    /**
     * Send a client notification listing all existing users.     
     */
    list(): void {
        if (this.users.length == 0) {
            success(`No user found in the list of users`);
        }
        
        Notifier.sendJson<ListOutput>({
            requestId: Context.get('request_id'),
            result: this.users
        });
    }

    /**
     * Delete all existing users. Full Reset.
     */
    delete(): void {
        for (let i = 0; i < this.users.length; i++) {
            let user = User.load(this.users[i]);
            if (user) {
                user.delete();
            }
        }
        this.users = new Array<string>();
        this.save();
    }
}