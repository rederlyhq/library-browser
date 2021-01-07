import '../configurations';
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient();

(async () => {
    console.log(`hello ${process.env.DB_URL}`);
    const result = await prisma.opl_author.findMany();
    console.log(JSON.stringify(result, null, 2));
    prisma.$disconnect();
})();
