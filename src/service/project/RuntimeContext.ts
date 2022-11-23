import { ProjectConfig, ProjectConfigOptions, RunMode, RuntimePaths } from '@/def';
import { StackBinaryDownloader } from '@/service/project/StackBinaryDownloader';
import { Exception } from '@/utils/Exception';
import { replacePlaceholders } from '@/utils/replacePlaceholders';
import { replaceRecursive } from '@/utils/replaceRecursive';
import findUp from 'find-up';
import path from 'path';



export class RuntimeContext
{
    
    protected static readonly SINGLETON_KEY = 'devphase_Context_VSffVql3bvj9aulZY5DNnRCnrEt1V27a';
    
    protected _stackBinaryDownloader : StackBinaryDownloader;
    
    public config : ProjectConfig;
    public paths : RuntimePaths = {
        devphase: null,
        project: null,
        
        artifacts: null,
        contracts: null,
        logs: null,
        currentLog: null,
        scripts: null,
        stacks: null,
        currentStack: null,
        tests: null,
        typings: null,
    };
    
    
    public static async getSingleton (runMode : RunMode = RunMode.Simple) : Promise<RuntimeContext>
    {
        const globalAny = global as any;
        
        if (!globalAny[RuntimeContext.SINGLETON_KEY]) {
            const instance = new RuntimeContext();
            await instance._init(runMode);
            
            globalAny[RuntimeContext.SINGLETON_KEY] = instance;
        }
        
        return globalAny[RuntimeContext.SINGLETON_KEY];
    }
    
    public async isInProjectDirectory () : Promise<boolean>
    {
        const configFilePath = await findUp([
            'devphase.config.ts',
            'devphase.config.js',
        ]);
        
        return (configFilePath !== undefined);
    }
    
    public async requestProjectDirectory ()
    {
        const isInProjectDirectory = await this.isInProjectDirectory();
        if (!isInProjectDirectory) {
            throw new Exception(
                'Config file not found',
                1665952724703
            );
        }
    }
    
    
    protected async _init (runMode : RunMode) : Promise<void>
    {
        const configFilePath = await findUp([
            'devphase.config.ts',
            'devphase.config.js',
        ]);
        
        this.paths.devphase = __dirname.endsWith('/cli')
            ? path.join(__dirname, '../../')
            : path.join(__dirname, '../');
        
        if (configFilePath) {
            this.paths.project = path.dirname(configFilePath);
            
            const userConfig = require(configFilePath).default;
            this.config = await this._getRunConfiguration(
                userConfig,
                runMode
            );
        }
        
        // setup directories
        for (const [ name, directory ] of Object.entries(this.config.directories)) {
            this.paths[name] = path.resolve(
                this.paths.project,
                directory
            );
        }
        
        const logStamp = (new Date()).toISOString();
        this.paths.currentLog = path.join(
            this.paths.logs,
            logStamp
        );
        
        this.paths.currentStack = path.join(
            this.paths.stacks,
            this.config.stack.version
        );
        
        // download stack
        this._stackBinaryDownloader = new StackBinaryDownloader(this);
        await this._stackBinaryDownloader.download();
    }
    
    
    protected async _getRunConfiguration (
        options : ProjectConfigOptions,
        runMode : RunMode
    ) : Promise<ProjectConfig>
    {
        const config : ProjectConfig = <any>replaceRecursive<ProjectConfigOptions>({
            directories: {
                artifacts: 'artifacts',
                contracts: 'contracts',
                logs: 'logs',
                stacks: 'stacks',
                tests: 'tests',
                typings: 'typings'
            },
            stack: {
                blockTime: 6000,
                version: 'latest',
                setupOptions: {
                    workerUrl: 'http://localhost:{{stack.pruntime.port}}',
                    clusterId: undefined,
                },
                node: {
                    port: 9944,
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
                    port: 8000,
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
                    gkMnemonic: '//Alice',
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
                    timeout: 5000,
                }
            },
            testing: {
                mocha: {}, // custom mocha configuration
                spawnStack: true, // spawn runtime stack
                stackLogOutput: false,
                blockTime: 100, // overrides block time specified in node (and pherry) component
                envSetup: {
                    setup: {
                        custom: undefined,
                        timeout: 60 * 1000,
                    },
                    teardown: {
                        custom: undefined,
                        timeout: 10 * 1000,
                    }
                },
            },
            devPhaseOptions: {
                nodeUrl: 'ws://localhost:{{stack.node.port}}',
                workerUrl: 'http://localhost:{{stack.pruntime.port}}',
            },
        }, options);
        
        // replace stack version
        config.stack.version = await StackBinaryDownloader.uniformStackVersion(config.stack.version);
        
        if (runMode == RunMode.Testing) {
            config.stack.blockTime = config.testing.blockTime;
        }
        
        // process placeholders
        replacePlaceholders(config, config);
        
        return config;
    }
    
}
