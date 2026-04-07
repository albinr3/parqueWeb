import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const inputUsername = String(credentials.username).trim();
        const inputPassword = String(credentials.password);

        let admin = await prisma.adminAccount.findUnique({
          where: { username: inputUsername },
        });

        // Bootstrap opcional del admin en producción/local usando variables de entorno.
        // Solo se crea si no existe y si el login coincide exactamente con los env vars.
        const envAdminUsername = process.env.ADMIN_USERNAME?.trim();
        const envAdminPassword = process.env.ADMIN_PASSWORD;
        const envAdminName = process.env.ADMIN_NAME?.trim() || 'Administrador';

        if (
          !admin &&
          envAdminUsername &&
          envAdminPassword &&
          inputUsername === envAdminUsername &&
          inputPassword === envAdminPassword
        ) {
          const hashed = await bcrypt.hash(envAdminPassword, 10);
          admin = await prisma.adminAccount.create({
            data: {
              username: envAdminUsername,
              password: hashed,
              name: envAdminName,
            },
          });
        }

        if (!admin) return null;

        let isValid = false;

        // Soporte legacy: si la contraseña guardada no está hasheada, compara plano
        // y migra automáticamente a bcrypt en login exitoso.
        const looksHashed = admin.password.startsWith('$2');
        if (looksHashed) {
          isValid = await bcrypt.compare(inputPassword, admin.password);
        } else {
          isValid = inputPassword === admin.password;
          if (isValid) {
            const migratedHash = await bcrypt.hash(inputPassword, 10);
            await prisma.adminAccount.update({
              where: { id: admin.id },
              data: { password: migratedHash },
            });
          }
        }

        if (!isValid) return null;

        return {
          id: admin.id,
          email: null,
          name: admin.name,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
