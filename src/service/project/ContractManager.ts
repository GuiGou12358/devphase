import { ContractType } from '@/def';
import { DeployOptions, InstantiateOptions } from '@/service/api/ContractFactory';
import { CompilationResult, Compiler } from '@/service/project/Compiler';
import { MultiContractExecutor } from '@/service/project/MultiContractExecutor';
import { RuntimeContext } from '@/service/project/RuntimeContext';
import { TypeBinder } from '@/service/project/TypeBinder';
import { Contract } from '@/typings';
import { Exception } from '@/utils/Exception';
import { ux } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs';
import Listr from 'listr';
import _ from 'lodash';
import path from 'path';


export type ContractDefinition = {
    name : string,
    type : ContractType,
    network : string,
    contractId : string,
    clusterId? : string,
}

export type ContractCreateNewOptions = {
    name? : string,
};

export type ContractCompileOptions = {
    contractName? : string,
    watch? : boolean,
    release? : boolean,
};

export type ContractDeployOptions = {
    contractType? : ContractType,
    clusterId? : string,
    network? : string,
    account? : string,
};

export type ContractCallOptions = {
    network? : string,
};


export class ContractManager
{
    
    protected static readonly TEMPLATE_FILES : string[] = [
        'Cargo.toml',
        'lib.rs'
    ];
    
    
    public constructor (
        protected _runtimeContext : RuntimeContext
    )
    {}
    
    public async loadContractsDefFromStorageFile () : Promise<ContractDefinition[]>
    {
        const contractsStoragePath = path.join(
            this._runtimeContext.paths.project,
            'contracts.json'
        );
        if (!fs.existsSync(contractsStoragePath)) {
            return null;
        }
        
        return JSON.parse(
            fs.readFileSync(contractsStoragePath, { encoding: 'utf-8' })
        );
    }
    
    protected async _addContractDefToStorageFile (
        contractDef : ContractDefinition
    )
    {
        const contractsStoragePath = path.join(
            this._runtimeContext.paths.project,
            'contracts.json'
        );
        
        let currentData : ContractDefinition[] = await this.loadContractsDefFromStorageFile();
        if (!currentData) {
            currentData = [];
        }
        
        currentData.push(contractDef);
        
        const outData = JSON.stringify(currentData);
        
        fs.writeFileSync(
            contractsStoragePath,
            outData,
            { encoding: 'utf-8' }
        );
    }
    
    public async loadContract<T extends Contract> (
        contractDef : ContractDefinition,
    ) : Promise<T>
    {
        const devPhase = this._runtimeContext.getDevPhase();
        
        const contractFactory = await devPhase.getFactory(
            contractDef.type,
            contractDef.name,
            { clusterId: contractDef.clusterId }
        );
        
        return contractFactory.attach(contractDef.contractId);
    }
    
    public async createNew (
        options : ContractCreateNewOptions
    )
    {
        const contractNameValidator = value => /^[a-z][a-z0-9_]+$/.test(value);
        if (!contractNameValidator(options.name)) {
            throw new Exception(
                'Unallowed characters in contract name ^[a-z][a-z0-9_]+$',
                1673533712922
            );
        }
        
        const templatePath = path.join(
            this._runtimeContext.paths.templates,
            'contract',
        );
        const targetContractPath = path.join(
            this._runtimeContext.paths.contracts,
            options.name,
        );
        
        // check it already exists
        if (fs.existsSync(targetContractPath)) {
            throw new Exception(
                'Contract already exists',
                1673534385418
            );
        }
        
        // copy template
        fs.cpSync(
            templatePath,
            targetContractPath,
            { recursive: true }
        );
        
        // replace placeholders
        const nameSnakeCase = options.name;
        const namePascalCase = _.startCase(_.camelCase(options.name)).replaceAll(' ', '');
        
        const placeholders = {
            '{{contract_name}}': nameSnakeCase,
            '{{ContractName}}': namePascalCase
        };
        
        for (const file of ContractManager.TEMPLATE_FILES) {
            const filePath = path.join(
                targetContractPath,
                file
            );
            
            await this._replacePlaceholdersInFile(
                filePath,
                placeholders
            );
        }
        
        ux.debug(chalk.green('Contract created in:'));
        ux.debug(targetContractPath);
        
        return {
            name: {
                snakeCase: nameSnakeCase,
                pascalCase: namePascalCase,
            },
            path: targetContractPath,
        };
    }
    
    protected async _replacePlaceholdersInFile (
        filePath : string,
        placeholders : Record<string, string>
    )
    {
        let fileData = fs.readFileSync(filePath, { encoding: 'utf-8' });
        
        for (const [ placeholder, value ] of Object.entries(placeholders)) {
            fileData = fileData.replaceAll(placeholder, value);
        }
        
        fs.writeFileSync(filePath, fileData, { encoding: 'utf-8' });
    }
    
    public async compile (
        options : ContractCompileOptions
    ) : Promise<Record<string, CompilationResult>>
    {
        ux.action.start('Contracts compilation');
        
        const contractCompiler = new Compiler(this._runtimeContext);
        const typeBinder = new TypeBinder(this._runtimeContext);
        const multiContractExecutor = new MultiContractExecutor(this._runtimeContext);
        
        const compilationResults : Record<string, CompilationResult> = {};
        
        const listr = await multiContractExecutor.exec(
            options.contractName,
            options.watch,
            async(contractName) => {
                return new Listr([
                    {
                        title: 'Compilation',
                        task: async() => {
                            const result = await contractCompiler.compile(
                                contractName,
                                options.release
                            );
                            if (!result.result) {
                                throw new Exception(
                                    'Unable to compile',
                                    1675312571299
                                );
                            }
                            
                            compilationResults[contractName] = result;
                        }
                    },
                    {
                        title: 'Type binding',
                        task: () => typeBinder.createBindings(contractName)
                    }
                ]);
            }
        );
        
        await listr.run();
        
        ux.action.stop();
        
        return compilationResults;
    }
    
    public async deploy (
        contractName : string,
        constructor : string,
        ctorArgs : string[],
        options : ContractDeployOptions
    )
    {
        options = {
            network: RuntimeContext.NETWORK_LOCAL,
            contractType: ContractType.InkCode,
            ...options
        };
        
        const devPhase = await this._runtimeContext.initDevPhase(options.network);
        
        const contractFactory = await devPhase.getFactory(
            options.contractType,
            contractName,
            { clusterId: options.clusterId }
        );
        
        // deploy
        // todo ld 2023-01-12 16:52:42 - verify was contacts already deployed (query not implemented yet)
        const deployOptions : DeployOptions = {};
        if (options.account) {
            deployOptions.asAccount = options.account;
        }
        
        await contractFactory.deploy(deployOptions);
        
        // instantiate
        const instantiateOptions : InstantiateOptions = {};
        if (options.account) {
            instantiateOptions.asAccount = options.account;
        }
        
        const instance = await contractFactory.instantiate(
            constructor,
            ctorArgs,
            instantiateOptions
        );
        
        // save in contracts file
        await this._addContractDefToStorageFile({
            name: contractName,
            network: options.network,
            contractId: instance.contractId,
            type: options.contractType,
            clusterId: instance.clusterId,
        });
        
        await devPhase.cleanup();
        
        return instance;
    }
    
    public async contractCall (
        contractName : string,
        options : ContractCallOptions
    )
    {
    
    }
    
}