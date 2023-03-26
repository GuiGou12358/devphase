import { Signing } from '@/typings/Signing';
import * as PhalaSdk from '@phala/sdk';
import type { KeyringPair } from '@polkadot/keyring/types';
import { ContractType } from '@devphase/service';
import { stringToU8a } from '@polkadot/util';


describe('Signing', () => {
    let factory : Signing.Factory;
    let contract : Signing.Contract;
    let signer : KeyringPair;
    let certificate : PhalaSdk.CertificateData;

    before(async function() {
        factory = await this.devPhase.getFactory(
            './contracts/signing/target/ink/signing.contract',
            {
                contractType: ContractType.InkCode,
            }
        );

        await factory.deploy();

        signer = this.devPhase.accounts.bob;
        certificate = await PhalaSdk.signCertificate({
            api: this.api,
            pair: signer,
        });
    });

    describe('default constructor', () => {
        before(async function() {
            contract = await factory.instantiate('default', []);
        });
        const message = "hi, how are ya?";

        it('Should be able derive keypair & sign/verify messages', async function() {
            const response = await contract.query.test(certificate, {}, message);
            console.log(response.output.toJSON());
        });
    });

});