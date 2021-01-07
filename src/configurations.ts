require('dotenv').config();
import * as _ from 'lodash';

let logs: Array<string> | null = [];
const generateLog = (key: string, value: string | undefined, defaultValue: unknown): string => `Configuration for [${key}] not recognized with value [${value}] using default value [${defaultValue}]`;

const fromBooleanField = (value: string | undefined | null): boolean | null => {
    switch (value?.toLowerCase()) {
        case 'true':
            return true;
        case 'false':
            return false;
        default:
            return null;
    }
};

function readBooleanValue(key: string, defaultValue: boolean): boolean;
function readBooleanValue(key: string, defaultValue?: boolean | null | undefined): boolean | null;
function readBooleanValue(key: string, defaultValue?: boolean | null | undefined): boolean | null {
    const rawValue = process.env[key];
    const value = fromBooleanField(rawValue);
    if (_.isNil(value)) {
        logs?.push(generateLog(key, rawValue, defaultValue));
        return defaultValue ?? null;
    }
    return value;
};

function readStringValue(key: string, defaultValue: string): string;
function readStringValue(key: string, defaultValue?: string | null | undefined): string | null;
function readStringValue(key: string, defaultValue?: string | null | undefined): string | null {
    const rawValue = process.env[key];
    const value = rawValue;
    if (_.isNil(value)) {
        logs?.push(generateLog(key, value, defaultValue));
        return defaultValue ?? null;
    }
    return value;
};

const nodeEnv = readStringValue('NODE_ENV', 'development');
// needs to be read ahead of of time to be used in configurations
const isProduction = nodeEnv === 'production';

const configurations = {
    app: {
        nodeEnv: nodeEnv,
        isProduction: isProduction,
        logMissingConfigurations: readBooleanValue('LOG_MISSING_CONFIGURATIONS', true),
        failOnMissingConfigurations: readBooleanValue('FAIL_ON_MISSING_CONFIGURATIONS', isProduction),
    },
    db: {
        host: readStringValue('DB_HOST', 'localhost'),
        name: readStringValue('DB_NAME', 'rederly'),
        user: readStringValue('DB_USER', 'postgres'),
        password: readStringValue('DB_PASSWORD', 'password'),
        port: readStringValue('DB_PORT', 'port'),
        // This is being calculated so deferring for now to have default logic run
        databaseURL: 'REDERLY_CONFIG_NOT_SET',
    },
    loadPromise: new Promise<void>((resolve, reject) => {
        // Avoid cyclic dependency by deferring the logging until after all the imports are done
        setTimeout(() => {
            // Can't use require statement in callback
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const logger = require('./utilities/logger').default;
            // THIS IS FOR DEBUGGING, DO NOT COMMIT UNCOMMENTED
            // logger.info(JSON.stringify(configurations, null, 2));

            if (_.isNil(logs)) {
                logger.error('configuration logs nil before reading');
            } else if (configurations.app.logMissingConfigurations) {
                logs.forEach((log: string) => {
                    logger.warn(log);
                });
            }

            // Log count defaults to 1 so it fails on null which has already been logged
            if (configurations.app.failOnMissingConfigurations && (logs?.length ?? 1 > 0)) {
                return reject(new Error(`Missing configurations:\n${logs?.join('\n') ?? 'Logs are null'}`));
            } else {
                resolve();
            }
            // After we log the warnings we can drop the logs, figured it would cause cleanup
            logs = null;
        });
    })
};

if(_.isNil(process.env.DB_URL)) {
    configurations.db.databaseURL = `postgresql://${configurations.db.user}:${configurations.db.password}@${configurations.db.host}:${configurations.db.port}/${configurations.db.name}?schema=public`
    process.env.DB_URL = configurations.db.databaseURL;
} else {
    logs?.push('DB_URL explicitly set, ignoring individual db configurations (like host and name)');
}

export default configurations;
