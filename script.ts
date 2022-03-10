import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();

async function reset() {
  await prisma.author.deleteMany({});
  await prisma.user.deleteMany({});
}

// A `main` function so that you can use async/await
async function main() {
  await reset();

  /**
   * Create a User and related Author record
   */
  const user = await prisma.user.create({
    data: {
      author: {
        create: {
          email: 'foo@example.com',
          name: 'Foo'
        }
      }
    }
  });

  const authors = await getAuthors();

  assert(authors.length === 1);

  const [author] = authors;

  assert(author.userId === user.id);

  console.log(
    'author with id',
    author.id,
    'is connected to user',
    author.userId
  );

  /**
   * Upsert the User record and try to connectOrCreate the existing
   * Author record using the Users own id.
   */
  await prisma.user.upsert({
    create: {
      author: {
        create: {
          email: 'foo@example.com',
          name: 'Foo'
        }
      }
    },
    update: {
      author: {
        connectOrCreate: {
          create: {
            email: 'should-not-be-created@example.com',
            name: 'should-not-be-created'
          },
          where: {
            /**
             * It should connect to the existing author record to which it should already
             * be connected, so it should basically do nothing.
             */
            userId: user.id
          }
        }
      }
    },
    where: {
      id: user.id
    }
  });

  console.log(
    'author with id',
    author.id,
    'should still be connected to user',
    user.id,
    'as asserted on line 35'
  );

  const refetchedAuthor = await prisma.author.findUnique({
    rejectOnNotFound: true,
    where: {
      id: author.id
    }
  });

  console.log(
    'now',
    (await getAuthors()).length,
    'authors exist in the database while it should be only 1'
  );
  console.log(
    'and the author that was created initially is now disconnected from the user we created',
    refetchedAuthor
  );

  assert(refetchedAuthor.userId === user.id, 'author is no longer connected to our only user');
}

function getAuthors() {
  return prisma.author.findMany();
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
