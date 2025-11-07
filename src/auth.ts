import { PrismaClient } from "@prisma/client";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const prisma = new PrismaClient();

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      console.log("JWT Callback - token:", token);
      console.log("JWT Callback - user:", user);
      console.log("JWT Callback - account:", account);
      console.log("JWT Callback - profile:", profile);
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token, user }) {
      console.log("Session Callback - session:", session);
      console.log("Session Callback - token:", token);
      console.log("Session Callback - user:", user);
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
