import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';
import httpResponse from '../utilities/http-response';
const router = express.Router();
import { PrismaClient } from '@prisma/client';
import _ = require('lodash');
import logger from '../utilities/logger';
const prisma = new PrismaClient({
    // log: ['query', 'warn', 'error']
});

const getQueryParamArray = (value: string | string[] | undefined): Array<string> => {
    if (_.isUndefined(value)) {
        return [];
    }

    if (_.isArray(value)) {
        return value;
    }
    return [value];
};

const stringArrayToNumberArray= (value: string[]): number[] => value.map(arg => parseInt(arg, 10));
const filterNaN = (arr: number[]) => _.filter(arr, _.negate(_.isNaN));

const getNumberArrayFromQuery = (value: string | string[] | undefined) =>  filterNaN(stringArrayToNumberArray(getQueryParamArray(value)));

const packageJSONPath = '../../package.json';

/**
 * Get the version number at startup, however you'll have to await the result in the callback
 * This should only be called once (same as if it was imported) and awaiting the promise will actually give you the result
 * On error returns null so that the api is indicating that it wasn't just missed but couldn't be retrieved (undefined just doesn't return the key)
 * Can't use import here because the rootDir is jailed to src (which makes sense)
 */
const versionPromise = new Promise<string | null>((resolve, reject) => {
    fs.readFile(path.join(__dirname, packageJSONPath), (err: Error | null, data: Buffer) => {
        if (err) {
            reject(err);
        } else {
            try {
                // returns version string
                resolve(JSON.parse(data.toString()).version);
            } catch (e) {
                reject(e);
            }
        }
    });
})
.catch((err: Error) => {
    logger.error(err);
    return null;
});

router.use('/health',
(_req: Request, _res: Response, next: NextFunction) => {
    next(httpResponse.Ok());
});

router.use('/version',
async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const version = await versionPromise;
        next(httpResponse.Ok(null, {
            packageJson: version
        }));            
    } catch (e) {
        next(e);
    }
});

router.get('/subjects', async (_req: Request, _res: Response, next: NextFunction) => {
    try {
        const subjects = await prisma.opl_dbsubject.findMany();
        logger.debug(`Subject count: ${subjects.length}`);
        next(httpResponse.Ok(null, {
            subjects: subjects,
        }));
    } catch (e) {
        next(e);
    }
});

router.get('/chapters', async (req: Request, _res: Response, next: NextFunction) => {
    const subjectId: number | undefined = getNumberArrayFromQuery(req.query.subjectId as string | string[] | undefined)[0];

    try {
        const chapters = await prisma.opl_dbchapter.findMany({
            where: {
                dbsubject_id: subjectId
            }
        });
        logger.debug(`Chapter count: ${chapters.length}`);
        next(httpResponse.Ok(null, {
            chapters: chapters,
        }));    
    } catch (e) {
        next(e);
    }
});

router.get('/sections', async (req: Request, _res: Response, next: NextFunction) => {
    const chapterId: number | undefined = getNumberArrayFromQuery(req.query.chapterId as string | string[] | undefined)[0];

    try {
        const sections = await prisma.opl_dbsection.findMany({
            where: {
                dbchapter_id: chapterId
            }
        });
        logger.debug(`Section count: ${sections.length}`);
        next(httpResponse.Ok(null, {
            sections: sections,
        }));    
    } catch (e) {
        next(e);
    }
});


router.get('/search', async (req: Request, _res: Response, next: NextFunction) => {
    const subjectId: number | undefined = getNumberArrayFromQuery(req.query.subjectId as string | string[] | undefined)[0];
    const chapterId: number | undefined = getNumberArrayFromQuery(req.query.chapterId as string | string[] | undefined)[0];
    const sectionId: number | undefined = getNumberArrayFromQuery(req.query.sectionId as string | string[] | undefined)[0];

    logger.debug(`Params: ${JSON.stringify({
        subjectId,
        chapterId,
        sectionId,
    })}`);

    try {
        const queryResult = await prisma.opl_pgfile.findMany({
            select: {
                filename: true,
                opl_dbsection: {
                    select: {
                        name: true,
                        opl_dbchapter: {
                            select: {
                                name: true,
                                opl_dbsubject: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    },
                },
                opl_path: {
                    select: {
                        path: true,
                    },
                },
            },
            where: {
                opl_dbsection: {
                    dbsection_id: sectionId,
                    opl_dbchapter: {
                        dbchapter_id: chapterId,
                        opl_dbsubject: {
                            dbsubject_id: subjectId
                        }
                    }
                }
            },
            orderBy: {
                path_id: 'asc'
            }
        });

        const result = queryResult.map((obj => ({
            filename: obj.filename,
            path: obj.opl_path.path,
            sectionName: obj.opl_dbsection.name,
            chapterName: obj.opl_dbsection.opl_dbchapter.name,
            subjectName: obj.opl_dbsection.opl_dbchapter.opl_dbsubject.name
        })));

        logger.debug(`Search count: ${result.length}`);

        next(httpResponse.Ok(null, {
            result: result,
        }));    
    } catch (e) {
        next(e);
    }
});

export default router;
