import type * as PhalaSdk from "@phala/sdk";
import type * as DevPhase from "@devphase/service";
import type * as DPT from "@devphase/service/etc/typings";
import type { ContractCallResult, ContractQuery } from "@polkadot/api-contract/base/types";
import type { ContractCallOutcome, ContractOptions } from "@polkadot/api-contract/types";
import type { Codec } from "@polkadot/types/types";

export namespace Signing {
    type InkPrimitives_LangError = { CouldNotReadInput: null };
    type Result = { Ok: boolean } | { Err: InkPrimitives_LangError };

    /** */
    /** Queries */
    /** */
    namespace ContractQuery {
        export interface Sign extends DPT.ContractQuery {
            (certificateData: PhalaSdk.CertificateData, options: ContractOptions, message: string): DPT.CallResult<DPT.CallOutcome<DPT.IJson<Result>>>;
        }

        export interface Verify extends DPT.ContractQuery {
            (certificateData: PhalaSdk.CertificateData, options: ContractOptions, message: string, signature: number[]): DPT.CallResult<DPT.CallOutcome<DPT.IJson<Result>>>;
        }

        export interface Test extends DPT.ContractQuery {
            (certificateData: PhalaSdk.CertificateData, options: ContractOptions, message: string): DPT.CallResult<DPT.CallOutcome<DPT.IJson<Result>>>;
        }
    }

    export interface MapMessageQuery extends DPT.MapMessageQuery {
        sign: ContractQuery.Sign;
        verify: ContractQuery.Verify;
        test: ContractQuery.Test;
    }

    /** */
    /** Transactions */
    /** */
    namespace ContractTx {
    }

    export interface MapMessageTx extends DPT.MapMessageTx {
    }

    /** */
    /** Contract */
    /** */
    export declare class Contract extends DPT.Contract {
        get query(): MapMessageQuery;
        get tx(): MapMessageTx;
    }

    /** */
    /** Contract factory */
    /** */
    export declare class Factory extends DevPhase.ContractFactory {
        instantiate<T = Contract>(constructor: "default", params: never[], options?: DevPhase.InstantiateOptions): Promise<T>;
    }
}
