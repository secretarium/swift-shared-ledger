import { Context, Notifier } from "@klave/sdk/assembly";
import { TradeInput, ConfirmTradeInput, SettleTradeInput, SetIdentitiesInput, UserRequestInput, ApproveUserRequestInput, SharedLedgerIDInput, TransferAssetInput, SubmitTradeInput, MultipleTradeInput} from "./shared_ledger/inputs/types";
import { ListOutput, GenericOutput } from "./shared_ledger/outputs/types";
import { Keys } from "./shared_ledger/keys";
import { success, error } from "./klave/types";
import { UserRequests } from "./shared_ledger/userRequests";
import { UserRequest } from "./shared_ledger/userRequest";
import { SharedLedger } from "./shared_ledger/sharedLedger";
import { Users } from "./shared_ledger/users";
import { SharedLedgerRole, User } from "./shared_ledger/user";
import { SharedLedgers } from "./shared_ledger/sharedLedgers";

/**
 * @transaction
 */
export function submitTrade(input: SubmitTradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }
    
    if (sharedLedger.addTrade(input)) {
        sharedLedger.save();    
        return;
    }
}

/**
 * @transaction
 */
export function confirmTrade(input: ConfirmTradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (user === null)
    {
        error("User not found");
        return;
    }

    if (sharedLedger.confirmTrade(input)) {
        Notifier.sendJson<GenericOutput>({
            requestId: Context.get('request_id'),
            result: {
                status: "success",
                message: "",
                UTI: input.UTI,
            }
        });    
    }
}

/**
 * @transaction
 */
export function transferAsset(input: TransferAssetInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (user === null)
    {
        error("User not found");
        return;
    }

    if (sharedLedger.transferTrade(input)) {
        Notifier.sendJson<GenericOutput>({
            requestId: Context.get('request_id'),
            result: {
                status: "success",
                message: "",
                UTI: input.UTI,
            }
        });    
    }
}

/**
 * @transaction
 */
export function settleTrade(input: SettleTradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (user === null)
    {
        error("User not found");
        return;
    }

    if (sharedLedger.settleTrade(input)) {
        Notifier.sendJson<GenericOutput>({
            requestId: Context.get('request_id'),
            result: {
                status: "success",
                message: "",
                UTI: input.UTI,
            }
        });    
    }
}

/**
 * @transaction
 */
export function getTradeInfo(input: TradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }

    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }

    if (!sharedLedger.users.includes(Context.get('sender'))) {
        error(`You are not authorized to remove trades from this sharedLedger.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (user === null)
    {
        error("User not found");
        return;
    }    
    success(sharedLedger.getTradeInfo(user, input.UTI, input.tokenB64));
}

/**
 * @transaction
 */
export function getMultipleTradeInfo(input: MultipleTradeInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null) {
        error(`SharedLedger does not exist. Create it first.`);
        return;
    }
    if (sharedLedger.locked) {
        error(`SharedLedger ${input.SLID} is now locked.`);
        return;
    }
    if (!sharedLedger.users.includes(Context.get('sender'))) {
        error(`You are not authorized to remove trades from this sharedLedger.`);
        return;
    }

    let user = User.load(Context.get('sender'));
    if (user === null)
    {
        error("User not found");
        return;
    }

    Notifier.sendJson<ListOutput>({
        requestId: Context.get('request_id'),
        result: sharedLedger.getMultipleTradeInfo(user, input.trades)
    });
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
    if (user === null)
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
    if (sharedLedgers.addSharedLedger(input.SLID)) {
        sharedLedgers.save();
    }    
}

/**
 * @transaction
 */
export function createUserRequest(input: UserRequestInput): void {
    let users = Users.load();
    if (users.addUser(Context.get('sender'), input.SLID, "pending", input.jurisdiction)) {
        users.save();
    }
    
    let userRequests = UserRequests.load();
    if (userRequests.addUserRequest(input.SLID, input.role, input.jurisdiction)) {
        userRequests.save();
    }
}

/**
 * @query
 */
export function listUserRequests(unused: string): void {
    let user = User.load(Context.get('sender'));
    if (user === null)
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
    if (user === null)
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
        if (user === null)
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
        if (sharedLedger === null)
        {
            error(`SharedLedger ${userRequest.sharedLedgerId} not found`);
            return;
        }
        sharedLedger.addUser(userRequest.userId, userRequest.role, userRequest.jurisdiction);
        sharedLedger.save();
        success(`Approved user request ${userRequest.id} for user ${userRequest.userId} to join sharedLedger ${userRequest.sharedLedgerId} as ${userRequest.role}`);
    }    
    
    let userRequests = UserRequests.load();    
    if (userRequests.removeUserRequest(input.userRequestId)) {
        userRequests.save();
    }
}

/**
 * @transaction
 */
export function addUserNoAppovalNeeded(input: UserRequestInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null)
    {
        error(`SharedLedger ${input.SLID} not found`);
        return;
    }
    sharedLedger.addUser(Context.get('sender'), input.role, input.jurisdiction);
    sharedLedger.save();
    success(`Successfully added User ${Context.get('sender')} to join sharedLedger ${input.SLID} as ${input.role}`);
}


/**
 * @transaction  
 */
export function resetIdentities(input: SetIdentitiesInput): void {
    let user = User.load(Context.get('sender'));
    if (user === null)
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
export function listSharedLedgers(unused: string): void {
    let sharedLedgers = SharedLedgers.load();
    sharedLedgers.list();
}

/**
 * @query 
 */
export function getSharedLedgerContent(input: SharedLedgerIDInput): void {
    let sharedLedger = SharedLedger.load(input.SLID);
    if (sharedLedger === null) {
        error(`SharedLedger ${input.SLID} does not exist. Create it first.`);
        return;
    }
    sharedLedger.getContent();
}

/**
 * @query 
 */
export function getUserContent(unused: string): void {
    let user = User.load(Context.get('sender'));
    if (user === null)
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
    if (user === null)
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
