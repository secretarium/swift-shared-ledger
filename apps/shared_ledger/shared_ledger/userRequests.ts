import { Ledger, JSON, Context } from "@klave/sdk";
import { success, error } from "../klave/types";
import { UserRequest } from "./userRequest";
import { ListOutput } from "./outputs/types";
import { Notifier } from "@klave/sdk/assembly";
import { JurisdictionType, RoleType } from "./user";

const UserRequestsTable = "UserRequestsTable";

/**
 * UserRequests is just a list of user requests(Request from a User to have a role for a given dataroom).
 */
@JSON
export class UserRequests {
    userRequests: Array<string>;

    constructor() {
        this.userRequests = new Array<string>();
    }

    /**
     * load the userRequests from the ledger.
     * @returns the existing userRequests.
     */
    static load(): UserRequests {
        let userRequestsTable = Ledger.getTable(UserRequestsTable).get("ALL");
        if (userRequestsTable.length === 0) {            
            // success(`New UserRequests Table created successfully`);
            return new UserRequests;
        }
        let wlt = JSON.parse<UserRequests>(userRequestsTable);
        // success(`UserRequests loaded successfully: ${userRequestsTable}`);
        return wlt;
    }

    /**
     * save the userRequests to the ledger.
     */
    save(): void {
        let userRequestsTable = JSON.stringify<UserRequests>(this);
        Ledger.getTable(UserRequestsTable).set("ALL", userRequestsTable);
        // success(`UserRequests saved successfully: ${userRequestsTable}`);
    }

    /**
     * Add a userRequest to the list of userRequests.
     * @param dataRoomId 
     * @param role 
     */
    addUserRequest(dataRoomId: string, role: RoleType, jurisdiction: JurisdictionType): boolean {
        let userRequest = new UserRequest(dataRoomId, role, jurisdiction);
        userRequest.save();
        this.userRequests.push(userRequest.id);

        success(`UserRequest added successfully: ${userRequest.id}`);
        return true;
    }

    /**
     * Remove a userRequest from the list of userRequests.
     * @param userId The id of the userRequest to remove.
     */
    removeUserRequest(userId: string): boolean {
        let userRequest = UserRequest.load(userId);
        if (!userRequest) {
            error("UserRequest not found: " + userId);
            return false;
        }
        userRequest.delete();

        let index = this.userRequests.indexOf(userRequest.id);
        this.userRequests.splice(index, 1);
        // success("UserRequest removed successfully: " + userId);
        return true;
    }

    /**
     * list all the userRequests in the userRequests.
     * @returns
     */
    list(): void {
        if (this.userRequests.length === 0) {
            success(`No userRequest found in the list of userRequests`);
        }
        
        Notifier.sendJson<ListOutput>({
            requestId: Context.get('request_id'),
            result: this.userRequests
        });
    }

    delete(): void {
        for (let i = 0; i < this.userRequests.length; i++) {
            let userRequest = UserRequest.load(this.userRequests[i]);
            if (userRequest) {
                userRequest.delete();
            }
        }
        this.userRequests = new Array<string>();
        this.save();
    }
}