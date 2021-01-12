import Boom = require('boom');
import * as express from 'express';
import httpResponse from '../utilities/http-response';
const router = express.Router();
import { PrismaClient } from "@prisma/client"
import _ = require('lodash');
import logger from '../utilities/logger';
const prisma = new PrismaClient({
    log: ['query', 'warn', 'error']
});

const getQueryParamArray = (value: string | string[] | undefined): Array<string> => {
    if (_.isUndefined(value)) {
        return [];
    }

    if (_.isArray(value)) {
        return value;
    }
    return [value];
}

const stringArrayToNumberArray= (value: string[]): number[] => value.map(arg => parseInt(arg, 10));
const filterNaN = (arr: number[]) => _.filter(arr, _.negate(_.isNaN));

const getNumberArrayFromQuery = (value: string | string[] | undefined) =>  filterNaN(stringArrayToNumberArray(getQueryParamArray(value)));
const doesExists = _.negate(_.isNil);


router.get('/subjects', async (_req, _res, next) => {
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

router.get('/chapters', async (req, _res, next) => {
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

router.get('/sections', async (req, _res, next) => {
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


router.get('/search', async (req, _res, next) => {
    const subjectId: number | undefined = getNumberArrayFromQuery(req.query.subjectId as string | string[] | undefined)[0];
    const chapterId: number | undefined = getNumberArrayFromQuery(req.query.chapterId as string | string[] | undefined)[0];
    const sectionId: number | undefined = getNumberArrayFromQuery(req.query.sectionId as string | string[] | undefined)[0];

    const includeSubject = doesExists(subjectId);
    const includeChapter = includeSubject || doesExists(chapterId);
    const includeSection = includeChapter || doesExists(sectionId);

    console.log(JSON.stringify({
        subjectId,
        chapterId,
        sectionId,
    }, null, 2))

    try {
        const result = await prisma.opl_path.findMany({
            select: {
                path_id: true,
                path: true,
            },
            where: {
                opl_pgfile: !includeSection ? undefined : {
                    some: {
                        opl_dbsection: !includeSection ? undefined : {
                            dbsection_id: sectionId,
                            opl_dbchapter: !includeChapter ? undefined: {
                                dbchapter_id: chapterId,
                                opl_dbsubject: !includeSubject ? undefined: {
                                    dbsubject_id: subjectId
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                path_id: 'asc'
            }
        });
        logger.debug({
            includeSubject,
            includeChapter,
            includeSection,
        })
        logger.debug(`Search count: ${result.length}`);

        next(httpResponse.Ok(null, {
            result: result,
        }));    
    } catch (e) {
        next(e);
    }
});

export default router;