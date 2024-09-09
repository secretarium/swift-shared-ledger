import { Context, Notifier } from "@klave/sdk/assembly";
import { TradeInput, ConfirmTradeInput, SettleTradeInput, SetIdentitiesInput, UserRequestInput, ApproveUserRequestInput, SharedLedgerIDInput, TransferAssetInput} from "./shared_ledger/inputs/types";
import { SubmitTradeOutput } from "./shared_ledger/outputs/types";
import { Keys } from "./shared_ledger/keys";
import { success, error } from "./klave/types";
import { Trade } from "./shared_ledger/trade";
import { UserRequests } from "./shared_ledger/userRequests";
import { UserRequest } from "./shared_ledger/userRequest";
import { SharedLedger } from "./shared_ledger/sharedLedger";
import { Users } from "./shared_ledger/users";
import { SharedLedgerRole, User } from "./shared_ledger/user";
import { SharedLedgers } from "./shared_ledger/sharedLedgers";

/**
 * @transaction
 */
export function submitTrade(input: TradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (!sharedLedger) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    let success = sharedLedger.addTrade(input);
    if (!success) {
        error(`Trade successfully submitted.`);
        return;
    }

    let keys = Keys.load();
    if (keys.klaveServer_private_key == "") {
        error(`Cannot read klaveServer identity.`);
        return;
    }

    let trade = Trade.load(input.UTI);
    if (!trade) {
        error(`Trade should have been created earlier.`);
        return;
    }

    Notifier.sendJson<SubmitTradeOutput>({
        requestId: Context.get('request_id'),
        result: {
            status: "",
            message: "",
            UTI: trade.UTI,
            tokenB64: trade.tokenB64
        }
    });
}

/**
 * @transaction
 */
export function confirmTrade(input: ConfirmTradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (!sharedLedger) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }

    sharedLedger.confirmTrade(input);
}

/**
 * @transaction
 */
export function transferAsset(input: TransferAssetInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (!sharedLedger) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }

    sharedLedger.transferTrade(input);
}

/**
 * @transaction
 */
export function settleTrade(input: SettleTradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (!sharedLedger) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }

    sharedLedger.settleTrade(input);
}

/**
 * @transaction
 */
export function createSuperAdmin(unused: string): void {
    let users = Users.load();
    if (users.users.length > 0) {
        error("Super admin already exists");
        return;
    }
    if (users.addUser(Context.get('sender'), "super", "admin", "global")) {
        users.save();
        success(`Super admin set-up successfully.`);
    }
}
/**
 * @transaction
 */
export function createSharedLedger(input: SharedLedgerIDInput): void {
    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }
    if (!user.isAdmin("super"))
    {
        error("You are not allowed to create a dataroom.");
        return;
    }
    let sharedLedgers = SharedLedgers.load();
    if (sharedLedgers.addSharedLedger(input.sharedLedgerId)) {
        sharedLedgers.save();
    }    
}

/**
 * @transaction
 */
export function createUserRequest(input: UserRequestInput): void {
    let users = Users.load();
    if (users.addUser(Context.get('sender'), input.sharedLedgerId, "pending", input.jurisdiction)) {
        users.save();
    }
    
    let userRequests = UserRequests.load();
    if (userRequests.addUserRequest(input.sharedLedgerId, input.role, input.jurisdiction)) {
        userRequests.save();
    }
}

/**
 * @query
 */
export function listUserRequests(unused: string): void {
    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }
    if (!user.isAdmin("super"))
    {
        error("You are not allowed to see user requests");
        return;
    }

    let userRequests = UserRequests.load();
    userRequests.list();
}

/**
 * @transaction
 */
export function approveUserRequest(input: ApproveUserRequestInput): void {
    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }
    if (!user.isAdmin("super"))
    {
        error("You are not allowed to see user requests");
        return;
    }

    let userRequest = UserRequest.load(input.userRequestId);
    if (!userRequest)
    {
        error("UserRequest not found");
        return;
    }

    if (userRequest.sharedLedgerId == "super" && userRequest.role == "admin") {
        // This is a user request to become an admin
        let user = User.load(userRequest.userId);
        if (!user)
        {
            error("User not found");
            return;
        }

        user.updateRole(new SharedLedgerRole(userRequest.sharedLedgerId, userRequest.role, userRequest.jurisdiction));
        user.save();
        success(`Approved SuperAdmin request ${userRequest.id} for user ${userRequest.userId} with ${userRequest.sharedLedgerId}, ${userRequest.role}.`);
    }
    else {
        let sharedLedger = SharedLedger.load(userRequest.sharedLedgerId);
        if (!sharedLedger)
        {
            error("SharedLedger not found");
            return;
        }
        sharedLedger.addUser(userRequest.userId, userRequest.role, userRequest.jurisdiction);
        sharedLedger.save();
        success(`Approved user request ${userRequest.id} for user ${userRequest.userId} to join dataroom ${userRequest.sharedLedgerId} as ${userRequest.role}`);
    }    
    
    let userRequests = UserRequests.load();    
    if (userRequests.removeUserRequest(input.userRequestId)) {
        userRequests.save();
    }
}

/**
 * @transaction  
 */
export function resetIdentities(input: SetIdentitiesInput): void {
    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }
    if (!user.isAdmin("super"))
    {
        error("You are not allowed to reset identities");
        return;
    }

    let keys = Keys.load();    
    let save = false;
    if (input.resetKlaveServer) {   
        if (keys.generateKlaveServerPrivateKey()) {
            save = true;
        }
    }
    if (save) {
        keys.save();
        success(`Identities reset successfully`);
    }
}

/**
 * @query 
 */
export function getPublicKeys(unused: string): void {
    let keys = Keys.load();
    keys.list();
}

/**
 * @query 
 */
export function getUserContent(unused: string): void {
    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }
    user.getContent();
}

/**
 * @transaction
 */
export function clearAll(unused: string): void {
    let user = User.load(Context.get('sender'));
    if (!user)
    {
        error("User not found");
        return;
    }
    if (!user.isAdmin("super"))
    {
        error("You are not allowed to clear all data.");
        return;
    }
    user.delete();

    let sharedLedgers = SharedLedgers.load();
    sharedLedgers.delete();

    let users = Users.load();
    users.delete();

    let keys = Keys.load();
    keys.clearKeys();

    let userRequests = UserRequests.load();
    userRequests.delete();    
}
