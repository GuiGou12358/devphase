import type { ProjectConfigOptions } from '@devphase/service';

const config : ProjectConfigOptions = {
    general: {
        ss58Format: 30,
    },
    /*
     * Project directories
     */
    directories: {
        artifacts: 'artifacts',
        contracts: 'contracts',
        logs: 'logs',
        scripts: 'scripts',
        stacks: 'stacks',
        tests: 'tests',
        typings: 'typings'
    },
    /*
     * Stack configuration
     * {
     *     [componentName : string]: {
     *          binary: string, // path to binary
     *          workingDir: string, // working directory as above
     *          evns: {
     *              [name: string]: string,
     *          },
     *          args: {
     *              [name: string]: string,
     *          },
     *          timeout: number // start up timeout
     *     }
     * }
     */
    stack: {
        blockTime: 6000, // default block time for direct stack running
        version: 'latest', // version which you want to pull from official repository (tag name) or "latest" one
        setupOptions: {
            workerUrl: 'http://localhost:{{stack.pruntime.port}}',
            clusterId: undefined,
        },
        node: {
            port: 9944, // ws port
            binary: '{{directories.stacks}}/{{stack.version}}/phala-node',
            workingDir: '{{directories.stacks}}/.data/node',
            envs: {},
            args: {
                '--dev': true,
                '--rpc-methods': 'Unsafe',
                '--block-millisecs': '{{stack.blockTime}}',
                '--ws-port': '{{stack.node.port}}',
                '--base-path': '.',
            },
            timeout: 10000,
        },
        pruntime: {
            port: 8000, // server port
            binary: '{{directories.stacks}}/{{stack.version}}/pruntime',
            workingDir: '{{directories.stacks}}/.data/pruntime',
            envs: {},
            args: {
                '--allow-cors': true,
                '--cores': 0,
                '--port': '{{stack.pruntime.port}}'
            },
            timeout: 2000,
        },
        pherry: {
            gkMnemonic: '//Alice', // gate keeper mnemonic
            binary: '{{directories.stacks}}/{{stack.version}}/pherry',
            workingDir: '{{directories.stacks}}/.data/pherry',
            envs: {},
            args: {
                '--no-wait': true,
                '--mnemonic': '{{stack.pherry.gkMnemonic}}',
                '--inject-key': '0000000000000000000000000000000000000000000000000000000000000001',
                '--substrate-ws-endpoint': 'ws://localhost:{{stack.node.port}}',
                '--pruntime-endpoint': 'http://localhost:{{stack.pruntime.port}}',
                '--dev-wait-block-ms': '{{stack.blockTime}}',
                '--attestation-provider': 'none',
            },
            timeout: 2000,
        }
    },
    /**
     * Networks configuration
     */
    networks: {
        local: {
            nodeUrl: 'ws://localhost:{{stack.node.port}}',
            nodeApiOptions: {
                // types: {
                //     ...KhalaTypes,
                //     ...PhalaSDKTypes,
                // },
                signedExtensions: {
                    CheckMqSequence: {} // fix debug output
                }
            },
            workerUrl: 'http://localhost:{{stack.pruntime.port}}',
            blockTime: 6000,
        }
    },
    /**
     * Testing configuration
     */
    testing: {
        mocha: {}, // custom mocha configuration
        spawnStack: true, // spawn runtime stack? or assume there is running one
        stackLogOutput: false, // if specifed pipes output of all stack component to file (by default it is ignored)
        blockTime: 100, // overrides block time specified in node (and pherry) component
        envSetup: { // environment setup
            setup: {
                custom: undefined, // custom setup procedure callback; (devPhase) => Promise<void>
                timeout: 60 * 1000,
            },
            teardown: {
                custom: undefined, // custom teardown procedure callback ; (devPhase) => Promise<void>
                timeout: 10 * 1000,
            }
        },
    },
    /**
     * Accounts default configuration
     */
    accountsConfig: {
        keyrings: {
            alice: '//Alice',
            bob: '//Bob',
            charlie: '//Charlie',
            dave: '//Dave',
            eve: '//Eve',
            ferdie: '//Ferdie'
        },
        suAccount: 'alice'
    }
};

export default config;
