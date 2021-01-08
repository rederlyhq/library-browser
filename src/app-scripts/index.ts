import configurations from '../configurations';
import { listen } from '../server';

// import * as fs from 'fs';
// import { PrismaClient } from "@prisma/client"
// import * as _ from 'lodash';
// const prisma = new PrismaClient();
// Object.keys(prisma).forEach((key: string) => {
//     const model = prisma[key as keyof typeof prisma] as any;
//     if (!_.isNil(model.findMany)) {
//         model.findMany({
//             take: 5
//         })
//         .then((result: unknown) => fs.promises.writeFile(`${key}.json`, JSON.stringify(result, null, 2)))
//         .catch((err: unknown) => console.error(`${key}: ${err}`));
//     }
// });

(async () => {
    await configurations.loadPromise;
    await listen();
})();
