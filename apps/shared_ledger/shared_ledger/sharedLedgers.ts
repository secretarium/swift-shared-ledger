import { Ledger, JSON, Context } from "@klave/sdk";
import { success, error } from "../klave/types";
import { SharedLedger } from "./sharedLedger";
import { ListOutput } from "./outputs/types";
import { Notifier } from "@klave/sdk/assembly";

const SharedLedgersTable = "SharedLedgersTable";

@JSON
export class SharedLedgers {
    sharedLedgers: Array<string>;

    constructor() {
        this.sharedLedgers = new Array<string>();
    }

    /**
     * load the sharedLedgers from the ledger.
     * @returns true if the sharedLedgers was loaded successfully, false otherwise.
     */
    static load(): SharedLedgers {
        let sharedLedgersTable = Ledger.getTable(SharedLedgersTable).get("ALL");
        if (sharedLedgersTable.length == 0) {            
            // success(`New SharedLedgers Table created successfully`);
            return new SharedLedgers;
        }
        let wlt = JSON.parse<SharedLedgers>(sharedLedgersTable);
        // success(`SharedLedgers loaded successfully: ${sharedLedgersTable}`);
        return wlt;
    }

    /**
     * save the sharedLedgers to the ledger.
     */
    save(): void {
        let sharedLedgersTable = JSON.stringify<SharedLedgers>(this);
        Ledger.getTable(SharedLedgersTable).set("ALL", sharedLedgersTable);
        // success(`SharedLedgers saved successfully: ${sharedLedgersTable}`);
    }

    /**
     * Add a sharedLedger to the list of sharedLedgers.
     * @param sharedLedgerId The id of the sharedLedger to add.     
     */
    addSharedLedger(sharedLedgerId: string): boolean {
        let existingSharedLedger = SharedLedger.load(sharedLedgerId);
        if (existingSharedLedger) {
            error(`SharedLedger already exists: ${sharedLedgerId}`);
            return false;
        }
        let sharedLedger = new SharedLedger(sharedLedgerId);        
        sharedLedger.users.push(Context.get('sender'));
        sharedLedger.save();
        this.sharedLedgers.push(sharedLedger.id);

        success(`SharedLedger added successfully: ${sharedLedger.id} `);
        return true;
    }

    /**
     * Remove a sharedLedger from the list of sharedLedgers.
     * @param sharedLedgerId The id of the sharedLedger to remove.
     */
    removeSharedLedger(sharedLedgerId: string): boolean {
        let sharedLedger = SharedLedger.load(sharedLedgerId);
        if (!sharedLedger) {
            error("SharedLedger not found: " + sharedLedgerId);
            return false;
        }
        sharedLedger.delete();

        let index = this.sharedLedgers.indexOf(sharedLedgerId);
        this.sharedLedgers.splice(index, 1);
        success("SharedLedger removed successfully: " + sharedLedgerId);
        return true;
    }

    /**
     * list all the sharedLedgers in the sharedLedgers.
     * @returns
     */
    list(): void {
        if (this.sharedLedgers.length == 0) {
            success(`No sharedLedger found in the list of sharedLedgers`);
        }

        let sender = Context.get('sender');

        Notifier.sendJson<ListOutput>({
            requestId: Context.get('request_id'),
            result: this.sharedLedgers
        });
    }

    delete(): void {
        for (let i = 0; i < this.sharedLedgers.length; i++) {
            let sharedLedger = SharedLedger.load(this.sharedLedgers[i]);
            if (sharedLedger) {
                sharedLedger.delete();
            }
        }
        this.sharedLedgers = [];
        this.save();
    }
}