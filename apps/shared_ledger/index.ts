import { Context, Notifier } from "@klave/sdk/assembly";
import { TradeInput, ActionTradeInput, SetIdentitiesInput, UserRequestInput, ApproveUserRequestInput, SharedLedgerIDInput, SubmitTradeInput, MultipleTradeInput, KeyValueMatchInput, LevenshteinMatchInput, BoundaryMatchInput} from "./shared_ledger/inputs/types";
import { ListOutput, GenericOutput, ListTradeIDs } from "./shared_ledger/outputs/types";
import { Keys } from "./shared_ledger/keys";
import { success, error } from "./klave/types";
import { UserRequests } from "./shared_ledger/userRequests";
import { UserRequest } from "./shared_ledger/userRequest";
import { SharedLedger } from "./shared_ledger/sharedLedger";
import { Users } from "./shared_ledger/users";
import { JurisdictionType, RoleType, SharedLedgerRole, User } from "./shared_ledger/user";
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
export function addMetadata(input: ActionTradeInput): void {
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
    if (sharedLedger.addMetadata(input)) {
        success(`Metadata added to trade ${input.UTI}`);
    }
}

/**
 * @transaction
 */
export function exactMatch(input: KeyValueMatchInput): void {
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
    if (sharedLedger.exactMatch(input)) {
        success(`Exact match found for ${input.key} = ${input.value}`);
    }
    else {
        error(`Exact match not found for ${input.key} = ${input.value}`);
    }

    return;
}

/**
 * @transaction
 */
export function levenshteinMatch(input: LevenshteinMatchInput): void {
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
    if (sharedLedger.levenshteinMatch(input)) {
        success(`Levenshtein match found for ${input.key} = ${input.value}`);
    }
    else {
        error(`Levenshtein match not found for ${input.key} = ${input.value}`);
    }
    return;
}

/**
 * @transaction
 */
export function boundaryMatch(input: BoundaryMatchInput): void {
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
    if (sharedLedger.boundaryMatch(input)) {
        success(`Boundary match found for ${input.key} between ${input.min} and ${input.max}`);
    }
    else {
        error(`Boundary match not found for ${input.key} between ${input.min} and ${input.max}`);
    }
    return;
}


/**
 * @transaction
 */
export function getAllTrades(input: SharedLedgerIDInput): void {
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
    let listTrades = sharedLedger.getAllTrades(user);

    Notifier.sendJson<ListTradeIDs>({
        requestId: Context.get('request_id'),
        result: listTrades
    });
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
    if (users.addUser(Context.get('sender'), "super", RoleType.Admin, JurisdictionType.Global)) {
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
    if (users.addUser(Context.get('sender'), input.SLID, input.role, input.jurisdiction)) {
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

    let userRequest = UserRequest.load(input.userRequestId);
    if (!userRequest)
    {
        error("UserRequest not found");
        return;
    }

    if (userRequest.sharedLedgerId === "super" && userRequest.role === RoleType.Admin) {
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
