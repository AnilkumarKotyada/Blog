import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@anilkumarkotyada95/medium-common3";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
    header: string;
  },
  Variables: {
    userId: string;
  },
}>();

// Middleware to verify the user using JWT
blogRouter.use('/*', async (c, next) => {
  const authheader = c.req.header("authorization") || "";
  try {
    const user = await verify(authheader, c.env.JWT_SECRET);
    if (user) {
      //@ts-ignore
      c.set("userId", user.id);
      await next();
    } else {
      c.status(403);
      return c.json({
        message: "You are not logged in"
      });
    }
  } catch (e) {
    c.status(403);
    return c.json({
      message: "You are not logged in"
    });
  }
});

// Create a new blog post
blogRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { success } = createBlogInput.safeParse(body);
  
  if (!success) {
    c.status(411);
    return c.json({
      message: "Inputs not correct"
    });
  }
  
  const userId = c.get('userId');
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: userId, // Passing `userId` directly as string
    }
  });

  return c.json({
    id: blog.id
  });
});

// Update an existing blog post
blogRouter.put('/', async (c) => {
  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      message: "Inputs not correct"
    });
  }
  
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.update({
    where: {
      id: body.id
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json({
    id: blog.id
  });
});

// Fetch all blog posts in bulk
blogRouter.get('/bulk', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blogs = await prisma.post.findMany({
    select: {
      content: true,
      title: true,
      id: true,
      author: {
        select: {
          name: true
        }
      }
    }
  });

  return c.json({
    blogs
  });
});

// Fetch a blog post by its ID
blogRouter.get('/:id', async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.post.findFirst({
      where: { 
        id 
      },
      select: {
        title: true,
        content: true,
        author: {
          select: {
            name: true
          }
        }
      }
    });

    return c.json({
      blog
    });
  } catch (e) {
    c.status(411);
    return c.json({
      message: "Error while fetching blog post",
    });
  }
});
