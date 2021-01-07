import configurations from '../configurations';
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient();
import { listen } from '../server';

(async () => {
    // console.log(`hello ${process.env.DB_URL}`);
    // const result = await prisma.opl_author.findMany();
    // console.log(JSON.stringify(result, null, 2));
    // prisma.$disconnect();
    await configurations.loadPromise;
    await listen();
})();
